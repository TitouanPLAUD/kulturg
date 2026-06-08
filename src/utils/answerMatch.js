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
