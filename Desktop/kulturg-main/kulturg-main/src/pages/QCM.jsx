import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { THEME_LIST, THEMES, DIFFICULTY } from '../data/themes.js'
import { useAllQuestions, useQuestionsLoaded } from '../hooks/useQuestions.js'
import { useGame } from '../context/GameContext.jsx'
import { pick, shuffle } from '../utils/helpers.js'

const QUESTION_COUNT = 10
const PER_QUESTION_SEC = 20

export default function QCM() {
  const [params, setParams] = useSearchParams()
  const [theme, setTheme] = useState(params.get('theme') || 'all')
  const [difficulty, setDifficulty] = useState(parseInt(params.get('diff') || '0', 10)) // 0=all
  const [phase, setPhase] = useState('setup') // setup | playing | done
  const [questions, setQuestions] = useState([])
  const [idx, setIdx] = useState(0)
  const [answers, setAnswers] = useState([])
  const [selected, setSelected] = useState(null)
  const [revealed, setRevealed] = useState(false)
  const [timeLeft, setTimeLeft] = useState(PER_QUESTION_SEC)
  const timerRef = useRef(null)
  const { answer, finishSession } = useGame()
  const ALL = useAllQuestions()
  const loaded = useQuestionsLoaded()

  const filtered = useMemo(() => {
    return ALL.filter(q => (theme === 'all' || q.theme === theme) && (!difficulty || q.difficulty === difficulty))
  }, [theme, difficulty, ALL])

  function start() {
    const pool = filtered.length ? filtered : ALL
    // pick = shuffle + slice → garantit aucun doublon dans une session
    const qs = pick(pool, Math.min(QUESTION_COUNT, pool.length)).map(q => ({
      ...q,
      // Shuffle choices but track correct
      _shuffled: shuffleWithAnswer(q.choices, q.answer),
    }))
    setQuestions(qs)
    setIdx(0)
    setAnswers([])
    setSelected(null)
    setRevealed(false)
    setTimeLeft(PER_QUESTION_SEC)
    setPhase('playing')
  }

  useEffect(() => {
    if (phase !== 'playing' || revealed) return
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current)
          handleReveal(null)
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [phase, idx, revealed])

  function handleReveal(chosen) {
    clearInterval(timerRef.current)
    setSelected(chosen)
    setRevealed(true)
    const q = questions[idx]
    const correct = chosen !== null && q._shuffled.choices[chosen] === q.choices[q.answer]
    answer(q.theme, q.difficulty, correct)
    setAnswers(a => [...a, { q, chosen, correct }])
  }

  function next() {
    if (idx + 1 >= questions.length) {
      const score = answers.filter(a => a.correct).length + 0 // already pushed
      finishSession({ mode: 'qcm', score: answers.filter(a => a.correct).length, total: questions.length })
      setPhase('done')
      return
    }
    setIdx(i => i + 1)
    setSelected(null)
    setRevealed(false)
    setTimeLeft(PER_QUESTION_SEC)
  }

  if (phase === 'setup') {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="heading text-3xl">QCM Culture G</h1>
        <p className="text-slate-400">{QUESTION_COUNT} questions · {PER_QUESTION_SEC}s par question.</p>

        <div className="card p-5 space-y-4">
          <div>
            <div className="text-sm font-semibold mb-2">Thème</div>
            <div className="flex flex-wrap gap-2">
              <ThemeChip active={theme === 'all'} onClick={() => setTheme('all')} label="Tous" emoji="🎲" />
              {THEME_LIST.map(t => (
                <ThemeChip key={t.id} active={theme === t.id} onClick={() => setTheme(t.id)} label={t.label} emoji={t.emoji} />
              ))}
            </div>
          </div>
          <div>
            <div className="text-sm font-semibold mb-2">Difficulté</div>
            <div className="flex flex-wrap gap-2">
              <ThemeChip active={difficulty === 0} onClick={() => setDifficulty(0)} label="Toutes" emoji="⚖️" />
              {[1,2,3].map(d => (
                <ThemeChip key={d} active={difficulty === d} onClick={() => setDifficulty(d)} label={DIFFICULTY[d].label} emoji={d === 1 ? '🟢' : d === 2 ? '🟠' : '🔴'} />
              ))}
            </div>
          </div>
          <div className="text-sm text-slate-400">
            {!loaded
              ? '⏳ Chargement des questions…'
              : `${filtered.length} question${filtered.length > 1 ? 's' : ''} disponible${filtered.length > 1 ? 's' : ''} dans ce filtre.`}
          </div>
          <button className="btn-primary w-full" disabled={!loaded || !filtered.length} onClick={start}>
            {!loaded ? '⏳ Chargement…' : 'Démarrer'}
          </button>
        </div>
      </div>
    )
  }

  if (phase === 'done') {
    const correct = answers.filter(a => a.correct).length
    const pct = Math.round((correct / questions.length) * 100)
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="card p-8 text-center animate-pop">
          <div className="text-6xl">{pct >= 80 ? '🏆' : pct >= 50 ? '👏' : '💪'}</div>
          <h1 className="heading text-3xl mt-2">{correct} / {questions.length}</h1>
          <p className="text-slate-400">Réussite : {pct}%</p>
        </div>
        <div className="card p-5 space-y-3">
          <div className="font-semibold">Récapitulatif</div>
          {answers.map((a, i) => (
            <div key={i} className={`p-3 rounded-lg border ${a.correct ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-rose-500/30 bg-rose-500/5'}`}>
              <div className="text-sm font-medium">{i + 1}. {a.q.q}</div>
              <div className="text-xs text-slate-400 mt-1">Réponse : <span className="text-emerald-400">{a.q.choices[a.q.answer]}</span></div>
              {a.q.explain && <div className="text-xs text-slate-500 italic mt-1">{a.q.explain}</div>}
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          <button className="btn-primary flex-1" onClick={start}>Rejouer</button>
          <button className="btn-ghost flex-1" onClick={() => setPhase('setup')}>Changer les filtres</button>
        </div>
      </div>
    )
  }

  // playing
  const q = questions[idx]
  const themeMeta = THEMES[q.theme]
  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between gap-3">
        <span className="chip">{themeMeta.emoji} {themeMeta.label}</span>
        <span className={`chip ${DIFFICULTY[q.difficulty].color}`}>{DIFFICULTY[q.difficulty].label}</span>
        <span className="ml-auto text-sm text-slate-400">{idx + 1} / {questions.length}</span>
      </div>

      <div className="h-2 rounded-full bg-white/5 overflow-hidden">
        <div className={`h-full transition-all ${timeLeft <= 5 ? 'bg-rose-500' : 'bg-midi-accent'}`} style={{ width: `${(timeLeft / PER_QUESTION_SEC) * 100}%` }} />
      </div>

      <div className="card p-6 md:p-8 animate-pop">
        <div className="text-xl md:text-2xl font-semibold leading-snug">{q.q}</div>
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3">
          {q._shuffled.choices.map((c, i) => {
            const isCorrect = c === q.choices[q.answer]
            const isChosen = selected === i
            let cls = 'border-white/10 bg-white/5 hover:bg-white/10'
            if (revealed) {
              if (isCorrect) cls = 'border-emerald-500/60 bg-emerald-500/10'
              else if (isChosen) cls = 'border-rose-500/60 bg-rose-500/10'
              else cls = 'border-white/10 bg-white/5 opacity-60'
            }
            return (
              <button key={i} disabled={revealed} onClick={() => handleReveal(i)}
                className={`text-left p-4 rounded-xl border transition ${cls}`}>
                <span className="inline-flex w-7 h-7 rounded-md bg-white/10 items-center justify-center mr-3 font-mono text-sm">{String.fromCharCode(65 + i)}</span>
                {c}
              </button>
            )
          })}
        </div>
        {revealed && q.explain && (
          <div className="mt-4 text-sm text-slate-300 bg-white/5 border border-white/10 rounded-lg p-3">
            💡 {q.explain}
          </div>
        )}
      </div>

      {revealed && (
        <button className="btn-primary w-full" onClick={next}>
          {idx + 1 >= questions.length ? 'Voir le score' : 'Question suivante →'}
        </button>
      )}
    </div>
  )
}

function shuffleWithAnswer(choices, answerIdx) {
  const items = choices.map((c, i) => ({ c, original: i }))
  const sh = shuffle(items)
  return { choices: sh.map(x => x.c), correctIndex: sh.findIndex(x => x.original === answerIdx) }
}

function ThemeChip({ active, onClick, label, emoji }) {
  return (
    <button onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm border transition ${active ? 'bg-midi-accent text-slate-900 border-midi-accent font-semibold' : 'bg-white/5 border-white/10 text-slate-200 hover:bg-white/10'}`}>
      <span className="mr-1.5">{emoji}</span>{label}
    </button>
  )
}
