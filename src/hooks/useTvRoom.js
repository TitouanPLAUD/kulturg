import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../context/AuthContext.jsx'
import { QUESTIONS as ALL_QUESTIONS } from '../data/questions.js'
import { PERSONALITIES } from '../data/personalities.js'
import { ETOILES } from '../data/etoiles.js'

// ─── Phases du jeu (ordre officiel) ─────────────────────────
export const PHASES = ['lobby','grand_oral','duel','coup_de_maitre','etoile_mysterieuse','sprint_12_coups','finished']

// ─── Gains en € ─────────────────────────────────────────────
export function gainForAnswer(phase, isCorrect, timeMs, qIdx = 0) {
  if (!isCorrect) return 0
  if (phase === 'grand_oral')        return 500 + (timeMs < 8000 ? 200 : 0)
  if (phase === 'duel')              return 800   // only for the first-correct winner
  if (phase === 'coup_de_maitre')    return Math.max(200, 1000 - qIdx * 200)
  if (phase === 'etoile_quiz')       return 300
  if (phase === 'etoile_guess')      return 2000
  if (phase === 'sprint_12_coups')   return 400
  return 0
}

// Calcul du gain total de tous les joueurs (pour prize pool)
export function computePrizePool(answers) {
  let total = 0
  const duelWinners = new Map() // q_idx → first correct profile_id
  for (const a of answers) {
    if (!a.is_correct) continue
    if (a.phase === 'duel') {
      if (!duelWinners.has(a.q_idx)) duelWinners.set(a.q_idx, a.profile_id)
      if (duelWinners.get(a.q_idx) === a.profile_id) total += 800
    } else {
      total += gainForAnswer(a.phase, true, a.time_ms ?? 15000, a.q_idx)
    }
  }
  return total
}

// ─── Helpers ─────────────────────────────────────────────────
function pick(arr, n) {
  return [...arr].sort(() => Math.random() - 0.5).slice(0, n)
}

function pickPersonality() {
  const p = PERSONALITIES[Math.floor(Math.random() * PERSONALITIES.length)]
  const decoys = PERSONALITIES.filter(x => x.id !== p.id).sort(() => Math.random() - 0.5).slice(0, 3).map(x => x.name)
  const choices = [...decoys, p.name].sort(() => Math.random() - 0.5)
  return { ...p, choices, answer: choices.indexOf(p.name) }
}

function pickEtoile() {
  const e = ETOILES[Math.floor(Math.random() * ETOILES.length)]
  const decoys = ETOILES.filter(x => x.id !== e.id).sort(() => Math.random() - 0.5).slice(0, 3).map(x => x.name)
  const choices = [...decoys, e.name].sort(() => Math.random() - 0.5)
  return { ...e, choices, answer: choices.indexOf(e.name) }
}

function generateCode() {
  const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => c[Math.floor(Math.random() * c.length)]).join('')
}

// ─── Hook ────────────────────────────────────────────────────
export function useTvRoom(code) {
  const { user } = useAuth()
  const [room, setRoom]                 = useState(null)
  const [participants, setParticipants] = useState([])
  const [answers, setAnswers]           = useState([])
  const [loading, setLoading]           = useState(true)
  const channelRef = useRef(null)
  const roomIdRef  = useRef(null)

  const isHost = room?.host_id === user?.id

  const loadParticipants = useCallback(async (roomId) => {
    const { data } = await supabase
      .from('tv_participants')
      .select('*, profile:profile_id(id, nickname, avatar)')
      .eq('room_id', roomId)
    setParticipants(data ?? [])
  }, [])

  useEffect(() => {
    if (!code) { setLoading(false); return }
    let mounted = true
    ;(async () => {
      const { data: r } = await supabase.from('tv_rooms').select('*').eq('code', code).single()
      if (!mounted) return
      if (!r) { setLoading(false); return }
      roomIdRef.current = r.id
      setRoom(r)
      const [, { data: ans }] = await Promise.all([
        loadParticipants(r.id),
        supabase.from('tv_answers').select('*').eq('room_id', r.id),
      ])
      if (!mounted) return
      setAnswers(ans ?? [])
      setLoading(false)

      channelRef.current = supabase.channel(`tv-${r.id}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tv_rooms' },
          ({ new: u }) => { if (u.id === r.id && mounted) setRoom(u) })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tv_participants' },
          ({ new: row }) => { if (row?.room_id === r.id && mounted) loadParticipants(r.id) })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tv_participants' },
          ({ new: row }) => { if (row?.room_id === r.id && mounted) loadParticipants(r.id) })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tv_answers' },
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

  // ── Soumettre une réponse ─────────────────────────────────
  async function submitAnswer({ phase, q_idx, answer_idx, is_correct, time_ms }) {
    if (!user || !room) return
    await supabase.from('tv_answers').upsert(
      { room_id: room.id, profile_id: user.id, phase, q_idx, answer_idx, is_correct, time_ms },
      { onConflict: 'room_id,profile_id,phase,q_idx' }
    )
  }

  // ── Mettre à jour la salle (hôte uniquement) ──────────────
  async function updateRoom(patch) {
    if (!room) return
    const { data } = await supabase.from('tv_rooms').update(patch).eq('id', room.id).select().single()
    if (data) setRoom(data)
  }

  // ── Lancer la partie ──────────────────────────────────────
  async function startGame() {
    if (!isHost) return
    await updateRoom({
      phase: 'grand_oral',
      phase_data: {
        questions_grand_oral:   pick(ALL_QUESTIONS, 6),
        questions_duel:         pick(ALL_QUESTIONS, 6),
        personality:            pickPersonality(),
        etoile:                 pickEtoile(),
        etoile_quiz:            pick(ALL_QUESTIONS, 4),
        questions_sprint:       pick(ALL_QUESTIONS, 12),
        q_idx:      0,
        clue_idx:   0,
        q_start_at: new Date().toISOString(),
      },
    })
  }

  // ── Avancer (hôte) ────────────────────────────────────────
  async function hostAdvance() {
    if (!isHost || !room) return
    const pd   = room.phase_data
    const phase = room.phase

    const LIMITS = {
      grand_oral:       pd.questions_grand_oral?.length  - 1,
      duel:             pd.questions_duel?.length        - 1,
      etoile_quiz:      pd.etoile_quiz?.length           - 1,
      sprint_12_coups:  pd.questions_sprint?.length      - 1,
    }

    function next(nextPhase, extra = {}) {
      return updateRoom({ phase: nextPhase, phase_data: { ...pd, q_idx: 0, clue_idx: 0, q_start_at: new Date().toISOString(), ...extra } })
    }
    function nextQ() {
      return updateRoom({ phase_data: { ...pd, q_idx: pd.q_idx + 1, q_start_at: new Date().toISOString() } })
    }

    if (phase === 'grand_oral') {
      return pd.q_idx < LIMITS.grand_oral ? nextQ() : next('duel')
    }
    if (phase === 'duel') {
      return pd.q_idx < LIMITS.duel ? nextQ() : next('coup_de_maitre')
    }
    if (phase === 'coup_de_maitre') {
      const allAnswered = participants.every(p =>
        answers.some(a => a.phase === 'coup_de_maitre' && a.profile_id === p.profile_id && a.q_idx === pd.clue_idx))
      const nextClue = pd.clue_idx + 1
      const maxClues = pd.personality?.clues?.length ?? 5
      if (!allAnswered && nextClue < maxClues) {
        return updateRoom({ phase_data: { ...pd, clue_idx: nextClue, q_start_at: new Date().toISOString() } })
      }
      return next('etoile_quiz')
    }
    if (phase === 'etoile_quiz') {
      return pd.q_idx < LIMITS.etoile_quiz ? nextQ() : next('etoile_guess')
    }
    if (phase === 'etoile_guess') {
      return next('sprint_12_coups')
    }
    if (phase === 'sprint_12_coups') {
      if (pd.q_idx < LIMITS.sprint_12_coups) return nextQ()
      // Tally final scores
      await tallyAllScores()
      return updateRoom({ phase: 'finished', phase_data: pd })
    }
  }

  // ── Calculer et persister les scores finaux ───────────────
  async function tallyAllScores() {
    const duelWinners = new Map()
    for (const a of answers.filter(x => x.phase === 'duel' && x.is_correct)) {
      if (!duelWinners.has(a.q_idx)) duelWinners.set(a.q_idx, a.profile_id)
    }
    for (const p of participants) {
      const mine = answers.filter(a => a.profile_id === p.profile_id)
      let total = 0
      for (const a of mine) {
        if (!a.is_correct) continue
        if (a.phase === 'duel') {
          if (duelWinners.get(a.q_idx) === p.profile_id) total += 800
        } else {
          total += gainForAnswer(a.phase, true, a.time_ms ?? 15000, a.q_idx)
        }
      }
      if (total > 0) await supabase.from('tv_participants').update({ score: total }).eq('id', p.id)
    }
  }

  // ── Créer une salle ───────────────────────────────────────
  async function createRoom() {
    if (!user) return null
    const code = generateCode()
    const { data, error } = await supabase.from('tv_rooms').insert({ code, host_id: user.id }).select().single()
    if (error || !data) return null
    await supabase.from('tv_participants').insert({ room_id: data.id, profile_id: user.id })
    return data.code
  }

  // ── Rejoindre une salle ───────────────────────────────────
  async function joinRoom(roomCode) {
    if (!user) return { error: 'Non connecté' }
    const { data: r } = await supabase.from('tv_rooms').select('*').eq('code', roomCode.toUpperCase()).single()
    if (!r) return { error: 'Salle introuvable' }
    if (r.phase !== 'lobby') return { error: 'Partie déjà commencée' }
    const { data: existing } = await supabase.from('tv_participants').select('id').eq('room_id', r.id).eq('profile_id', user.id).single()
    if (!existing) {
      const { data: all } = await supabase.from('tv_participants').select('id').eq('room_id', r.id)
      if ((all?.length ?? 0) >= 4) return { error: 'Salle pleine (4 joueurs max)' }
      await supabase.from('tv_participants').insert({ room_id: r.id, profile_id: user.id })
    }
    return { code: r.code }
  }

  return {
    room, participants, answers, loading, isHost,
    myAnswers: answers.filter(a => a.profile_id === user?.id),
    submitAnswer, hostAdvance, startGame, createRoom, joinRoom,
  }
}
