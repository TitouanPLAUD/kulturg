import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useGame, levelFromXP, gradeFromLevel } from '../context/GameContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useRaceRoom } from '../hooks/useRaceRoom.js'

const games = [
  { to: '/multi', title: 'Jeu TV',           desc: 'À 4 joueurs : reproduction de la mécanique télé en 4 phases.', emoji: '📺', tone: 'from-amber-500 to-orange-600' },
  { to: '/multi', title: 'Frappe Express',   desc: '2 joueurs : premier à 5 bonnes réponses gagne le duel.',       emoji: '⚔️', tone: 'from-blue-500 to-cyan-600' },
  { to: '/multi', title: 'Course aux Points', desc: '2 à 15 joueurs : sois le plus rapide pour scorer un max.',    emoji: '🏁', tone: 'from-green-500 to-emerald-600' },
]

export default function Home() {
  const { state } = useGame()
  const { user, profile } = useAuth()
  const level = levelFromXP(state.totalXP)
  const grade = gradeFromLevel(level)
  const accuracy = state.totalAnswered
    ? Math.round((state.totalCorrect / state.totalAnswered) * 100)
    : 0

  return (
    <div className="space-y-6">

      {/* Hero (compact) */}
      <section className="card p-5 md:p-6 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-midi-accent/10 blur-3xl pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1 min-w-0">
            {/* Identité + Grade */}
            {user && profile ? (
              <div className="flex items-center gap-3">
                <span className="text-4xl shrink-0">{profile.avatar}</span>
                <div className="min-w-0">
                  <div className="text-slate-400 text-xs uppercase tracking-widest">Bienvenue,</div>
                  <div className="font-display text-2xl text-white leading-tight truncate">{profile.nickname}</div>
                  <div className={`flex items-center gap-1.5 text-sm font-semibold mt-0.5 ${grade.color}`}>
                    <span>{grade.emoji}</span>
                    <span className="truncate">{grade.name}</span>
                    <span className="text-slate-500 font-normal text-xs shrink-0">· Niv. {level}</span>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <span className="chip mb-2 inline-flex items-center gap-2">
                  <img src="/logo.png" className="h-5 w-5 rounded-md object-cover" alt="" />
                  Les Douze Coups de Minuit
                </span>
                <h1 className="heading text-3xl md:text-4xl">
                  Deviens un <span className="text-midi-accent">Maître de Minuit</span>
                </h1>
              </>
            )}
          </div>

          {/* CTA compact */}
          <div className="flex flex-wrap gap-2 shrink-0">
            <PublicSalonButton user={user} />
            {user
              ? <Link to="/profil" className="btn btn-ghost">Mon profil</Link>
              : <Link to="/auth" className="btn btn-ghost">Créer un compte</Link>
            }
          </div>
        </div>

        {/* Stats */}
        <div className="relative mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Niveau" value={level} accent />
          <StatCard label="XP total" value={state.totalXP.toLocaleString('fr-FR')} />
          <StatCard label="Réussite" value={`${accuracy} %`} />
          <StatCard label="Série 🔥" value={`${state.streak.current} j`} />
        </div>
      </section>

      {/* Multijoueur */}
      <section>
        <SectionTitle>🎮 Multijoueur</SectionTitle>
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

function PublicSalonButton({ user }) {
  const navigate = useNavigate()
  const { joinPublicRoom } = useRaceRoom(null)
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    if (!user) { navigate('/auth'); return }
    setLoading(true)
    const { code, error } = await joinPublicRoom()
    if (code) navigate(`/race/${code}`)
    else { setLoading(false); alert(error ?? 'Impossible de rejoindre le salon public.') }
  }

  return (
    <button onClick={handleClick} disabled={loading}
      className="btn bg-green-500 hover:bg-green-400 text-black disabled:opacity-60">
      {loading ? 'Recherche…' : '🌍 Salon public'}
    </button>
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
