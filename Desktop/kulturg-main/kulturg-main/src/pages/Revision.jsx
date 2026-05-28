import { useMemo, useState } from 'react'
import { useAllQuestions, useQuestionsLoaded } from '../hooks/useQuestions.js'
import { THEME_LIST, THEMES } from '../data/themes.js'
import { useGame } from '../context/GameContext.jsx'
import { shuffle } from '../utils/helpers.js'

export default function Revision() {
  const { state, srsReview } = useGame()
  const ALL = useAllQuestions()
  const loaded = useQuestionsLoaded()
  const [theme, setTheme] = useState('all')
  const [mode, setMode] = useState('due') // due | all
  const [idx, setIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [session, setSession] = useState(null)

  const queue = useMemo(() => {
    const now = Date.now()
    let pool = ALL.filter(q => theme === 'all' || q.theme === theme)
    if (mode === 'due') {
      pool = pool.filter(q => {
        const card = state.srs[q.id]
        if (!card) return true
        return new Date(card.dueISO).getTime() <= now
      })
    }
    return shuffle(pool).slice(0, 20)
  }, [theme, mode, state.srs, ALL])

  function startSession() {
    setSession(queue)
    setIdx(0)
    setFlipped(false)
  }

  function review(correct) {
    const q = session[idx]
    srsReview(q.id, correct)
    if (idx + 1 >= session.length) {
      setSession(null)
    } else {
      setIdx(idx + 1)
      setFlipped(false)
    }
  }

  if (!session) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <h1 className="heading text-3xl">Mode Révision</h1>
        <p className="text-slate-400">Flashcards avec répétition espacée. Les cartes que tu rates reviennent plus vite, celles que tu maîtrises s'espacent.</p>

        <div className="card p-5 space-y-4">
          <div>
            <div className="text-sm font-semibold mb-2">Thème</div>
            <div className="flex flex-wrap gap-2">
              <Chip active={theme === 'all'} onClick={() => setTheme('all')} label="Tous" emoji="🎲" />
              {THEME_LIST.map(t => (
                <Chip key={t.id} active={theme === t.id} onClick={() => setTheme(t.id)} label={t.label} emoji={t.emoji} />
              ))}
            </div>
          </div>
          <div>
            <div className="text-sm font-semibold mb-2">Quoi réviser</div>
            <div className="flex gap-2">
              <Chip active={mode === 'due'} onClick={() => setMode('due')} label="À réviser maintenant" emoji="⏰" />
              <Chip active={mode === 'all'} onClick={() => setMode('all')} label="Tout mélanger" emoji="🔀" />
            </div>
          </div>
          <div className="text-sm text-slate-400">
            {!loaded ? '⏳ Chargement des questions…' : `${queue.length} carte${queue.length > 1 ? 's' : ''} prête${queue.length > 1 ? 's' : ''}.`}
          </div>
          <button className="btn-primary w-full" disabled={!loaded || !queue.length} onClick={startSession}>
            {!loaded ? '⏳ Chargement…' : queue.length ? 'Démarrer la révision' : 'Aucune carte à réviser'}
          </button>
        </div>

        <div className="card p-5">
          <div className="font-semibold mb-3">Statistiques mémoire</div>
          <BoxStats srs={state.srs} />
        </div>
      </div>
    )
  }

  const q = session[idx]
  const themeMeta = THEMES[q.theme]
  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <span className="chip">{themeMeta.emoji} {themeMeta.label}</span>
        <span className="chip">{idx + 1} / {session.length}</span>
      </div>

      <button onClick={() => setFlipped(f => !f)} className="block w-full text-left">
        <div className={`card p-8 min-h-[260px] grid place-items-center text-center transition`}>
          {!flipped ? (
            <div>
              <div className="text-xs text-slate-400 mb-3 uppercase tracking-widest">Question</div>
              <div className="text-xl md:text-2xl font-semibold">{q.q}</div>
              <div className="text-xs text-slate-500 mt-4">(Clique pour révéler)</div>
            </div>
          ) : (
            <div>
              <div className="text-xs text-emerald-400 mb-3 uppercase tracking-widest">Réponse</div>
              <div className="text-xl md:text-2xl font-bold text-emerald-300">{q.choices[q.answer]}</div>
              {q.explain && <div className="text-sm text-slate-400 mt-3">{q.explain}</div>}
            </div>
          )}
        </div>
      </button>

      {flipped && (
        <div className="grid grid-cols-2 gap-3">
          <button className="btn bg-rose-500/80 hover:bg-rose-500 text-white" onClick={() => review(false)}>😕 J'ai oublié</button>
          <button className="btn bg-emerald-500/80 hover:bg-emerald-500 text-white" onClick={() => review(true)}>😎 Je savais</button>
        </div>
      )}
    </div>
  )
}

function Chip({ active, onClick, label, emoji }) {
  return (
    <button onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm border transition ${active ? 'bg-midi-accent text-slate-900 border-midi-accent font-semibold' : 'bg-white/5 border-white/10 text-slate-200 hover:bg-white/10'}`}>
      <span className="mr-1.5">{emoji}</span>{label}
    </button>
  )
}

function BoxStats({ srs }) {
  const counts = [0,0,0,0,0]
  Object.values(srs).forEach(c => { counts[(c.box || 1) - 1]++ })
  const labels = ['🌱 Nouvelle', '🌿 Faible', '🌳 Moyenne', '⭐ Solide', '💎 Maîtrisée']
  return (
    <div className="grid grid-cols-5 gap-2">
      {counts.map((n, i) => (
        <div key={i} className="rounded-lg bg-white/5 border border-white/10 p-3 text-center">
          <div className="text-xs text-slate-400">{labels[i]}</div>
          <div className="text-xl font-bold">{n}</div>
        </div>
      ))}
    </div>
  )
}
