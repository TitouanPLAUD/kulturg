import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useTvRoom } from '../hooks/useTvRoom.js'
import { useDuelRoom } from '../hooks/useDuelRoom.js'
import { useRaceRoom } from '../hooks/useRaceRoom.js'

export default function Multijoueur() {
  const { user } = useAuth()

  if (!user) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center space-y-5">
        <div className="text-6xl">🎮</div>
        <h1 className="heading text-3xl">Multijoueur</h1>
        <p className="text-slate-400">Connecte-toi pour créer ou rejoindre une partie.</p>
        <Link to="/auth" className="btn btn-primary">Se connecter</Link>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="heading text-4xl mb-2">Multijoueur</h1>
        <p className="text-slate-500 text-sm">Choisis ton mode de jeu</p>
      </div>

      <PublicSalonBanner />

      <div className="grid md:grid-cols-3 gap-6">
        <ModeCard
          emoji="📺"
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
          emoji="⚔️"
          title="Frappe Express"
          subtitle="2 joueurs requis"
          description="Face à face ! Premier à 5 bonnes réponses gagne. Réponds vite — la première bonne réponse rapporte le point."
          phases={[
            { icon: '⚡', label: 'Simultané',         detail: 'Même question en même temps' },
            { icon: '🎯', label: '1er correct',        detail: 'Remporte le point' },
            { icon: '🔒', label: 'Mauvaise réponse',   detail: 'Bloqué pour ce tour' },
            { icon: '🏆', label: 'Premier à 5',        detail: 'Gagne le duel' },
          ]}
          accentClass="border-blue-500/30 hover:border-blue-500/60"
          btnClass="bg-blue-500 hover:bg-blue-400 text-white"
          useHook={() => useDuelRoom(null)}
          route="pvp"
        />

        <ModeCard
          emoji="🏁"
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
        />
      </div>
    </div>
  )
}

function PublicSalonBanner() {
  const navigate = useNavigate()
  const { joinPublicRoom } = useRaceRoom(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  async function handleJoin() {
    setLoading(true); setError('')
    const { code, error: err } = await joinPublicRoom()
    if (err) { setError(err); setLoading(false); return }
    navigate(`/race/${code}`)
  }

  return (
    <div className="card p-6 border border-green-500/30 bg-green-500/5 flex flex-col sm:flex-row items-center gap-5">
      <div className="text-5xl">🌍</div>
      <div className="flex-1 text-center sm:text-left">
        <h2 className="font-display text-2xl tracking-wider">Salon public · Course aux Points</h2>
        <p className="text-sm text-slate-400 mt-1">
          Aucun code requis — rejoins instantanément une partie et affronte des joueurs du monde entier.
        </p>
        {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
      </div>
      <button onClick={handleJoin} disabled={loading}
        className="shrink-0 px-6 py-3 rounded-xl font-bold bg-green-500 hover:bg-green-400 text-black transition disabled:opacity-60">
        {loading ? 'Recherche…' : '🏁 Rejoindre'}
      </button>
    </div>
  )
}

function ModeCard({ emoji, title, subtitle, description, phases, accentClass, btnClass, useHook, route }) {
  const navigate = useNavigate()
  const [joinCode, setJoinCode] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const { createRoom, joinRoom } = useHook()

  async function handleCreate() {
    setLoading(true); setError('')
    const code = await createRoom()
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
          <span className="text-4xl">{emoji}</span>
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
        <button onClick={handleCreate} disabled={loading}
          className={`w-full py-3 rounded-xl font-bold transition disabled:opacity-60 ${btnClass}`}>
          {loading ? '…' : '+ Créer une partie'}
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
    </div>
  )
}
