import { useEffect, useMemo, useRef, useState } from 'react'
import { ETOILES } from '../data/etoiles.js'
import { useAllQuestions } from '../hooks/useQuestions.js'
import { useGame } from '../context/GameContext.jsx'
import { normalize, pick, shuffle } from '../utils/helpers.js'

export default function EtoileMysterieuse() {
  const [star, setStar] = useState(null)
  const [questions, setQuestions] = useState([])
  const [idx, setIdx] = useState(0)
  const [revealedHints, setRevealedHints] = useState(0)
  const [phase, setPhase] = useState('ready') // ready | playing | won | lost
  const [input, setInput] = useState('')
  const [shake, setShake] = useState(false)
  const { answer, finishSession } = useGame()
  const ALL = useAllQuestions()

  function start() {
    const s = ETOILES[Math.floor(Math.random() * ETOILES.length)]
    setStar(s)
    setQuestions(pick(ALL, 8).map(q => ({ ...q, shuffled: shuffleChoices(q) })))
    setIdx(0)
    setRevealedHints(0)
    setInput('')
    setPhase('playing')
  }

  function shuffleChoices(q) {
    const items = q.choices.map((c, i) => ({ c, original: i }))
    const sh = shuffle(items)
    return { choices: sh.map(x => x.c), correctIndex: sh.findIndex(x => x.original === q.answer) }
  }

  function chooseAnswer(i) {
    const q = questions[idx]
    const correct = i === q.shuffled.correctIndex
    answer(q.theme, q.difficulty, correct)
    if (correct) {
      setRevealedHints(h => Math.min(star.hints.length, h + 1))
    }
    if (idx + 1 >= questions.length) {
      // fin sans avoir trouvé
      if (revealedHints + (correct ? 1 : 0) >= star.hints.length) return // all hints unlocked, player still need to guess
      // user didn't guess -> can still try
    }
    setIdx(i => i + 1)
  }

  function submitGuess(e) {
    e?.preventDefault()
    if (normalize(input) === normalize(star.name)) {
      const score = Math.max(1, 10 - idx + (star.hints.length - revealedHints))
      finishSession({ mode: 'etoile', score, total: 1 })
      setPhase('won')
    } else {
      setShake(true)
      setInput('')
      setTimeout(() => setShake(false), 350)
    }
  }

  function giveUp() {
    setPhase('lost')
    finishSession({ mode: 'etoile', score: 0, total: 1 })
  }

  if (phase === 'ready') {
    return (
      <div className="max-w-2xl mx-auto card p-8 text-center space-y-4">
        <div className="text-6xl">⭐</div>
        <h1 className="heading text-3xl">Étoile Mystérieuse</h1>
        <p className="text-slate-400">Une silhouette se cache. À chaque bonne réponse, un indice se dévoile. Devine qui c'est avant la fin des questions.</p>
        <button className="btn-primary w-full" onClick={start}>Démarrer</button>
      </div>
    )
  }

  if (phase === 'won' || phase === 'lost') {
    return (
      <div className="max-w-2xl mx-auto card p-8 text-center space-y-4 animate-pop">
        <div className="text-7xl">{phase === 'won' ? '🌟' : '💫'}</div>
        <div className="text-5xl">{star.silhouette}</div>
        <h1 className="heading text-3xl">{phase === 'won' ? 'Bravo !' : 'Dommage…'}</h1>
        <p className="text-lg">C'était <span className="text-midi-accent font-bold">{star.name}</span></p>
        <button className="btn-primary" onClick={start}>Nouvelle étoile</button>
      </div>
    )
  }

  const q = questions[idx]

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="card p-6 text-center space-y-3">
        <div className="text-xs uppercase tracking-widest text-slate-400">Silhouette de l'étoile</div>
        <div className="text-6xl tracking-widest">{star.silhouette}</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
          {star.hints.map((h, i) => (
            <div key={i} className={`p-2 rounded-lg border ${i < revealedHints ? 'bg-midi-accent/10 border-midi-accent/40 text-slate-100' : 'bg-white/5 border-white/10 text-slate-500'}`}>
              {i < revealedHints ? `💡 ${h}` : `🔒 Indice ${i + 1}`}
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={submitGuess} className={`flex gap-2 ${shake ? 'animate-shake' : ''}`}>
        <input value={input} onChange={e => setInput(e.target.value)} placeholder="Je propose…"
          className="flex-1 rounded-xl bg-white/5 border border-white/10 px-4 py-3 focus:outline-none focus:border-midi-accent" />
        <button type="submit" className="btn-primary">Proposer</button>
        <button type="button" onClick={giveUp} className="btn-ghost">Abandon</button>
      </form>

      {q ? (
        <div className="card p-6 space-y-3">
          <div className="text-xs text-slate-400">Question {idx + 1} / {questions.length} · réponds pour révéler un indice</div>
          <div className="text-lg font-semibold">{q.q}</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {q.shuffled.choices.map((c, i) => (
              <button key={i} onClick={() => chooseAnswer(i)} className="text-left p-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10">
                <span className="inline-flex w-6 h-6 rounded bg-white/10 items-center justify-center mr-2 text-xs font-mono">{String.fromCharCode(65 + i)}</span>
                {c}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="card p-6 text-center text-slate-400">Plus de questions — à toi de proposer une réponse !</div>
      )}
    </div>
  )
}
