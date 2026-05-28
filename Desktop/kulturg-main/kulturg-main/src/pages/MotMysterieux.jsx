import { useEffect, useMemo, useState } from 'react'
import { MOTS } from '../data/mots.js'
import { useGame } from '../context/GameContext.jsx'
import { normalize, shuffle } from '../utils/helpers.js'

export default function MotMysterieux() {
  const [pool, setPool] = useState([])
  const [idx, setIdx] = useState(0)
  const [revealed, setRevealed] = useState([]) // indices de lettres révélées
  const [input, setInput] = useState('')
  const [phase, setPhase] = useState('ready')
  const [hintsUsed, setHintsUsed] = useState(0)
  const [score, setScore] = useState(0)
  const { answer, finishSession } = useGame()

  const current = pool[idx]
  const word = current?.word || ''

  function start() {
    setPool(shuffle(MOTS).slice(0, 6))
    setIdx(0)
    setRevealed([])
    setInput('')
    setHintsUsed(0)
    setScore(0)
    setPhase('playing')
  }

  function submit(e) {
    e?.preventDefault()
    if (normalize(input) === normalize(word)) {
      const points = Math.max(2, 10 - hintsUsed * 2 - revealed.length)
      setScore(s => s + points)
      answer('litterature', 2, true)
      setPhase('solved')
    } else {
      setInput('')
      setPhase('miss')
      setTimeout(() => setPhase('playing'), 350)
    }
  }

  function revealLetter() {
    if (!word) return
    const unrevealed = []
    for (let i = 0; i < word.length; i++) if (!revealed.includes(i) && /\p{L}/u.test(word[i])) unrevealed.push(i)
    if (!unrevealed.length) return
    setRevealed(r => [...r, unrevealed[Math.floor(Math.random() * unrevealed.length)]])
  }

  function useHint() {
    setHintsUsed(h => Math.min((current?.clues?.length || 3), h + 1))
  }

  function nextOne() {
    if (idx + 1 >= pool.length) {
      finishSession({ mode: 'mot', score, total: pool.length })
      setPhase('done')
      return
    }
    setIdx(idx + 1)
    setRevealed([])
    setInput('')
    setHintsUsed(0)
    setPhase('playing')
  }

  if (phase === 'ready') {
    return (
      <div className="max-w-2xl mx-auto card p-8 text-center space-y-4">
        <div className="text-6xl">🔤</div>
        <h1 className="heading text-3xl">Mot Mystérieux</h1>
        <p className="text-slate-400">Trouve le mot à partir de la définition. Tu peux révéler des lettres ou demander des indices, mais ça réduit le score.</p>
        <button className="btn-primary w-full" onClick={start}>Démarrer</button>
      </div>
    )
  }

  if (phase === 'done') {
    return (
      <div className="max-w-2xl mx-auto card p-8 text-center space-y-4 animate-pop">
        <div className="text-6xl">🎉</div>
        <h1 className="heading text-3xl">{score} pts</h1>
        <button className="btn-primary" onClick={start}>Rejouer</button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <span className="chip">Mot {idx + 1} / {pool.length}</span>
        <span className="chip text-midi-accent">⭐ {score}</span>
      </div>
      <div className="card p-6 md:p-8 space-y-5">
        <div>
          <div className="text-xs uppercase tracking-widest text-slate-400 mb-2">Définition</div>
          <div className="text-lg">{current.definition}</div>
        </div>

        <div className="flex flex-wrap gap-1.5 justify-center py-2">
          {word.split('').map((ch, i) => {
            const isLetter = /\p{L}/u.test(ch)
            const show = !isLetter || revealed.includes(i) || phase === 'solved'
            return (
              <div key={i} className={`w-8 h-10 md:w-9 md:h-11 rounded-md grid place-items-center font-display text-xl uppercase border ${show ? 'bg-midi-accent/15 border-midi-accent/50 text-midi-accent' : 'bg-white/5 border-white/10 text-transparent'}`}>
                {show ? ch : '·'}
              </div>
            )
          })}
        </div>

        {current.clues.slice(0, hintsUsed).map((c, i) => (
          <div key={i} className="text-sm text-slate-300 bg-white/5 border border-white/10 rounded-lg p-3 animate-pop">💡 {c}</div>
        ))}

        {phase !== 'solved' && (
          <>
            <form onSubmit={submit} className={`flex gap-2 ${phase === 'miss' ? 'animate-shake' : ''}`}>
              <input value={input} onChange={e => setInput(e.target.value)} autoFocus
                placeholder="Ta réponse…"
                className="flex-1 rounded-xl bg-white/5 border border-white/10 px-4 py-3 focus:outline-none focus:border-midi-accent" />
              <button className="btn-primary" type="submit">Valider</button>
            </form>
            <div className="flex justify-between text-sm">
              <button onClick={revealLetter} className="text-slate-300 hover:text-white">+ Révéler une lettre</button>
              <button onClick={useHint} disabled={hintsUsed >= (current.clues?.length || 0)} className="text-slate-300 hover:text-white disabled:opacity-40">💡 Indice ({hintsUsed}/{current.clues.length})</button>
            </div>
          </>
        )}

        {phase === 'solved' && (
          <>
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-4 animate-pop">
              <div className="text-emerald-300 font-bold">Bravo, c'était <span className="text-white">{word}</span></div>
            </div>
            <button className="btn-primary w-full" onClick={nextOne}>{idx + 1 >= pool.length ? 'Voir le score' : 'Mot suivant →'}</button>
          </>
        )}
      </div>
    </div>
  )
}
