import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMultiplayer } from '../context/MultiplayerContext'
import { useAllQuestions, useQuestionsLoaded } from '../hooks/useQuestions'
import { THEMES, DIFFICULTY } from '../data/themes'
import { pick, shuffle } from '../utils/helpers.js'

const QUESTION_COUNT = 10

export default function Lobby() {
  const { code } = useParams()
  const navigate = useNavigate()
  const { player, room, roomPlayers, startGame, leaveRoom } = useMultiplayer()
  const ALL = useAllQuestions()
  const questionsLoaded = useQuestionsLoaded()
  const [starting, setStarting] = useState(false)
  const [copied, setCopied] = useState(false)

  const isHost = room?.host_id === player?.id

  // Redirige quand la partie commence
  useEffect(() => {
    if (room?.status === 'playing') {
      navigate(`/multijoueur/jeu/${room.code}`)
    }
  }, [room?.status, room?.code, navigate])

  // Redirige si la room disparaît (host parti)
  useEffect(() => {
    if (!room && player) {
      navigate('/multijoueur')
    }
  }, [room, player, navigate])

  function copyCode() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function copyLink() {
    navigator.clipboard.writeText(`${window.location.origin}/multijoueur?code=${code}`).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  async function handleStart() {
    setStarting(true)
    // Prépare les questions selon les paramètres de la salle
    let pool = ALL
    if (room.theme) pool = pool.filter(q => q.theme === room.theme)
    if (room.difficulty) pool = pool.filter(q => q.difficulty === room.difficulty)
    if (!pool.length) pool = ALL
    const questions = pick(pool, Math.min(QUESTION_COUNT, pool.length)).map(q => {
      const shuffled = shuffleChoices(q.choices, q.answer)
      return { ...q, choices: shuffled.choices, answer: shuffled.newAnswerIdx }
    })
    await startGame(questions)
    setStarting(false)
  }

  function shuffleChoices(choices, answerIdx) {
    const correct = choices[answerIdx]
    const indices = [0, 1, 2, 3]
    const shuffledIdx = shuffle(indices)
    const newChoices = shuffledIdx.map(i => choices[i])
    const newAnswerIdx = newChoices.indexOf(correct)
    return { choices: newChoices, newAnswerIdx }
  }

  async function handleLeave() {
    await leaveRoom()
    navigate('/multijoueur')
  }

  if (!room) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-400 text-center">
          <div className="text-4xl mb-4">🔍</div>
          <p>Chargement de la salle…</p>
        </div>
      </div>
    )
  }

  const themeLabel = room.theme ? THEMES[room.theme]?.label : 'Tous les thèmes'
  const themeEmoji = room.theme ? THEMES[room.theme]?.emoji : '🌐'
  const diffLabel = room.difficulty ? DIFFICULTY[room.difficulty]?.label : 'Toutes les difficultés'

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="max-w-lg mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="font-display text-4xl text-white">Salle d'attente</h1>
          <p className="text-slate-400 mt-1">En attente des joueurs…</p>
        </div>

        {/* Code de la partie */}
        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-6 text-center shadow-xl">
          <p className="text-indigo-200 text-sm font-semibold uppercase tracking-widest mb-2">Code de la partie</p>
          <div className="font-display text-6xl text-white tracking-[0.2em] mb-4">{code}</div>
          <div className="flex gap-2 justify-center">
            <button
              onClick={copyCode}
              className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            >
              {copied ? '✅ Copié !' : '📋 Copier le code'}
            </button>
            <button
              onClick={copyLink}
              className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            >
              🔗 Partager le lien
            </button>
          </div>
        </div>

        {/* Paramètres */}
        <div className="bg-slate-800 rounded-2xl p-4 flex gap-4 justify-center text-center">
          <div>
            <div className="text-2xl">{themeEmoji}</div>
            <div className="text-slate-400 text-xs mt-1">Thème</div>
            <div className="text-white text-sm font-semibold">{themeLabel}</div>
          </div>
          <div className="w-px bg-slate-700" />
          <div>
            <div className="text-2xl">⭐</div>
            <div className="text-slate-400 text-xs mt-1">Difficulté</div>
            <div className="text-white text-sm font-semibold">{diffLabel}</div>
          </div>
          <div className="w-px bg-slate-700" />
          <div>
            <div className="text-2xl">❓</div>
            <div className="text-slate-400 text-xs mt-1">Questions</div>
            <div className="text-white text-sm font-semibold">10</div>
          </div>
        </div>

        {/* Liste des joueurs */}
        <div className="bg-slate-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-700 flex justify-between items-center">
            <span className="font-semibold text-white">Joueurs ({roomPlayers.length})</span>
            <span className="text-slate-400 text-sm">Min. 1 pour lancer</span>
          </div>
          <div className="divide-y divide-slate-700">
            {roomPlayers.map(rp => {
              const name = rp.players?.nickname ?? '…'
              const av = rp.players?.avatar ?? '🎭'
              const isMe = rp.player_id === player?.id
              const isRoomHost = rp.player_id === room.host_id
              return (
                <div key={rp.id} className="px-5 py-3 flex items-center gap-3">
                  <span className="text-2xl">{av}</span>
                  <span className="text-white font-medium flex-1">
                    {name}
                    {isMe && <span className="text-indigo-400 text-xs ml-2">(vous)</span>}
                  </span>
                  {isRoomHost && <span className="text-amber-400 text-xs font-semibold">👑 Hôte</span>}
                  <span className="text-emerald-400 text-xs">✓ Prêt</span>
                </div>
              )
            })}
            {roomPlayers.length === 0 && (
              <div className="px-5 py-6 text-slate-500 text-center text-sm">Aucun joueur pour l'instant…</div>
            )}
          </div>
        </div>

        {/* Actions */}
        {isHost ? (
          <button
            onClick={handleStart}
            disabled={starting || !questionsLoaded}
            className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-60 text-white font-bold py-4 rounded-xl text-lg transition-all shadow-lg"
          >
            {!questionsLoaded ? '⏳ Chargement des questions…' : starting ? 'Lancement…' : '🚀 Lancer la partie !'}
          </button>
        ) : (
          <div className="text-center text-slate-400 py-4">
            <div className="text-3xl mb-2">⏳</div>
            En attente que l'hôte lance la partie…
          </div>
        )}

        <button
          onClick={handleLeave}
          className="w-full text-slate-500 hover:text-rose-400 py-2 text-sm transition-all"
        >
          Quitter la salle
        </button>
      </div>
    </div>
  )
}
