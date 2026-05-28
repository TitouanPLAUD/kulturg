import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../context/AuthContext.jsx'
import { QUESTIONS as ALL_QUESTIONS } from '../data/questions.js'

export const TARGET_SCORE = 5
const Q_COUNT = 15

function pick(arr, n) {
  return [...arr].sort(() => Math.random() - 0.5).slice(0, n)
}

function generateCode() {
  const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => c[Math.floor(Math.random() * c.length)]).join('')
}

// Returns { hostScore, guestScore, roundWinners: Map<q_idx, profile_id> }
export function computeDuelScores(answers) {
  const roundWinners = new Map()
  for (const a of [...answers]
    .filter(x => x.is_correct)
    .sort((a, b) => new Date(a.answered_at) - new Date(b.answered_at))) {
    if (!roundWinners.has(a.q_idx)) roundWinners.set(a.q_idx, a.profile_id)
  }
  const scores = {}
  for (const pid of roundWinners.values()) {
    scores[pid] = (scores[pid] ?? 0) + 1
  }
  return { scores, roundWinners }
}

export function useDuelRoom(code) {
  const { user } = useAuth()
  const [room,    setRoom]    = useState(null)
  const [profiles, setProfiles] = useState({}) // { [profile_id]: { nickname, avatar } }
  const [answers, setAnswers] = useState([])
  const [loading, setLoading] = useState(true)
  const channelRef = useRef(null)
  const roomIdRef  = useRef(null)

  const isHost  = room?.host_id  === user?.id
  const isGuest = room?.guest_id === user?.id

  const loadProfiles = useCallback(async (room) => {
    const ids = [room.host_id, room.guest_id].filter(Boolean)
    if (!ids.length) return
    const { data } = await supabase
      .from('profiles')
      .select('id, nickname, avatar')
      .in('id', ids)
    if (data) {
      const map = {}
      for (const p of data) map[p.id] = p
      setProfiles(map)
    }
  }, [])

  useEffect(() => {
    if (!code) { setLoading(false); return }
    let mounted = true
    ;(async () => {
      const { data: r } = await supabase
        .from('duel_rooms').select('*').eq('code', code).single()
      if (!mounted) return
      if (!r) { setLoading(false); return }
      roomIdRef.current = r.id
      setRoom(r)
      const [, { data: ans }] = await Promise.all([
        loadProfiles(r),
        supabase.from('duel_answers').select('*').eq('room_id', r.id),
      ])
      if (!mounted) return
      setAnswers(ans ?? [])
      setLoading(false)

      channelRef.current = supabase.channel(`pvp-${r.id}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'duel_rooms' },
          ({ new: u }) => {
            if (u.id === r.id && mounted) {
              setRoom(u)
              loadProfiles(u)
            }
          })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'duel_answers' },
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
  }, [code, loadProfiles])

  async function updateRoom(patch) {
    if (!room) return
    const { data } = await supabase
      .from('duel_rooms').update(patch).eq('id', room.id).select().single()
    if (data) setRoom(data)
  }

  async function submitAnswer({ q_idx, answer_idx, is_correct, time_ms }) {
    if (!user || !room) return
    await supabase.from('duel_answers').upsert(
      { room_id: room.id, profile_id: user.id, q_idx, answer_idx, is_correct, time_ms },
      { onConflict: 'room_id,profile_id,q_idx' }
    )
  }

  async function startGame() {
    if (!isHost) return
    // On exige que l'adversaire ait rejoint (salle complète 2/2)
    if (!room?.guest_id) return
    await updateRoom({
      phase: 'playing',
      phase_data: {
        questions: pick(ALL_QUESTIONS, Q_COUNT),
        q_idx: 0,
        q_start_at: new Date().toISOString(),
      },
    })
  }

  async function hostAdvance() {
    if (!isHost || !room) return
    const pd = room.phase_data
    const { scores } = computeDuelScores(answers)
    const hostScore  = scores[room.host_id]  ?? 0
    const guestScore = scores[room.guest_id] ?? 0
    const nextIdx    = (pd.q_idx ?? 0) + 1

    // Check win condition
    if (hostScore >= TARGET_SCORE || guestScore >= TARGET_SCORE || nextIdx >= pd.questions.length) {
      const winnerId = hostScore > guestScore ? room.host_id
        : guestScore > hostScore ? room.guest_id
        : null // tie
      return updateRoom({ phase: 'finished', phase_data: { ...pd, winner_id: winnerId } })
    }
    return updateRoom({
      phase_data: { ...pd, q_idx: nextIdx, q_start_at: new Date().toISOString() },
    })
  }

  async function createRoom() {
    if (!user) return null
    const code = generateCode()
    const { data, error } = await supabase
      .from('duel_rooms').insert({ code, host_id: user.id }).select().single()
    if (error || !data) return null
    return data.code
  }

  async function joinRoom(roomCode) {
    if (!user) return { error: 'Non connecté' }
    const { data: r } = await supabase
      .from('duel_rooms').select('*').eq('code', roomCode.toUpperCase()).single()
    if (!r) return { error: 'Salle introuvable' }
    if (r.phase !== 'lobby') return { error: 'Partie déjà commencée' }
    if (r.host_id === user.id) return { code: r.code }
    if (r.guest_id === user.id) return { code: r.code }
    if (r.guest_id) return { error: 'Salle déjà pleine' }
    const { error } = await supabase
      .from('duel_rooms').update({ guest_id: user.id }).eq('id', r.id)
    if (error) return { error: 'Impossible de rejoindre.' }
    return { code: r.code }
  }

  const myAnswers = answers.filter(a => a.profile_id === user?.id)

  return {
    room, profiles, answers, myAnswers, loading,
    isHost, isGuest,
    submitAnswer, hostAdvance, startGame, createRoom, joinRoom,
  }
}
