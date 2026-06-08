import { useAuth } from '../context/AuthContext.jsx'

export default function BanScreen() {
  const { profile, signOut } = useAuth()
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-midi-bg text-center">
      <div className="max-w-md space-y-5">
        <div className="text-7xl">🚫</div>
        <h1 className="font-display text-3xl tracking-wider text-red-400">Compte suspendu</h1>
        <p className="text-slate-400">
          Ton accès aux Douze Coups de Minuit a été suspendu par l'administration.
        </p>
        {profile?.ban_reason && (
          <p className="text-sm text-slate-300 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
            <span className="text-slate-500">Motif :</span> {profile.ban_reason}
          </p>
        )}
        <p className="text-xs text-slate-600">
          Si tu penses qu'il s'agit d'une erreur, contacte l'équipe.
        </p>
        <button onClick={signOut}
          className="btn btn-ghost text-sm px-4 py-2">
          Se déconnecter
        </button>
      </div>
    </div>
  )
}
