import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMultiplayer, randomAvatar } from '../context/MultiplayerContext'
import { THEME_LIST, DIFFICULTY } from '../data/themes'

const AVATARS = ['🎭', '🦁', '🐯', '🦊', '🐺', '🦝', '🐸', '🦄', '🐲', '🦋',
  '🌟', '🔥', '⚡', '🌈', '🎯', '🚀', '🎸', '🏆', '💎', '🎩']

const MODES = [
  { id: 'qcm', label: 'QCM', emoji: '❓', desc: '10 questions, 20 s chacune' },
]

export default function MultiplayerHub() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { player, setNickname, createRoom, joinRoom } = useMultiplayer()

  // Pré-remplissage depuis le lien de partage (?code=ABC123)
  const codeFromUrl = searchParams.get('code') ?? ''

  const [tab, setTab] = useState(codeFromUrl ? 'join' : 'create')
  const [nickname, setNicknameInput] = useState(player?.nickname ?? '')
  const [avatar, setAvatar] = useState(player?.avatar ?? randomAvatar())
  const [identityDone, setIdentityDone] = useState(!!player)

  const [mode, setMode] = useState('qcm')
  const [theme, setTheme] = useState('all')
  const [difficulty, setDifficulty] = useState(0)

  const [joinCode, setJoinCode] = useState(codeFromUrl)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleIdentity(e) {
    e.preventDefault()
    if (nickname.trim().length < 2) return
    setLoading(true)
    try {
      await setNickname(nickname.trim(), avatar)
      setIdentityDone(true)
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  async function handleCreate(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const room = await createRoom({ mode, theme: theme === 'all' ? null : theme, difficulty: difficulty || null })
      navigate(`/multijoueur/lobby/${room.code}`)
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  async function handleJoin(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const room = await joinRoom(joinCode)
      navigate(`/multijoueur/lobby/${room.code}`)
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  if (!identityDone) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="text-5xl mb-3">🎮</div>
            <h1 className="font-display text-4xl text-white">Multijoueur</h1>
            <p className="text-slate-400 mt-2">Choisissez votre identité avant de jouer</p>
          </div>

          <form onSubmit={handleIdentity} className="bg-slate-800 rounded-2xl p-6 space-y-6">
            <div>
              <label className="text-sm font-medium text-slate-300 block mb-2">Votre pseudo</label>
              <input
                type="text"
                value={nickname}
                onChange={e => setNicknameInput(e.target.value)}
                placeholder="Ex: SuperJoueur42"
                maxLength={20}
                minLength={2}
                className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-500"
                autoFocus
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300 block mb-3">Votre avatar</label>
              <div className="grid grid-cols-10 gap-2">
                {AVATARS.map(a => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setAvatar(a)}
                    className={`text-2xl rounded-lg p-1 transition-all ${avatar === a ? 'bg-indigo-600 scale-110' : 'hover:bg-slate-700'}`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="text-rose-400 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={nickname.trim().length < 2 || loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all"
            >
              {loading ? 'Chargement…' : 'Continuer →'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🎮</div>
          <h1 className="font-display text-4xl text-white">Multijoueur</h1>
          <p className="text-slate-400 mt-1">
            Connecté en tant que{' '}
            <span className="text-white font-semibold">{player.avatar} {player.nickname}</span>
          </p>
        </div>

        {/* Tabs */}
        <div className="flex bg-slate-800 rounded-xl p-1 mb-6">
          {[
            { id: 'create', label: '🆕 Créer une partie' },
            { id: 'join', label: '🔗 Rejoindre une partie' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setError('') }}
              className={`flex-1 py-2.5 rounded-lg font-semibold text-sm transition-all ${tab === t.id ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Create */}
        {tab === 'create' && (
          <form onSubmit={handleCreate} className="bg-slate-800 rounded-2xl p-6 space-y-6">
            <div>
              <label className="text-sm font-medium text-slate-300 block mb-3">Mode de jeu</label>
              <div className="grid gap-3">
                {MODES.map(m => (
                  <label key={m.id} className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${mode === m.id ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-700 hover:border-slate-600'}`}>
                    <input type="radio" name="mode" value={m.id} checked={mode === m.id} onChange={() => setMode(m.id)} className="sr-only" />
                    <span className="text-3xl">{m.emoji}</span>
                    <div>
                      <div className="font-bold text-white">{m.label}</div>
                      <div className="text-slate-400 text-sm">{m.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300 block mb-2">Thème</label>
              <select
                value={theme}
                onChange={e => setTheme(e.target.value)}
                className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">🌐 Tous les thèmes</option>
                {THEME_LIST.map(t => (
                  <option key={t.id} value={t.id}>{t.emoji} {t.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300 block mb-2">Difficulté</label>
              <div className="flex gap-2">
                {[{ v: 0, label: 'Toutes' }, { v: 1, label: 'Facile' }, { v: 2, label: 'Moyen' }, { v: 3, label: 'Difficile' }].map(d => (
                  <button
                    key={d.v}
                    type="button"
                    onClick={() => setDifficulty(d.v)}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${difficulty === d.v ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-400 hover:text-white'}`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="text-rose-400 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white font-bold py-4 rounded-xl text-lg transition-all shadow-lg"
            >
              {loading ? 'Création…' : '🚀 Créer la partie'}
            </button>
          </form>
        )}

        {/* Join */}
        {tab === 'join' && (
          <form onSubmit={handleJoin} className="bg-slate-800 rounded-2xl p-6 space-y-6">
            <div className="text-center py-4">
              <div className="text-6xl mb-4">🔗</div>
              <p className="text-slate-300">Entrez le code de la partie que vous souhaitez rejoindre</p>
            </div>

            <div>
              <input
                type="text"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase().trim())}
                placeholder="Ex : ABC123"
                maxLength={6}
                className="w-full bg-slate-700 text-white text-center text-3xl font-display tracking-[0.3em] rounded-xl px-4 py-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-600 uppercase"
                autoFocus
              />
            </div>

            {error && <p className="text-rose-400 text-sm text-center">{error}</p>}

            <button
              type="submit"
              disabled={joinCode.length < 4 || loading}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-bold py-4 rounded-xl text-lg transition-all shadow-lg"
            >
              {loading ? 'Connexion…' : '✅ Rejoindre la partie'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
