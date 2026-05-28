export const THEMES = {
  histoire:    { id: 'histoire',    label: 'Histoire',     emoji: '🏛️', color: 'from-amber-500 to-red-600' },
  geographie:  { id: 'geographie',  label: 'Géographie',   emoji: '🌍', color: 'from-emerald-500 to-teal-600' },
  sciences:    { id: 'sciences',    label: 'Sciences',     emoji: '🔬', color: 'from-cyan-500 to-blue-600' },
  cinema:      { id: 'cinema',      label: 'Cinéma',       emoji: '🎬', color: 'from-pink-500 to-rose-600' },
  musique:     { id: 'musique',     label: 'Musique',      emoji: '🎵', color: 'from-purple-500 to-fuchsia-600' },
  sport:       { id: 'sport',       label: 'Sport',        emoji: '⚽', color: 'from-lime-500 to-green-600' },
  litterature: { id: 'litterature', label: 'Littérature',  emoji: '📚', color: 'from-orange-500 to-amber-600' },
  arts:        { id: 'arts',        label: 'Arts',         emoji: '🎨', color: 'from-indigo-500 to-violet-600' },
  tv:          { id: 'tv',          label: 'TV & Séries',  emoji: '📺', color: 'from-sky-500 to-indigo-600' },
  societe:     { id: 'societe',     label: 'Société',      emoji: '🗞️', color: 'from-zinc-400 to-slate-600' },
}

export const THEME_LIST = Object.values(THEMES)

export const DIFFICULTY = {
  1: { label: 'Facile',    color: 'text-emerald-400', points: 10 },
  2: { label: 'Moyen',     color: 'text-amber-400',   points: 20 },
  3: { label: 'Difficile', color: 'text-rose-400',    points: 40 },
}
