import { createContext, useContext, useEffect, useReducer, useRef } from 'react'
import { supabase } from '../lib/supabase'

const PLAYER_KEY = 'kulturg.player'

const AVATARS = ['🎭', '🦁', '🐯', '🦊', '🐺', '🦝', '🐸', '🦄', '🐲', '🦋',
  '🌟', '🔥', '⚡', '🌈', '🎯', '🚀', '🎸', '🏆', '💎', '🎩']

export function randomAvatar() {
  return AVATARS[Math.floor(Math.random() * AVATARS.length)]
}

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

function loadLocalPlayer() {
  try {
    const raw = localStorage.getItem(PLAYER_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* noop */ }
  return null
}

function saveLocalPlayer(p) {
  localStorage.setItem(PLAYER_KEY, JSON.stringify(p))
}

const initialState = {
  player: loadLocalPlayer(),
  room: null,
  roomPlayers: [],
  roomQuestions: [],
  myAnswers: [],
  error: null,
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_PLAYER':
      return { ...state, player: action.player }
    case 'SET_ROOM':
      return { ...state, room: action.room, error: null }
    case 'SET_ROOM_PLAYERS':
      return { ...state, roomPlayers: action.roomPlayers }
    case 'UPDATE_ROOM_PLAYER': {
      const updated = state.roomPlayers.map(rp =>
        rp.player_id === action.rp.player_id ? { ...rp, ...action.rp } : rp
      )
      const exists = updated.some(rp => rp.player_id === action.rp.player_id)
      return { ...state, roomPlayers: exists ? updated : [...updated, action.rp] }
    }
    case 'REMOVE_ROOM_PLAYER':
      return { ...state, roomPlayers: state.roomPlayers.filter(rp => rp.player_id !== action.playerId) }
    case 'SET_ROOM_QUESTIONS':
      return { ...state, roomQuestions: action.questions }
    case 'ADD_MY_ANSWER':
      return { ...state, myAnswers: [...state.myAnswers, action.answer] }
    case 'UPDATE_ROOM_STATUS':
      if (!state.room) return state
      return { ...state, room: { ...state.room, status: action.status, started_at: action.started_at ?? state.room.started_at, finished_at: action.finished_at ?? state.room.finished_at } }
    case 'SET_ERROR':
      return { ...state, error: action.error }
    case 'LEAVE_ROOM':
      return { ...state, room: null, roomPlayers: [], roomQuestions: [], myAnswers: [] }
    default:
      return state
  }
}

const MultiplayerContext = createContext(null)

export function MultiplayerProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const channelRef = useRef(null)

  // Ensure player exists in DB when identity is set
  async function ensurePlayer(nickname, avatar) {
    let local = state.player
    if (!local) {
      const { data, error } = await supabase
        .from('players')
        .insert({ nickname, avatar: avatar ?? randomAvatar() })
        .select()
        .single()
      if (error) throw error
      local = data
      saveLocalPlayer(local)
      dispatch({ type: 'SET_PLAYER', player: local })
    }
    return local
  }

  async function setNickname(nickname, avatar) {
    const p = await ensurePlayer(nickname, avatar ?? randomAvatar())
    return p
  }

  async function createRoom({ mode, theme, difficulty }) {
    if (!state.player) throw new Error('Pas de joueur défini')
    const code = generateCode()
    const { data: room, error } = await supabase
      .from('rooms')
      .insert({ code, host_id: state.player.id, mode, theme: theme ?? null, difficulty: difficulty ?? null })
      .select()
      .single()
    if (error) throw error

    await supabase.from('room_players').insert({ room_id: room.id, player_id: state.player.id })

    dispatch({ type: 'SET_ROOM', room })
    await fetchRoomPlayers(room.id)
    subscribeToRoom(room.id)
    return room
  }

  async function joinRoom(code) {
    if (!state.player) throw new Error('Pas de joueur défini')
    const { data: room, error } = await supabase
      .from('rooms')
      .select()
      .eq('code', code.toUpperCase().trim())
      .single()
    if (error || !room) throw new Error('Code invalide ou partie introuvable')
    if (room.status === 'finished') throw new Error('Cette partie est terminée')

    const { error: joinError } = await supabase
      .from('room_players')
      .upsert({ room_id: room.id, player_id: state.player.id }, { onConflict: 'room_id,player_id' })
    if (joinError) throw joinError

    dispatch({ type: 'SET_ROOM', room })
    await fetchRoomPlayers(room.id)
    subscribeToRoom(room.id)

    // Si la partie est déjà lancée, charge les questions immédiatement
    if (room.status === 'playing') {
      await fetchRoomQuestions(room.id)
    }

    return room
  }

  async function fetchRoomPlayers(roomId) {
    const { data } = await supabase
      .from('room_players')
      .select('*, players(nickname, avatar)')
      .eq('room_id', roomId)
      .order('joined_at')
    if (data) dispatch({ type: 'SET_ROOM_PLAYERS', roomPlayers: data })
  }

  async function fetchRoomQuestions(roomId) {
    const { data } = await supabase
      .from('room_questions')
      .select()
      .eq('room_id', roomId)
      .order('position')
    if (data) dispatch({ type: 'SET_ROOM_QUESTIONS', questions: data })
  }

  async function startGame(questions) {
    if (!state.room) return
    // Insère les questions dans la DB
    const rows = questions.map((q, i) => ({
      room_id: state.room.id,
      position: i,
      question_data: q,
    }))
    await supabase.from('room_questions').insert(rows)

    // Met à jour le statut
    const { data: updated } = await supabase
      .from('rooms')
      .update({ status: 'playing', started_at: new Date().toISOString() })
      .eq('id', state.room.id)
      .select()
      .single()

    // Met à jour le statut du joueur
    await supabase
      .from('room_players')
      .update({ status: 'playing' })
      .eq('room_id', state.room.id)
      .eq('player_id', state.player.id)

    dispatch({ type: 'UPDATE_ROOM_STATUS', status: 'playing', started_at: updated?.started_at })
    dispatch({ type: 'SET_ROOM_QUESTIONS', questions: rows })
  }

  async function submitAnswer({ questionPosition, answerIndex, isCorrect, timeTakenMs, xpEarned }) {
    if (!state.room || !state.player) return
    const answer = { questionPosition, answerIndex, isCorrect, timeTakenMs }
    dispatch({ type: 'ADD_MY_ANSWER', answer })

    await supabase.from('player_answers').upsert({
      room_id: state.room.id,
      player_id: state.player.id,
      question_position: questionPosition,
      answer_index: answerIndex,
      is_correct: isCorrect,
      time_taken_ms: timeTakenMs,
    }, { onConflict: 'room_id,player_id,question_position' })

    // Met à jour le score dans room_players
    const { data: rp } = await supabase
      .from('room_players')
      .select()
      .eq('room_id', state.room.id)
      .eq('player_id', state.player.id)
      .single()
    if (rp) {
      await supabase.from('room_players').update({
        score: rp.score + (xpEarned ?? 0),
        correct_count: rp.correct_count + (isCorrect ? 1 : 0),
        answered_count: rp.answered_count + 1,
      }).eq('id', rp.id)
    }
  }

  async function finishGame() {
    if (!state.room || !state.player) return
    await supabase.from('room_players')
      .update({ status: 'finished' })
      .eq('room_id', state.room.id)
      .eq('player_id', state.player.id)

    // Si tous ont fini, on clôt la room
    const { data: rps } = await supabase
      .from('room_players')
      .select()
      .eq('room_id', state.room.id)
    const allDone = rps?.every(rp => rp.status === 'finished')
    if (allDone) {
      await supabase.from('rooms')
        .update({ status: 'finished', finished_at: new Date().toISOString() })
        .eq('id', state.room.id)
    }
  }

  async function leaveRoom() {
    if (!state.room || !state.player) return
    unsubscribeRoom()
    const isHost = state.room.host_id === state.player.id
    if (isHost && state.room.status === 'waiting') {
      await supabase.from('rooms').delete().eq('id', state.room.id)
    } else {
      await supabase.from('room_players')
        .delete()
        .eq('room_id', state.room.id)
        .eq('player_id', state.player.id)
    }
    dispatch({ type: 'LEAVE_ROOM' })
  }

  function subscribeToRoom(roomId) {
    unsubscribeRoom()
    const channel = supabase.channel(`room:${roomId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
        payload => {
          if (payload.new) {
            dispatch({ type: 'UPDATE_ROOM_STATUS', status: payload.new.status, started_at: payload.new.started_at, finished_at: payload.new.finished_at })
            if (payload.new.status === 'playing') fetchRoomQuestions(roomId)
          }
        }
      )
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'room_players', filter: `room_id=eq.${roomId}` },
        async payload => {
          // Récupère les infos joueur
          const { data } = await supabase
            .from('room_players')
            .select('*, players(nickname, avatar)')
            .eq('id', payload.new.id)
            .single()
          if (data) dispatch({ type: 'UPDATE_ROOM_PLAYER', rp: data })
        }
      )
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'room_players', filter: `room_id=eq.${roomId}` },
        async payload => {
          const { data } = await supabase
            .from('room_players')
            .select('*, players(nickname, avatar)')
            .eq('id', payload.new.id)
            .single()
          if (data) dispatch({ type: 'UPDATE_ROOM_PLAYER', rp: data })
        }
      )
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'room_players', filter: `room_id=eq.${roomId}` },
        payload => {
          dispatch({ type: 'REMOVE_ROOM_PLAYER', playerId: payload.old.player_id })
        }
      )
      .subscribe()
    channelRef.current = channel
  }

  function unsubscribeRoom() {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }
  }

  useEffect(() => () => unsubscribeRoom(), [])

  return (
    <MultiplayerContext.Provider value={{ ...state, setNickname, createRoom, joinRoom, startGame, submitAnswer, finishGame, leaveRoom, fetchRoomPlayers }}>
      {children}
    </MultiplayerContext.Provider>
  )
}

export function useMultiplayer() {
  const ctx = useContext(MultiplayerContext)
  if (!ctx) throw new Error('useMultiplayer must be used within MultiplayerProvider')
  return ctx
}
