import { Link } from 'react-router-dom'
import { useGame, levelFromXP } from '../context/GameContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { THEME_LIST } from '../data/themes.js'
import { useAllQuestions } from '../hooks/useQuestions.js'

const games = [
  { to: '/qcm',            title: 'QCM Culture G',      desc: 'Sessions chronométrées par thème.',     emoji: '❓', tone: 'from-amber-500 to-orange-600' },
  { to: '/duel',           title: 'Duel rapide',         desc: '60 s pour enchaîner un max de bonnes.', emoji: '⚔️', tone: 'from-rose-500 to-red-600' },
  { to: '/coup-de-maitre', title: 'Coup de Maître',      desc: 'Devine la personnalité avec des indices.', emoji: '🎯', tone: 'from-indigo-500 to-violet-600' },
  { to: '/mot',            title: 'Mot Mystérieux',      desc: 'Trouve le mot à partir de sa définition.', emoji: '🔤', tone: 'from-emerald-500 to-teal-600' },
  { to: '/etoile',         title: 'Étoile Mystérieuse',  desc: 'Une silhouette se révèle au fil des indices.', emoji: '⭐', tone: 'from-yellow-400 to-amber-600' },
  { to: '/revision',       title: 'Mode Révision',       desc: 'Flashcards et répétition espacée.',     emoji: '🃏', tone: 'from-sky-500 to-blue-600' },
]

export default function Home() {
  const { state } = useGame()
  const { user, profile } = useAuth()
  const QUESTIONS = useAllQuestions()
  const level = levelFromXP(state.totalXP)
  const accuracy = state.totalAnswered
    ? Math.round((state.totalCorrect / state.totalAnswered) * 100)
    : 0

  return (
    <div className="space-y-10">

      {/* Hero */}
      <section className="card p-8 md:p-10 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-midi-accent/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-10 w-72 h-72 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

        <div className="relative">
          {user && profile ? (
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">{profile.avatar}</span>
              <div>
                <div className="text-slate-400 text-sm">Bienvenue,</div>
                <div className="font-display text-xl text-white">{profile.nickname}</div>
              </div>
            </div>
          ) : (
            <span className="chip mb-3 inline-block">🏆 Entraîne-toi pour les 12 Coups de Midi</span>
          )}

          <h1 className="heading text-4xl md:text-5xl mb-3">
            Deviens un <span className="text-midi-accent">Maître de Midi</span>
          </h1>
          <p className="text-slate-400 max-w-2xl text-sm md:text-base">
            Six mini-jeux, dix thèmes, {QUESTIONS.length} questions. Suis ta progression, débloque des badges et bats tes records.
          </p>

          {/* Stats */}
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Niveau" value={level} accent />
            <StatCard label="XP total" value={state.totalXP.toLocaleString('fr-FR')} />
            <StatCard label="Réussite" value={`${accuracy} %`} />
            <StatCard label="Série 🔥" value={`${state.streak.current} j`} />
          </div>

          {/* CTA */}
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/qcm" className="btn btn-primary">▶ Commencer un QCM</Link>
            <Link to="/duel" className="btn btn-secondary">⚔️ Lancer un duel</Link>
            {user
              ? <Link to="/profil" className="btn btn-ghost">Mon profil</Link>
              : <Link to="/auth" className="btn btn-ghost">Créer un compte</Link>
            }
          </div>
        </div>
      </section>

      {/* Mini-jeux */}
      <section>
        <SectionTitle>Mini-jeux</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {games.map(g => (
            <Link key={g.to} to={g.to}
              className="card p-5 group hover:-translate-y-1 transition-all duration-200">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${g.tone} grid place-items-center text-2xl mb-4 shadow-lg`}>
                {g.emoji}
              </div>
              <div className="font-semibold text-base">{g.title}</div>
              <div className="text-sm text-slate-400 mt-1 leading-relaxed">{g.desc}</div>
              <div className="mt-4 text-sm text-midi-accent group-hover:translate-x-1 transition-transform">
                Jouer →
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Thèmes */}
      <section>
        <SectionTitle>Thèmes</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {THEME_LIST.map(t => {
            const s = state.byTheme[t.id] || { answered: 0, correct: 0 }
            const acc = s.answered ? Math.round((s.correct / s.answered) * 100) : null
            return (
              <Link key={t.id} to={`/qcm?theme=${t.id}`}
                className="card p-4 hover:bg-white/5 transition group">
                <div className="text-3xl mb-2">{t.emoji}</div>
                <div className="font-semibold text-sm">{t.label}</div>
                {acc !== null
                  ? <div className="text-xs text-midi-accent mt-1">{acc} % réussite</div>
                  : <div className="text-xs text-slate-500 mt-1">Non joué</div>
                }
              </Link>
            )
          })}
        </div>
      </section>

      {/* Invite à créer un compte si non connecté */}
      {!user && (
        <section className="card p-6 flex flex-col sm:flex-row items-center gap-4 border border-midi-accent/20 bg-midi-accent/5">
          <div className="text-4xl">🔐</div>
          <div className="flex-1 text-center sm:text-left">
            <div className="font-semibold text-white">Sauvegarde ta progression</div>
            <div className="text-sm text-slate-400 mt-1">Crée un compte gratuit pour ne pas perdre tes stats, tes badges et tes amis.</div>
          </div>
          <Link to="/auth" className="btn btn-primary shrink-0">Créer un compte</Link>
        </section>
      )}
    </div>
  )
}

function SectionTitle({ children }) {
  return (
    <h2 className="heading text-2xl mb-4">{children}</h2>
  )
}

function StatCard({ label, value, accent }) {
  return (
    <div className={`rounded-xl border px-4 py-3 ${accent
      ? 'bg-midi-accent/10 border-midi-accent/30'
      : 'bg-white/5 border-white/10'}`}>
      <div className={`text-xs mb-0.5 ${accent ? 'text-midi-accent' : 'text-slate-400'}`}>{label}</div>
      <div className={`text-2xl font-bold tabular-nums ${accent ? 'text-midi-accent' : 'text-white'}`}>{value}</div>
    </div>
  )
}
