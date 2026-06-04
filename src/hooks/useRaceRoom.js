import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../context/AuthContext.jsx'
import { QUESTIONS as ALL_QUESTIONS } from '../data/questions.js'

export const RACE_MAX_PLAYERS = 15
export const RACE_MIN_PLAYERS = 2
export const Q_COUNT          = 10      // nombre de questions par défaut
export const TIMER_MS         = 20000   // durée par question par défaut (ms)

// Réglages personnalisables d'une partie
export const Q_COUNT_OPTIONS = [5, 10, 15, 20]      // nombre de questions
export const TIMER_OPTIONS   = [10, 15, 20, 30]     // durée par question (secondes)
export const DIFFICULTY_OPTIONS = [
  { value: 'all', label: 'Toutes',    emoji: '🎲' },
  { value: 1,     label: 'Facile',    emoji: '🟢' },
  { value: 2,     label: 'Moyen',     emoji: '🟠' },
  { value: 3,     label: 'Difficile', emoji: '🔴' },
]

export const DEFAULT_RACE_SETTINGS = {
  themes:     [],     // [] = tous les thèmes
  difficulty: 'all',  // 'all' | 1 | 2 | 3
  duration:   20,     // secondes par question
  count:      10,     // nombre de questions
}

// Points par rang de réponse correcte
export const POINTS = [5, 3, 2, 1] // 1er, 2e, 3e, reste

function pick(arr, n) {
  return [...arr].sort(() => Math.random() - 0.5).slice(0, n)
}

// Sélectionne les questions selon les réglages (thèmes / difficulté / nombre)
function pickQuestions(settings) {
  const s = { ...DEFAULT_RACE_SETTINGS, ...(settings ?? {}) }
  let pool = ALL_QUESTIONS

  if (s.themes?.length) {
    const set = new Set(s.themes)
    const filtered = pool.filter(q => set.has(q.theme))
    if (filtered.length) pool = filtered
  }

  if (s.difficulty && s.difficulty !== 'all') {
    const filtered = pool.filter(q => q.difficulty === s.difficulty)
    if (filtered.length) pool = filtered
  }

  if (!pool.length) pool = ALL_QUESTIONS
  const n = Math.min(s.count ?? Q_COUNT, pool.length)
  return pick(pool, n)
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

  // Re-fetch les answers à chaque transition de phase pour garantir un état
  // complet sur tous les clients (Supabase realtime peut rater des events
  // pendant des micro-coupures réseau).
  useEffect(() => {
    if (!room?.id) return
    let cancelled = false
    ;(async () => {
      const { data } = await supabase
        .from('race_answers').select('*').eq('room_id', room.id)
      if (!cancelled) setAnswers(data ?? [])
    })()
    return () => { cancelled = true }
  }, [room?.id, room?.phase])

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
    const settings  = { ...DEFAULT_RACE_SETTINGS, ...(room.phase_data?.settings ?? {}) }
    const questions = pickQuestions(settings)
    await supabase.from('race_answers').delete().eq('room_id', room.id)
    setAnswers([])
    return updateRoom({
      phase: 'playing',
      phase_data: {
        settings,
        questions,
        q_idx:       0,
        q_start_at:  new Date().toISOString(),
        q_count:     questions.length,
        timer_ms:    (settings.duration ?? TIMER_MS / 1000) * 1000,
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

  async function createRoom({ isPublic = false, settings } = {}) {
    if (!user) return null
    const code = generateCode()
    const phase_data = settings
      ? { settings: { ...DEFAULT_RACE_SETTINGS, ...settings } }
      : {}
    const { data, error } = await supabase
      .from('race_rooms').insert({ code, host_id: user.id, is_public: isPublic, phase_data }).select().single()
    if (error || !data) return null
    await supabase.from('race_participants').insert({ room_id: data.id, profile_id: user.id })
    return data.code
  }

  // Matchmaking : rejoint un salon public ouvert, ou en crée un si aucun n'est dispo.
  // Aucun code n'est requis — n'importe quel joueur connecté peut entrer.
  async function joinPublicRoom() {
    if (!user) return { error: 'Non connecté' }

    // Salons publics encore en lobby, créés il y a moins de 30 min
    const since = new Date(Date.now() - 30 * 60 * 1000).toISOString()
    const { data: rooms } = await supabase
      .from('race_rooms')
      .select('*')
      .eq('is_public', true)
      .eq('phase', 'lobby')
      .gte('created_at', since)
      .order('created_at', { ascending: true })

    if (rooms?.length) {
      const ids = rooms.map(r => r.id)
      const { data: parts } = await supabase
        .from('race_participants')
        .select('room_id, profile_id')
        .in('room_id', ids)

      const byRoom = {}
      for (const p of (parts ?? [])) (byRoom[p.room_id] ??= []).push(p.profile_id)

      for (const r of rooms) {
        const members = byRoom[r.id] ?? []
        if (members.includes(user.id)) return { code: r.code }        // déjà dedans
        // L'hôte doit toujours être présent (seul lui peut lancer/avancer via RLS)
        const hostPresent = members.includes(r.host_id)
        if (hostPresent && members.length < RACE_MAX_PLAYERS) {
          const { error } = await supabase
            .from('race_participants').insert({ room_id: r.id, profile_id: user.id })
          if (!error) return { code: r.code }
        }
      }
    }

    // Aucun salon dispo → on en crée un (le joueur en devient l'hôte)
    const code = await createRoom({ isPublic: true })
    if (!code) return { error: 'Erreur lors de la création du salon.' }
    return { code }
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
    submitAnswer, hostAdvance, startGame, createRoom, joinRoom, joinPublicRoom,
  }
}
