const KEY = 'kulturg.v1'

const defaultState = {
  totalXP: 0,
  totalAnswered: 0,
  totalCorrect: 0,
  bestDuel: 0,
  streak: { current: 0, lastPlayedISO: null },
  byTheme: {}, // theme -> { answered, correct, xp }
  badges: [],  // ids
  // Spaced-repetition cards: questionId -> { box: 1..5, dueISO }
  srs: {},
  history: [], // last 50 sessions { date, mode, score, total }
}

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY)
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
