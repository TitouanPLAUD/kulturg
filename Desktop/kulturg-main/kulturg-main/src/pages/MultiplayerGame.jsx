import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMultiplayer } from '../context/MultiplayerContext'
import { DIFFICULTY, THEMES } from '../data/themes'

const PER_QUESTION_SEC = 20

export default function MultiplayerGame() {
  const { code } = useParams()
  const navigate = useNavigate()
  const { player, room, roomPlayers, roomQuestions, submitAnswer, finishGame } = useMultiplayer()

  const [idx, setIdx] = useState(0)
  const [selected, setSelected] = useState(null)
  const [revealed, setRevealed] = useState(false)
  const [timeLeft, setTimeLeft] = useState(PER_QUESTION_SEC)
  const [results, setResults] = useState([]) // { correct, answerIdx, timeTaken }
  const timerRef = useRef(null)
  const startRef = useRef(Date.now())

  const questions = roomQuestions.map(rq => rq.question_data)
  const q = questions[idx]

  // Redirige si la room est terminée ou si on n'a pas de questions
  useEffect(() => {
    if (room?.status === 'finished') navigate(`/multijoueur/resultats/${code}`)
  }, [room?.status, code, navigate])

  useEffect(() => {
    if (roomQuestions.length > 0) startRef.current = Date.now()
  }, [roomQuestions.length])

  // Timer
  useEffect(() => {
    if (!q || revealed) return
    setTimeLeft(PER_QUESTION_SEC)
    startRef.current = Date.now()
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current)
          handleTimeout()
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [idx, q]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!q) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-400 text-center">
          <div className="text-4xl mb-4 animate-spin">⏳</div>
          <p>Chargement des questions…</p>
        </div>
      </div>
    )
  }

  function handleTimeout() {
    if (revealed) return
    setSelected(-1)
    setRevealed(true)
    recordAnswer(-1, false)
    scheduleNext()
  }

  function handleSelect(choiceIdx) {
    if (revealed) return
    clearInterval(timerRef.current)
    const timeTaken = Date.now() - startRef.current
    const isCorrect = choiceIdx === q.answer
    const diff = DIFFICULTY[q.difficulty]
    const xp = isCorrect ? (diff?.points ?? 10) : 0
    setSelected(choiceIdx)
    setRevealed(true)
    recordAnswer(choiceIdx, isCorrect, timeTaken, xp)
    scheduleNext()
  }

  function recordAnswer(choiceIdx, isCorrect, timeTakenMs, xpEarned) {
    setResults(prev => [...prev, { correct: isCorrect, answerIdx: choiceIdx, timeTaken: timeTakenMs }])
    submitAnswer({ questionPosition: idx, answerIndex: choiceIdx, isCorrect, timeTakenMs, xpEarned })
  }

  function scheduleNext() {
    setTimeout(async () => {
      if (idx + 1 >= questions.length) {
        await finishGame()
        navigate(`/multijoueur/resultats/${code}`)
      } else {
        setIdx(i => i + 1)
        setSelected(null)
        setRevealed(false)
        startRef.current = Date.now()
      }
    }, 2500)
  }

  const timerPercent = (timeLeft / PER_QUESTION_SEC) * 100
  const timerColor = timeLeft <= 5 ? 'bg-rose-500' : timeLeft <= 10 ? 'bg-amber-500' : 'bg-indigo-500'

  // Scores live des autres joueurs
  const myRp = roomPlayers.find(rp => rp.player_id === player?.id)
  const others = roomPlayers.filter(rp => rp.player_id !== player?.id)

  return (
    <div className="min-h-screen px-4 py-6 max-w-2xl mx-auto">
      {/* Progression */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-slate-400 text-sm">Question {idx + 1}/{questions.length}</span>
        <div className="flex items-center gap-2">
          <span className={`font-bold text-lg ${timeLeft <= 5 ? 'text-rose-400 animate-pulse' : 'text-white'}`}>
            {timeLeft}s
          </span>
        </div>
      </div>

      {/* Barre de timer */}
      <div className="w-full bg-slate-700 rounded-full h-2 mb-6 overflow-hidden">
        <div
          className={`h-2 rounded-full transition-all duration-1000 ${timerColor}`}
          style={{ width: `${timerPercent}%` }}
        />
      </div>

      {/* Tags thème/difficulté */}
      <div className="flex gap-2 mb-4">
        <span className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded-full">
          {THEMES[q.theme]?.emoji} {THEMES[q.theme]?.label}
        </span>
        <span className={`text-xs px-2 py-1 rounded-full bg-slate-700 ${DIFFICULTY[q.difficulty]?.color}`}>
          {DIFFICULTY[q.difficulty]?.label}
        </span>
      </div>

      {/* Question */}
      <div className="bg-slate-800 rounded-2xl p-6 mb-6">
        <p className="text-white text-lg font-semibold leading-relaxed">{q.q}</p>
      </div>

      {/* Choix */}
      <div className="grid grid-cols-1 gap-3 mb-6">
        {q.choices.map((choice, i) => {
          let style = 'bg-slate-800 hover:bg-slate-700 text-white border-2 border-transparent'
          if (revealed) {
            if (i === q.answer) style = 'bg-emerald-600/30 border-2 border-emerald-500 text-emerald-300'
            else if (i === selected && selected !== q.answer) style = 'bg-rose-600/30 border-2 border-rose-500 text-rose-300'
            else style = 'bg-slate-800 border-2 border-transparent text-slate-500'
          } else if (selected === i) {
            style = 'bg-indigo-600 border-2 border-indigo-400 text-white'
          }

          return (
            <button
              key={i}
              onClick={() => handleSelect(i)}
              disabled={revealed}
              className={`w-full text-left p-4 rounded-xl font-medium transition-all ${style} disabled:cursor-default`}
            >
              <span className="text-slate-400 mr-2">{String.fromCharCode(65 + i)}.</span>
              {choice}
            </button>
          )
        })}
      </div>

      {/* Feedback après réponse */}
      {revealed && (
        <div className={`text-center rounded-xl p-3 mb-4 font-semibold ${selected === q.answer ? 'bg-emerald-600/20 text-emerald-400' : selected === -1 ? 'bg-slate-700 text-slate-400' : 'bg-rose-600/20 text-rose-400'}`}>
          {selected === q.answer ? `✅ Bravo ! +${DIFFICULTY[q.difficulty]?.points} XP` : selected === -1 ? '⏰ Temps écoulé !' : '❌ Mauvaise réponse'}
          {q.explain && <p className="text-slate-300 text-sm font-normal mt-1">{q.explain}</p>}
        </div>
      )}

      {/* Scores live des autres */}
      {others.length > 0 && (
        <div className="bg-slate-800 rounded-xl p-4">
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">Autres joueurs</p>
          <div className="space-y-2">
            {others.map(rp => (
              <div key={rp.player_id} className="flex items-center gap-3">
                <span className="text-lg">{rp.players?.avatar ?? '🎭'}</span>
                <span className="text-white text-sm flex-1">{rp.players?.nickname ?? '…'}</span>
                <span className="text-slate-400 text-xs">{rp.answered_count}/{questions.length}</span>
                <span className="text-amber-400 text-sm font-bold">{rp.score} XP</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
