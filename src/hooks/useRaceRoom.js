import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../context/AuthContext.jsx'
import { QUESTIONS as ALL_QUESTIONS } from '../data/questions.js'
import { getCommunityQuestions } from '../data/communityQuestions.js'
import { ELO_START } from '../utils/elo.js'

export const RACE_MAX_PLAYERS = 15
export const RACE_MIN_PLAYERS = 2
export const Q_COUNT          = 15      // nombre de questions par défaut
export const TIMER_MS         = 20000   // durée par question par défaut (ms)

// ── Questions « liste » (citer le plus de réponses) ──
export const LIST_TIMER_MS    = 30000   // 30 s pour ce type
export const LIST_POINT_PER   = 2       // points par bonne réponse citée
export const LIST_RANK_BONUS  = [10, 5, 3] // bonus pour les 3 joueurs avec le plus de bonnes réponses

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
  count:      15,     // nombre de questions
}

// Points par rang de réponse correcte
export const POINTS = [5, 3, 2, 1] // 1er, 2e, 3e, reste

// ── Bonus de série ────────────────────────────────────────────
// À partir de STREAK_THRESHOLD bonnes réponses d'affilée, chaque bonne
// réponse rapporte un bonus croissant, plafonné à STREAK_MAX_BONUS.
//   série 1-2 → +0 · série 3 → +1 · série 4 → +2 · série 5+ → +3
// Une mauvaise réponse (ou une question ratée) remet la série à zéro.
export const STREAK_THRESHOLD = 3
export const STREAK_MAX_BONUS = 3

export function streakBonus(streak) {
  if (streak < STREAK_THRESHOLD) return 0
  return Math.min(streak - (STREAK_THRESHOLD - 1), STREAK_MAX_BONUS)
}

// Longueur de la série de bonnes réponses d'affilée d'un joueur,
// après avoir traité les questions 0..upToQIdx (incluse).
export function computePlayerStreak(answers, profile_id, upToQIdx) {
  let streak = 0
  for (let q = 0; q <= upToQIdx; q++) {
    const correct = answers.some(a => a.profile_id === profile_id && a.q_idx === q && a.is_correct)
    streak = correct ? streak + 1 : 0
  }
  return streak
}

// Série courante de chaque joueur : { [profile_id]: streak }
export function computeStreaks(answers, q_count) {
  const players = [...new Set(answers.map(a => a.profile_id))]
  const map = {}
  for (const pid of players) map[pid] = computePlayerStreak(answers, pid, q_count - 1)
  return map
}

function pick(arr, n) {
  return [...arr].sort(() => Math.random() - 0.5).slice(0, n)
}

// Sélectionne les questions selon les réglages (thèmes / difficulté / nombre).
// Pour la Course aux Points, on équilibre les 3 types (QCM / réponse libre /
// classement) et on les alterne pour varier le rythme.
function pickQuestions(settings) {
  const s = { ...DEFAULT_RACE_SETTINGS, ...(settings ?? {}) }
  let pool = [...ALL_QUESTIONS, ...getCommunityQuestions()]

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

  const target = Math.min(s.count ?? Q_COUNT, pool.length)

  // Réserves par type, déjà mélangées
  const buckets = {
    order: pick(pool.filter(q => q.type === 'order'), pool.length),
    open:  pick(pool.filter(q => q.type === 'open'),  pool.length),
    mcq:   pick(pool.filter(q => !q.type && Array.isArray(q.choices)), pool.length),
  }
  // Curseurs de consommation
  const idx = { order: 0, open: 0, mcq: 0 }

  // Tirage round-robin équilibré, dans un ordre alterné mcq → open → order
  const sequence = ['mcq', 'open', 'order']
  const result = []
  let guard = 0
  while (result.length < target && guard < target * 4) {
    const t = sequence[guard % sequence.length]
    guard++
    if (idx[t] < buckets[t].length) {
      result.push(buckets[t][idx[t]++])
    }
    // Si les 3 types sont épuisés, on complète avec ce qui reste du pool
    if (idx.order >= buckets.order.length && idx.open >= buckets.open.length && idx.mcq >= buckets.mcq.length) {
      break
    }
  }

  // Complément si on n'a pas atteint la cible (pool restreint par filtres)
  if (result.length < target) {
    const used = new Set(result.map(q => q.id))
    result.push(...pick(pool.filter(q => !used.has(q.id)), target - result.length))
  }

  return result.slice(0, target)
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

// ── Question « liste » : résultat par joueur (nombre de bonnes réponses + rang) ──
// On stocke le nombre de bonnes réponses dans answer_idx au moment du submit.
export function computeListResult(answers, q_idx) {
  const rows = answers
    .filter(a => a.q_idx === q_idx)
    .map(a => ({
      profile_id: a.profile_id,
      count: Math.max(0, a.answer_idx ?? 0),
      at: a.answered_at,
    }))
  const ranked = rows
    .filter(r => r.count > 0)
    .sort((a, b) => b.count - a.count || new Date(a.at) - new Date(b.at))
  return { rows, ranked }
}

// Points d'une question « liste » : 2 par bonne réponse + bonus de rang (10/5/3)
export function computeListPoints(answers, q_idx) {
  const { rows, ranked } = computeListResult(answers, q_idx)
  const map = {}
  for (const r of rows) {
    if (r.count > 0) map[r.profile_id] = r.count * LIST_POINT_PER
  }
  ranked.forEach((r, i) => {
    if (i < LIST_RANK_BONUS.length) map[r.profile_id] = (map[r.profile_id] ?? 0) + LIST_RANK_BONUS[i]
  })
  return map
}

// Scores totaux { [profile_id]: total }, bonus de série inclus.
// `questions` permet de gérer le scoring spécifique des questions « liste ».
export function computeScores(answers, q_count, questions = []) {
  const players = [...new Set(answers.map(a => a.profile_id))]
  const isList = (q) => questions[q]?.type === 'list'

  // Points de base (par rang de rapidité) pour chaque question normale
  const baseByQ = []
  const listByQ = {}
  for (let q = 0; q < q_count; q++) {
    if (isList(q)) { baseByQ[q] = {}; listByQ[q] = computeListPoints(answers, q) }
    else baseByQ[q] = computeQuestionPoints(answers, q)
  }

  // Lookup rapide des bonnes réponses : "pid:q_idx"
  const correct = new Set(
    answers.filter(a => a.is_correct).map(a => `${a.profile_id}:${a.q_idx}`)
  )

  const scores = {}
  for (const pid of players) {
    let streak = 0
    let total  = 0
    for (let q = 0; q < q_count; q++) {
      if (isList(q)) {
        total += listByQ[q]?.[pid] ?? 0   // la série n'est pas affectée
        continue
      }
      if (correct.has(`${pid}:${q}`)) {
        streak += 1
        total += (baseByQ[q][pid] ?? 0) + streakBonus(streak)
      } else {
        streak = 0
      }
    }
    if (total) scores[pid] = total
  }
  return scores
}

// ── Fetch (caché) des questions « liste » depuis Supabase ──
let _listCache = null
export async function getListQuestions() {
  if (_listCache) return _listCache
  const { data } = await supabase.from('list_questions').select('*')
  _listCache = (data ?? []).map(r => ({
    id:         r.id,
    type:       'list',
    theme:      r.theme,
    difficulty: r.difficulty ?? 2,
    q:          r.prompt,
    answers:    Array.isArray(r.answers) ? r.answers : [],
    timer_ms:   LIST_TIMER_MS,
  }))
  return _listCache
}

export function useRaceRoom(code) {
  const { user, profile } = useAuth()
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

  async function submitAnswer({ q_idx, answer_idx, is_correct, answer_text }) {
    if (!user || !room) return
    // INSERT only (no upsert) pour préserver le answered_at server-side d'origine
    await supabase.from('race_answers').insert({
      room_id: room.id, profile_id: user.id, q_idx,
      answer_idx: answer_idx ?? -1, is_correct,
      answer_text: answer_text ?? null,
    })
  }

  async function startGame() {
    // Solo autorisé en partie privée ; 2 joueurs min en salon public (matchmaking)
    const minPlayers = room?.is_public ? RACE_MIN_PLAYERS : 1
    if (!isHost || participants.length < minPlayers) return
    const settings  = { ...DEFAULT_RACE_SETTINGS, ...(room.phase_data?.settings ?? {}) }
    const questions = pickQuestions(settings)
    // Injecte UNE question « liste » à une position aléatoire (une seule par partie)
    try {
      const listPool = await getListQuestions()
      if (listPool.length && questions.length) {
        const listQ = listPool[Math.floor(Math.random() * listPool.length)]
        const pos   = Math.floor(Math.random() * questions.length)
        questions[pos] = { ...listQ }
      }
    } catch { /* si l'échec, on garde une partie 100% normale */ }
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

  async function createRoom({ isPublic = false, ranked = false, roomElo = null, settings } = {}) {
    if (!user) return null
    const code = generateCode()
    const phase_data = settings
      ? { settings: { ...DEFAULT_RACE_SETTINGS, ...settings } }
      : {}
    const { data, error } = await supabase
      .from('race_rooms').insert({
        code, host_id: user.id, is_public: isPublic, ranked, room_elo: roomElo, phase_data,
      }).select().single()
    if (error || !data) return null
    await supabase.from('race_participants').insert({ room_id: data.id, profile_id: user.id })
    return data.code
  }

  // Matchmaking générique : rejoint une salle publique ouverte (ranked ou non),
  // ou en crée une. En ranked, on essaie d'apparier des ELO proches.
  async function matchmake({ ranked }) {
    if (!user) return { error: 'Non connecté' }
    const myElo = profile?.elo ?? ELO_START
    const since = new Date(Date.now() - 30 * 60 * 1000).toISOString()

    const { data: rooms } = await supabase
      .from('race_rooms')
      .select('*')
      .eq('is_public', true)
      .eq('ranked', ranked)
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

      // En ranked : bandes d'ELO croissantes. En casual : une seule passe (band ∞).
      const bands = ranked ? [120, 300, Infinity] : [Infinity]
      for (const band of bands) {
        for (const r of rooms) {
          const members = byRoom[r.id] ?? []
          if (members.includes(user.id)) return { code: r.code }
          const hostPresent = members.includes(r.host_id)
          const eloOk = !ranked || Math.abs((r.room_elo ?? myElo) - myElo) <= band
          if (hostPresent && eloOk && members.length < RACE_MAX_PLAYERS) {
            const { error } = await supabase
              .from('race_participants').insert({ room_id: r.id, profile_id: user.id })
            if (!error) return { code: r.code }
          }
        }
      }
    }

    // Aucune salle dispo → on en crée une
    const code = await createRoom({ isPublic: true, ranked, roomElo: ranked ? myElo : null })
    if (!code) return { error: 'Erreur lors de la création du salon.' }
    return { code }
  }

  // Salon public (casual) : tout le monde, sans ELO.
  const joinPublicRoom = () => matchmake({ ranked: false })
  // RANKED : appariement par ELO, gains/pertes d'ELO.
  const joinRankedRoom = () => matchmake({ ranked: true })

  async function joinRoom(roomCode) {
    if (!user) return { error: 'Non connecté' }
    const { data: r } = await supabase
      .from('race_rooms').select('*').eq('code', roomCode.toUpperCase()).single()
    if (!r) return { error: 'Salle introuvable' }

    // Si l'utilisateur fait déjà partie de la salle, il peut la rejoindre
    // quelle que soit la phase (refresh / reconnexion en cours de partie).
    const { data: existing } = await supabase
      .from('race_participants').select('id').eq('room_id', r.id).eq('profile_id', user.id).maybeSingle()
    if (existing) return { code: r.code }

    // Nouveau participant : il faut que la partie soit encore en lobby
    if (r.phase !== 'lobby') return { error: 'Partie déjà commencée' }

    const { count } = await supabase
      .from('race_participants').select('id', { count: 'exact', head: true }).eq('room_id', r.id)
    if ((count ?? 0) >= RACE_MAX_PLAYERS) return { error: `Salle pleine (${RACE_MAX_PLAYERS}/${RACE_MAX_PLAYERS})` }

    const { error } = await supabase
      .from('race_participants').insert({ room_id: r.id, profile_id: user.id })
    if (error) return { error: 'Impossible de rejoindre.' }
    return { code: r.code }
  }

  // Reprendre la main si l'hôte est inactif
  async function claimHost() {
    if (!user || !room) return { error: 'Non connecté' }
    if (room.host_id === user.id) return {}
    const { error } = await supabase.rpc('claim_race_host', { target_room_id: room.id })
    if (error) return { error: error.message }
    return {}
  }

  const myAnswers = answers.filter(a => a.profile_id === user?.id)

  return {
    room, participants, answers, myAnswers, loading,
    isHost,
    submitAnswer, hostAdvance, startGame, createRoom, joinRoom, joinPublicRoom, joinRankedRoom, claimHost,
  }
}
