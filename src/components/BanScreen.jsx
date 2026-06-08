import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext.jsx'

function formatRemaining(until) {
  const ms = until.getTime() - Date.now()
  if (ms <= 0) return '0s'
  const s = Math.floor(ms / 1000)
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (d > 0) return `${d}j ${h}h ${m}min`
  if (h > 0) return `${h}h ${m}min`
  if (m > 0) return `${m}min ${sec}s`
  return `${sec}s`
}

export default function BanScreen({ ban = {} }) {
  const { profile, signOut } = useAuth()
  const { permanent, until, reason } = ban
  const [, tick] = useState(0)

  // Rafraîchit le compte à rebours chaque seconde pour un timeout
  useEffect(() => {
    if (permanent || !until) return
    const i = setInterval(() => tick(x => x + 1), 1000)
    return () => clearInterval(i)
  }, [permanent, until])

  return (
    <div className="min-h-screen flex items-center justify-center px-4 text-center" style={{ background: 'var(--bg-base, #0a0f1e)' }}>
      <div className="max-w-md space-y-5">
        <div className="text-7xl">{permanent ? '🚫' : '⏳'}</div>
        <h1 className="font-display text-3xl tracking-wider text-red-400">
          {permanent ? 'Compte suspendu' : 'Tu as pris une rouste'}
        </h1>

        {permanent ? (
          <p className="text-slate-400">
            Ton accès aux Douze Coups de Minuit a été suspendu par l'administration.
          </p>
        ) : (
          <p className="text-slate-400">
            Tu es temporairement exclu. Reviens dans :
          </p>
        )}

        {!permanent && until && (
          <div className="font-display text-4xl text-white tabular-nums">
            {formatRemaining(until)}
          </div>
        )}

        {reason && (
          <p className="text-sm text-slate-300 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
            <span className="text-slate-500">Motif :</span> {reason}
          </p>
        )}

        <p className="text-xs text-slate-600">
          {permanent
            ? 'Si tu penses qu\'il s\'agit d\'une erreur, contacte l\'équipe.'
            : 'La page se débloquera automatiquement à la fin du timeout.'}
        </p>

        <button onClick={signOut} className="btn btn-ghost text-sm px-4 py-2">
          Se déconnecter
        </button>
      </div>
    </div>
  )
}
