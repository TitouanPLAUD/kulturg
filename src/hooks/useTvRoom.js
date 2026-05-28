import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../context/AuthContext.jsx'
import { QUESTIONS as ALL_QUESTIONS } from '../data/questions.js'
import { PERSONALITIES } from '../data/personalities.js'

// ─── Phases officielles ───────────────────────────────────────
export const PHASES = [
  'lobby',
  'coup_envoi',        // 4 → 3 joueurs : questions + rouge + duel
  'coup_par_coup',     // 3 → 2 joueurs : idem
  'coup_fatal',        // 2 → 1 joueur  : chronomètre / coups
  'coup_de_maitre',    // solo : 5 questions, dévoile l'étoile
  'etoile_mysterieuse',// solo : deviner la personnalité
  'finished',
]

// Capacité d'une salle TV
export const TV_MAX_PLAYERS = 4
export const TV_REQUIRED_PLAYERS = TV_MAX_PLAYERS // requis pour démarrer

// Gains du Coup de Maître (cumulatif par question réussie)
const CDM_GAINS = [500, 1000, 1500, 2000, 5000]

export function gainForAnswer(phase, isCorrect, _timeMs, qIdx = 0) {
  if (!isCorrect) return 0
  if (phase === 'coup_de_maitre') return CDM_GAINS[qIdx] ?? 0
  if (phase === 'etoile_mysterieuse') return 10000
  return 0
}

export function computeMaitreScore(answers, maitreId) {
  return answers
    .filter(a => a.profile_id === maitreId && a.phase === 'coup_de_maitre' && a.is_correct)
    .reduce((sum, a) => sum + (CDM_GAINS[a.q_idx] ?? 0), 0)
}

// computePrizePool gardé pour compatibilité TopBar
export function computePrizePool(answers) {
  return answers
    .filter(a => a.phase === 'coup_de_maitre' && a.is_correct)
    .reduce((sum, a) => sum + (CDM_GAINS[a.q_idx] ?? 0), 0)
}

// ─── Helpers ─────────────────────────────────────────────────
function rnd(arr, n) {
  return [...arr].sort(() => Math.random() - 0.5).slice(0, n)
}

function pickPersonality() {
  const p = PERSONALITIES[Math.floor(Math.random() * PERSONALITIES.length)]
  const decoys = PERSONALITIES
    .filter(x => x.id !== p.id)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3)
    .map(x => x.name)
  const choices = [...decoys, p.name].sort(() => Math.random() - 0.5)
  return { ...p, choices, answer: choices.indexOf(p.name) }
}

function generateCode() {
  const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => c[Math.floor(Math.random() * c.length)]).join('')
}

// Construit la phase_data d'une manche battle (envoi / par_coup)
function makeBattleData(activeIds, questions, duelQuestion, eliminated = []) {
  return {
    subphase:        'question',
    active_players:  activeIds,
    eliminated,
    champion_id:     activeIds[0],
    wrong_counts:    Object.fromEntries(activeIds.map(id => [id, 0])),
    rouge_player_id: null,
    duel_vs_id:      null,
    questions,
    duel_question:   duelQuestion,
    q_idx:           0,
    q_start_at:      new Date().toISOString(),
  }
}

// ─── Hook ─────────────────────────────────────────────────────
export function useTvRoom(code) {
  const { user } = useAuth()
  const [room, setRoom]               = useState(null)
  const [participants, setParticipants] = useState([])
  const [answers, setAnswers]         = useState([])
  const [loading, setLoading]         = useState(true)
  const channelRef       = useRef(null)
  const gameStartedAtRef = useRef(null) // Détecte le démarrage d'une nouvelle partie

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
      setRoom(r)
      const [, { data: ans }] = await Promise.all([
        loadParticipants(r.id),
        supabase.from('tv_answers').select('*').eq('room_id', r.id),
      ])
      if (!mounted) return
      setAnswers(ans ?? [])
      setLoading(false)

      // Initialiser le curseur game_started_at avec l'état actuel
      gameStartedAtRef.current = r.phase_data?.game_started_at ?? null

      channelRef.current = supabase.channel(`tv-${r.id}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tv_rooms' },
          ({ new: u }) => {
            if (u.id === r.id && mounted) {
              // Nouvelle partie détectée → vider les réponses obsolètes
              const newGSA = u.phase_data?.game_started_at
              if (newGSA && newGSA !== gameStartedAtRef.current) {
                gameStartedAtRef.current = newGSA
                setAnswers([])
              }
              setRoom(u)
            }
          })
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

  async function updateRoom(patch) {
    if (!room) return
    const { data } = await supabase.from('tv_rooms').update(patch).eq('id', room.id).select().single()
    if (data) setRoom(data)
  }

  // ── Lancer la partie ──────────────────────────────────────
  async function startGame() {
    if (!isHost) return
    const activeIds = participants.map(p => p.profile_id)
    // On exige la salle complète (4/4)
    if (activeIds.length < TV_REQUIRED_PLAYERS) return

    // Purger les réponses d'une éventuelle partie précédente dans cette salle
    await supabase.from('tv_answers').delete().eq('room_id', room.id)
    setAnswers([]) // Vider l'état local de l'hôte immédiatement

    const game_started_at = new Date().toISOString()

    // 4 joueurs → jeu complet (le seul cas autorisé)
    // game_started_at est diffusé à tous les clients → ils vident leur état local
    return updateRoom({
      phase:      'coup_envoi',
      phase_data: {
        ...makeBattleData(activeIds, rnd(ALL_QUESTIONS, 20), rnd(ALL_QUESTIONS, 1)[0]),
        game_started_at,
      },
    })
  }

  // ── Avancer (hôte uniquement) ─────────────────────────────
  async function hostAdvance() {
    if (!isHost || !room) return
    const pd    = room.phase_data
    const phase = room.phase

    // ── MANCHES BATTLE ─────────────────────────────────────
    if (phase === 'coup_envoi' || phase === 'coup_par_coup') {
      const duelPhase = phase + '_duel'

      // ── Résolution du duel ──────────────────────────────
      if (pd.subphase === 'duel') {
        const duelAnswers = answers.filter(a =>
          a.phase === duelPhase &&
          (a.profile_id === pd.rouge_player_id || a.profile_id === pd.duel_vs_id)
        )
        const firstCorrect = duelAnswers
          .filter(a => a.is_correct)
          .sort((a, b) => new Date(a.answered_at) - new Date(b.answered_at))[0]

        // Le champion gagne par défaut si personne n'a bon
        const winner_id = firstCorrect?.profile_id ?? pd.duel_vs_id
        const loser_id  = [pd.rouge_player_id, pd.duel_vs_id].find(id => id !== winner_id)

        const newActive    = (pd.active_players ?? []).filter(id => id !== loser_id)
        const newEliminated = [...(pd.eliminated ?? []), loser_id]

        // Coup envoi → coup par coup (4→3)
        if (phase === 'coup_envoi' && newActive.length === 3) {
          return updateRoom({
            phase:      'coup_par_coup',
            phase_data: makeBattleData(newActive, rnd(ALL_QUESTIONS, 20), rnd(ALL_QUESTIONS, 1)[0], newEliminated),
          })
        }
        // 2 restants → coup fatal
        if (newActive.length === 2) {
          return updateRoom({
            phase: 'coup_fatal',
            phase_data: {
              active_players: newActive,
              eliminated:     newEliminated,
              champion_id:    winner_id,
              coups:          Object.fromEntries(newActive.map(id => [id, 12])),
              questions:      rnd(ALL_QUESTIONS, 15),
              q_idx:          0,
              q_start_at:     new Date().toISOString(),
            },
          })
        }
        // Retour question (cas edge avec plus de joueurs)
        const newWrong = Object.fromEntries(newActive.map(id => [id, id === winner_id ? 0 : (pd.wrong_counts?.[id] ?? 0)]))
        return updateRoom({
          phase_data: {
            ...pd, subphase: 'question', champion_id: winner_id,
            wrong_counts: newWrong, rouge_player_id: null, duel_vs_id: null,
            active_players: newActive, eliminated: newEliminated,
            q_start_at: new Date().toISOString(),
          },
        })
      }

      // ── Question normale ───────────────────────────────
      const qAnswers = answers.filter(a => a.phase === phase && a.q_idx === pd.q_idx)
      const newWrong = { ...(pd.wrong_counts ?? {}) }
      for (const pid of (pd.active_players ?? [])) {
        const ans = qAnswers.find(a => a.profile_id === pid)
        if (ans && !ans.is_correct) newWrong[pid] = (newWrong[pid] ?? 0) + 1
      }

      // Quelqu'un est au rouge ?
      const rougePlayer = (pd.active_players ?? []).find(pid => newWrong[pid] >= 2)
      if (rougePlayer) {
        const vs_id = pd.champion_id === rougePlayer
          ? (pd.active_players.find(id => id !== rougePlayer) ?? null)
          : pd.champion_id
        return updateRoom({
          phase_data: {
            ...pd, wrong_counts: newWrong, subphase: 'duel',
            rouge_player_id: rougePlayer, duel_vs_id: vs_id,
            q_start_at: new Date().toISOString(),
          },
        })
      }

      // Question suivante
      const nextIdx = pd.q_idx + 1
      if (nextIdx < (pd.questions ?? []).length) {
        return updateRoom({
          phase_data: { ...pd, wrong_counts: newWrong, q_idx: nextIdx, q_start_at: new Date().toISOString() },
        })
      }

      // Plus de questions → élimination forcée du plus mauvais
      const sorted  = [...(pd.active_players ?? [])].sort((a, b) => (newWrong[b] ?? 0) - (newWrong[a] ?? 0))
      const forcedLoser = sorted[0]
      const newActive   = (pd.active_players ?? []).filter(id => id !== forcedLoser)
      const newEliminated = [...(pd.eliminated ?? []), forcedLoser]

      if (phase === 'coup_envoi' && newActive.length === 3) {
        return updateRoom({
          phase:      'coup_par_coup',
          phase_data: makeBattleData(newActive, rnd(ALL_QUESTIONS, 20), rnd(ALL_QUESTIONS, 1)[0], newEliminated),
        })
      }
      return updateRoom({
        phase: 'coup_fatal',
        phase_data: {
          active_players: newActive,
          eliminated:     newEliminated,
          champion_id:    newActive[0],
          coups:          Object.fromEntries(newActive.map(id => [id, 12])),
          questions:      rnd(ALL_QUESTIONS, 15),
          q_idx:          0,
          q_start_at:     new Date().toISOString(),
        },
      })
    }

    // ── COUP FATAL ─────────────────────────────────────────
    if (phase === 'coup_fatal') {
      const qAnswers = answers.filter(a => a.phase === 'coup_fatal' && a.q_idx === pd.q_idx)
      const newCoups = { ...(pd.coups ?? {}) }

      for (const pid of (pd.active_players ?? [])) {
        const ans = qAnswers.find(a => a.profile_id === pid)
        if (!ans) {
          // Pas de réponse (timeout) → perd 1 coup
          newCoups[pid] = Math.max(0, (newCoups[pid] ?? 12) - 1)
        } else if (!ans.is_correct) {
          // Mauvaise réponse → perd 2 coups
          newCoups[pid] = Math.max(0, (newCoups[pid] ?? 12) - 2)
        } else {
          // Bonne réponse → adversaire perd 1 coup
          const opp = pd.active_players.find(id => id !== pid)
          if (opp) newCoups[opp] = Math.max(0, (newCoups[opp] ?? 12) - 1)
        }
      }

      const goToCDM = (winnerId, loserId) =>
        updateRoom({
          phase: 'coup_de_maitre',
          phase_data: {
            maitre_id:     winnerId,
            eliminated:    [...(pd.eliminated ?? []), loserId],
            questions:     rnd(ALL_QUESTIONS, 5),
            personality:   pickPersonality(),
            q_idx:         0,
            correct_count: 0,
            score:         0,
            q_start_at:    new Date().toISOString(),
          },
        })

      const eliminated = (pd.active_players ?? []).find(pid => newCoups[pid] <= 0)
      if (eliminated) {
        const winner = pd.active_players.find(id => id !== eliminated)
        return goToCDM(winner, eliminated)
      }

      const nextIdx = pd.q_idx + 1
      if (nextIdx < (pd.questions ?? []).length) {
        return updateRoom({ phase_data: { ...pd, coups: newCoups, q_idx: nextIdx, q_start_at: new Date().toISOString() } })
      }

      // Plus de questions : le joueur avec le moins de coups perd
      const [p1, p2] = pd.active_players ?? []
      const loserId  = (newCoups[p1] ?? 0) <= (newCoups[p2] ?? 0) ? p1 : p2
      const winnerId = pd.active_players.find(id => id !== loserId)
      return goToCDM(winnerId, loserId)
    }

    // ── COUP DE MAÎTRE ─────────────────────────────────────
    if (phase === 'coup_de_maitre') {
      const myAns      = answers.find(a => a.phase === 'coup_de_maitre' && a.q_idx === pd.q_idx && a.profile_id === pd.maitre_id)
      const isCorrect  = myAns?.is_correct ?? false
      const newCorrect = (pd.correct_count ?? 0) + (isCorrect ? 1 : 0)
      const newScore   = (pd.score ?? 0) + (isCorrect ? (CDM_GAINS[pd.q_idx] ?? 0) : 0)
      const nextIdx    = pd.q_idx + 1

      if (nextIdx < 5) {
        return updateRoom({
          phase_data: { ...pd, q_idx: nextIdx, correct_count: newCorrect, score: newScore, q_start_at: new Date().toISOString() },
        })
      }

      // 5 bonnes réponses → étoile mystérieuse
      if (newCorrect === 5) {
        return updateRoom({
          phase: 'etoile_mysterieuse',
          phase_data: {
            maitre_id:   pd.maitre_id,
            eliminated:  pd.eliminated,
            personality: pd.personality,   // même personnalité à deviner
            score:       newScore,
            q_start_at:  new Date().toISOString(),
          },
        })
      }

      // Pas parfait → terminé
      await saveMaitreScore(pd.maitre_id, newScore)
      return updateRoom({ phase: 'finished', phase_data: { ...pd, correct_count: newCorrect, score: newScore } })
    }

    // ── ÉTOILE MYSTÉRIEUSE ─────────────────────────────────
    if (phase === 'etoile_mysterieuse') {
      const myAns     = answers.find(a => a.phase === 'etoile_mysterieuse' && a.profile_id === pd.maitre_id)
      const isCorrect = myAns?.is_correct ?? false
      const final     = (pd.score ?? 0) + (isCorrect ? 10000 : 0)
      await saveMaitreScore(pd.maitre_id, final)
      return updateRoom({ phase: 'finished', phase_data: { ...pd, etoile_correct: isCorrect, final_score: final } })
    }
  }

  async function saveMaitreScore(maitreId, score) {
    const p = participants.find(x => x.profile_id === maitreId)
    if (p && score > 0) await supabase.from('tv_participants').update({ score }).eq('id', p.id)
  }

  // ── Créer / rejoindre ─────────────────────────────────────
  async function createRoom() {
    if (!user) return null
    const code = generateCode()
    const { data, error } = await supabase.from('tv_rooms').insert({ code, host_id: user.id }).select().single()
    if (error || !data) return null
    await supabase.from('tv_participants').insert({ room_id: data.id, profile_id: user.id })
    return data.code
  }

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
