// Normalisation et matching tolérant pour les questions à réponse libre.
// Gère : accents, majuscules, ponctuation, articles, pluriels, genres, fautes mineures.

// ── Normalisation principale ─────────────────────────────────
export function normalize(s) {
  if (!s) return ''
  return s
    .toString()
    // Décomposition Unicode : "é" → "e" + "´"
    .normalize('NFD')
    // Supprime les diacritiques (accents)
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    // Ponctuation → espace
    .replace(/[.,;:!?'"()\[\]{}\/\\<>«»–—-]+/g, ' ')
    // Espaces multiples → un seul
    .replace(/\s+/g, ' ')
    .trim()
}

// ── Strip articles français usuels en début ──────────────────
const ARTICLES = [
  // Trier du plus long au plus court pour matcher "de la" avant "de"
  "aux ", "des ", "les ", "une ", "des ", "ses ", "mes ", "tes ", "nos ", "vos ", "ces ",
  "de l ", "de la ", "du ", "de ", "au ",
  "un ", "la ", "le ", "l ",
]
function stripArticle(s) {
  for (const art of ARTICLES) {
    if (s.startsWith(art)) return s.slice(art.length)
  }
  return s
}

// ── Variantes pluriel / singulier / féminin (basiques) ───────
function variants(s) {
  const out = new Set([s])
  // pluriel basique : ajouter / retirer "s" final
  if (s.endsWith('s'))   out.add(s.slice(0, -1))
  else                   out.add(s + 's')
  // "x" final (chevaux, journaux…) — on ne tente pas la racine, c'est trop hasardeux
  // féminin basique : ajouter / retirer "e" final
  if (s.endsWith('e'))   out.add(s.slice(0, -1))
  else                   out.add(s + 'e')
  // combinaisons "es" / ""
  if (s.endsWith('es'))  out.add(s.slice(0, -2))
  return out
}

// ── Distance de Levenshtein bornée ──────────────────────────
function levenshtein(a, b, max = 2) {
  if (a === b) return 0
  if (Math.abs(a.length - b.length) > max) return max + 1
  const dp = Array.from({ length: a.length + 1 }, (_, i) => i)
  for (let j = 1; j <= b.length; j++) {
    let prev = dp[0]
    dp[0] = j
    let rowMin = j
    for (let i = 1; i <= a.length; i++) {
      const tmp = dp[i]
      dp[i] = a[i - 1] === b[j - 1]
        ? prev
        : 1 + Math.min(prev, dp[i - 1], dp[i])
      prev = tmp
      if (dp[i] < rowMin) rowMin = dp[i]
    }
    // Si toute la ligne dépasse le seuil, on peut couper
    if (rowMin > max) return max + 1
  }
  return dp[a.length]
}

// ── Classement : l'ordre proposé correspond-il à l'ordre canonique ? ──
export function checkOrder(proposed, canonical) {
  if (!Array.isArray(proposed) || !Array.isArray(canonical)) return false
  if (proposed.length !== canonical.length) return false
  return proposed.every((x, i) => x === canonical[i])
}

// ── Matching pour les questions « liste » ────────────────────
// En plus du match complet, on accepte un mot isolé (nom de famille ou prénom)
// s'il identifie de façon UNIQUE un seul élément du pool (évite "Louis" ambigu).
const PARTICLES = new Set([
  'de', 'du', 'des', 'd', 'la', 'le', 'les', 'l', 'au', 'aux',
  'von', 'van', 'der', 'di', 'da', 'del', 'el', 'al',
])
const isRoman = (t) => /^[ivxlcdm]+$/.test(t)

function significantTokens(name) {
  return normalize(name)
    .split(' ')
    .filter(t => t.length >= 3 && !PARTICLES.has(t) && !isRoman(t))
}

function tokenMatch(a, b) {
  if (a === b) return true
  const max = a.length <= 4 ? 0 : 1
  return max > 0 && levenshtein(a, b, max) <= max
}

/**
 * Renvoie l'index du pool correspondant à `typed`, ou -1.
 *  1) match complet tolérant (matchAnswer)
 *  2) sinon, mot isolé (nom/prénom) identifiant UN SEUL élément du pool
 */
export function matchListAnswer(typed, pool = []) {
  if (typeof typed !== 'string' || !typed.trim()) return -1
  const t = stripArticle(normalize(typed))
  if (!t) return -1

  // 1) Match exact (avec variantes pluriel/féminin) — pas de Levenshtein ici,
  //    pour éviter qu'un prénom seul "comble" un numéro ("Charles" → "Charles V").
  const tv = variants(t)
  for (let i = 0; i < pool.length; i++) {
    const c = stripArticle(normalize(pool[i]))
    if (!c) continue
    if (t === c) return i
    const cv = variants(c)
    for (const tx of tv) if (cv.has(tx)) return i
  }

  // 2) Mot isolé (nom de famille / prénom) identifiant UN SEUL élément du pool,
  //    avec tolérance aux fautes au niveau du mot.
  if (t.includes(' ')) return -1
  const hits = []
  for (let i = 0; i < pool.length; i++) {
    if (significantTokens(pool[i]).some(tok => tokenMatch(t, tok))) hits.push(i)
  }
  return hits.length === 1 ? hits[0] : -1
}

// ── Match principal ──────────────────────────────────────────
/**
 * Indique si `typed` correspond à `expected` ou l'une des `accepts`,
 * avec tolérance sur accents, majuscules, articles, pluriels, fautes mineures.
 *
 * @param {string}    typed     ce que le joueur a tapé
 * @param {string}    expected  réponse de référence
 * @param {string[]?} accepts   variantes acceptées supplémentaires
 * @returns {boolean}
 */
export function matchAnswer(typed, expected, accepts = []) {
  if (typeof typed !== 'string' || !typed.trim()) return false
  const t = stripArticle(normalize(typed))
  if (!t) return false

  const candidates = [expected, ...(accepts ?? [])]
    .filter(Boolean)
    .map(c => stripArticle(normalize(c)))

  for (const c of candidates) {
    if (!c) continue
    // Match direct
    if (t === c) return true
    // Variantes pluriel/féminin des deux côtés
    const tv = variants(t)
    const cv = variants(c)
    for (const tx of tv) for (const cx of cv) if (tx === cx) return true
    // Tolérance fautes : 1 caractère pour réponses courtes (≤8), 2 pour plus long
    const maxDist = c.length <= 8 ? 1 : 2
    if (levenshtein(t, c, maxDist) <= maxDist) return true
  }
  return false
}
