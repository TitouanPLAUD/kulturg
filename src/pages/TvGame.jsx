import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useTvRoom, gainForAnswer, computePrizePool } from '../hooks/useTvRoom.js'
import { JLRProvider, useJLR } from '../components/JLRAvatar.jsx'

// ─── Phase metadata ───────────────────────────────────────────
const PHASE_META = {
  grand_oral:      { label: 'Grand Oral',          icon: '🎤', grad: 'from-amber-950/60'  },
  duel:            { label: 'Le Duel',             icon: '⚔️',  grad: 'from-orange-950/60' },
  coup_de_maitre:  { label: 'Coup de Maître',      icon: '🎯', grad: 'from-purple-950/60' },
  etoile_quiz:     { label: 'Étoile Mystérieuse',  icon: '⭐', grad: 'from-cyan-950/60'   },
  etoile_guess:    { label: "Qui est l'Étoile ?",  icon: '🌟', grad: 'from-cyan-950/60'   },
  sprint_12_coups: { label: '12 Coups de Midi',    icon: '⚡', grad: 'from-red-950/60'    },
}

const DURATIONS = {
  grand_oral:       20000,
  duel:             15000,
  coup_de_maitre:   12000,
  etoile_quiz:      18000,
  etoile_guess:     25000,
  sprint_12_coups:  10000,
}

// ─── Timer hook ───────────────────────────────────────────────
function useTimer(startAt, duration) {
  const [timeLeft, setTimeLeft] = useState(duration)
  useEffect(() => {
    const origin = startAt ? new Date(startAt).getTime() : Date.now()
    const initial = Math.max(0, duration - (Date.now() - origin))
    setTimeLeft(initial)
    if (initial === 0) return
    const tick = setInterval(() => {
      const left = Math.max(0, duration - (Date.now() - origin))
      setTimeLeft(left)
      if (left === 0) clearInterval(tick)
    }, 100)
    return () => clearInterval(tick)
  }, [startAt, duration])
  return {
    timeLeft,
    secs: Math.ceil(timeLeft / 1000),
    pct: (timeLeft / duration) * 100,
    expired: timeLeft === 0,
  }
}

// ─── Root ─────────────────────────────────────────────────────
export default function TvGame() {
  return (
    <JLRProvider>
      <TvGameCore />
    </JLRProvider>
  )
}

function TvGameCore() {
  const { code } = useParams()
  const { user } = useAuth()
  const { room, participants, answers, myAnswers, isHost, loading,
          submitAnswer, hostAdvance, startGame } = useTvRoom(code)
  const { trigger } = useJLR()

  const [showTransition, setShowTransition] = useState(false)
  const [transPhase, setTransPhase]         = useState(null)
  const prevPhase = useRef(null)

  useEffect(() => {
    if (!room?.phase) return
    const prev = prevPhase.current
    prevPhase.current = room.phase
    if (prev && prev !== room.phase && room.phase !== 'lobby') {
      setTransPhase(room.phase)
      setShowTransition(true)
      const t = setTimeout(() => setShowTransition(false), 2800)

      // JLR annonce la phase
      const phaseKey = room.phase === 'finished' ? 'finished' : room.phase
      trigger('intro', phaseKey, 5000)

      return () => clearTimeout(t)
    }
  }, [room?.phase, trigger])

  if (loading) return <TV><Centered><Spinner /><p className="text-slate-400 mt-4">Chargement…</p></Centered></TV>
  if (!room)   return <TV><Centered><p className="text-4xl mb-3">❓</p><p className="text-slate-400 mb-6">Salle introuvable.</p><BackBtn /></Centered></TV>
  if (!user)   return <TV><Centered><p className="text-slate-400 mb-4">Connecte-toi pour jouer.</p><Link to="/auth" className="tvbtn">Connexion</Link></Centered></TV>

  const phase      = room.phase
  const pd         = room.phase_data ?? {}
  const prizePool  = computePrizePool(answers)
  const meta       = PHASE_META[phase]
  const props      = { room, pd, participants, answers, myAnswers, isHost, submitAnswer, hostAdvance, prizePool }

  return (
    <TV grad={meta?.grad}>
      {showTransition && <PhaseTransition phase={transPhase} />}

      {phase !== 'lobby' && phase !== 'finished' && (
        <TopBar phase={phase} pd={pd} prizePool={prizePool} />
      )}

      <div className="max-w-2xl mx-auto px-4 pb-10">
        {phase === 'lobby'              && <LobbyPhase       {...props} code={code} onStart={startGame} />}
        {phase === 'grand_oral'         && <GrandOralPhase   {...props} />}
        {phase === 'duel'               && <DuelPhase        {...props} />}
        {phase === 'coup_de_maitre'     && <CoupDeMaitrePhase {...props} />}
        {phase === 'etoile_quiz'        && <EtoileQuizPhase  {...props} />}
        {phase === 'etoile_guess'       && <EtoileGuessPhase {...props} />}
        {phase === 'sprint_12_coups'    && <SprintPhase      {...props} />}
        {phase === 'finished'           && <FinishedPhase participants={participants} answers={answers} />}
      </div>
    </TV>
  )
}

// ─── TV shell ─────────────────────────────────────────────────
function TV({ children, grad = '' }) {
  return (
    <div className={`min-h-screen bg-[#060c18] text-white bg-gradient-to-b ${grad || 'from-slate-950'} to-[#060c18] overflow-x-hidden`}>
      {children}
    </div>
  )
}

// ─── Phase transition overlay ─────────────────────────────────
function PhaseTransition({ phase }) {
  const meta = PHASE_META[phase] ?? { label: phase, icon: '▶' }
  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center animate-pop">
      <div className="text-8xl mb-6">{meta.icon}</div>
      <p className="font-display text-5xl md:text-7xl text-white tracking-wide text-center px-4">
        {meta.label}
      </p>
      <p className="mt-4 text-slate-400 text-base tracking-widest uppercase">Préparez-vous !</p>
    </div>
  )
}

// ─── Top bar ──────────────────────────────────────────────────
function TopBar({ phase, pd, prizePool }) {
  const meta = PHASE_META[phase] ?? { label: phase, icon: '▶' }
  const progress = {
    grand_oral:      { cur: pd.q_idx + 1, total: pd.questions_grand_oral?.length },
    duel:            { cur: pd.q_idx + 1, total: pd.questions_duel?.length },
    etoile_quiz:     { cur: pd.q_idx + 1, total: pd.etoile_quiz?.length },
    sprint_12_coups: { cur: pd.q_idx + 1, total: pd.questions_sprint?.length },
    coup_de_maitre:  { cur: (pd.clue_idx ?? 0) + 1, total: pd.personality?.clues?.length ?? 5, label: 'indice' },
  }[phase]

  return (
    <div className="sticky top-0 z-20 backdrop-blur-xl bg-black/70 border-b border-white/10 px-4 py-3">
      <div className="max-w-2xl mx-auto flex items-center gap-3">
        <span className="text-xl">{meta.icon}</span>
        <span className="font-display text-base tracking-wider hidden sm:block text-slate-200">{meta.label}</span>
        {progress?.total && (
          <span className="text-xs text-slate-500 bg-white/5 px-2 py-0.5 rounded-full">
            {progress.label ?? 'Q'}{progress.cur}/{progress.total}
          </span>
        )}
        <div className="flex-1" />
        <div className="text-right">
          <div className="text-xs text-slate-500">Cagnotte</div>
          <div className="font-display text-xl text-yellow-400 leading-none">
            {prizePool.toLocaleString('fr-FR')} €
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Lobby ────────────────────────────────────────────────────
function LobbyPhase({ room, participants, isHost, onStart, code }) {
  const [copied, setCopied] = useState(false)
  const { trigger } = useJLR()

  // Accueil JLR dès l'entrée dans le lobby
  useEffect(() => {
    const t = setTimeout(() => trigger('idle', 'lobby', 0), 800)
    return () => clearTimeout(t)
  }, [trigger])

  // JLR réagit quand un joueur rejoint
  const prevCount = useRef(participants.length)
  useEffect(() => {
    if (participants.length > prevCount.current) {
      trigger('excited', 'lobby', 4000)
    }
    prevCount.current = participants.length
  }, [participants.length, trigger])

  function copyCode() {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center py-8">
      <div className="w-full space-y-6">

        <div className="text-center space-y-2">
          <div className="text-6xl">📺</div>
          <h1 className="font-display text-4xl md:text-5xl tracking-wider">Les 12 Coups de Midi</h1>
          <p className="text-slate-500 text-sm">Salle d'attente</p>
        </div>

        {/* Code */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center">
          <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Code de la partie</p>
          <div className="flex items-center justify-center gap-3">
            <span className="font-mono text-3xl tracking-[0.3em] font-black text-yellow-400">{code}</span>
            <button onClick={copyCode}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition text-sm">
              {copied ? '✓' : '📋'}
            </button>
          </div>
          <p className="text-xs text-slate-600 mt-2">Partage ce code à tes adversaires</p>
        </div>

        {/* Players */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Joueurs</h2>
            <span className="text-xs text-slate-500 bg-white/10 rounded-full px-2 py-0.5">{participants.length}/4</span>
          </div>
          <ul className="space-y-3">
            {participants.map(p => (
              <li key={p.id} className="flex items-center gap-3">
                <span className="text-3xl">{p.profile?.avatar ?? '🎭'}</span>
                <span className="font-semibold flex-1">{p.profile?.nickname ?? '…'}</span>
                {p.profile_id === room.host_id && (
                  <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">Hôte</span>
                )}
              </li>
            ))}
            {Array.from({ length: 4 - participants.length }).map((_, i) => (
              <li key={i} className="flex items-center gap-3 opacity-20">
                <span className="text-3xl">👤</span>
                <span className="text-slate-500 text-sm">En attente…</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Game flow */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
          <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Déroulé</p>
          {[
            ['🎤', 'Grand Oral',          '6 questions · 500–700 € par réponse'],
            ['⚔️',  'Le Duel',             '6 buzzer · 800 € pour le 1er correct'],
            ['🎯', 'Coup de Maître',       '1 personnalité · 200–1 000 € selon indice'],
            ['⭐', 'Étoile Mystérieuse',   '4 indices + révélation finale · 2 000 €'],
            ['⚡', 'Sprint 12 Coups',      '12 questions rapides · 400 € chacune'],
          ].map(([icon, name, detail]) => (
            <div key={name} className="flex items-start gap-3 text-sm">
              <span>{icon}</span>
              <div>
                <span className="font-semibold text-slate-200">{name}</span>
                <span className="text-slate-600 ml-2 text-xs">{detail}</span>
              </div>
            </div>
          ))}
        </div>

        {isHost ? (
          <button onClick={onStart} disabled={participants.length < 2}
            className="w-full py-4 rounded-2xl font-display text-xl tracking-wider bg-yellow-500 text-black
              hover:bg-yellow-400 transition disabled:opacity-40 disabled:cursor-not-allowed">
            {participants.length < 2 ? '⏳ En attente d\'un joueur…' : '▶ Lancer la partie !'}
          </button>
        ) : (
          <p className="text-center text-slate-500 text-sm py-4">
            ⏳ En attente que l'hôte lance la partie…
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Grand Oral ───────────────────────────────────────────────
function GrandOralPhase({ pd, participants, answers, myAnswers, isHost, submitAnswer, hostAdvance }) {
  const phase     = 'grand_oral'
  const questions = pd.questions_grand_oral ?? []
  const q_idx     = pd.q_idx ?? 0
  const q         = questions[q_idx]
  const { secs, pct, expired } = useTimer(pd.q_start_at, DURATIONS.grand_oral)
  const [selected, setSelected] = useState(null)
  const [revealed, setRevealed] = useState(false)
  const advRef     = useRef(false)
  const urgentFired = useRef(false)
  const revealFired = useRef(false)
  const startedAt  = pd.q_start_at ? new Date(pd.q_start_at).getTime() : Date.now()
  const { trigger } = useJLR()

  const myAnswer  = myAnswers.find(a => a.phase === phase && a.q_idx === q_idx)
  const qAnswers  = answers.filter(a => a.phase === phase && a.q_idx === q_idx)

  useEffect(() => {
    setSelected(null); setRevealed(false)
    advRef.current = false; urgentFired.current = false; revealFired.current = false
    trigger('thinking', 'thinking', 3500)
  }, [q_idx, trigger])

  useEffect(() => { if (expired && !revealed) setRevealed(true) }, [expired, revealed])

  // JLR urgent à 5s
  useEffect(() => {
    if (secs <= 5 && secs > 0 && !revealed && !urgentFired.current) {
      urgentFired.current = true
      trigger('urgent', 'urgent', 3000)
    }
  }, [secs, revealed, trigger])

  useEffect(() => {
    if (!isHost || revealed) return
    if (participants.length > 0 && participants.every(p => qAnswers.some(a => a.profile_id === p.profile_id)))
      setRevealed(true)
  }, [qAnswers, participants, isHost, revealed])

  // JLR réaction à la révélation
  useEffect(() => {
    if (!revealed || revealFired.current) return
    revealFired.current = true
    if (myAnswer) {
      if (myAnswer.is_correct) trigger('excited', 'correct', 5000)
      else trigger('sad', 'wrong', 5000)
    }
  }, [revealed, myAnswer, trigger])

  useEffect(() => {
    if (!isHost || !revealed || advRef.current) return
    const allDone = participants.every(p => qAnswers.some(a => a.profile_id === p.profile_id))
    const t = setTimeout(() => {
      if (!advRef.current) { advRef.current = true; hostAdvance() }
    }, allDone ? 2500 : 3500)
    return () => clearTimeout(t)
  }, [revealed, isHost, participants, qAnswers, hostAdvance])

  async function pick(idx) {
    if (myAnswer || revealed || selected !== null || !q) return
    setSelected(idx)
    const isCorrect = idx === q.answer
    await submitAnswer({ phase, q_idx, answer_idx: idx, is_correct: isCorrect, time_ms: Date.now() - startedAt })
  }

  if (!q) return <Centered><Spinner /></Centered>

  const myGain = revealed && myAnswer?.is_correct
    ? gainForAnswer(phase, true, myAnswer.time_ms ?? 20000) : null

  return (
    <div className="space-y-5 pt-4">
      <QHeader icon="🎤" label="Grand Oral"
        sub={`Q${q_idx + 1} / ${questions.length} · 500–700 €`}
        secs={secs} pct={pct} />

      <QuestionCard text={q.q} theme={q.theme} />

      <ChoicesGrid choices={q.choices} answer={q.answer} revealed={revealed}
        selected={myAnswer?.answer_idx ?? selected} onPick={pick} />

      {revealed && myGain !== null && (
        <GainBadge gain={myGain} />
      )}

      <PlayerBar participants={participants} qAnswers={qAnswers} revealed={revealed} answer={q.answer} />
    </div>
  )
}

// ─── Duel ─────────────────────────────────────────────────────
function DuelPhase({ pd, participants, answers, myAnswers, isHost, submitAnswer, hostAdvance }) {
  const phase     = 'duel'
  const questions = pd.questions_duel ?? []
  const q_idx     = pd.q_idx ?? 0
  const q         = questions[q_idx]
  const { secs, pct, expired } = useTimer(pd.q_start_at, DURATIONS.duel)
  const [selected, setSelected] = useState(null)
  const [revealed, setRevealed] = useState(false)
  const advRef      = useRef(false)
  const urgentFired = useRef(false)
  const buzzFired   = useRef(false)
  const revealFired = useRef(false)
  const startedAt   = pd.q_start_at ? new Date(pd.q_start_at).getTime() : Date.now()
  const { trigger } = useJLR()

  const myAnswer  = myAnswers.find(a => a.phase === phase && a.q_idx === q_idx)
  const qAnswers  = answers.filter(a => a.phase === phase && a.q_idx === q_idx)

  const duelWinner = qAnswers
    .filter(a => a.is_correct)
    .sort((a, b) => new Date(a.answered_at) - new Date(b.answered_at))[0] ?? null

  // Cherche aussi le premier buzz (correct ou non)
  const firstBuzz = qAnswers
    .sort((a, b) => new Date(a.answered_at) - new Date(b.answered_at))[0] ?? null

  useEffect(() => {
    setSelected(null); setRevealed(false)
    advRef.current = false; urgentFired.current = false
    buzzFired.current = false; revealFired.current = false
    trigger('thinking', 'thinking', 3500)
  }, [q_idx, trigger])

  useEffect(() => { if (expired && !revealed) setRevealed(true) }, [expired, revealed])

  // JLR sur buzz
  useEffect(() => {
    if (firstBuzz && !buzzFired.current) {
      buzzFired.current = true
      trigger('shocked', 'buzz', 2500)
    }
  }, [firstBuzz, trigger])

  // JLR urgent
  useEffect(() => {
    if (secs <= 4 && secs > 0 && !revealed && !urgentFired.current && !firstBuzz) {
      urgentFired.current = true
      trigger('urgent', 'urgent', 3000)
    }
  }, [secs, revealed, firstBuzz, trigger])

  // Révélation 1.2s après premier buzz correct
  useEffect(() => {
    if (revealed || !duelWinner) return
    const t = setTimeout(() => setRevealed(true), 1200)
    return () => clearTimeout(t)
  }, [duelWinner, revealed])

  // JLR réaction révélation
  useEffect(() => {
    if (!revealed || revealFired.current) return
    revealFired.current = true
    if (duelWinner) trigger('excited', 'duel_win', 5000)
    else if (firstBuzz && !duelWinner) trigger('sad', 'duel_miss', 5000)
    else trigger('sad', 'wrong', 4000)
  }, [revealed, duelWinner, firstBuzz, trigger])

  useEffect(() => {
    if (!isHost || !revealed || advRef.current) return
    const t = setTimeout(() => {
      if (!advRef.current) { advRef.current = true; hostAdvance() }
    }, 3500)
    return () => clearTimeout(t)
  }, [revealed, isHost, hostAdvance])

  async function pick(idx) {
    if (myAnswer || revealed || selected !== null || !q) return
    setSelected(idx)
    const isCorrect = idx === q.answer
    await submitAnswer({ phase, q_idx, answer_idx: idx, is_correct: isCorrect, time_ms: Date.now() - startedAt })
  }

  if (!q) return <Centered><Spinner /></Centered>

  const winnerPart = duelWinner
    ? participants.find(p => p.profile_id === duelWinner.profile_id)
    : null

  return (
    <div className="space-y-5 pt-4">
      <QHeader icon="⚔️" label="Le Duel" sub={`Q${q_idx + 1} / ${questions.length} · Buzzer · 800 €`}
        secs={secs} pct={pct} timerClass="bg-orange-500" />

      <QuestionCard text={q.q} />

      {/* Buzz indicator */}
      {firstBuzz && !revealed && (
        <div className="text-center bg-orange-500/10 border border-orange-500/30 rounded-2xl py-4 animate-pop">
          {winnerPart || participants.find(p => p.profile_id === firstBuzz.profile_id) ? (
            <>
              <span className="text-3xl">
                {(participants.find(p => p.profile_id === firstBuzz.profile_id))?.profile?.avatar ?? '🎭'}
              </span>
              <p className="font-display text-xl text-orange-300 tracking-wider mt-1">
                {(participants.find(p => p.profile_id === firstBuzz.profile_id))?.profile?.nickname ?? '?'} buzzé !
              </p>
            </>
          ) : null}
        </div>
      )}

      {revealed && (
        winnerPart ? (
          <div className="text-center bg-yellow-500/10 border border-yellow-500/30 rounded-2xl py-4 animate-pop">
            <span className="text-4xl">{winnerPart.profile?.avatar ?? '🎭'}</span>
            <p className="font-display text-2xl text-yellow-400 tracking-wider mt-1">
              {winnerPart.profile?.nickname ?? '?'} remporte le duel !
            </p>
            <p className="text-yellow-300 font-bold mt-0.5">+800 €</p>
          </div>
        ) : (
          <div className="text-center bg-white/5 border border-white/10 rounded-2xl py-4">
            <p className="text-slate-400">Personne n'a répondu correctement 😕</p>
          </div>
        )
      )}

      <ChoicesGrid choices={q.choices} answer={q.answer} revealed={revealed}
        selected={myAnswer?.answer_idx ?? selected} onPick={pick}
        disableAll={!!firstBuzz && !myAnswer} />

      <PlayerBar participants={participants} qAnswers={qAnswers} revealed={revealed}
        answer={q.answer} duelWinnerId={duelWinner?.profile_id} />
    </div>
  )
}

// ─── Coup de Maître ───────────────────────────────────────────
function CoupDeMaitrePhase({ pd, participants, answers, myAnswers, isHost, submitAnswer, hostAdvance }) {
  const phase       = 'coup_de_maitre'
  const personality = pd.personality
  const clue_idx    = pd.clue_idx ?? 0
  const { secs, pct, expired } = useTimer(pd.q_start_at, DURATIONS.coup_de_maitre)
  const [selected, setSelected] = useState(null)
  const [revealed, setRevealed] = useState(false)
  const advRef      = useRef(false)
  const urgentFired = useRef(false)
  const revealFired = useRef(false)
  const startedAt   = pd.q_start_at ? new Date(pd.q_start_at).getTime() : Date.now()
  const { trigger } = useJLR()

  const myAnswer  = myAnswers.find(a => a.phase === phase)
  const qAnswers  = answers.filter(a => a.phase === phase)

  useEffect(() => {
    setSelected(null); setRevealed(false)
    advRef.current = false; urgentFired.current = false; revealFired.current = false
    trigger('thinking', 'coup_de_maitre', 4000)
  }, [clue_idx, trigger])

  useEffect(() => { if (expired && !revealed) setRevealed(true) }, [expired, revealed])

  useEffect(() => {
    if (secs <= 4 && secs > 0 && !revealed && !urgentFired.current) {
      urgentFired.current = true
      trigger('urgent', 'urgent', 2500)
    }
  }, [secs, revealed, trigger])

  useEffect(() => {
    if (!isHost || !revealed || advRef.current) return
    const t = setTimeout(() => {
      if (!advRef.current) { advRef.current = true; hostAdvance() }
    }, 3500)
    return () => clearTimeout(t)
  }, [revealed, isHost, hostAdvance])

  // JLR révélation
  useEffect(() => {
    if (!revealed || revealFired.current) return
    revealFired.current = true
    if (myAnswer?.is_correct) trigger('excited', 'correct', 5000)
    else if (myAnswer) trigger('sad', 'wrong', 5000)
  }, [revealed, myAnswer, trigger])

  async function pick(idx) {
    if (myAnswer || revealed || selected !== null || !personality) return
    setSelected(idx)
    const isCorrect = idx === personality.answer
    await submitAnswer({ phase, q_idx: clue_idx, answer_idx: idx, is_correct: isCorrect, time_ms: Date.now() - startedAt })
  }

  if (!personality) return <Centered><Spinner /></Centered>

  const points = Math.max(200, 1000 - clue_idx * 200)

  return (
    <div className="space-y-5 pt-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎯</span>
            <span className="font-display text-2xl tracking-wider">Coup de Maître</span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Indice {clue_idx + 1}/{personality.clues.length}
          </p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-xs text-slate-500">Valeur actuelle</div>
          <div className="font-display text-2xl text-yellow-400">{points} €</div>
          <div className="text-slate-600 text-xs mt-0.5">{secs}s</div>
        </div>
      </div>

      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full bg-purple-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
        <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold">Qui suis-je ?</p>
        {personality.clues.slice(0, clue_idx + 1).map((clue, i) => (
          <div key={i} className={`flex gap-3 items-start ${i === clue_idx ? 'animate-pop' : ''}`}>
            <span className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
              ${i === clue_idx ? 'bg-purple-500 text-white' : 'bg-white/10 text-slate-500'}`}>
              {i + 1}
            </span>
            <p className={`text-base leading-snug ${i === clue_idx ? 'text-white font-medium' : 'text-slate-400'}`}>
              {clue}
            </p>
          </div>
        ))}
        {Array.from({ length: personality.clues.length - clue_idx - 1 }).map((_, i) => (
          <div key={i} className="flex gap-3 items-center opacity-15">
            <span className="shrink-0 w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs text-slate-600">
              {clue_idx + i + 2}
            </span>
            <div className="h-3 bg-white/10 rounded flex-1" />
          </div>
        ))}
      </div>

      <ChoicesGrid choices={personality.choices} answer={personality.answer} revealed={revealed}
        selected={myAnswer?.answer_idx ?? selected} onPick={pick} disableAll={!!myAnswer}
        accent="border-purple-500 bg-purple-500/15 text-purple-300" />

      {myAnswer && !revealed && (
        <p className="text-center text-sm text-slate-500 bg-white/5 rounded-xl py-3">
          ✓ Réponse enregistrée — attends la correction…
        </p>
      )}

      {revealed && (
        <div className="text-center">
          <p className="text-2xl font-black text-white animate-pop">
            {personality.choices?.[personality.answer]}
          </p>
        </div>
      )}

      <PlayerBar participants={participants} qAnswers={qAnswers} revealed={revealed} answer={personality.answer} />
    </div>
  )
}

// ─── Étoile Quiz ──────────────────────────────────────────────
function EtoileQuizPhase({ pd, participants, answers, myAnswers, isHost, submitAnswer, hostAdvance }) {
  const phase     = 'etoile_quiz'
  const questions = pd.etoile_quiz ?? []
  const q_idx     = pd.q_idx ?? 0
  const q         = questions[q_idx]
  const etoile    = pd.etoile
  const { secs, pct, expired } = useTimer(pd.q_start_at, DURATIONS.etoile_quiz)
  const [selected, setSelected] = useState(null)
  const [revealed, setRevealed] = useState(false)
  const advRef      = useRef(false)
  const urgentFired = useRef(false)
  const revealFired = useRef(false)
  const startedAt   = pd.q_start_at ? new Date(pd.q_start_at).getTime() : Date.now()
  const { trigger } = useJLR()

  const myAnswer  = myAnswers.find(a => a.phase === phase && a.q_idx === q_idx)
  const qAnswers  = answers.filter(a => a.phase === phase && a.q_idx === q_idx)

  useEffect(() => {
    setSelected(null); setRevealed(false)
    advRef.current = false; urgentFired.current = false; revealFired.current = false
    trigger('thinking', 'thinking', 3000)
  }, [q_idx, trigger])

  useEffect(() => { if (expired && !revealed) setRevealed(true) }, [expired, revealed])

  useEffect(() => {
    if (secs <= 5 && secs > 0 && !revealed && !urgentFired.current) {
      urgentFired.current = true
      trigger('urgent', 'urgent', 3000)
    }
  }, [secs, revealed, trigger])

  useEffect(() => {
    if (!isHost || revealed) return
    if (participants.length > 0 && participants.every(p => qAnswers.some(a => a.profile_id === p.profile_id)))
      setRevealed(true)
  }, [qAnswers, participants, isHost, revealed])

  useEffect(() => {
    if (!revealed || revealFired.current) return
    revealFired.current = true
    if (myAnswer?.is_correct) trigger('excited', 'correct', 5000)
    else if (myAnswer) trigger('sad', 'wrong', 5000)
  }, [revealed, myAnswer, trigger])

  useEffect(() => {
    if (!isHost || !revealed || advRef.current) return
    const t = setTimeout(() => {
      if (!advRef.current) { advRef.current = true; hostAdvance() }
    }, 3000)
    return () => clearTimeout(t)
  }, [revealed, isHost, hostAdvance])

  async function pick(idx) {
    if (myAnswer || revealed || selected !== null || !q) return
    setSelected(idx)
    await submitAnswer({ phase, q_idx, answer_idx: idx, is_correct: idx === q.answer, time_ms: Date.now() - startedAt })
  }

  if (!q || !etoile) return <Centered><Spinner /></Centered>

  const revealedHints = etoile.hints?.slice(0, q_idx + (revealed ? 1 : 0)) ?? []

  return (
    <div className="space-y-5 pt-4">
      <QHeader icon="⭐" label="Étoile Mystérieuse"
        sub={`Q${q_idx + 1} / ${questions.length} · 300 €`}
        secs={secs} pct={pct} timerClass="bg-cyan-500" />

      <div className="bg-cyan-950/40 border border-cyan-500/20 rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-3">
          <span className="text-4xl filter blur-sm select-none">{etoile.silhouette}</span>
          <p className="text-xs text-cyan-500 uppercase tracking-widest font-semibold">Étoile Mystérieuse</p>
        </div>
        {revealedHints.length > 0 && (
          <div className="space-y-1.5">
            {revealedHints.map((h, i) => (
              <p key={i} className={`text-sm flex gap-2 ${i === revealedHints.length - 1 ? 'text-cyan-200 animate-pop' : 'text-slate-500'}`}>
                <span className="text-cyan-600 shrink-0">★</span>{h}
              </p>
            ))}
          </div>
        )}
        {revealedHints.length === 0 && (
          <p className="text-xs text-slate-600 italic">Les indices apparaissent au fil des questions…</p>
        )}
      </div>

      <QuestionCard text={q.q} theme={q.theme} />

      <ChoicesGrid choices={q.choices} answer={q.answer} revealed={revealed}
        selected={myAnswer?.answer_idx ?? selected} onPick={pick}
        accent="border-cyan-500 bg-cyan-500/15 text-cyan-300" />

      <PlayerBar participants={participants} qAnswers={qAnswers} revealed={revealed} answer={q.answer} />
    </div>
  )
}

// ─── Étoile Guess ─────────────────────────────────────────────
function EtoileGuessPhase({ pd, participants, answers, myAnswers, isHost, submitAnswer, hostAdvance }) {
  const phase   = 'etoile_guess'
  const etoile  = pd.etoile
  const { secs, pct, expired } = useTimer(pd.q_start_at, DURATIONS.etoile_guess)
  const [selected, setSelected] = useState(null)
  const [revealed, setRevealed] = useState(false)
  const advRef      = useRef(false)
  const urgentFired = useRef(false)
  const revealFired = useRef(false)
  const startedAt   = pd.q_start_at ? new Date(pd.q_start_at).getTime() : Date.now()
  const { trigger } = useJLR()

  const myAnswer  = myAnswers.find(a => a.phase === phase && a.q_idx === 0)
  const qAnswers  = answers.filter(a => a.phase === phase && a.q_idx === 0)

  useEffect(() => {
    setSelected(null); setRevealed(false)
    advRef.current = false; urgentFired.current = false; revealFired.current = false
    trigger('idle', 'etoile_guess', 5000)
  }, [trigger])

  useEffect(() => { if (expired && !revealed) setRevealed(true) }, [expired, revealed])

  useEffect(() => {
    if (secs <= 7 && secs > 0 && !revealed && !urgentFired.current) {
      urgentFired.current = true
      trigger('urgent', 'urgent', 3500)
    }
  }, [secs, revealed, trigger])

  useEffect(() => {
    if (!isHost || revealed) return
    if (participants.length > 0 && participants.every(p => qAnswers.some(a => a.profile_id === p.profile_id)))
      setRevealed(true)
  }, [qAnswers, participants, isHost, revealed])

  useEffect(() => {
    if (!revealed || revealFired.current) return
    revealFired.current = true
    if (myAnswer?.is_correct) trigger('celebrate', 'correct', 6000)
    else if (myAnswer) trigger('sad', 'wrong', 5000)
  }, [revealed, myAnswer, trigger])

  useEffect(() => {
    if (!isHost || !revealed || advRef.current) return
    const t = setTimeout(() => {
      if (!advRef.current) { advRef.current = true; hostAdvance() }
    }, 5000)
    return () => clearTimeout(t)
  }, [revealed, isHost, hostAdvance])

  async function pick(idx) {
    if (myAnswer || revealed || selected !== null || !etoile) return
    setSelected(idx)
    await submitAnswer({ phase, q_idx: 0, answer_idx: idx, is_correct: idx === etoile.answer, time_ms: Date.now() - startedAt })
  }

  if (!etoile) return <Centered><Spinner /></Centered>

  return (
    <div className="space-y-5 pt-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🌟</span>
            <span className="font-display text-2xl tracking-wider">Qui est l'Étoile ?</span>
          </div>
          <p className="text-xs text-yellow-500 font-bold mt-0.5">2 000 € en jeu !</p>
        </div>
        <div className="text-right shrink-0 text-slate-400 text-sm">{secs}s</div>
      </div>

      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full bg-cyan-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>

      <div className="bg-cyan-950/40 border border-cyan-500/30 rounded-2xl p-6 text-center space-y-4">
        <div className={`text-6xl transition-all duration-1000 ${revealed ? '' : 'filter blur-md'}`}>
          {etoile.silhouette}
        </div>
        <div className="space-y-2 text-left">
          {etoile.hints?.map((h, i) => (
            <p key={i} className="text-sm text-cyan-200 flex gap-2 items-start">
              <span className="text-cyan-500 shrink-0 mt-0.5">★</span>{h}
            </p>
          ))}
        </div>
        {revealed && (
          <p className="font-display text-3xl text-cyan-300 animate-pop tracking-wider">
            {etoile.choices?.[etoile.answer]}
          </p>
        )}
      </div>

      <ChoicesGrid choices={etoile.choices} answer={etoile.answer} revealed={revealed}
        selected={myAnswer?.answer_idx ?? selected} onPick={pick}
        accent="border-cyan-500 bg-cyan-500/15 text-cyan-300" />

      <PlayerBar participants={participants} qAnswers={qAnswers} revealed={revealed} answer={etoile.answer} />
    </div>
  )
}

// ─── Sprint 12 Coups ──────────────────────────────────────────
function SprintPhase({ pd, participants, answers, myAnswers, isHost, submitAnswer, hostAdvance }) {
  const phase     = 'sprint_12_coups'
  const questions = pd.questions_sprint ?? []
  const q_idx     = pd.q_idx ?? 0
  const q         = questions[q_idx]
  const { secs, pct, expired } = useTimer(pd.q_start_at, DURATIONS.sprint_12_coups)
  const [selected, setSelected] = useState(null)
  const [revealed, setRevealed] = useState(false)
  const advRef      = useRef(false)
  const urgentFired = useRef(false)
  const revealFired = useRef(false)
  const startedAt   = pd.q_start_at ? new Date(pd.q_start_at).getTime() : Date.now()
  const { trigger } = useJLR()

  const myAnswer  = myAnswers.find(a => a.phase === phase && a.q_idx === q_idx)
  const qAnswers  = answers.filter(a => a.phase === phase && a.q_idx === q_idx)

  useEffect(() => {
    setSelected(null); setRevealed(false)
    advRef.current = false; urgentFired.current = false; revealFired.current = false
  }, [q_idx])

  useEffect(() => { if (expired && !revealed) setRevealed(true) }, [expired, revealed])

  useEffect(() => {
    if (secs <= 3 && secs > 0 && !revealed && !urgentFired.current) {
      urgentFired.current = true
      trigger('urgent', 'urgent', 2500)
    }
  }, [secs, revealed, trigger])

  useEffect(() => {
    if (!isHost || revealed) return
    if (participants.length > 0 && participants.every(p => qAnswers.some(a => a.profile_id === p.profile_id)))
      setRevealed(true)
  }, [qAnswers, participants, isHost, revealed])

  useEffect(() => {
    if (!revealed || revealFired.current) return
    revealFired.current = true
    if (myAnswer?.is_correct) trigger('excited', 'correct', 3000)
    else if (myAnswer) trigger('sad', 'wrong', 3000)
  }, [revealed, myAnswer, trigger])

  useEffect(() => {
    if (!isHost || !revealed || advRef.current) return
    const allDone = participants.every(p => qAnswers.some(a => a.profile_id === p.profile_id))
    const t = setTimeout(() => {
      if (!advRef.current) { advRef.current = true; hostAdvance() }
    }, allDone ? 1800 : 2500)
    return () => clearTimeout(t)
  }, [revealed, isHost, participants, qAnswers, hostAdvance])

  async function pick(idx) {
    if (myAnswer || revealed || selected !== null || !q) return
    setSelected(idx)
    await submitAnswer({ phase, q_idx, answer_idx: idx, is_correct: idx === q.answer, time_ms: Date.now() - startedAt })
  }

  if (!q) return <Centered><Spinner /></Centered>

  const urgent = secs <= 3

  return (
    <div className="space-y-4 pt-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">⚡</span>
          <span className="font-display text-xl tracking-wider">Sprint 12 Coups</span>
          <span className="text-xs text-slate-500 bg-white/5 px-2 py-0.5 rounded-full">
            Q{q_idx + 1}/{questions.length}
          </span>
        </div>
        <span className={`font-display text-4xl tabular-nums ${urgent ? 'text-red-400 animate-pulse' : 'text-white'}`}>
          {secs}s
        </span>
      </div>

      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${urgent ? 'bg-red-500' : 'bg-red-400'}`}
          style={{ width: `${pct}%` }} />
      </div>

      <QuestionCard text={q.q} theme={q.theme} />

      <ChoicesGrid choices={q.choices} answer={q.answer} revealed={revealed}
        selected={myAnswer?.answer_idx ?? selected} onPick={pick} />

      <PlayerBar participants={participants} qAnswers={qAnswers} revealed={revealed} answer={q.answer} compact />
    </div>
  )
}

// ─── Finished / Podium ────────────────────────────────────────
function FinishedPhase({ participants, answers }) {
  const prizePool = computePrizePool(answers)
  const [show, setShow] = useState(false)
  const { trigger } = useJLR()

  useEffect(() => {
    const t1 = setTimeout(() => setShow(true), 400)
    const t2 = setTimeout(() => trigger('celebrate', 'finished', 0), 1200)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [trigger])

  const duelWinners = new Map()
  for (const a of [...answers]
    .filter(x => x.phase === 'duel' && x.is_correct)
    .sort((a, b) => new Date(a.answered_at) - new Date(b.answered_at))) {
    if (!duelWinners.has(a.q_idx)) duelWinners.set(a.q_idx, a.profile_id)
  }

  const ranked = [...participants].map(p => {
    let score = 0
    for (const a of answers.filter(x => x.profile_id === p.profile_id)) {
      if (!a.is_correct) continue
      if (a.phase === 'duel') {
        if (duelWinners.get(a.q_idx) === p.profile_id) score += 800
      } else {
        score += gainForAnswer(a.phase, true, a.time_ms ?? 20000, a.q_idx)
      }
    }
    return { ...p, score }
  }).sort((a, b) => b.score - a.score)

  const winner  = ranked[0]
  const medals  = ['🥇', '🥈', '🥉', '']

  return (
    <div className="min-h-screen flex flex-col items-center justify-center py-10 px-4">
      <div className={`w-full max-w-md space-y-6 transition-all duration-700 ${show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>

        <div className="text-center space-y-2">
          <div className="text-7xl animate-bounce">🏆</div>
          <h1 className="font-display text-5xl text-yellow-400 tracking-wider">Maître de Midi</h1>
          <p className="text-slate-500 text-sm">
            Cagnotte totale : <span className="text-yellow-400 font-bold">{prizePool.toLocaleString('fr-FR')} €</span>
          </p>
        </div>

        {winner && (
          <div className="bg-yellow-500/10 border-2 border-yellow-500/40 rounded-2xl p-6 text-center space-y-2 animate-glow">
            <div className="text-6xl">{winner.profile?.avatar ?? '🎭'}</div>
            <div className="font-display text-3xl text-yellow-400 tracking-wider">
              {winner.profile?.nickname ?? 'Joueur'}
            </div>
            <div className="font-black text-3xl">{winner.score.toLocaleString('fr-FR')} €</div>
            <div className="inline-block bg-yellow-500/20 text-yellow-300 text-xs px-3 py-1 rounded-full font-semibold">
              🏆 Maître de Midi !
            </div>
          </div>
        )}

        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          {ranked.map((p, i) => (
            <div key={p.id}
              className={`flex items-center gap-4 px-5 py-4 ${i < ranked.length - 1 ? 'border-b border-white/5' : ''}`}>
              <span className="text-xl w-7 text-center">{medals[i] ?? `${i + 1}`}</span>
              <span className="text-2xl">{p.profile?.avatar ?? '🎭'}</span>
              <span className="flex-1 font-semibold truncate">{p.profile?.nickname ?? '?'}</span>
              <span className="font-black text-yellow-400 tabular-nums">
                {p.score.toLocaleString('fr-FR')} €
              </span>
            </div>
          ))}
        </div>

        <Link to="/tv"
          className="block w-full py-4 text-center rounded-2xl bg-yellow-500 text-black font-display text-xl tracking-wider hover:bg-yellow-400 transition">
          Nouvelle partie
        </Link>
      </div>
    </div>
  )
}

// ─── Shared components ────────────────────────────────────────

function QHeader({ icon, label, sub, secs, pct, timerClass = 'bg-yellow-500' }) {
  const urgent = secs <= 5
  return (
    <div className="space-y-2 pt-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xl">{icon}</span>
          <span className="font-display text-xl tracking-wider">{label}</span>
          {sub && <span className="text-xs text-slate-500 hidden sm:block">{sub}</span>}
        </div>
        <span className={`font-display text-3xl tabular-nums ${urgent ? 'text-red-400 animate-pulse' : 'text-white'}`}>
          {secs}s
        </span>
      </div>
      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${timerClass}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function QuestionCard({ text, theme }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
      <p className="text-xl md:text-2xl font-bold leading-relaxed">{text}</p>
      {theme && <p className="text-xs text-slate-600 mt-3 uppercase tracking-wider">{theme}</p>}
    </div>
  )
}

function ChoicesGrid({ choices, answer, revealed, selected, onPick, disableAll = false,
  accent = 'border-yellow-500 bg-yellow-500/15 text-yellow-300' }) {
  if (!choices?.length) return null
  const locked = disableAll || selected !== null || revealed
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {choices.map((choice, idx) => {
        const isCorrect  = idx === answer
        const isSelected = selected === idx
        let cls = 'w-full text-left p-4 rounded-xl border-2 font-semibold transition-all duration-200 '
        if (revealed) {
          if (isCorrect)        cls += 'border-green-500 bg-green-500/15 text-green-300'
          else if (isSelected)  cls += 'border-red-500 bg-red-500/10 text-red-400 opacity-70'
          else                  cls += 'border-white/5 bg-transparent text-slate-600 opacity-40'
        } else if (isSelected) {
          cls += accent
        } else if (locked) {
          cls += 'border-white/10 bg-white/5 text-slate-500 opacity-60 cursor-default'
        } else {
          cls += 'border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10 cursor-pointer'
        }
        return (
          <button key={idx} className={cls}
            onClick={() => { if (!locked) onPick(idx) }}>
            <span className="text-xs opacity-50 mr-2">{['A', 'B', 'C', 'D'][idx]}</span>
            {choice}
            {revealed && isCorrect && <span className="ml-2 text-green-400">✓</span>}
          </button>
        )
      })}
    </div>
  )
}

function GainBadge({ gain }) {
  return (
    <div className={`text-center text-2xl font-display tracking-wider animate-pop ${gain > 0 ? 'text-yellow-400' : 'text-slate-600'}`}>
      {gain > 0 ? `+${gain.toLocaleString('fr-FR')} €` : 'Pas de gain'}
    </div>
  )
}

function PlayerBar({ participants, qAnswers, revealed, answer, duelWinnerId, compact = false }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3">
      <div className="grid grid-cols-4 gap-2">
        {participants.map(p => {
          const ans           = qAnswers.find(a => a.profile_id === p.profile_id)
          const isDuelWinner  = duelWinnerId === p.profile_id
          let badge = <span className="text-slate-700 text-xs">…</span>
          if (ans) {
            if (revealed) {
              badge = ans.is_correct
                ? <span className="text-green-400 text-sm font-bold">✓</span>
                : <span className="text-red-400 text-sm font-bold">✗</span>
            } else {
              badge = isDuelWinner
                ? <span className="text-orange-400 text-sm font-bold">⚡</span>
                : <span className="text-yellow-400 text-sm">✓</span>
            }
          }
          return (
            <div key={p.id} className="flex flex-col items-center gap-1 text-center">
              <span className="text-xl">{p.profile?.avatar ?? '🎭'}</span>
              {!compact && (
                <span className="text-xs text-slate-500 truncate w-full text-center leading-none">
                  {p.profile?.nickname ?? '?'}
                </span>
              )}
              {badge}
            </div>
          )
        })}
        {Array.from({ length: Math.max(0, 4 - participants.length) }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1 opacity-20">
            <span className="text-xl">👤</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function Centered({ children }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-3 px-4">
      {children}
    </div>
  )
}

function Spinner() {
  return <div className="w-10 h-10 rounded-full border-2 border-yellow-500 border-t-transparent animate-spin" />
}

function BackBtn() {
  return (
    <Link to="/tv"
      className="px-6 py-3 bg-yellow-500 text-black font-bold rounded-xl hover:bg-yellow-400 transition">
      Retour
    </Link>
  )
}
