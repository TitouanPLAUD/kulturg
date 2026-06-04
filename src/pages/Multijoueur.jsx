import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useTvRoom } from '../hooks/useTvRoom.js'
import {
  useRaceRoom,
  DEFAULT_RACE_SETTINGS,
  Q_COUNT_OPTIONS,
  TIMER_OPTIONS,
  DIFFICULTY_OPTIONS,
} from '../hooks/useRaceRoom.js'
import { THEME_LIST } from '../data/themes.js'

export default function Multijoueur() {
  const { user } = useAuth()

  if (!user) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center space-y-5">
        <div className="text-6xl">🔒</div>
        <h1 className="heading text-3xl">Partie perso</h1>
        <p className="text-slate-400">Connecte-toi pour créer ou rejoindre une partie privée.</p>
        <Link to="/auth" className="btn btn-primary">Se connecter</Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="heading text-4xl mb-2">Partie perso</h1>
        <p className="text-slate-500 text-sm">Crée une partie privée ou rejoins celle d'un ami avec un code</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <ModeCard
          emoji="📺"
          logo="/logos/jeu-tv.png"
          title="Jeu TV"
          subtitle="4 joueurs requis"
          description="Simulation des 12 Coups de Midi : Coup d'Envoi, Coup Fatal, Coup de Maître et Étoile Mystérieuse."
          phases={[
            { icon: '⚔️', label: 'Coup d\'Envoi',    detail: 'Élimination progressive' },
            { icon: '💀', label: 'Coup Fatal',        detail: '12 coups · −2 par erreur' },
            { icon: '🏆', label: 'Coup de Maître',    detail: 'Solo · cagnotte en jeu' },
            { icon: '⭐', label: 'Étoile Mystérieuse', detail: '5/5 requis · voiture !' },
          ]}
          accentClass="border-midi-accent/30 hover:border-midi-accent/60"
          btnClass="bg-midi-accent hover:bg-blue-400 text-white"
          useHook={() => useTvRoom(null)}
          route="tv"
        />

        <ModeCard
          emoji="🏁"
          logo="/logos/course-points.png"
          title="Course aux Points"
          subtitle="2 à 15 joueurs"
          description="Tous les joueurs voient les mêmes questions. Sois le plus rapide à répondre correctement pour scorer un maximum !"
          phases={[
            { icon: '🥇', label: '1er correct',  detail: '+5 points' },
            { icon: '🥈', label: '2e correct',   detail: '+3 points' },
            { icon: '🥉', label: '3e correct',   detail: '+2 points' },
            { icon: '✅', label: 'Autres',        detail: '+1 point · Incorrect = 0' },
          ]}
          accentClass="border-green-500/30 hover:border-green-500/60"
          btnClass="bg-green-500 hover:bg-green-400 text-black"
          useHook={() => useRaceRoom(null)}
          route="race"
          customizable
        />
      </div>
    </div>
  )
}

function ModeCard({ emoji, logo, title, subtitle, description, phases, accentClass, btnClass, useHook, route, customizable }) {
  const navigate = useNavigate()
  const [joinCode, setJoinCode] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const { createRoom, joinRoom } = useHook()

  async function handleCreate(settings) {
    setShowSettings(false)
    setLoading(true); setError('')
    const code = await createRoom(settings ? { settings } : undefined)
    if (code) navigate(`/${route}/${code}`)
    else { setError('Erreur lors de la création.'); setLoading(false) }
  }

  async function handleJoin(e) {
    e.preventDefault()
    setLoading(true); setError('')
    const { code, error: err } = await joinRoom(joinCode.trim())
    if (err) { setError(err); setLoading(false); return }
    navigate(`/${route}/${code}`)
    setLoading(false)
  }

  return (
    <div className={`card p-6 border transition-colors flex flex-col gap-5 ${accentClass}`}>
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          {logo
            ? <img src={logo} alt={title} className="w-12 h-12 rounded-xl object-cover shadow-lg" draggable={false} />
            : <span className="text-4xl">{emoji}</span>}
          <div>
            <h2 className="font-display text-2xl tracking-wider">{title}</h2>
            <p className="text-xs text-slate-500">{subtitle}</p>
          </div>
        </div>
        <p className="text-sm text-slate-400 leading-relaxed">{description}</p>
      </div>

      {/* Phases */}
      <div className="space-y-1.5">
        {phases.map(p => (
          <div key={p.label} className="flex items-center gap-2 text-sm">
            <span>{p.icon}</span>
            <span className="font-medium text-slate-300">{p.label}</span>
            <span className="text-slate-600 text-xs">· {p.detail}</span>
          </div>
        ))}
      </div>

      {error && (
        <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-3 mt-auto">
        <button onClick={() => customizable ? setShowSettings(true) : handleCreate()} disabled={loading}
          className={`w-full py-3 rounded-xl font-bold transition disabled:opacity-60 ${btnClass}`}>
          {loading ? '…' : customizable ? '⚙️ Créer une partie personnalisée' : '🔒 Créer une partie privée'}
        </button>

        <form onSubmit={handleJoin} className="flex gap-2">
          <input
            className="input flex-1 uppercase tracking-widest text-center font-mono"
            placeholder="Code…"
            maxLength={6}
            value={joinCode}
            onChange={e => setJoinCode(e.target.value.toUpperCase())}
          />
          <button type="submit" disabled={loading || joinCode.length < 6}
            className="btn btn-ghost px-4 disabled:opacity-40">
            Rejoindre
          </button>
        </form>
      </div>

      {showSettings && (
        <RaceSettingsModal
          onClose={() => setShowSettings(false)}
          onCreate={handleCreate}
          loading={loading}
        />
      )}
    </div>
  )
}

// ─── Modal de réglages d'une partie personnalisée (Course aux Points) ──
function RaceSettingsModal({ onClose, onCreate, loading }) {
  const [themes,     setThemes]     = useState(DEFAULT_RACE_SETTINGS.themes)
  const [difficulty, setDifficulty] = useState(DEFAULT_RACE_SETTINGS.difficulty)
  const [duration,   setDuration]   = useState(DEFAULT_RACE_SETTINGS.duration)
  const [count,      setCount]      = useState(DEFAULT_RACE_SETTINGS.count)

  function toggleTheme(id) {
    setThemes(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id])
  }

  function submit() {
    onCreate({ themes, difficulty, duration, count })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}>
      <div className="game-modal bg-[#0c1018] border border-green-500/20 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto space-y-6 animate-pop"
        onClick={e => e.stopPropagation()}>
        <div className="text-center">
          <div className="text-4xl mb-1">⚙️🏁</div>
          <h2 className="font-display text-2xl tracking-wider">Réglages de la partie</h2>
          <p className="text-xs text-slate-500 mt-1">Personnalise ta Course aux Points</p>
        </div>

        {/* Thèmes */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Thèmes des questions</label>
            <button onClick={() => setThemes([])}
              className={`text-xs ${themes.length === 0 ? 'text-green-400' : 'text-slate-500 hover:text-white'}`}>
              Tous
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {THEME_LIST.map(t => {
              const active = themes.includes(t.id)
              return (
                <button key={t.id} onClick={() => toggleTheme(t.id)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition
                    ${active
                      ? 'bg-green-500/20 border-green-500/50 text-green-300'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/30'}`}>
                  {t.emoji} {t.label}
                </button>
              )
            })}
          </div>
          <p className="text-xs text-slate-600 mt-2">
            {themes.length === 0 ? 'Tous les thèmes seront utilisés.' : `${themes.length} thème${themes.length > 1 ? 's' : ''} sélectionné${themes.length > 1 ? 's' : ''}.`}
          </p>
        </div>

        {/* Difficulté */}
        <div>
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2 block">Difficulté</label>
          <div className="grid grid-cols-4 gap-2">
            {DIFFICULTY_OPTIONS.map(d => (
              <button key={String(d.value)} onClick={() => setDifficulty(d.value)}
                className={`py-2.5 rounded-xl text-sm font-medium border transition flex flex-col items-center gap-1
                  ${difficulty === d.value
                    ? 'bg-green-500/20 border-green-500/50 text-green-300'
                    : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/30'}`}>
                <span className="text-lg">{d.emoji}</span>
                <span className="text-xs">{d.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Durée par question */}
        <div>
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2 block">Durée par question</label>
          <div className="grid grid-cols-4 gap-2">
            {TIMER_OPTIONS.map(s => (
              <button key={s} onClick={() => setDuration(s)}
                className={`py-2.5 rounded-xl text-sm font-bold border transition
                  ${duration === s
                    ? 'bg-green-500/20 border-green-500/50 text-green-300'
                    : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/30'}`}>
                {s}s
              </button>
            ))}
          </div>
        </div>

        {/* Nombre de questions */}
        <div>
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2 block">Nombre de questions</label>
          <div className="grid grid-cols-4 gap-2">
            {Q_COUNT_OPTIONS.map(n => (
              <button key={n} onClick={() => setCount(n)}
                className={`py-2.5 rounded-xl text-sm font-bold border transition
                  ${count === n
                    ? 'bg-green-500/20 border-green-500/50 text-green-300'
                    : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/30'}`}>
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white font-semibold transition text-sm">
            Annuler
          </button>
          <button onClick={submit} disabled={loading}
            className="flex-1 py-3 rounded-xl bg-green-500 hover:bg-green-400 text-black font-bold transition disabled:opacity-60">
            {loading ? '…' : '🏁 Créer la partie'}
          </button>
        </div>
      </div>
    </div>
  )
}
