import { useEffect, useMemo, useState } from 'react'
import { PERSONALITIES } from '../data/personalities.js'
import { useGame } from '../context/GameContext.jsx'
import { normalize, shuffle } from '../utils/helpers.js'

export default function CoupDeMaitre() {
  const [pool, setPool] = useState([])
  const [idx, setIdx] = useState(0)
  const [clueLevel, setClueLevel] = useState(1)
  const [input, setInput] = useState('')
  const [phase, setPhase] = useState('ready') // ready | playing | solved | failed | done
  const [score, setScore] = useState(0)
  const [played, setPlayed] = useState(0)
  const { finishSession, answer } = useGame()

  const current = pool[idx]

  function start() {
    setPool(shuffle(PERSONALITIES).slice(0, 5))
    setIdx(0)
    setClueLevel(1)
    setInput('')
    setScore(0)
    setPlayed(0)
    setPhase('playing')
  }

  function submit(e) {
    e?.preventDefault()
    if (!current) return
    if (normalize(input) === normalize(current.name)) {
      const points = Math.max(1, 6 - clueLevel) // 5..1
      setScore(s => s + points)
      answer('histoire', 2, true) // crédite XP générique
      setPhase('solved')
    } else {
      setInput('')
      if (clueLevel >= current.clues.length) {
        setPhase('failed')
      } else {
        setClueLevel(l => l + 1)
      }
    }
  }

  function reveal() {
    setClueLevel(current.clues.length)
  }

  function nextOne() {
    const newPlayed = played + 1
    setPlayed(newPlayed)
    if (idx + 1 >= pool.length) {
      finishSession({ mode: 'coup', score, total: pool.length })
      setPhase('done')
      return
    }
    setIdx(idx + 1)
    setClueLevel(1)
    setInput('')
    setPhase('playing')
  }

  if (phase === 'ready') {
    return (
      <div className="max-w-2xl mx-auto card p-8 text-center space-y-4">
        <div className="text-6xl">🎯</div>
        <h1 className="heading text-3xl">Le Coup de Maître</h1>
        <p className="text-slate-400">Devine la personnalité avec un minimum d'indices. 5 manches. Plus tu trouves vite, plus tu gagnes de points.</p>
        <button className="btn-primary w-full" onClick={start}>Démarrer</button>
      </div>
    )
  }

  if (phase === 'done') {
    return (
      <div className="max-w-2xl mx-auto card p-8 text-center space-y-4 animate-pop">
        <div className="text-6xl">🏁</div>
        <h1 className="heading text-3xl">Fin de partie — {score} pts</h1>
        <div className="flex gap-3 justify-center">
          <button className="btn-primary" onClick={start}>Rejouer</button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <span className="chip">Manche {idx + 1} / {pool.length}</span>
        <span className="chip text-midi-accent">⭐ {score}</span>
      </div>

      <div className="card p-6 md:p-8 space-y-4">
        <div className="text-sm uppercase tracking-widest text-slate-400">Indices</div>
        <ol className="space-y-2">
          {current.clues.slice(0, clueLevel).map((c, i) => (
            <li key={i} className="p-3 rounded-lg bg-white/5 border border-white/10 animate-pop">
              <span className="text-midi-accent font-bold mr-2">#{i + 1}</span>{c}
            </li>
          ))}
        </ol>

        {phase === 'playing' && (
          <>
            <form onSubmit={submit} className="flex gap-2">
              <input value={input} onChange={e => setInput(e.target.value)} autoFocus
                placeholder="Ton hypothèse…"
                className="flex-1 rounded-xl bg-white/5 border border-white/10 px-4 py-3 focus:outline-none focus:border-midi-accent" />
              <button className="btn-primary" type="submit">Valider</button>
            </form>
            <div className="flex justify-between text-sm">
              <button onClick={() => setClueLevel(l => Math.min(current.clues.length, l + 1))} className="text-slate-300 hover:text-white">
                Indice suivant ({clueLevel} / {current.clues.length})
              </button>
              <button onClick={reveal} className="text-rose-300 hover:text-rose-200">Donner sa langue au chat</button>
            </div>
          </>
        )}

        {phase === 'solved' && (
          <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-4 animate-pop">
            <div className="text-emerald-300 font-bold">Bravo ! C'était <span className="text-white">{current.name}</span></div>
            <div className="text-sm text-slate-300 mt-1">+{Math.max(1, 6 - clueLevel)} points</div>
          </div>
        )}
        {phase === 'failed' && (
          <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-4">
            <div className="text-rose-300 font-bold">Raté. La réponse était : <span className="text-white">{current.name}</span></div>
          </div>
        )}
        {(phase === 'solved' || phase === 'failed') && (
          <button className="btn-primary w-full" onClick={nextOne}>
            {idx + 1 >= pool.length ? 'Voir le score' : 'Manche suivante →'}
          </button>
        )}
      </div>
    </div>
  )
}
