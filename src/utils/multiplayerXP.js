// Récompenses XP pour les modes multijoueur — avec déduplication par room
// pour éviter de re-créditer en cas de rendu multiple / re-mount.

const STORAGE_KEY = 'multi_xp_awarded'

function getAwarded() {
  try {
    return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]'))
  } catch {
    return new Set()
  }
}

function saveAwarded(set) {
  // Limite à 500 entrées pour éviter la croissance illimitée
  const arr = [...set].slice(-500)
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(arr)) } catch {}
}

/**
 * Récompense une partie multijoueur une seule fois.
 * @param {string} key  identifiant unique (mode + roomId + userId)
 * @param {number} amount  XP à attribuer
 * @param {(amount: number) => void} addXP  méthode du GameContext
 * @returns {number} XP réellement attribués (0 si déjà fait)
 */
export function awardXPOnce(key, amount, addXP) {
  if (!key || !amount || !addXP) return 0
  const awarded = getAwarded()
  if (awarded.has(key)) return 0
  awarded.add(key)
  saveAwarded(awarded)
  addXP(amount)
  return amount
}

// ── Enregistrement des parties (achievements), dédupliqué par room ──
const GAMES_KEY = 'multi_games_recorded'

function getGamesRecorded() {
  try { return new Set(JSON.parse(localStorage.getItem(GAMES_KEY) ?? '[]')) }
  catch { return new Set() }
}
function saveGamesRecorded(set) {
  try { localStorage.setItem(GAMES_KEY, JSON.stringify([...set].slice(-500))) } catch {}
}

/**
 * Enregistre une partie multijoueur terminée une seule fois (par key).
 * @param {string} key  identifiant unique (mode + roomId + userId)
 * @param {'race'|'tv'} mode
 * @param {boolean} won
 * @param {(mode: string, won: boolean) => void} recordGame  méthode du GameContext
 * @returns {boolean} true si enregistré (première fois)
 */
export function recordGameOnce(key, mode, won, recordGame) {
  if (!key || !recordGame) return false
  const set = getGamesRecorded()
  if (set.has(key)) return false
  set.add(key)
  saveGamesRecorded(set)
  recordGame(mode, won)
  return true
}

// ── Barèmes par mode ─────────────────────────────────────────────
export const XP_RATES = {
  tv:    { maitre: 500, eliminated: 100 },
  duel:  { winner: 250, loser: 80 },
  // Race : 1er +200, 2e +130, 3e +90, suivants +40 (+ score brut * 2 en bonus)
  race:  { ranks: [200, 130, 90], floor: 40, scoreFactor: 2 },
}

export function tvXP(isMaitre) {
  return isMaitre ? XP_RATES.tv.maitre : XP_RATES.tv.eliminated
}

export function duelXP(isWinner) {
  return isWinner ? XP_RATES.duel.winner : XP_RATES.duel.loser
}

export function raceXP(rank, score = 0) {
  const r = XP_RATES.race
  const base = rank > 0 && rank <= r.ranks.length ? r.ranks[rank - 1] : r.floor
  return base + Math.max(0, score) * r.scoreFactor
}
