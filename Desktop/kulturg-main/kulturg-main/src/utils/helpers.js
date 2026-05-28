export function shuffle(arr) {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function pick(arr, n) {
  return shuffle(arr).slice(0, n)
}

export function normalize(str) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim()
}

// Tolérance intelligente : accepte variantes proches
export function matches(userAnswer, correctAnswer) {
  const user = normalize(userAnswer)
  const correct = normalize(correctAnswer)

  // Exact
  if (user === correct) return true

  // Avec tolérance : 80% de similarité min
  const similarity = levenshteinSimilarity(user, correct)
  return similarity >= 0.80
}

// Distance de Levenshtein (0..1)
function levenshteinSimilarity(a, b) {
  const longer = a.length > b.length ? a : b
  const shorter = a.length > b.length ? b : a
  if (longer.length === 0) return 1.0

  const editDistance = getEditDistance(longer, shorter)
  return (longer.length - editDistance) / longer.length
}

function getEditDistance(s1, s2) {
  const costs = []
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j
      } else if (j > 0) {
        let newValue = costs[j - 1]
        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1
        }
        costs[j - 1] = lastValue
        lastValue = newValue
      }
    }
    if (i > 0) costs[s2.length] = lastValue
  }
  return costs[s2.length]
}
