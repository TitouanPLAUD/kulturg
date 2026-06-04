import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useTvRoom } from '../hooks/useTvRoom.js'

export default function TvLanding() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const { createRoom, joinRoom } = useTvRoom(null)
  const [joinCode, setJoinCode] = useState('')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  async function handleCreate() {
    if (!user) return
    setLoading(true)
    setError('')
    const code = await createRoom()
    if (code) navigate(`/tv/${code}`)
    else setError('Erreur lors de la création de la salle.')
    setLoading(false)
  }

  async function handleJoin(e) {
    e.preventDefault()
    if (!user) return
    setLoading(true)
    setError('')
    const { code, error: err } = await joinRoom(joinCode.trim())
    if (err) { setError(err); setLoading(false); return }
    navigate(`/tv/${code}`)
    setLoading(false)
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center space-y-5">
        <img src="/logos/jeu-tv.png" alt="Jeu TV" className="w-20 h-20 rounded-2xl object-cover mx-auto shadow-lg" draggable={false} />
        <h1 className="heading text-3xl">Jeu TV</h1>
        <p className="text-slate-400">Connecte-toi pour rejoindre ou créer une partie multijoueur.</p>
        <Link to="/auth" className="btn btn-primary">Se connecter</Link>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto space-y-8 mt-6">

      {/* Header */}
      <div className="text-center">
        <img src="/logos/jeu-tv.png" alt="Jeu TV" className="w-20 h-20 rounded-2xl object-cover mx-auto mb-3 shadow-lg" draggable={false} />
        <h1 className="heading text-4xl">Jeu TV</h1>
        <p className="text-slate-400 mt-2 text-sm">
          Simulation des 12 Coups de Midi — jusqu'à 4 joueurs
        </p>
      </div>

      {/* Phases */}
      <div className="card p-5 space-y-3">
        <h2 className="font-semibold text-slate-300 text-sm uppercase tracking-wider">Déroulement</h2>
        {[
          { emoji: '🔥', label: 'Tour de chauffe',    desc: '5 questions QCM · 15 secondes chacune' },
          { emoji: '🎯', label: 'Coup de Maître',     desc: 'Personnalité avec indices progressifs' },
          { emoji: '⚡', label: 'Sprint Final',        desc: '8 questions rapides · 8 secondes' },
          { emoji: '🏆', label: 'Podium',              desc: 'Le meilleur devient Maître de Midi !' },
        ].map(p => (
          <div key={p.label} className="flex items-center gap-3">
            <span className="text-xl w-7">{p.emoji}</span>
            <div>
              <span className="font-medium text-sm">{p.label}</span>
              <span className="text-slate-500 text-xs ml-2">{p.desc}</span>
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="rounded-lg bg-red-500/15 border border-red-500/30 px-4 py-3 text-sm text-red-300 text-center">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="grid sm:grid-cols-2 gap-4">
        {/* Créer */}
        <div className="card p-5 flex flex-col gap-3">
          <div className="text-2xl">🎮</div>
          <div>
            <div className="font-semibold">Créer une partie</div>
            <div className="text-xs text-slate-400 mt-0.5">Tu seras l'hôte et tu lanceras la partie.</div>
          </div>
          <button
            onClick={handleCreate}
            disabled={loading}
            className="btn btn-primary mt-auto disabled:opacity-60">
            Créer
          </button>
        </div>

        {/* Rejoindre */}
        <div className="card p-5 flex flex-col gap-3">
          <div className="text-2xl">🚪</div>
          <div>
            <div className="font-semibold">Rejoindre</div>
            <div className="text-xs text-slate-400 mt-0.5">Entre le code de la salle (6 lettres).</div>
          </div>
          <form onSubmit={handleJoin} className="flex flex-col gap-2 mt-auto">
            <input
              className="input w-full uppercase tracking-widest text-center font-mono text-lg"
              placeholder="ABC123"
              maxLength={6}
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
            />
            <button
              type="submit"
              disabled={loading || joinCode.length < 6}
              className="btn btn-secondary disabled:opacity-60">
              Rejoindre
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
