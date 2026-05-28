import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useDuelRoom, computeDuelScores, TARGET_SCORE } from '../hooks/useDuelRoom.js'

const QUESTION_DURATION = 12000

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
  return { secs: Math.ceil(timeLeft / 1000), pct: (timeLeft / duration) * 100, expired: timeLeft === 0 }
}

export default function DuelGame() {
  const { code } = useParams()
  const { user }  = useAuth()
  const { room, profiles, answers, myAnswers, isHost, isGuest, loading,
          submitAnswer, hostAdvance, startGame } = useDuelRoom(code)

  if (loading) return <Shell><Center><Spinner /><p className="text-slate-400 mt-4">Chargement…</p></Center></Shell>
  if (!room)   return <Shell><Center><p className="text-4xl mb-3">❓</p><p className="text-slate-400 mb-5">Salle introuvable.</p><BackBtn /></Center></Shell>
  if (!user)   return <Shell><Center><p className="text-slate-400 mb-4">Connecte-toi pour jouer.</p><Link to="/auth" className="pvpbtn">Connexion</Link></Center></Shell>
  if (!isHost && !isGuest) return <Shell><Center><p className="text-slate-400">Tu n'es pas dans cette salle.</p><BackBtn /></Center></Shell>

  const phase = room.phase
  const props = { room, profiles, answers, myAnswers, isHost, submitAnswer, hostAdvance, user }

  return (
    <Shell>
      {phase === 'lobby'   && <LobbyPhase   {...props} onStart={startGame} />}
      {phase === 'playing' && <PlayingPhase {...props} />}
      {phase === 'finished'&& <FinishedPhase {...props} />}
    </Shell>
  )
}

// ─── Shell ────────────────────────────────────────────────────
function Shell({ children }) {
  return (
    <div className="min-h-screen bg-[#060c18] text-white flex flex-col">
      {children}
    </div>
  )
}

// ─── Lobby ────────────────────────────────────────────────────
function LobbyPhase({ room, profiles, isHost, onStart, user }) {
  const [copied, setCopied] = useState(false)
  const host  = profiles[room.host_id]
  const guest = profiles[room.guest_id]
  const ready = !!room.guest_id

  function copy() {
    navigator.clipboard.writeText(room.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-10 gap-8">
      {/* Title */}
      <div className="text-center space-y-2">
        <div className="text-6xl">⚔️</div>
        <h1 className="font-display text-5xl tracking-wider text-white">Frappe Express</h1>
        <p className="text-slate-500 text-sm">Premier à {TARGET_SCORE} points gagne</p>
      </div>

      {/* Players vs */}
      <div className="flex items-center gap-6 md:gap-12">
        {/* Host */}
        <PlayerCard profile={host} label="Hôte" color="blue" isYou={room.host_id === user.id} />

        <div className="flex flex-col items-center gap-1">
          <span className="font-display text-3xl text-slate-600 tracking-widest">VS</span>
        </div>

        {/* Guest */}
        {guest
          ? <PlayerCard profile={guest} label="Adversaire" color="red" isYou={room.guest_id === user.id} />
          : (
            <div className="flex flex-col items-center gap-3 w-32">
              <div className="w-20 h-20 rounded-2xl bg-white/5 border-2 border-dashed border-white/20 flex items-center justify-center">
                <span className="text-3xl opacity-30">👤</span>
              </div>
              <span className="text-slate-600 text-sm text-center">En attente…</span>
            </div>
          )
        }
      </div>

      {/* Code */}
      <div className="bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-center">
        <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Code de la partie</p>
        <div className="flex items-center gap-3">
          <span className="font-mono text-2xl tracking-[0.3em] font-black text-midi-accent">{room.code}</span>
          <button onClick={copy} className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition text-sm">
            {copied ? '✓' : '📋'}
          </button>
        </div>
      </div>

      {/* Rules */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5 max-w-sm w-full space-y-2 text-sm">
        {[
          ['⚡', `Premier à ${TARGET_SCORE} bonnes réponses gagne`],
          ['🎯', 'Les deux joueurs voient la même question'],
          ['🔒', 'Première bonne réponse = point · Mauvaise = bloqué'],
          ['⏱️', '12 secondes par question'],
          ['🔥', 'Balle de match à 4-4 !'],
        ].map(([icon, text]) => (
          <div key={text} className="flex gap-3 items-start">
            <span>{icon}</span>
            <span className="text-slate-400">{text}</span>
          </div>
        ))}
      </div>

      {isHost ? (
        <button onClick={onStart} disabled={!ready}
          className={`px-10 py-4 rounded-2xl font-display text-xl tracking-wider transition
            ${ready
              ? 'bg-midi-accent text-white hover:bg-blue-400'
              : 'bg-white/10 text-slate-500 cursor-not-allowed'}`}>
          {ready ? '▶ Lancer le duel !' : '⏳ En attente de l\'adversaire…'}
        </button>
      ) : (
        <p className="text-slate-500 text-sm">⏳ L'hôte va lancer la partie…</p>
      )}
    </div>
  )
}

// ─── Playing ──────────────────────────────────────────────────
function PlayingPhase({ room, profiles, answers, myAnswers, isHost, submitAnswer, hostAdvance, user }) {
  const pd     = room.phase_data ?? {}
  const q_idx  = pd.q_idx ?? 0
  const q      = pd.questions?.[q_idx]
  const { secs, pct, expired } = useTimer(pd.q_start_at, QUESTION_DURATION)

  const [selected, setSelected] = useState(null)
  const [revealed, setRevealed] = useState(false)
  const [pointAnim, setPointAnim] = useState(null) // { profileId, label }
  const advRef    = useRef(false)
  const prevIdx   = useRef(q_idx)
  const startedAt = pd.q_start_at ? new Date(pd.q_start_at).getTime() : Date.now()

  const { scores, roundWinners } = computeDuelScores(answers)
  const hostScore  = scores[room.host_id]  ?? 0
  const guestScore = scores[room.guest_id] ?? 0
  const matchPoint = hostScore === TARGET_SCORE - 1 && guestScore === TARGET_SCORE - 1

  const myAnswer   = myAnswers.find(a => a.q_idx === q_idx)
  const qAnswers   = answers.filter(a => a.q_idx === q_idx)
  const roundWinner = roundWinners.get(q_idx) // profile_id of who scored this round

  // Reset on new question
  useEffect(() => {
    if (prevIdx.current !== q_idx) {
      // Show who scored the previous round briefly
      const prev = roundWinners.get(prevIdx.current)
      if (prev) {
        const prof = profiles[prev]
        setPointAnim({ profileId: prev, label: prof?.nickname ?? '?' })
        setTimeout(() => setPointAnim(null), 1800)
      }
      prevIdx.current = q_idx
      setSelected(null)
      setRevealed(false)
      advRef.current = false
    }
  }, [q_idx, roundWinners, profiles])

  // Reveal when timer expires
  useEffect(() => { if (expired && !revealed) setRevealed(true) }, [expired, revealed])

  // Reveal 1s after someone gets it right
  useEffect(() => {
    if (revealed || !roundWinner) return
    const t = setTimeout(() => setRevealed(true), 1000)
    return () => clearTimeout(t)
  }, [roundWinner, revealed])

  // Host auto-advance
  useEffect(() => {
    if (!isHost || !revealed || advRef.current) return
    const t = setTimeout(() => {
      if (!advRef.current) { advRef.current = true; hostAdvance() }
    }, 2800)
    return () => clearTimeout(t)
  }, [revealed, isHost, hostAdvance])

  async function pick(idx) {
    if (myAnswer || revealed || selected !== null || !q) return
    setSelected(idx)
    const isCorrect = idx === q.answer
    await submitAnswer({ q_idx, answer_idx: idx, is_correct: isCorrect, time_ms: Date.now() - startedAt })
  }

  if (!q) return <Center><Spinner /></Center>

  const urgent = secs <= 3
  const host   = profiles[room.host_id]
  const guest  = profiles[room.guest_id]

  return (
    <div className="flex-1 flex flex-col">

      {/* Point animation overlay */}
      {pointAnim && (
        <div className="fixed inset-0 z-40 pointer-events-none flex items-center justify-center">
          <div className="bg-yellow-500/90 text-black font-display text-3xl tracking-wider px-8 py-4 rounded-2xl animate-pop shadow-2xl">
            ⚡ POINT — {pointAnim.label}
          </div>
        </div>
      )}

      {/* Match point banner */}
      {matchPoint && !revealed && (
        <div className="bg-red-500/20 border-b border-red-500/30 text-center py-2">
          <span className="text-red-400 font-bold text-sm tracking-widest uppercase animate-pulse">
            🔥 Balle de match — prochain point gagne !
          </span>
        </div>
      )}

      {/* Score bar */}
      <div className="px-4 py-5 bg-black/40 border-b border-white/10">
        <div className="max-w-lg mx-auto flex items-center gap-4">
          {/* Host */}
          <div className="flex-1 flex flex-col items-start gap-1">
            <div className="flex items-center gap-2">
              <span className="text-xl">{host?.avatar ?? '🎭'}</span>
              <span className="text-sm font-semibold truncate max-w-[80px]">{host?.nickname ?? 'Hôte'}</span>
            </div>
            <ScoreDots score={hostScore} color="blue" />
          </div>

          {/* Center score */}
          <div className="text-center shrink-0">
            <div className="font-display text-4xl tracking-wider leading-none">
              <span className="text-blue-400">{hostScore}</span>
              <span className="text-slate-600 mx-2">—</span>
              <span className="text-red-400">{guestScore}</span>
            </div>
            <div className="text-xs text-slate-600 mt-1">sur {TARGET_SCORE}</div>
          </div>

          {/* Guest */}
          <div className="flex-1 flex flex-col items-end gap-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold truncate max-w-[80px] text-right">{guest?.nickname ?? 'Adversaire'}</span>
              <span className="text-xl">{guest?.avatar ?? '🎭'}</span>
            </div>
            <ScoreDots score={guestScore} color="red" reverse />
          </div>
        </div>
      </div>

      {/* Question area */}
      <div className="flex-1 flex flex-col max-w-lg mx-auto w-full px-4 py-6 gap-5">

        {/* Timer + Q counter */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500 bg-white/5 px-2 py-0.5 rounded-full">
            Q{q_idx + 1} / {pd.questions?.length}
          </span>
          <span className={`font-display text-3xl tabular-nums ${urgent ? 'text-red-400 animate-pulse' : 'text-white'}`}>
            {secs}s
          </span>
        </div>

        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${urgent ? 'bg-red-500' : 'bg-yellow-500'}`}
            style={{ width: `${pct}%` }} />
        </div>

        {/* Question */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
          <p className="text-xl font-bold leading-relaxed">{q.q}</p>
          {q.theme && <p className="text-xs text-slate-600 mt-2 uppercase tracking-wider">{q.theme}</p>}
        </div>

        {/* Choices */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {q.choices?.map((choice, idx) => {
            const isCorrect  = idx === q.answer
            const isSelected = (myAnswer?.answer_idx ?? selected) === idx
            const locked     = myAnswer !== undefined || selected !== null || revealed

            let cls = 'w-full text-left p-4 rounded-xl border-2 font-semibold transition-all '
            if (revealed) {
              if (isCorrect)       cls += 'border-green-500 bg-green-500/15 text-green-300'
              else if (isSelected) cls += 'border-red-500 bg-red-500/10 text-red-400 opacity-70'
              else                 cls += 'border-white/5 text-slate-600 opacity-40'
            } else if (isSelected) {
              cls += 'border-midi-accent bg-midi-accent/15 text-midi-accent'
            } else if (locked) {
              cls += 'border-white/10 bg-white/5 text-slate-500 opacity-60 cursor-default'
            } else {
              cls += 'border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10 cursor-pointer'
            }
            return (
              <button key={idx} className={cls} onClick={() => { if (!locked) pick(idx) }}>
                <span className="text-xs opacity-50 mr-2">{['A','B','C','D'][idx]}</span>
                {choice}
                {revealed && isCorrect && <span className="ml-2 text-green-400">✓</span>}
              </button>
            )
          })}
        </div>

        {/* Players status */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { id: room.host_id, profile: host, color: 'blue' },
            { id: room.guest_id, profile: guest, color: 'red' },
          ].map(({ id, profile, color }) => {
            const ans = qAnswers.find(a => a.profile_id === id)
            const won = roundWinner === id
            const border = color === 'blue' ? 'border-blue-500/20' : 'border-red-500/20'
            const bg     = color === 'blue' ? 'bg-blue-500/5'      : 'bg-red-500/5'
            return (
              <div key={id ?? color}
                className={`flex items-center gap-2 p-3 rounded-xl border ${border} ${bg}`}>
                <span className="text-lg">{profile?.avatar ?? '🎭'}</span>
                <span className="text-sm truncate flex-1">{profile?.nickname ?? '?'}</span>
                {ans
                  ? revealed
                    ? won
                      ? <span className="text-midi-accent text-sm">⚡+1</span>
                      : ans.is_correct
                        ? <span className="text-green-400 text-xs">✓</span>
                        : <span className="text-red-400 text-xs">✗</span>
                    : <span className="text-midi-accent text-sm">✓</span>
                  : <span className="text-slate-700 text-xs">…</span>
                }
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Finished ─────────────────────────────────────────────────
function FinishedPhase({ room, profiles, answers, user }) {
  const pd = room.phase_data ?? {}
  const winnerId = pd.winner_id
  const winner   = profiles[winnerId]
  const loserId  = winnerId === room.host_id ? room.guest_id : room.host_id
  const loser    = profiles[loserId]
  const isWinner = winnerId === user.id
  const { scores } = computeDuelScores(answers)
  const [show, setShow] = useState(false)

  useEffect(() => { const t = setTimeout(() => setShow(true), 300); return () => clearTimeout(t) }, [])

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-10 gap-8">
      <div className={`w-full max-w-sm space-y-6 transition-all duration-700 ${show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>

        {/* Result banner */}
        <div className={`text-center py-6 rounded-2xl border-2 ${
          winnerId === null
            ? 'border-slate-500/30 bg-slate-500/10'
            : isWinner
              ? 'border-yellow-500/40 bg-yellow-500/10'
              : 'border-red-500/30 bg-red-500/10'
        }`}>
          <div className="text-6xl mb-2">
            {winnerId === null ? '🤝' : isWinner ? '🏆' : '💀'}
          </div>
          <p className={`font-display text-4xl tracking-wider ${
            winnerId === null ? 'text-slate-300'
            : isWinner ? 'text-midi-accent'
            : 'text-red-400'
          }`}>
            {winnerId === null ? 'ÉGALITÉ' : isWinner ? 'VICTOIRE !' : 'DÉFAITE'}
          </p>
          {winnerId !== null && !isWinner && (
            <p className="text-slate-500 text-sm mt-1">{winner?.nickname ?? '?'} a gagné</p>
          )}
        </div>

        {/* Score recap */}
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          {[
            { id: room.host_id,  label: 'Hôte' },
            { id: room.guest_id, label: 'Adversaire' },
          ].map(({ id, label }) => {
            const prof  = profiles[id]
            const score = scores[id] ?? 0
            const won   = id === winnerId
            return (
              <div key={id ?? label} className={`flex items-center gap-4 px-5 py-4 border-b border-white/5 last:border-0 ${won ? 'bg-yellow-500/5' : ''}`}>
                <span className="text-2xl">{won ? '🏆' : '  '}</span>
                <span className="text-xl">{prof?.avatar ?? '🎭'}</span>
                <span className="flex-1 font-semibold">
                  {prof?.nickname ?? label}
                  {id === user.id && <span className="text-xs text-slate-500 ml-1">(moi)</span>}
                </span>
                <div className="text-right">
                  <span className={`font-display text-2xl ${won ? 'text-midi-accent' : 'text-slate-400'}`}>
                    {score} pts
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        <div className="flex gap-3">
          <Link to="/multi" className="flex-1 py-3 text-center rounded-xl bg-yellow-500 text-black font-bold hover:bg-yellow-400 transition">
            Rejouer
          </Link>
          <Link to="/" className="flex-1 py-3 text-center rounded-xl bg-white/10 text-white hover:bg-white/15 transition">
            Accueil
          </Link>
        </div>
      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────
function ScoreDots({ score, color, reverse = false }) {
  const filled = color === 'blue' ? 'bg-blue-500' : 'bg-red-500'
  const empty  = color === 'blue' ? 'border-blue-500/30' : 'border-red-500/30'
  const dots = Array.from({ length: TARGET_SCORE }, (_, i) => (
    <div key={i}
      className={`w-3 h-3 rounded-full border-2 transition-all duration-300
        ${i < score ? `${filled} border-transparent` : `border-2 ${empty}`}`} />
  ))
  return (
    <div className={`flex gap-1 ${reverse ? 'flex-row-reverse' : ''}`}>
      {dots}
    </div>
  )
}

function PlayerCard({ profile, label, color, isYou }) {
  const ring = color === 'blue' ? 'ring-blue-500/50' : 'ring-red-500/50'
  const bg   = color === 'blue' ? 'from-blue-900/40 to-slate-900/60' : 'from-red-900/40 to-slate-900/60'
  return (
    <div className={`flex flex-col items-center gap-3 p-4 rounded-2xl bg-gradient-to-b ${bg} border border-white/10 ${isYou ? `ring-2 ${ring}` : ''} w-32 md:w-36`}>
      <div className="text-5xl">{profile?.avatar ?? '🎭'}</div>
      <div className="text-center">
        <div className="font-semibold text-sm truncate max-w-[100px]">
          {profile?.nickname ?? '…'}
        </div>
        <div className="text-xs text-slate-600">{label}{isYou && ' · toi'}</div>
      </div>
    </div>
  )
}

function Center({ children }) {
  return <div className="flex-1 flex flex-col items-center justify-center gap-3 px-4">{children}</div>
}
function Spinner() {
  return <div className="w-10 h-10 rounded-full border-2 border-yellow-500 border-t-transparent animate-spin" />
}
function BackBtn() {
  return <Link to="/multi" className="px-6 py-3 bg-yellow-500 text-black font-bold rounded-xl hover:bg-yellow-400 transition">Retour</Link>
}
