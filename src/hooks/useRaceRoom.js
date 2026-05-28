import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../context/AuthContext.jsx'
import { QUESTIONS as ALL_QUESTIONS } from '../data/questions.js'

export const RACE_MAX_PLAYERS = 15
export const RACE_MIN_PLAYERS = 2
export const Q_COUNT          = 10
export const TIMER_MS         = 20000

// Points par rang de réponse correcte
export const POINTS = [5, 3, 2, 1] // 1er, 2e, 3e, reste

function pick(arr, n) {
  return [...arr].sort(() => Math.random() - 0.5).slice(0, n)
}

function generateCode() {
  const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => c[Math.floor(Math.random() * c.length)]).join('')
}

// Points gagnés pour une question donnée { [profile_id]: points }
export function computeQuestionPoints(answers, q_idx) {
  const correct = [...answers]
    .filter(a => a.q_idx === q_idx && a.is_correct)
    .sort((a, b) => new Date(a.answered_at) - new Date(b.answered_at))

  const map = {}
  correct.forEach((a, i) => {
    map[a.profile_id] = POINTS[i] ?? POINTS[POINTS.length - 1]
  })
  return map
}

// Scores totaux { [profile_id]: total }
export function computeScores(answers, q_count) {
  const scores = {}
  for (let q = 0; q < q_count; q++) {
    const pts = computeQuestionPoints(answers, q)
    for (const [pid, p] of Object.entries(pts)) {
      scores[pid] = (scores[pid] ?? 0) + p
    }
  }
  return scores
}

export function useRaceRoom(code) {
  const { user } = useAuth()
  const [room,         setRoom]         = useState(null)
  const [participants, setParticipants] = useState([])
  const [answers,      setAnswers]      = useState([])
  const [loading,      setLoading]      = useState(true)
  const channelRef = useRef(null)

  const isHost = room?.host_id === user?.id

  const loadParticipants = useCallback(async (roomId) => {
    const { data } = await supabase
      .from('race_participants')
      .select('*, profile:profile_id(id, nickname, avatar)')
      .eq('room_id', roomId)
    setParticipants(data ?? [])
  }, [])

  useEffect(() => {
    if (!code) { setLoading(false); return }
    let mounted = true
    ;(async () => {
      const { data: r } = await supabase
        .from('race_rooms').select('*').eq('code', code).single()
      if (!mounted) return
      if (!r) { setLoading(false); return }
      setRoom(r)
      const [, { data: ans }] = await Promise.all([
        loadParticipants(r.id),
        supabase.from('race_answers').select('*').eq('room_id', r.id),
      ])
      if (!mounted) return
      setAnswers(ans ?? [])
      setLoading(false)

      channelRef.current = supabase.channel(`race-${r.id}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'race_rooms' },
          ({ new: u }) => { if (u.id === r.id && mounted) setRoom(u) })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'race_participants' },
          ({ new: row }) => { if (row?.room_id === r.id && mounted) loadParticipants(r.id) })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'race_answers' },
          ({ new: a }) => {
            if (a?.room_id === r.id && mounted)
              setAnswers(prev => [...prev.filter(x => x.id !== a.id), a])
          })
        .subscribe()
    })()
    return () => {
      mounted = false
      if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null }
    }
  }, [code, loadParticipants])

  async function updateRoom(patch) {
    if (!room) return
    const { data } = await supabase
      .from('race_rooms').update(patch).eq('id', room.id).select().single()
    if (data) setRoom(data)
  }

  async function submitAnswer({ q_idx, answer_idx, is_correct }) {
    if (!user || !room) return
    // INSERT only (no upsert) pour préserver le answered_at server-side d'origine
    await supabase.from('race_answers').insert({
      room_id: room.id, profile_id: user.id, q_idx, answer_idx, is_correct,
    })
  }

  async function startGame() {
    if (!isHost || participants.length < RACE_MIN_PLAYERS) return
    await supabase.from('race_answers').delete().eq('room_id', room.id)
    setAnswers([])
    return updateRoom({
      phase: 'playing',
      phase_data: {
        questions:   pick(ALL_QUESTIONS, Q_COUNT),
        q_idx:       0,
        q_start_at:  new Date().toISOString(),
        q_count:     Q_COUNT,
      },
    })
  }

  async function hostAdvance() {
    if (!isHost || !room) return
    const pd = room.phase_data
    const next = (pd.q_idx ?? 0) + 1
    if (next >= (pd.questions?.length ?? Q_COUNT)) {
      return updateRoom({ phase: 'finished' })
    }
    return updateRoom({
      phase_data: { ...pd, q_idx: next, q_start_at: new Date().toISOString() },
    })
  }

  async function createRoom() {
    if (!user) return null
    const code = generateCode()
    const { data, error } = await supabase
      .from('race_rooms').insert({ code, host_id: user.id }).select().single()
    if (error || !data) return null
    await supabase.from('race_participants').insert({ room_id: data.id, profile_id: user.id })
    return data.code
  }

  async function joinRoom(roomCode) {
    if (!user) return { error: 'Non connecté' }
    const { data: r } = await supabase
      .from('race_rooms').select('*').eq('code', roomCode.toUpperCase()).single()
    if (!r) return { error: 'Salle introuvable' }
    if (r.phase !== 'lobby') return { error: 'Partie déjà commencée' }

    const { count } = await supabase
      .from('race_participants').select('id', { count: 'exact', head: true }).eq('room_id', r.id)
    if ((count ?? 0) >= RACE_MAX_PLAYERS) return { error: `Salle pleine (${RACE_MAX_PLAYERS}/${RACE_MAX_PLAYERS})` }

    const { data: existing } = await supabase
      .from('race_participants').select('id').eq('room_id', r.id).eq('profile_id', user.id).single()
    if (existing) return { code: r.code }

    const { error } = await supabase
      .from('race_participants').insert({ room_id: r.id, profile_id: user.id })
    if (error) return { error: 'Impossible de rejoindre.' }
    return { code: r.code }
  }

  const myAnswers = answers.filter(a => a.profile_id === user?.id)

  return {
    room, participants, answers, myAnswers, loading,
    isHost,
    submitAnswer, hostAdvance, startGame, createRoom, joinRoom,
  }
}
