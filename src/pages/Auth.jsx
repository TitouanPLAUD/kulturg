import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../context/AuthContext.jsx'
import SchoolPicker from '../components/SchoolPicker.jsx'
import { DEFAULT_AVATAR } from '../data/avatars.js'

export default function Auth() {
  const { user } = useAuth()
  const [mode, setMode]       = useState('login')
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [nickname, setNickname] = useState('')
  const [country, setCountry] = useState('')
  const [city, setCity]       = useState('')
  const [school, setSchool]   = useState(null)
  const [error, setError]     = useState('')
  const [info, setInfo]       = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  // Déjà connecté → redirection
  useEffect(() => {
    if (user) navigate('/', { replace: true })
  }, [user, navigate])

  function reset() {
    setError('')
    setInfo('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    reset()
    setLoading(true)

    try {
      if (mode === 'signup') {
        if (password !== confirm) {
          setError('Les mots de passe ne correspondent pas.')
          return
        }
        if (nickname.trim().length < 2) {
          setError('Le pseudo doit faire au moins 2 caractères.')
          return
        }
        const { data: signUpData, error: err } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { nickname: nickname.trim() } },
        })
        if (err) throw err
        // Persist extra profile fields (trigger already created the row)
        if (signUpData?.user) {
          await supabase.from('profiles').update({
            avatar:  DEFAULT_AVATAR,
            country: country.trim() || null,
            city:    city.trim()    || null,
            school:  school || null,
            // Rétrocompatibilité : on garde is_icam à true si l'école choisie est l'ICAM
            is_icam: school === 'icam',
          }).eq('id', signUpData.user.id)
        }
        setInfo('Inscription réussie ! Vérifie ta boîte mail pour confirmer ton compte.')
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password })
        if (err) throw err
        navigate('/')
      }
    } catch (err) {
      setError(translateError(err.message))
    } finally {
      setLoading(false)
    }
  }

  function translateError(msg) {
    if (msg.includes('Invalid login credentials')) return 'Email ou mot de passe incorrect.'
    if (msg.includes('Email not confirmed')) return 'Confirme ton email avant de te connecter.'
    if (msg.includes('User already registered')) return 'Un compte existe déjà avec cet email.'
    if (msg.includes('Password should be at least')) return 'Le mot de passe doit faire au moins 6 caractères.'
    return msg
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 font-display text-3xl mb-2">
            <img src="/logo.png" alt="Logo" className="h-10 w-10 rounded-xl object-cover shadow-lg" />
            Les Douze Coups de Minuit
          </Link>
          <p className="text-slate-400 mt-2">
            {mode === 'login' ? 'Connecte-toi à ton compte' : 'Crée ton compte'}
          </p>
        </div>

        <div className="card p-8">
          <div className="flex rounded-lg overflow-hidden border border-white/10 mb-6">
            <button
              onClick={() => { setMode('login'); reset() }}
              className={`flex-1 py-2 text-sm font-medium transition ${mode === 'login' ? 'bg-midi-accent text-white' : 'text-slate-300 hover:bg-white/5'}`}
            >
              Connexion
            </button>
            <button
              onClick={() => { setMode('signup'); reset() }}
              className={`flex-1 py-2 text-sm font-medium transition ${mode === 'signup' ? 'bg-midi-accent text-white' : 'text-slate-300 hover:bg-white/5'}`}
            >
              Inscription
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-sm text-slate-300 mb-1">Pseudo</label>
                <input
                  className="input w-full"
                  type="text"
                  placeholder="Ton pseudo (2–20 caractères)"
                  value={nickname}
                  onChange={e => setNickname(e.target.value)}
                  minLength={2}
                  maxLength={20}
                  required
                  autoComplete="username"
                />
              </div>
            )}

            <div>
              <label className="block text-sm text-slate-300 mb-1">Email</label>
              <input
                className="input w-full"
                type="email"
                placeholder="ton@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-300 mb-1">Mot de passe</label>
              <input
                className="input w-full"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              />
            </div>

            {mode === 'signup' && (
              <div>
                <label className="block text-sm text-slate-300 mb-1">Confirmer le mot de passe</label>
                <input
                  className="input w-full"
                  type="password"
                  placeholder="••••••••"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>
            )}

            {mode === 'signup' && (
              <div className="space-y-3 pt-1 border-t border-white/10">
                <p className="text-xs text-slate-500 pt-1">Localisation <span className="opacity-60">(optionnel, pour le classement)</span></p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-slate-300 mb-1">Pays</label>
                    <input
                      className="input w-full"
                      type="text"
                      placeholder="France"
                      value={country}
                      onChange={e => setCountry(e.target.value)}
                      maxLength={50}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-300 mb-1">Ville</label>
                    <input
                      className="input w-full"
                      type="text"
                      placeholder="Paris"
                      value={city}
                      onChange={e => setCity(e.target.value)}
                      maxLength={50}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-1">École <span className="text-slate-500">(pour le classement inter-écoles 🏆)</span></label>
                  <SchoolPicker value={school} onChange={setSchool} />
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-lg bg-red-500/15 border border-red-500/30 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            {info && (
              <div className="rounded-lg bg-green-500/15 border border-green-500/30 px-4 py-3 text-sm text-green-300">
                {info}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading
                ? 'Chargement…'
                : mode === 'login' ? 'Se connecter' : 'Créer mon compte'
              }
            </button>
          </form>
        </div>

        <p className="text-center text-slate-500 text-sm mt-6">
          <Link to="/" className="hover:text-slate-300 transition">← Retour à l'accueil</Link>
        </p>
      </div>
    </div>
  )
}
