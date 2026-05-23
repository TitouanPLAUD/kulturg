import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useGame, levelFromXP, nextLevelThreshold } from '../context/GameContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'

const links = [
  { to: '/', label: 'Accueil', emoji: '🏠' },
  { to: '/qcm', label: 'QCM', emoji: '❓' },
  { to: '/duel', label: 'Duel', emoji: '⚔️' },
  { to: '/coup-de-maitre', label: 'Coup de Maître', emoji: '🎯' },
  { to: '/mot', label: 'Mot Mystérieux', emoji: '🔤' },
  { to: '/etoile', label: 'Étoile Mystérieuse', emoji: '⭐' },
  { to: '/revision', label: 'Révision', emoji: '🃏' },
  { to: '/profil', label: 'Profil', emoji: '👤' },
  { to: '/admin', label: 'Admin', emoji: '⚙️' },
]

export default function Layout() {
  const { state } = useGame()
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const level = levelFromXP(state.totalXP)
  const next = nextLevelThreshold(state.totalXP)
  const progress = next === 0 ? 100 : Math.min(100, ((state.totalXP - (next === 100 ? 0 : 0)) / next) * 100)

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-midi-bg/70 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          <NavLink to="/" className="flex items-center gap-2 font-display text-2xl">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-midi-accent text-slate-900 shadow-lg">K</span>
            <span>KulturG</span>
          </NavLink>
          <nav className="ml-auto hidden md:flex items-center gap-1 overflow-x-auto scrollbar-thin">
            {links.map(l => (
              <NavLink key={l.to} to={l.to} end={l.to === '/'}
                className={({ isActive }) =>
                  `px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${isActive ? 'bg-white/10 text-white' : 'text-slate-300 hover:bg-white/5'}`
                }>
                <span className="mr-1.5">{l.emoji}</span>{l.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-3 ml-2">
            {user ? (
              <>
                <div className="text-right hidden sm:block">
                  <div className="text-xs text-slate-400 truncate max-w-[120px]">{profile?.nickname ?? user.email}</div>
                  <div className="text-sm font-semibold text-midi-accent">{state.totalXP} XP</div>
                </div>
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-midi-accent to-amber-600 grid place-items-center font-display text-lg text-slate-900 shadow-lg select-none">
                  {profile?.avatar ?? '🎭'}
                </div>
                <button
                  onClick={handleSignOut}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:bg-white/5 hover:text-white transition"
                >
                  Déconnexion
                </button>
              </>
            ) : (
              <>
                <div className="text-right hidden sm:block">
                  <div className="text-xs text-slate-400">Niveau {level}</div>
                  <div className="text-sm font-semibold text-midi-accent">{state.totalXP} XP</div>
                </div>
                <NavLink
                  to="/auth"
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-midi-accent text-slate-900 hover:bg-amber-400 transition"
                >
                  Connexion
                </NavLink>
              </>
            )}
          </div>
        </div>
        <div className="h-1 bg-white/5">
          <div className="h-full bg-gradient-to-r from-midi-accent to-amber-500 transition-all" style={{ width: `${progress}%` }} />
        </div>
        <nav className="md:hidden flex items-center gap-1 overflow-x-auto scrollbar-thin px-3 py-2 border-t border-white/5">
          {links.map(l => (
            <NavLink key={l.to} to={l.to} end={l.to === '/'}
              className={({ isActive }) => `px-3 py-1.5 rounded-lg text-xs whitespace-nowrap ${isActive ? 'bg-white/10 text-white' : 'text-slate-300'}`}>
              {l.emoji} {l.label}
            </NavLink>
          ))}
          {user && (
            <button
              onClick={handleSignOut}
              className="px-3 py-1.5 rounded-lg text-xs text-slate-400 whitespace-nowrap ml-auto"
            >
              Déconnexion
            </button>
          )}
        </nav>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        <Outlet />
      </main>

      <footer className="border-t border-white/10 mt-12">
        <div className="max-w-7xl mx-auto px-4 py-6 text-center text-slate-400 text-sm">
          KulturG — entraînement culture générale inspiré des 12 Coups de Midi
        </div>
      </footer>
    </div>
  )
}
