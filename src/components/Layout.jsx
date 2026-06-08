import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useGame, levelFromXP, nextLevelThreshold } from '../context/GameContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { ChatWidgetProvider } from '../context/ChatWidgetContext.jsx'
import ChatWidget from './ChatWidget.jsx'
import Avatar from './Avatar.jsx'
import FeedbackButton from './FeedbackButton.jsx'
import TestBanner from './TestBanner.jsx'

const navLinks = [
  { to: '/',           label: 'Accueil',      emoji: '🏠', end: true },
  { to: '/multi',      label: 'Partie perso', emoji: '🔒' },
  { to: '/classement', label: 'Classement',   emoji: '🏆' },
  { to: '/reglages',   label: 'Réglages',     emoji: '⚙️' },
]

const authLinks = [
  { to: '/amis', label: 'Amis', emoji: '👥' },
]

function NavItem({ to, label, emoji, end = false }) {
  return (
    <NavLink to={to} end={end}
      className={({ isActive }) =>
        `px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition
        ${isActive ? 'bg-white/10 text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`
      }>
      <span className="mr-1">{emoji}</span>{label}
    </NavLink>
  )
}

export default function Layout() {
  const { state } = useGame()
  const { user, profile, signOut, isFounder } = useAuth()
  const navigate = useNavigate()

  const level = levelFromXP(state.totalXP)
  const next = nextLevelThreshold(state.totalXP)
  const progress = next > 0 ? Math.min(100, (state.totalXP / next) * 100) : 100

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  return (
    <ChatWidgetProvider>
    <div className="min-h-screen flex flex-col">
      <TestBanner />
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-midi-bg/80 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">

          {/* Logo */}
          <NavLink to="/" className="flex items-center gap-2 font-display text-2xl shrink-0">
            <img src="/logo.png" alt="Logo" className="h-9 w-9 rounded-xl object-cover shadow-lg shadow-midi-accent/20" />
            <span className="hidden sm:block">Les Douze Coups de Minuit</span>
          </NavLink>

          {/* Nav desktop */}
          <nav className="ml-4 hidden md:flex items-center gap-0.5">
            {navLinks.map(l => <NavItem key={l.to} {...l} end={l.end} />)}
            {user && authLinks.map(l => <NavItem key={l.to} {...l} />)}
            {isFounder && <NavItem to="/admin" label="Admin" emoji="🛡️" />}
          </nav>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Zone utilisateur */}
          {user ? (
            <div className="flex items-center gap-2">
              <NavLink to="/profil"
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/5 transition">
                <span className="text-slate-400 text-xs">{profile?.nickname ?? ''}</span>
                <Avatar value={profile?.avatar} size={26} className="text-xl leading-none" />
              </NavLink>
              <div className="hidden sm:block text-right">
                <div className="text-xs text-slate-500">Niv. {level}</div>
                <div className="text-xs font-semibold text-midi-accent">{state.totalXP} XP</div>
              </div>
              <button
                onClick={handleSignOut}
                className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:bg-white/5 hover:text-white transition">
                Déco
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="hidden sm:block text-right">
                <div className="text-xs text-slate-500">Niv. {level}</div>
                <div className="text-xs font-semibold text-midi-accent">{state.totalXP} XP</div>
              </div>
              <NavLink to="/auth"
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-midi-accent text-white hover:bg-blue-400 transition">
                Connexion
              </NavLink>
            </div>
          )}
        </div>

        {/* Barre XP */}
        <div className="h-0.5 bg-white/5">
          <div className="h-full bg-gradient-to-r from-midi-accent to-blue-600 transition-all duration-700"
            style={{ width: `${progress}%` }} />
        </div>

        {/* Nav mobile */}
        <nav className="md:hidden flex items-center gap-0.5 overflow-x-auto scrollbar-thin px-3 py-2 border-t border-white/5">
          {navLinks.map(l => <MobileLink key={l.to} to={l.to} label={l.emoji} end={l.end} />)}
          {user && authLinks.map(l => <MobileLink key={l.to} to={l.to} label={l.emoji} />)}
          {isFounder && <MobileLink to="/admin" label="🛡️" />}
        </nav>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        <Outlet />
      </main>

      <footer className="border-t border-white/10 mt-12">
        <div className="max-w-7xl mx-auto px-4 py-6 text-center text-slate-600 text-xs">
          Les Douze Coups de Minuit — quiz de culture générale
        </div>
      </footer>

      <ChatWidget />
      <FeedbackButton />
    </div>
    </ChatWidgetProvider>
  )
}

function MobileLink({ to, label, end }) {
  return (
    <NavLink to={to} end={end}
      className={({ isActive }) =>
        `px-3 py-1.5 rounded-lg text-base whitespace-nowrap transition ${isActive ? 'bg-white/10' : 'hover:bg-white/5'}`
      }>
      {label}
    </NavLink>
  )
}
