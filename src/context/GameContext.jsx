import { createContext, useContext, useEffect, useMemo, useReducer } from 'react'
import { loadState, saveState, resetState } from '../utils/storage.js'
import { DIFFICULTY } from '../data/themes.js'

const GameContext = createContext(null)

function reducer(state, action) {
  switch (action.type) {
    case 'ANSWER': {
      const { theme, difficulty, correct } = action
      const points = correct ? DIFFICULTY[difficulty].points : 0
      const byTheme = { ...state.byTheme }
      const t = byTheme[theme] || { answered: 0, correct: 0, xp: 0 }
      byTheme[theme] = {
        answered: t.answered + 1,
        correct: t.correct + (correct ? 1 : 0),
        xp: t.xp + points,
      }
      return {
        ...state,
        totalXP: state.totalXP + points,
        totalAnswered: state.totalAnswered + 1,
        totalCorrect: state.totalCorrect + (correct ? 1 : 0),
        byTheme,
      }
    }
    case 'FINISH_SESSION': {
      const today = new Date().toISOString().slice(0, 10)
      const last = state.streak.lastPlayedISO
      let current = state.streak.current
      if (last === today) {
        // same day, no change
      } else if (last && daysBetween(last, today) === 1) {
        current = current + 1
      } else {
        current = 1
      }
      const history = [
        { date: new Date().toISOString(), ...action.session },
        ...state.history,
      ].slice(0, 50)
      const bestDuel = action.session.mode === 'duel'
        ? Math.max(state.bestDuel, action.session.score)
        : state.bestDuel
      return { ...state, streak: { current, lastPlayedISO: today }, history, bestDuel }
    }
    case 'SRS_REVIEW': {
      // box increments on correct, resets on miss
      const srs = { ...state.srs }
      const card = srs[action.qid] || { box: 1 }
      const newBox = action.correct ? Math.min(5, (card.box || 1) + 1) : 1
      const days = [0, 1, 2, 4, 7, 14][newBox]
      const due = new Date(Date.now() + days * 86400000).toISOString()
      srs[action.qid] = { box: newBox, dueISO: due }
      return { ...state, srs }
    }
    case 'BADGE': {
      if (state.badges.includes(action.id)) return state
      return { ...state, badges: [...state.badges, action.id] }
    }
    case 'RESET': {
      resetState()
      return loadState()
    }
    case 'HYDRATE':
      return action.state
    default:
      return state
  }
}

function daysBetween(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000)
}

export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, null, loadState)

  useEffect(() => { saveState(state) }, [state])

  // Auto-attribution de badges
  useEffect(() => {
    const checks = [
      { id: 'first-blood', cond: state.totalAnswered >= 1 },
      { id: 'apprenti',    cond: state.totalAnswered >= 25 },
      { id: 'erudit',      cond: state.totalAnswered >= 100 },
      { id: 'maitre',      cond: state.totalAnswered >= 250 },
      { id: 'serial',      cond: state.bestDuel >= 10 },
      { id: 'legend',      cond: state.bestDuel >= 20 },
      { id: 'streak3',     cond: state.streak.current >= 3 },
      { id: 'streak7',     cond: state.streak.current >= 7 },
      { id: 'xp1k',        cond: state.totalXP >= 1000 },
    ]
    checks.forEach(c => { if (c.cond && !state.badges.includes(c.id)) dispatch({ type: 'BADGE', id: c.id }) })
  }, [state.totalAnswered, state.bestDuel, state.streak.current, state.totalXP, state.badges])

  const api = useMemo(() => ({
    state,
    answer: (theme, difficulty, correct) => dispatch({ type: 'ANSWER', theme, difficulty, correct }),
    srsReview: (qid, correct) => dispatch({ type: 'SRS_REVIEW', qid, correct }),
    finishSession: (session) => dispatch({ type: 'FINISH_SESSION', session }),
    reset: () => dispatch({ type: 'RESET' }),
  }), [state])

  return <GameContext.Provider value={api}>{children}</GameContext.Provider>
}

export const useGame = () => {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGame must be used within GameProvider')
  return ctx
}

export const LEVEL_THRESHOLDS = [0, 100, 250, 500, 1000, 2000, 4000, 7500, 12000, 18000, 25000]
export function levelFromXP(xp) {
  let lvl = 1
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) if (xp >= LEVEL_THRESHOLDS[i]) lvl = i + 1
  return lvl
}
export function nextLevelThreshold(xp) {
  for (const t of LEVEL_THRESHOLDS) if (t > xp) return t
  return LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1]
}

// ─── Grades par palier de niveau ──────────────────────────────────────────────
export const GRADES = [
  { minLevel: 1000, name: 'Maître Absolu des Douze Coups', emoji: '👑', color: 'text-yellow-300',  message: "Il n'y a plus rien à prouver. Tu règnes sur les Douze Coups." },
  { minLevel:  500, name: 'Oracle des Temps Modernes',     emoji: '🔮', color: 'text-purple-400', message: "Les autres joueurs murmurent ton nom avec respect." },
  { minLevel:  100, name: 'Cerveau d\'Acier Trempé',       emoji: '⚡', color: 'text-blue-300',   message: "Ton savoir est une arme redoutable. Impressionnant." },
  { minLevel:   50, name: 'Encyclopédiste Fou',            emoji: '🧠', color: 'text-cyan-400',   message: "Tu n'es plus un joueur ordinaire — tu es une référence." },
  { minLevel:   25, name: 'Maestro du Quiz',               emoji: '🎓', color: 'text-green-400',  message: "Tu domines la majorité des joueurs. Continue sur ta lancée !" },
  { minLevel:   10, name: 'Érudit des Salons',             emoji: '📚', color: 'text-indigo-400', message: "Tes connaissances commencent à forcer l'admiration." },
  { minLevel:    5, name: 'Fureteur de Savoirs',           emoji: '🔍', color: 'text-teal-400',   message: "La curiosité est ton moteur. Tu es sur la bonne voie !" },
  { minLevel:    1, name: 'Apprenti Culturel',             emoji: '🌱', color: 'text-slate-400',  message: "Tes premiers pas dans l'arène — chaque réponse compte." },
]

export function gradeFromLevel(level) {
  for (const g of GRADES) {
    if (level >= g.minLevel) return g
  }
  return GRADES[GRADES.length - 1]
}

export const BADGES = {
  'first-blood': { label: 'Première réponse', emoji: '🌱' },
  'apprenti':    { label: 'Apprenti (25)', emoji: '📘' },
  'erudit':      { label: 'Érudit (100)', emoji: '🧠' },
  'maitre':      { label: 'Maître (250)', emoji: '🏆' },
  'serial':      { label: 'Sériel (Duel ≥10)', emoji: '🔥' },
  'legend':      { label: 'Légende (Duel ≥20)', emoji: '💎' },
  'streak3':     { label: 'Série 3 jours', emoji: '🔥' },
  'streak7':     { label: 'Série 7 jours', emoji: '⚡' },
  'xp1k':        { label: '1000 XP', emoji: '⭐' },
}
