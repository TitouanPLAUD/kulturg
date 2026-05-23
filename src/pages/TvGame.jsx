import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useTvRoom, scoreForAnswer } from '../hooks/useTvRoom.js'

// ─── Durées (ms) ──────────────────────────────────────────────
const DURATION = { tour_chauffe: 15000, sprint_final: 8000, coup_de_maitre: 10000 }

export default function TvGame() {
  const { code } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { room, participants, answers, myAnswers, isHost, loading,
          submitAnswer, startGame, advanceQuestion, advanceClue } = useTvRoom(code)

  if (loading) return <Centered><Spinner /><p className="text-slate-400 mt-3">Chargement…</p></Centered>
  if (!room)   return <Centered><p className="text-slate-400">Salle introuvable.</p><Link to="/tv" className="btn btn-primary mt-4">Retour</Link></Centered>
  if (!user)   return <Centered><p className="text-slate-400">Connecte-toi pour jouer.</p><Link to="/auth" className="btn btn-primary mt-4">Connexion</Link></Centered>

  const phase = room.phase

  if (phase === 'lobby')         return <LobbyPhase room={room} participants={participants} isHost={isHost} onStart={startGame} code={code} />
  if (phase === 'tour_chauffe')  return <QuestionPhase room={room} participants={participants} answers={answers} myAnswers={myAnswers} isHost={isHost} phase="tour_chauffe" duration={DURATION.tour_chauffe} onAdvance={() => advanceQuestion('tour_chauffe')} onSubmit={submitAnswer} />
  if (phase === 'coup_de_maitre') return <CoupDeMaitrePhase room={room} participants={participants} answers={answers} myAnswers={myAnswers} isHost={isHost} duration={DURATION.coup_de_maitre} onAdvance={advanceClue} onSubmit={submitAnswer} />
  if (phase === 'sprint_final')  return <QuestionPhase room={room} participants={participants} answers={answers} myAnswers={myAnswers} isHost={isHost} phase="sprint_final" duration={DURATION.sprint_final} onAdvance={() => advanceQuestion('sprint_final')} onSubmit={submitAnswer} />
  if (phase === 'finished')      return <FinishedPhase participants={participants} />

  return <Centered><Spinner /></Centered>
}

// ─── Lobby ────────────────────────────────────────────────────
function LobbyPhase({ room, participants, isHost, onStart, code }) {
  const [copied, setCopied] = useState(false)

  function copy() {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="max-w-md mx-auto mt-8 space-y-6">
      <div className="text-center">
        <div className="text-5xl mb-2">📺</div>
        <h1 className="heading text-3xl">Salle d'attente</h1>
        <div className="mt-3 inline-flex items-center gap-2 bg-white/5 rounded-xl px-4 py-2">
          <span className="font-mono text-2xl tracking-widest text-midi-accent font-bold">{code}</span>
          <button onClick={copy} className="text-slate-400 hover:text-white transition text-sm">
            {copied ? '✓' : '📋'}
          </button>
        </div>
        <p className="text-slate-500 text-xs mt-1">Partage ce code avec tes amis</p>
      </div>

      <div className="card p-5">
        <h2 className="text-sm text-slate-400 uppercase tracking-wider mb-3">
          Joueurs ({participants.length}/4)
        </h2>
        <ul className="space-y-2">
          {participants.map(p => (
            <li key={p.id} className="flex items-center gap-3 py-1">
              <span className="text-2xl">{p.profile?.avatar ?? '🎭'}</span>
              <span className="font-medium">{p.profile?.nickname ?? '…'}</span>
              {p.profile_id === room.host_id && (
                <span className="ml-auto chip text-xs">Hôte</span>
              )}
            </li>
          ))}
          {Array.from({ length: 4 - participants.length }).map((_, i) => (
            <li key={i} className="flex items-center gap-3 py-1 opacity-30">
              <span className="text-2xl">👤</span>
              <span className="text-slate-500 text-sm">En attente…</span>
            </li>
          ))}
        </ul>
      </div>

      {isHost ? (
        <button
          onClick={onStart}
          disabled={participants.length < 2}
          className="btn btn-primary w-full text-lg py-3 disabled:opacity-50">
          {participants.length < 2 ? 'En attente d\'un autre joueur…' : '▶ Lancer la partie !'}
        </button>
      ) : (
        <p className="text-center text-slate-400 text-sm">En attente que l'hôte lance la partie…</p>
      )}
    </div>
  )
}

// ─── Question phase (tour de chauffe + sprint final) ──────────
function QuestionPhase({ room, participants, answers, myAnswers, isHost, phase, duration, onAdvance, onSubmit }) {
  const pd = room.phase_data
  const questions = phase === 'tour_chauffe' ? pd.questions_tour : pd.questions_sprint
  const q_idx = pd.q_idx ?? 0
  const question = questions?.[q_idx]

  const [timeLeft, setTimeLeft] = useState(duration)
  const [revealed, setRevealed] = useState(false)
  const [selected, setSelected] = useState(null)
  const advancedRef = useRef(false)
  const startedAt = pd.q_start_at ? new Date(pd.q_start_at).getTime() : Date.now()

  const myAnswer = myAnswers.find(a => a.phase === phase && a.q_idx === q_idx)
  const phaseAnswers = answers.filter(a => a.phase === phase && a.q_idx === q_idx)

  // Reset when question changes
  useEffect(() => {
    setSelected(null)
    setRevealed(false)
    advancedRef.current = false
    setTimeLeft(duration)
  }, [q_idx, phase, duration])

  // Timer
  useEffect(() => {
    if (revealed) return
    const tick = setInterval(() => {
      const elapsed = Date.now() - startedAt
      const left = Math.max(0, duration - elapsed)
      setTimeLeft(left)
      if (left === 0) {
        setRevealed(true)
        clearInterval(tick)
      }
    }, 100)
    return () => clearInterval(tick)
  }, [startedAt, duration, revealed])

  // Host: auto-advance after reveal delay
  useEffect(() => {
    if (!isHost || !revealed || advancedRef.current) return
    const allAnswered = participants.every(p =>
      phaseAnswers.some(a => a.profile_id === p.profile_id))
    const timer = setTimeout(() => {
      if (!advancedRef.current) {
        advancedRef.current = true
        onAdvance()
      }
    }, allAnswered ? 2500 : 3500)
    return () => clearTimeout(timer)
  }, [revealed, isHost, participants, phaseAnswers, onAdvance])

  // Host: advance when all answered
  useEffect(() => {
    if (!isHost || revealed || advancedRef.current) return
    const allAnswered = participants.length > 0 &&
      participants.every(p => phaseAnswers.some(a => a.profile_id === p.profile_id))
    if (allAnswered) {
      setRevealed(true)
    }
  }, [phaseAnswers, participants, isHost, revealed])

  async function handleAnswer(idx) {
    if (myAnswer || revealed || selected !== null) return
    setSelected(idx)
    const isCorrect = idx === question.answer
    const time_ms = Date.now() - startedAt
    await onSubmit({ phase, q_idx, answer_idx: idx, is_correct: isCorrect, time_ms })
  }

  if (!question) return <Centered><Spinner /></Centered>

  const timePct = (timeLeft / duration) * 100
  const timerColor = timePct > 50 ? 'bg-midi-accent' : timePct > 20 ? 'bg-orange-500' : 'bg-red-500'

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="chip">{phase === 'tour_chauffe' ? '🔥 Tour de chauffe' : '⚡ Sprint Final'}</span>
          <span className="text-slate-500 text-sm">Q{q_idx + 1}/{questions.length}</span>
        </div>
        <div className="text-2xl font-bold tabular-nums text-midi-accent">
          {Math.ceil(timeLeft / 1000)}s
        </div>
      </div>

      {/* Timer bar */}
      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${timerColor}`} style={{ width: `${timePct}%` }} />
      </div>

      {/* Question */}
      <div className="card p-6 text-center">
        <p className="text-xl font-semibold leading-relaxed">{question.q}</p>
      </div>

      {/* Choices */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {question.choices.map((choice, idx) => {
          const isCorrect = idx === question.answer
          const isSelected = (myAnswer?.answer_idx ?? selected) === idx
          let cls = 'card p-4 text-left cursor-pointer transition-all border-2 border-transparent font-medium'
          if (revealed) {
            if (isCorrect) cls += ' border-green-500 bg-green-500/10 text-green-300'
            else if (isSelected && !isCorrect) cls += ' border-red-500 bg-red-500/10 text-red-400'
            else cls += ' opacity-40'
          } else if (isSelected) {
            cls += ' border-midi-accent bg-midi-accent/10'
          } else if (!myAnswer && selected === null) {
            cls += ' hover:border-white/20 hover:bg-white/5'
          } else {
            cls += ' opacity-50 cursor-default'
          }
          return (
            <button key={idx} className={cls} onClick={() => handleAnswer(idx)}>
              <span className="text-slate-400 text-xs mr-2">{['A', 'B', 'C', 'D'][idx]}</span>
              {choice}
              {revealed && isCorrect && <span className="ml-2">✓</span>}
            </button>
          )
        })}
      </div>

      {/* Scoreboard */}
      <Scoreboard participants={participants} phaseAnswers={phaseAnswers} question={question} revealed={revealed} />
    </div>
  )
}

// ─── Coup de Maître ───────────────────────────────────────────
function CoupDeMaitrePhase({ room, participants, answers, myAnswers, isHost, duration, onAdvance, onSubmit }) {
  const pd = room.phase_data
  const personality = pd.personality
  const clue_idx = pd.clue_idx ?? 0
  const phase = 'coup_de_maitre'

  const [timeLeft, setTimeLeft] = useState(duration)
  const [revealed, setRevealed] = useState(false)
  const [selected, setSelected] = useState(null)
  const advancedRef = useRef(false)
  const startedAt = pd.q_start_at ? new Date(pd.q_start_at).getTime() : Date.now()

  const myAnswer = myAnswers.find(a => a.phase === phase && a.q_idx === 0)
  const phaseAnswers = answers.filter(a => a.phase === phase && a.q_idx === 0)

  useEffect(() => {
    setSelected(null)
    setRevealed(false)
    advancedRef.current = false
    setTimeLeft(duration)
  }, [clue_idx, duration])

  // Timer per clue
  useEffect(() => {
    if (revealed) return
    const tick = setInterval(() => {
      const elapsed = Date.now() - startedAt
      const left = Math.max(0, duration - elapsed)
      setTimeLeft(left)
      if (left === 0) {
        setRevealed(true)
        clearInterval(tick)
      }
    }, 100)
    return () => clearInterval(tick)
  }, [startedAt, duration, revealed])

  // Host: advance clue after reveal
  useEffect(() => {
    if (!isHost || !revealed || advancedRef.current) return
    const allAnswered = participants.every(p => phaseAnswers.some(a => a.profile_id === p.profile_id))
    const delay = allAnswered ? 2500 : 3000
    const t = setTimeout(() => {
      if (!advancedRef.current) { advancedRef.current = true; onAdvance() }
    }, delay)
    return () => clearTimeout(t)
  }, [revealed, isHost, participants, phaseAnswers, onAdvance])

  useEffect(() => {
    if (!isHost || revealed || advancedRef.current) return
    const allAnswered = participants.length > 0 &&
      participants.every(p => phaseAnswers.some(a => a.profile_id === p.profile_id))
    if (allAnswered) setRevealed(true)
  }, [phaseAnswers, participants, isHost, revealed])

  async function handleAnswer(idx) {
    if (myAnswer || revealed || selected !== null || !personality) return
    setSelected(idx)
    const isCorrect = idx === personality.answer
    const time_ms = Date.now() - startedAt
    await onSubmit({ phase, q_idx: 0, answer_idx: idx, is_correct: isCorrect, time_ms })
  }

  if (!personality) return <Centered><Spinner /></Centered>

  const timePct = (timeLeft / duration) * 100
  const points = Math.max(100, (5 - clue_idx) * 100 + 100)

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <span className="chip">🎯 Coup de Maître</span>
        <div className="flex items-center gap-3">
          <span className="text-midi-accent font-bold text-sm">{points} pts</span>
          <span className="text-2xl font-bold tabular-nums text-white">{Math.ceil(timeLeft / 1000)}s</span>
        </div>
      </div>

      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${timePct}%` }} />
      </div>

      {/* Clues revealed so far */}
      <div className="card p-5 space-y-3">
        <p className="text-xs text-slate-500 uppercase tracking-wider">Indice {clue_idx + 1} / {personality.clues.length}</p>
        {personality.clues.slice(0, clue_idx + 1).map((clue, i) => (
          <div key={i} className={`flex items-start gap-2 ${i === clue_idx ? 'text-white animate-pop' : 'text-slate-400'}`}>
            <span className="text-midi-accent shrink-0 font-bold">{i + 1}.</span>
            <span>{clue}</span>
          </div>
        ))}
      </div>

      {/* MCQ choices */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {personality.choices.map((choice, idx) => {
          const isCorrect = idx === personality.answer
          const isSelected = (myAnswer?.answer_idx ?? selected) === idx
          let cls = 'card p-4 text-left cursor-pointer transition-all border-2 border-transparent font-medium text-sm'
          if (revealed) {
            if (isCorrect) cls += ' border-green-500 bg-green-500/10 text-green-300'
            else if (isSelected) cls += ' border-red-500 bg-red-500/10 text-red-400 opacity-60'
            else cls += ' opacity-30'
          } else if (isSelected) {
            cls += ' border-indigo-500 bg-indigo-500/10'
          } else if (!myAnswer && selected === null) {
            cls += ' hover:border-white/20 hover:bg-white/5'
          } else {
            cls += ' opacity-40 cursor-default'
          }
          return (
            <button key={idx} className={cls} onClick={() => handleAnswer(idx)}>
              {choice}
              {revealed && isCorrect && <span className="ml-2 text-green-400">✓</span>}
            </button>
          )
        })}
      </div>

      <Scoreboard participants={participants} phaseAnswers={phaseAnswers} question={{ answer: personality.answer }} revealed={revealed} />
    </div>
  )
}

// ─── Finished ─────────────────────────────────────────────────
function FinishedPhase({ participants }) {
  const sorted = [...participants].sort((a, b) => b.score - a.score)
  const medals = ['🥇', '🥈', '🥉']
  const winner = sorted[0]

  return (
    <div className="max-w-md mx-auto mt-6 space-y-6 text-center">
      <div>
        <div className="text-6xl mb-2">🏆</div>
        <h1 className="heading text-4xl text-midi-accent">Maître de Midi</h1>
        <p className="text-slate-400 text-sm mt-1">Partie terminée !</p>
      </div>

      {winner && (
        <div className="card p-6 border border-midi-accent/30 bg-midi-accent/5">
          <div className="text-5xl mb-2">{winner.profile?.avatar ?? '🎭'}</div>
          <div className="font-display text-2xl text-midi-accent">{winner.profile?.nickname ?? 'Joueur'}</div>
          <div className="text-3xl font-bold mt-1">{winner.score} pts</div>
          <div className="text-slate-400 text-sm mt-1">🏆 Maître de Midi !</div>
        </div>
      )}

      <div className="card p-4 space-y-2">
        {sorted.map((p, i) => (
          <div key={p.id} className="flex items-center gap-3 py-1">
            <span className="text-xl w-7">{medals[i] ?? `${i + 1}.`}</span>
            <span className="text-xl">{p.profile?.avatar ?? '🎭'}</span>
            <span className="flex-1 text-left font-medium">{p.profile?.nickname ?? '?'}</span>
            <span className="font-bold tabular-nums text-midi-accent">{p.score} pts</span>
          </div>
        ))}
      </div>

      <Link to="/tv" className="btn btn-primary w-full">Nouvelle partie</Link>
    </div>
  )
}

// ─── Scoreboard sidebar ───────────────────────────────────────
function Scoreboard({ participants, phaseAnswers, question, revealed }) {
  return (
    <div className="card p-4">
      <h3 className="text-xs text-slate-500 uppercase tracking-wider mb-2">Joueurs</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {participants.map(p => {
          const ans = phaseAnswers.find(a => a.profile_id === p.profile_id)
          let status = '…'
          let statusColor = 'text-slate-500'
          if (ans) {
            if (revealed) {
              status = ans.is_correct ? '✓' : '✗'
              statusColor = ans.is_correct ? 'text-green-400' : 'text-red-400'
            } else {
              status = '✓'
              statusColor = 'text-midi-accent'
            }
          }
          return (
            <div key={p.id} className="flex items-center gap-2 text-sm">
              <span>{p.profile?.avatar ?? '🎭'}</span>
              <span className="truncate flex-1">{p.profile?.nickname ?? '?'}</span>
              <span className={`font-bold text-xs ${statusColor}`}>{status}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Utils ────────────────────────────────────────────────────
function Centered({ children }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-2">
      {children}
    </div>
  )
}

function Spinner() {
  return <div className="w-8 h-8 rounded-full border-2 border-midi-accent border-t-transparent animate-spin" />
}
