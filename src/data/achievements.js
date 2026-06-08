// Achievements : 5 types, 3 paliers chacun (I / II / III).
// Chaque type lit une métrique du state local et se débloque par palier.

export const ACHIEVEMENTS = [
  {
    id: 'runner',
    baseName: 'Runner',
    emoji: '🏁',
    desc: 'Victoires en Course aux Points',
    tiers: [1, 10, 25],
    metric: (s) => s.games?.raceWon ?? 0,
  },
  {
    id: 'erudit',
    baseName: 'Érudit',
    emoji: '🧠',
    desc: 'Bonnes réponses au total',
    tiers: [50, 250, 1000],
    metric: (s) => s.totalCorrect ?? 0,
  },
  {
    id: 'maitre-midi',
    baseName: 'Maître de Midi',
    emoji: '👑',
    desc: 'Sacres de Maître de Midi',
    tiers: [1, 5, 15],
    metric: (s) => s.games?.tvWon ?? 0,
  },
  {
    id: 'streak',
    baseName: 'Streak',
    emoji: '🔥',
    desc: "Jours d'affilée (série)",
    tiers: [3, 7, 30],
    tierImages: ['/badges/streak-1.png', '/badges/streak-2.png', '/badges/streak-3.png'],
    metric: (s) => Math.max(s.maxStreak ?? 0, s.streak?.current ?? 0),
  },
  {
    id: 'legende',
    baseName: 'Légende',
    emoji: '⭐',
    desc: 'XP total accumulé',
    tiers: [1000, 5000, 15000],
    metric: (s) => s.totalXP ?? 0,
  },
]

const ROMAN = ['I', 'II', 'III', 'IV', 'V']

// Évalue un achievement par rapport au state : palier atteint + progression.
export function evalAchievement(a, state) {
  const value = a.metric(state)
  let tier = 0
  for (let i = 0; i < a.tiers.length; i++) if (value >= a.tiers[i]) tier = i + 1

  const unlocked = tier > 0
  const maxed = tier >= a.tiers.length
  const nextThreshold = maxed ? null : a.tiers[tier]
  const prevThreshold = tier > 0 ? a.tiers[tier - 1] : 0

  const progress = maxed
    ? 100
    : Math.max(0, Math.min(100, Math.round(((value - prevThreshold) / (nextThreshold - prevThreshold)) * 100)))

  return {
    id: a.id,
    baseName: a.baseName,
    emoji: a.emoji,
    desc: a.desc,
    tierImages: a.tierImages ?? null,
    value,
    tier,
    tierLabel: tier > 0 ? ROMAN[tier - 1] : null,
    unlocked,
    maxed,
    nextThreshold,
    progress,
  }
}

export function evalAchievements(state) {
  return ACHIEVEMENTS.map(a => evalAchievement(a, state))
}
