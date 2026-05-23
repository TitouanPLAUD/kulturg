import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../context/AuthContext.jsx'
import { QUESTIONS as ALL_QUESTIONS } from '../data/questions.js'
import { PERSONALITIES } from '../data/personalities.js'

// ─── Scoring ────────────────────────────────────────────────
export function scoreForAnswer(phase, isCorrect, timeSec, clueIdx = 0) {
  if (!isCorrect) return 0
  if (phase === 'tour_chauffe') {
    return 300 + (timeSec < 5 ? 100 : 0)
  }
  if (phase === 'coup_de_maitre') {
    return Math.max(100, (5 - clueIdx) * 100 + 100) // 600→200 based on clue
  }
  if (phase === 'sprint_final') {
    return 200 + (timeSec < 3 ? 100 : 0)
  }
  return 0
}

// ─── Question selection ──────────────────────────────────────
function pickQuestions(n) {
  const shuffled = [...ALL_QUESTIONS].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, n)
}

function pickPersonality() {
  const p = PERSONALITIES[Math.floor(Math.random() * PERSONALITIES.length)]
  // Build 4 MCQ choices: correct + 3 decoys
  const decoys = PERSONALITIES
    .filter(x => x.id !== p.id)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3)
    .map(x => x.name)
  const choices = [...decoys, p.name].sort(() => Math.random() - 0.5)
  const answer = choices.indexOf(p.name)
  return { ...p, choices, answer }
}

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

// ─── Hook ────────────────────────────────────────────────────
export function useTvRoom(code) {
  const { user } = useAuth()
  const [room, setRoom]               = useState(null)
  const [participants, setParticipants] = useState([])
  const [answers, setAnswers]         = useState([])
  const [loading, setLoading]         = useState(true)
  const channelRef = useRef(null)

  const isHost = room?.host_id === user?.id

  // ── Load ─────────────────────────────────────────────────
  const loadRoom = useCallback(async () => {
    const { data } = await supabase
      .from('tv_rooms').select('*').eq('code', code).single()
    if (data) setRoom(data)
    return data
  }, [code])

  const loadParticipants = useCallback(async (roomId) => {
    const { data } = await supabase
      .from('tv_participants')
      .select('*, profile:profile_id(id, nickname, avatar)')
      .eq('room_id', roomId)
    setParticipants(data ?? [])
  }, [])

  const loadAnswers = useCallback(async (roomId) => {
    const { data } = await supabase
      .from('tv_answers').select('*').eq('room_id', roomId)
    setAnswers(data ?? [])
  }, [])

  useEffect(() => {
    let roomId
    ;(async () => {
      const r = await loadRoom()
      if (!r) { setLoading(false); return }
      roomId = r.id
      await Promise.all([loadParticipants(r.id), loadAnswers(r.id)])
      setLoading(false)

      // ── Realtime ────────────────────────────────────────
      channelRef.current = supabase.channel(`tv-${r.id}`)
        .on('postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'tv_rooms', filter: `id=eq.${r.id}` },
          ({ new: updated }) => setRoom(updated))
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'tv_participants', filter: `room_id=eq.${r.id}` },
          () => loadParticipants(r.id))
        .on('postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'tv_participants', filter: `room_id=eq.${r.id}` },
          () => loadParticipants(r.id))
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'tv_answers', filter: `room_id=eq.${r.id}` },
          ({ new: ans }) => setAnswers(prev => [...prev.filter(a => a.id !== ans.id), ans]))
        .subscribe()
    })()

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current)
    }
  }, [code, loadRoom, loadParticipants, loadAnswers])

  // ── Computed ─────────────────────────────────────────────
  const scores = useMemo(() => {
    const map = {}
    for (const p of participants) {
      map[p.profile_id] = p.score
    }
    return map
  }, [participants])

  // ── Actions ──────────────────────────────────────────────
  async function submitAnswer({ phase, q_idx, answer_idx, is_correct, time_ms }) {
    if (!user || !room) return
    await supabase.from('tv_answers').upsert({
      room_id: room.id,
      profile_id: user.id,
      phase,
      q_idx,
      answer_idx,
      is_correct,
      time_ms,
    }, { onConflict: 'room_id,profile_id,phase,q_idx' })
  }

  // Host: update room phase/data
  async function updateRoom(patch) {
    if (!room) return
    const { data } = await supabase
      .from('tv_rooms').update(patch).eq('id', room.id).select().single()
    if (data) setRoom(data)
  }

  // Host: start the game
  async function startGame() {
    const personality = pickPersonality()
    const questions_tour   = pickQuestions(5)
    const questions_sprint = pickQuestions(8)
    await updateRoom({
      phase: 'tour_chauffe',
      phase_data: {
        questions_tour,
        questions_sprint,
        personality,
        q_idx: 0,
        q_start_at: new Date().toISOString(),
        clue_idx: 0,
      },
    })
  }

  // Host: advance to next question or phase
  async function advanceQuestion(currentPhase) {
    if (!isHost || !room) return
    const pd = room.phase_data
    const questions = currentPhase === 'tour_chauffe' ? pd.questions_tour : pd.questions_sprint
    const nextIdx = (pd.q_idx ?? 0) + 1

    if (nextIdx < questions.length) {
      await updateRoom({
        phase_data: { ...pd, q_idx: nextIdx, q_start_at: new Date().toISOString() },
      })
    } else {
      // Tally scores before moving to next phase
      await tallyScores(currentPhase)
      const nextPhase = currentPhase === 'tour_chauffe' ? 'coup_de_maitre' : 'finished'
      await updateRoom({
        phase: nextPhase,
        phase_data: {
          ...pd,
          q_idx: 0,
          clue_idx: 0,
          q_start_at: new Date().toISOString(),
        },
      })
    }
  }

  // Host: reveal next clue
  async function advanceClue() {
    if (!isHost || !room) return
    const pd = room.phase_data
    const nextClue = (pd.clue_idx ?? 0) + 1
    if (nextClue >= (pd.personality?.clues?.length ?? 5)) {
      await tallyScores('coup_de_maitre')
      await updateRoom({
        phase: 'sprint_final',
        phase_data: { ...pd, q_idx: 0, q_start_at: new Date().toISOString() },
      })
    } else {
      await updateRoom({
        phase_data: { ...pd, clue_idx: nextClue, q_start_at: new Date().toISOString() },
      })
    }
  }

  // Compute and persist scores for a finished phase
  async function tallyScores(phase) {
    const pd = room.phase_data
    const phaseAnswers = answers.filter(a => a.phase === phase)
    for (const p of participants) {
      const myAnswers = phaseAnswers.filter(a => a.profile_id === p.profile_id)
      let delta = 0
      for (const a of myAnswers) {
        const timeSec = (a.time_ms ?? 15000) / 1000
        const clueIdx = phase === 'coup_de_maitre'
          ? (answers.find(x => x.profile_id === a.profile_id && x.phase === 'coup_de_maitre')?.q_idx ?? 0)
          : 0
        delta += scoreForAnswer(phase, a.is_correct, timeSec, clueIdx)
      }
      if (delta > 0) {
        await supabase
          .from('tv_participants')
          .update({ score: (p.score ?? 0) + delta })
          .eq('id', p.id)
      }
    }
  }

  // Create a new room
  async function createRoom() {
    if (!user) return null
    const code = generateCode()
    const { data, error } = await supabase
      .from('tv_rooms')
      .insert({ code, host_id: user.id })
      .select().single()
    if (error || !data) return null
    // Auto-join as participant
    await supabase.from('tv_participants').insert({
      room_id: data.id,
      profile_id: user.id,
    })
    return data.code
  }

  // Join existing room
  async function joinRoom(roomCode) {
    if (!user) return { error: 'Non connecté' }
    const { data: r } = await supabase
      .from('tv_rooms').select('*').eq('code', roomCode.toUpperCase()).single()
    if (!r) return { error: 'Salle introuvable' }
    if (r.phase !== 'lobby') return { error: 'Partie déjà commencée' }
    const { data: existing } = await supabase
      .from('tv_participants')
      .select('id').eq('room_id', r.id).eq('profile_id', user.id).single()
    if (!existing) {
      const { data: all } = await supabase
        .from('tv_participants').select('id').eq('room_id', r.id)
      if ((all?.length ?? 0) >= 4) return { error: 'Salle pleine (4 joueurs max)' }
      await supabase.from('tv_participants').insert({ room_id: r.id, profile_id: user.id })
    }
    return { code: r.code }
  }

  return {
    room, participants, answers, scores, loading, isHost,
    submitAnswer, startGame, advanceQuestion, advanceClue,
    createRoom, joinRoom,
    myAnswers: answers.filter(a => a.profile_id === user?.id),
  }
}
