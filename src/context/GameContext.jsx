import { createContext, useContext, useEffect, useMemo, useReducer, useRef } from 'react'
import { loadState, saveState, resetState } from '../utils/storage.js'
import { DIFFICULTY } from '../data/themes.js'
import { useAuth } from './AuthContext.jsx'
import { supabase } from '../lib/supabase.js'

const GameContext = createContext(null)

function reducer(state, action) {
  switch (action.type) {
    case 'ANSWER': {
      const { theme, difficulty, correct, awardXp = true } = action
      // En partie privée (awardXp=false), aucun XP n'est gagné.
      const points = (correct && awardXp) ? DIFFICULTY[difficulty].points : 0
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
    case 'MERGE_REMOTE': {
      // Fusion « le plus haut gagne » au login : on ne prend les valeurs serveur
      // que si elles dépassent le local (évite d'écraser une progression).
      if ((action.total_xp ?? 0) <= state.totalXP) return state
      return {
        ...state,
        totalXP:       action.total_xp,
        totalAnswered: action.total_answered ?? state.totalAnswered,
        totalCorrect:  action.total_correct ?? state.totalCorrect,
      }
    }
    case 'ADD_XP': {
      // Récompense multijoueur — XP uniquement, n'affecte pas answered/correct
      return { ...state, totalXP: state.totalXP + (action.amount ?? 0) }
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
  const { user, profile } = useAuth()
  const mergedRef = useRef(false)
  const pushTimer = useRef(null)

  useEffect(() => { saveState(state) }, [state])

  // ── Sync serveur : fusion au login puis envoi de la progression ──
  // À la connexion, on récupère la progression serveur et on garde la plus
  // élevée (cross-device safe).
  useEffect(() => {
    if (!profile) { mergedRef.current = false; return }
    if (mergedRef.current) return
    mergedRef.current = true
    dispatch({
      type: 'MERGE_REMOTE',
      total_xp:       profile.total_xp ?? 0,
      total_answered: profile.total_answered ?? 0,
      total_correct:  profile.total_correct ?? 0,
    })
  }, [profile])

  // Envoi (débauncé) de la progression locale vers le profil serveur.
  useEffect(() => {
    if (!user) return
    clearTimeout(pushTimer.current)
    pushTimer.current = setTimeout(() => {
      supabase.from('profiles').update({
        total_xp:       state.totalXP,
        total_answered: state.totalAnswered,
        total_correct:  state.totalCorrect,
      }).eq('id', user.id)
    }, 1500)
    return () => clearTimeout(pushTimer.current)
  }, [user, state.totalXP, state.totalAnswered, state.totalCorrect])

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
    answer: (theme, difficulty, correct, awardXp = true) => dispatch({ type: 'ANSWER', theme, difficulty, correct, awardXp }),
    srsReview: (qid, correct) => dispatch({ type: 'SRS_REVIEW', qid, correct }),
    finishSession: (session) => dispatch({ type: 'FINISH_SESSION', session }),
    addXP: (amount) => dispatch({ type: 'ADD_XP', amount }),
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
  {
    minLevel: 1000, name: 'Maître Absolu des Douze Coups', emoji: '👑', color: 'text-yellow-300',
    messages: [
      "Il n'y a plus rien à prouver. Tu règnes sur les Douze Coups de Minuit.",
      "Les légendes ne naissent pas, elles se construisent question après question. Tu l'as fait.",
      "Mille niveaux. Certains cherchent encore le niveau 2. Toi, tu es au sommet.",
      "Même Jean-Luc Reichmann s'inclinerait devant toi.",
      "Tu n'es plus un joueur. Tu es une institution.",
    ],
  },
  {
    minLevel: 500, name: 'Oracle des Temps Modernes', emoji: '🔮', color: 'text-purple-400',
    messages: [
      "Les autres joueurs murmurent ton nom avec une admiration mêlée de crainte.",
      "Tu vois les questions avant même qu'elles arrivent. C'est troublant.",
      "À ce stade, le quiz te connaît par cœur. Et il a un peu peur de toi.",
      "500 niveaux. Tu pourrais écrire les questions toi-même.",
      "L'oracle a parlé — et il avait raison, comme toujours.",
    ],
  },
  {
    minLevel: 100, name: "Cerveau d'Acier Trempé", emoji: '⚡', color: 'text-blue-300',
    messages: [
      "Ton savoir est une arme redoutable. Le reste du monde n'est pas prêt.",
      "100 niveaux, c'est pas un score — c'est un mode de vie.",
      "Les questions difficiles ? Elles te font sourire. C'est inquiétant.",
      "Tu as transformé chaque bonne réponse en blindage mental. Respect.",
      "Cerveau d'acier, cœur de feu. L'arène t'appartient.",
    ],
  },
  {
    minLevel: 50, name: 'Encyclopédiste Fou', emoji: '🧠', color: 'text-cyan-400',
    messages: [
      "Tu n'es plus un joueur ordinaire — tu es une référence vivante.",
      "Les gens commencent à te demander des choses au lieu de googler.",
      "50 niveaux de savoir accumulé. Ton cerveau déborde, et c'est beau.",
      "À ce stade, tu mérites ton propre thème dans le jeu.",
      "L'encyclopédie ? Tu l'as lue. Deux fois. Par plaisir.",
    ],
  },
  {
    minLevel: 25, name: 'Maestro du Quiz', emoji: '🎓', color: 'text-green-400',
    messages: [
      "Tu domines la majorité des joueurs. Continue sur ta lancée !",
      "Maestro en scène — les autres notent, toi tu joues.",
      "25 niveaux de maîtrise. On commence à parler de toi dans les chaumières.",
      "Tu n'apprends plus, tu confirmes ce que tu savais déjà.",
      "Les podiums, c'est ta résidence secondaire.",
    ],
  },
  {
    minLevel: 10, name: 'Érudit des Salons', emoji: '📚', color: 'text-indigo-400',
    messages: [
      "Tes connaissances commencent à forcer l'admiration.",
      "On t'invite aux dîners pour avoir de la conversation de qualité.",
      "Tu cites tes sources et tu as raison. C'est rare. C'est toi.",
      "L'érudit a lu, a retenu, et est revenu jouer. Logique.",
      "Niveau 10 : tu n'es plus un hasard, tu es une intention.",
    ],
  },
  {
    minLevel: 5, name: 'Fureteur de Savoirs', emoji: '🔍', color: 'text-teal-400',
    messages: [
      "La curiosité est ton moteur. Tu es sur la bonne voie !",
      "Tu poses les bonnes questions. Et tu trouves les bonnes réponses.",
      "Fureteur dans l'âme — rien ne t'échappe pour longtemps.",
      "5 niveaux déjà. L'appétit vient en jouant.",
      "On ne t'arrêtera pas. Et c'est tant mieux.",
    ],
  },
  {
    minLevel: 1, name: 'Apprenti Culturel', emoji: '🌱', color: 'text-slate-400',
    messages: [
      "Tes premiers pas dans l'arène — chaque réponse compte.",
      "Tout le monde commence quelque part. Le tien commence ici.",
      "L'apprenti d'aujourd'hui est le Maître de demain. Commence fort.",
      "Une graine de savoir plantée. Elle va pousser vite.",
      "Bienvenue dans l'arène. Les questions n'ont qu'à bien se tenir.",
    ],
  },
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
