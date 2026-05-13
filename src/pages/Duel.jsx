import { useEffect, useRef, useState } from 'react'
import { THEMES, DIFFICULTY } from '../data/themes.js'
import { useAllQuestions } from '../hooks/useQuestions.js'
import { useGame } from '../context/GameContext.jsx'
import { shuffle } from '../utils/helpers.js'

const DURATION = 60

export default function Duel() {
  const [phase, setPhase] = useState('ready') // ready | playing | done
  const [time, setTime] = useState(DURATION)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [current, setCurrent] = useState(null)
  const [flash, setFlash] = useState(null) // 'good' | 'bad' | null
  const timerRef = useRef(null)
  const poolRef = useRef([])
  const { answer, finishSession, state } = useGame()
  const ALL = useAllQuestions()

  function buildPool() {
    poolRef.current = shuffle(ALL)
  }

  function pickQuestion() {
    if (!poolRef.current.length) buildPool()
    const q = poolRef.current.pop()
    const items = q.choices.map((c, i) => ({ c, original: i }))
    const sh = shuffle(items)
    return { ...q, shuffled: sh.map(x => x.c), correctIndex: sh.findIndex(x => x.original === q.answer) }
  }

  function start() {
    buildPool()
    setPhase('playing')
    setTime(DURATION)
    setScore(0)
    setStreak(0)
    setBestStreak(0)
    setCurrent(pickQuestion())
  }

  useEffect(() => {
    if (phase !== 'playing') return
    timerRef.current = setInterval(() => {
      setTime(t => {
        if (t <= 1) {
          clearInterval(timerRef.current)
          end()
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [phase])

  function end() {
    setPhase('done')
    finishSession({ mode: 'duel', score, total: score })
  }

  function choose(i) {
    if (!current || phase !== 'playing') return
    const correct = i === current.correctIndex
    answer(current.theme, current.difficulty, correct)
    if (correct) {
      const ns = streak + 1
      setStreak(ns)
      setBestStreak(b => Math.max(b, ns))
      setScore(s => s + 1 + Math.floor(ns / 3))
      setFlash('good')
    } else {
      setStreak(0)
      setFlash('bad')
      setTime(t => Math.max(0, t - 3)) // pénalité
    }
    setTimeout(() => setFlash(null), 250)
    setCurrent(pickQuestion())
  }

  if (phase === 'ready') {
    return (
      <div className="max-w-2xl mx-auto card p-8 text-center space-y-4">
        <div className="text-6xl">⚔️</div>
        <h1 className="heading text-3xl">Duel rapide</h1>
        <p className="text-slate-400">60 secondes pour enchaîner un max de bonnes réponses. Chaque erreur coûte 3s. Une série de 3+ donne du bonus.</p>
        <div className="text-sm text-slate-300">Meilleur duel : <span className="text-midi-accent font-bold">{state.bestDuel}</span></div>
        <button className="btn-primary w-full" onClick={start}>Lancer le duel</button>
      </div>
    )
  }

  if (phase === 'done') {
    return (
      <div className="max-w-2xl mx-auto card p-8 text-center space-y-4 animate-pop">
        <div className="text-6xl">{score >= state.bestDuel ? '🏆' : '⏱️'}</div>
        <h1 className="heading text-3xl">Score : {score}</h1>
        <div className="text-slate-400">Meilleure série : {bestStreak}</div>
        <div className="flex gap-3 justify-center">
          <button className="btn-primary" onClick={start}>Rejouer</button>
          <button className="btn-ghost" onClick={() => setPhase('ready')}>Retour</button>
        </div>
      </div>
    )
  }

  const themeMeta = current && THEMES[current.theme]
  return (
    <div className={`max-w-3xl mx-auto space-y-4 ${flash === 'bad' ? 'animate-shake' : ''}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="chip">⏱️ {time}s</span>
          {themeMeta && <span className="chip">{themeMeta.emoji} {themeMeta.label}</span>}
        </div>
        <div className="flex items-center gap-2">
          <span className="chip">🔥 {streak}</span>
          <span className="chip text-midi-accent">⭐ {score}</span>
        </div>
      </div>
      <div className="h-2 rounded-full bg-white/5 overflow-hidden">
        <div className={`h-full transition-all ${time <= 10 ? 'bg-rose-500' : 'bg-midi-accent'}`} style={{ width: `${(time / DURATION) * 100}%` }} />
      </div>

      {current && (
        <div className={`card p-6 md:p-8 ${flash === 'good' ? 'border-emerald-500/60' : ''}`}>
          <div className="text-xs text-slate-400 mb-2">{DIFFICULTY[current.difficulty].label}</div>
          <div className="text-xl md:text-2xl font-semibold leading-snug">{current.q}</div>
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3">
            {current.shuffled.map((c, i) => (
              <button key={i} onClick={() => choose(i)} className="text-left p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition">
                <span className="inline-flex w-7 h-7 rounded-md bg-white/10 items-center justify-center mr-3 font-mono text-sm">{String.fromCharCode(65 + i)}</span>
                {c}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
