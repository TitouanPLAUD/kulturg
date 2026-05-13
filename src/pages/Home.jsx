import { Link } from 'react-router-dom'
import { useGame, levelFromXP } from '../context/GameContext.jsx'
import { THEME_LIST } from '../data/themes.js'
import { useAllQuestions } from '../hooks/useQuestions.js'

const games = [
  { to: '/qcm',             title: 'QCM Culture G',     desc: 'Sessions chronométrées par thème et difficulté.', emoji: '❓', tone: 'from-amber-500 to-orange-600' },
  { to: '/duel',            title: 'Duel rapide',       desc: '60 secondes pour enchaîner un max de bonnes réponses.', emoji: '⚔️', tone: 'from-rose-500 to-red-600' },
  { to: '/coup-de-maitre',  title: 'Coup de Maître',    desc: 'Devine la personnalité avant la fin des indices.', emoji: '🎯', tone: 'from-indigo-500 to-violet-600' },
  { to: '/mot',             title: 'Mot Mystérieux',    desc: 'Trouve le mot à partir de sa définition.', emoji: '🔤', tone: 'from-emerald-500 to-teal-600' },
  { to: '/etoile',          title: 'Étoile Mystérieuse', desc: 'Une silhouette se révèle au fil des indices.', emoji: '⭐', tone: 'from-yellow-400 to-amber-600' },
  { to: '/revision',        title: 'Mode Révision',     desc: 'Flashcards et répétition espacée.', emoji: '🃏', tone: 'from-sky-500 to-blue-600' },
]

export default function Home() {
  const { state } = useGame()
  const QUESTIONS = useAllQuestions()
  const level = levelFromXP(state.totalXP)
  const accuracy = state.totalAnswered ? Math.round((state.totalCorrect / state.totalAnswered) * 100) : 0

  return (
    <div className="space-y-8">
      <section className="card p-8 md:p-10 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-midi-accent/10 blur-3xl" />
        <div className="absolute -bottom-24 -left-10 w-72 h-72 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="relative">
          <span className="chip mb-3">🏆 Entraîne-toi pour les 12 Coups de Midi</span>
          <h1 className="heading text-4xl md:text-6xl mb-3">Deviens un <span className="text-midi-accent">Maître de Midi</span></h1>
          <p className="text-slate-300 max-w-2xl">Six mini-jeux, dix thèmes, une base de plus de {QUESTIONS.length} questions. Suis ta progression, débloque des badges, et bats tes records.</p>

          <div className="mt-6 grid grid-cols-2 md:grid-cols-5 gap-3 max-w-4xl">
            <Stat label="Niveau" value={level} />
            <Stat label="XP total" value={state.totalXP} />
            <Stat label="Réussite" value={`${accuracy}%`} />
            <Stat label="Série 🔥" value={`${state.streak.current} j`} />
            <Stat label="Banque" value={`${QUESTIONS.length} q`} highlight />
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/qcm" className="btn-primary">▶ Commencer un QCM</Link>
            <Link to="/duel" className="btn-secondary">⚔️ Lancer un duel</Link>
            <Link to="/profil" className="btn-ghost">Voir mon profil</Link>
          </div>
        </div>
      </section>

      <section>
        <h2 className="heading text-2xl mb-4">Mini-jeux</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {games.map(g => (
            <Link key={g.to} to={g.to} className="card p-5 group hover:-translate-y-1 transition-transform">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${g.tone} grid place-items-center text-2xl mb-3 shadow-lg`}>{g.emoji}</div>
              <div className="font-semibold text-lg">{g.title}</div>
              <div className="text-sm text-slate-400 mt-1">{g.desc}</div>
              <div className="mt-3 text-sm text-midi-accent group-hover:translate-x-1 transition-transform">Jouer →</div>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="heading text-2xl mb-4">Thèmes</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {THEME_LIST.map(t => {
            const s = state.byTheme[t.id] || { answered: 0, correct: 0 }
            const acc = s.answered ? Math.round((s.correct / s.answered) * 100) : 0
            return (
              <Link key={t.id} to={`/qcm?theme=${t.id}`} className="card p-4 hover:bg-white/5 transition">
                <div className={`text-3xl mb-2`}>{t.emoji}</div>
                <div className="font-semibold">{t.label}</div>
                <div className="text-xs text-slate-400 mt-1">{s.answered} q · {acc}% réussite</div>
              </Link>
            )
          })}
        </div>
      </section>
    </div>
  )
}

function Stat({ label, value, highlight }) {
  return (
    <div className={`rounded-xl border px-4 py-3 ${highlight ? 'bg-midi-accent/10 border-midi-accent/40' : 'bg-white/5 border-white/10'}`}>
      <div className={`text-xs ${highlight ? 'text-midi-accent' : 'text-slate-400'}`}>{label}</div>
      <div className={`text-2xl font-bold ${highlight ? 'text-midi-accent' : 'text-white'}`}>{value}</div>
    </div>
  )
}
