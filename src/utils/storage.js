const KEY = 'minuit.v1'
const LEGACY_KEY = 'kulturg.v1' // migration douce

const defaultState = {
  totalXP: 0,
  totalAnswered: 0,
  totalCorrect: 0,
  bestDuel: 0,
  maxStreak: 0,              // meilleure série de jours atteinte
  streak: { current: 0, lastPlayedISO: null },
  byTheme: {}, // theme -> { answered, correct, xp }
  badges: [],  // ids
  // Compteurs de parties multijoueur (pour les achievements)
  games: { racePlayed: 0, raceWon: 0, tvPlayed: 0, tvWon: 0 },
  // Spaced-repetition cards: questionId -> { box: 1..5, dueISO }
  srs: {},
  history: [], // last 50 sessions { date, mode, score, total }
}

export function loadState() {
  try {
    let raw = localStorage.getItem(KEY)
    if (!raw) {
      // migration depuis l'ancienne clé
      const legacy = localStorage.getItem(LEGACY_KEY)
      if (legacy) {
        localStorage.setItem(KEY, legacy)
        localStorage.removeItem(LEGACY_KEY)
        raw = legacy
      }
    }
    if (!raw) return { ...defaultState }
    return { ...defaultState, ...JSON.parse(raw) }
  } catch {
    return { ...defaultState }
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {}
}

export function resetState() {
  localStorage.removeItem(KEY)
}
