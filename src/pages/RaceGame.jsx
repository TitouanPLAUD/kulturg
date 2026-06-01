import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import {
  useRaceRoom,
  computeQuestionPoints,
  computeScores,
  RACE_MAX_PLAYERS,
  RACE_MIN_PLAYERS,
  Q_COUNT,
  TIMER_MS,
  POINTS,
} from '../hooks/useRaceRoom.js'

// ─── Timer ─────────────────────────────────────────────────────
function useTimer(startAt) {
  const [timeLeft, setTimeLeft] = useState(TIMER_MS)
  useEffect(() => {
    if (!startAt) { setTimeLeft(TIMER_MS); return }
    const origin  = new Date(startAt).getTime()
    const initial = Math.max(0, TIMER_MS - (Date.now() - origin))
    setTimeLeft(initial)
    if (initial === 0) return
    const tick = setInterval(() => {
      const left = Math.max(0, TIMER_MS - (Date.now() - origin))
      setTimeLeft(left)
      if (left === 0) clearInterval(tick)
    }, 100)
    return () => clearInterval(tick)
  }, [startAt])
  return {
    timeLeft,
    secs:    Math.ceil(timeLeft / 1000),
    pct:     (timeLeft / TIMER_MS) * 100,
    expired: timeLeft === 0,
  }
}

// ─── Racine ────────────────────────────────────────────────────
export default function RaceGame() {
  const { code }   = useParams()
  const { user }   = useAuth()
  const navigate   = useNavigate()
  const {
    room, participants, answers, myAnswers, loading,
    isHost, submitAnswer, hostAdvance, startGame,
  } = useRaceRoom(code)

  const [confirmQuit, setConfirmQuit] = useState(false)

  if (loading)  return <Shell><Centered><Spinner /><p className="text-slate-400 mt-4">Chargement…</p></Centered></Shell>
  if (!room)    return <Shell><Centered><p className="text-5xl mb-3">❓</p><p className="text-slate-400 mb-6">Salle introuvable.</p><Link to="/multi" className="rbtn">Retour</Link></Centered></Shell>
  if (!user)    return <Shell><Centered><p className="text-slate-400 mb-4">Connecte-toi pour jouer.</p><Link to="/auth" className="rbtn">Connexion</Link></Centered></Shell>

  const phase = room.phase
  const pd    = room.phase_data ?? {}

  return (
    <Shell>
      {/* Bouton quitter */}
      {phase !== 'finished' && (
        <button onClick={() => setConfirmQuit(true)}
          className="fixed top-4 right-4 z-40 px-3 py-1.5 rounded-lg bg-black/60 border border-white/10 text-slate-400 hover:text-white text-xs font-medium transition backdrop-blur-sm">
          ✕ Quitter
        </button>
      )}

      {confirmQuit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#111827] border border-white/10 rounded-2xl p-6 w-full max-w-sm text-center space-y-4 animate-pop">
            <div className="text-4xl">🚪</div>
            <h2 className="font-display text-2xl tracking-wider">Quitter la partie ?</h2>
            <div className="flex gap-3">
              <button onClick={() => setConfirmQuit(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold transition">
                Rester
              </button>
              <button onClick={() => navigate('/multi')}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold transition">
                Quitter
              </button>
            </div>
          </div>
        </div>
      )}

      {phase === 'lobby'    && <RaceLobby room={room} participants={participants} isHost={isHost} code={code} onStart={startGame} />}
      {phase === 'playing'  && <RacePlaying pd={pd} participants={participants} answers={answers} myAnswers={myAnswers} isHost={isHost} submitAnswer={submitAnswer} hostAdvance={hostAdvance} userId={user.id} />}
      {phase === 'finished' && <RaceFinished participants={participants} answers={answers} q_count={pd.q_count ?? Q_COUNT} />}
    </Shell>
  )
}

// ─── Shell ──────────────────────────────────────────────────────
function Shell({ children }) {
  return (
    <div className="min-h-screen bg-[#07090f] text-white bg-gradient-to-b from-green-950/30 to-[#07090f] overflow-x-hidden">
      {children}
    </div>
  )
}

// ─── Lobby ──────────────────────────────────────────────────────
function RaceLobby({ room, participants, isHost, code, onStart }) {
  const [copied, setCopied] = useState(false)
  const n = participants.length
  const canStart = n >= RACE_MIN_PLAYERS
  const isPublic = room.is_public

  // Salon public : l'hôte lance automatiquement après un court décompte dès qu'on a assez de joueurs
  const onStartRef = useRef(onStart)
  onStartRef.current = onStart
  const [countdown, setCountdown] = useState(null)
  useEffect(() => {
    if (!isPublic || !isHost || !canStart) { setCountdown(null); return }
    setCountdown(5)
    const tick = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(tick); onStartRef.current(); return 0 }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(tick)
  }, [isPublic, isHost, canStart])

  function copyCode() {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-10 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="text-6xl">🏁</div>
        <h1 className="font-display text-4xl md:text-5xl tracking-wider">Course aux Points</h1>
        {isPublic && (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-green-500/15 text-green-400 px-3 py-1 rounded-full">
            🌍 Salon public · tout le monde peut rejoindre
          </span>
        )}
        <p className="text-slate-500 text-sm">Jusqu'à {RACE_MAX_PLAYERS} joueurs · {Q_COUNT} questions · 20 secondes chacune</p>
      </div>

      {/* Code (salon privé uniquement) */}
      {!isPublic && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center">
          <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Code de la partie</p>
          <div className="flex items-center justify-center gap-3">
            <span className="font-mono text-3xl tracking-[0.3em] font-black text-green-400">{code}</span>
            <button onClick={copyCode} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition">
              {copied ? '✓' : '📋'}
            </button>
          </div>
          <p className="text-xs text-slate-600 mt-2">Partage ce code à tes amis</p>
        </div>
      )}

      {/* Joueurs */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Joueurs ({n}/{RACE_MAX_PLAYERS})</h2>
          {n >= 2 && <span className="text-xs text-green-400 bg-green-500/10 rounded-full px-2 py-0.5">Prêt à jouer !</span>}
        </div>
        <ul className="space-y-2 max-h-64 overflow-y-auto">
          {participants.map(p => (
            <li key={p.id} className="flex items-center gap-3">
              <span className="text-2xl">{p.profile?.avatar ?? '🎭'}</span>
              <span className="font-medium flex-1 text-sm">{p.profile?.nickname ?? '…'}</span>
              {p.profile_id === room.host_id && (
                <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">Hôte</span>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* Règles rapides */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
        <p className="text-xs text-slate-500 uppercase tracking-widest mb-3">Système de points</p>
        <div className="grid grid-cols-4 gap-2 text-center text-sm">
          {[
            { rank: '1er', pts: 5, color: 'text-yellow-400' },
            { rank: '2e',  pts: 3, color: 'text-slate-300' },
            { rank: '3e',  pts: 2, color: 'text-amber-600' },
            { rank: 'Reste', pts: 1, color: 'text-slate-500' },
          ].map(({ rank, pts, color }) => (
            <div key={rank} className="bg-white/5 rounded-xl py-3">
              <div className={`font-display text-2xl ${color}`}>{pts}</div>
              <div className="text-slate-500 text-xs mt-0.5">{rank}</div>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-600 mt-3 text-center">Mauvaise réponse = 0 point</p>
      </div>

      {isHost ? (
        <button onClick={onStart} disabled={!canStart}
          className="w-full py-4 rounded-2xl font-display text-xl tracking-wider bg-green-500 text-black hover:bg-green-400 transition disabled:opacity-40 disabled:cursor-not-allowed">
          {!canStart
            ? `⏳ En attente de joueurs (${n}/${RACE_MIN_PLAYERS} min)`
            : isPublic && countdown !== null
              ? `🚀 Lancement dans ${countdown}s — clique pour démarrer maintenant`
              : '▶ Lancer la course !'}
        </button>
      ) : (
        <p className="text-center text-slate-500 text-sm py-4">
          {isPublic
            ? '⏳ La course démarre dès qu\'il y a assez de joueurs…'
            : '⏳ En attente que l\'hôte lance la course…'}
        </p>
      )}
    </div>
  )
}

// ─── Partie en cours ────────────────────────────────────────────
function RacePlaying({ pd, participants, answers, myAnswers, isHost, submitAnswer, hostAdvance, userId }) {
  const questions  = pd.questions ?? []
  const q_idx      = pd.q_idx ?? 0
  const q          = questions[q_idx]
  const { secs, pct, expired } = useTimer(pd.q_start_at)

  const [selected,  setSelected]  = useState(null)
  const [revealed,  setRevealed]  = useState(false)
  const advRef      = useRef(false)
  const startedAt   = pd.q_start_at ? new Date(pd.q_start_at).getTime() : Date.now()

  // Reset à chaque nouvelle question
  useEffect(() => {
    setSelected(null)
    setRevealed(false)
    advRef.current = false
  }, [q_idx])

  // Timer expiré → révéler
  useEffect(() => {
    if (expired && !revealed) setRevealed(true)
  }, [expired, revealed])

  // Tous les joueurs ont répondu → révéler (host only trigger)
  useEffect(() => {
    if (!isHost || revealed) return
    const qAnswers = answers.filter(a => a.q_idx === q_idx)
    const allAnswered = participants.length > 0 &&
      participants.every(p => qAnswers.some(a => a.profile_id === p.profile_id))
    if (allAnswered) setRevealed(true)
  }, [answers, participants, q_idx, isHost, revealed])

  // Auto-avance après révélation
  useEffect(() => {
    if (!isHost || !revealed || advRef.current) return
    advRef.current = true
    const t = setTimeout(() => hostAdvance(), 4000)
    return () => clearTimeout(t)
  }, [revealed, isHost, hostAdvance])

  async function pick(idx) {
    if (revealed || selected !== null || !q) return
    const myAns = myAnswers.find(a => a.q_idx === q_idx)
    if (myAns) return
    setSelected(idx)
    await submitAnswer({ q_idx, answer_idx: idx, is_correct: idx === q.answer })
  }

  if (!q) return <Centered><Spinner /></Centered>

  const qAnswers     = answers.filter(a => a.q_idx === q_idx)
  const myAnswer     = myAnswers.find(a => a.q_idx === q_idx)
  const qPoints      = revealed ? computeQuestionPoints(answers, q_idx) : {}
  const totalScores  = computeScores(answers, q_idx + (revealed ? 1 : 0))
  const myPts        = qPoints[userId]
  const myRank       = revealed
    ? [...answers.filter(a => a.q_idx === q_idx && a.is_correct)]
        .sort((a, b) => new Date(a.answered_at) - new Date(b.answered_at))
        .findIndex(a => a.profile_id === userId) + 1
    : null

  const selectedProp = myAnswer?.answer_idx ?? selected

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">

      {/* ── Zone principale ── */}
      <div className="flex-1 flex flex-col max-w-2xl w-full mx-auto px-4 pt-6 pb-4 lg:py-8">

        {/* Header */}
        <div className="space-y-2 mb-5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500 font-medium">🏁 Q{q_idx + 1}/{questions.length}</span>
            <span className={`font-display text-3xl tabular-nums font-bold ${secs <= 5 ? 'text-red-400 animate-pulse' : 'text-green-400'}`}>
              {secs}s
            </span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${secs <= 5 ? 'bg-red-500' : 'bg-green-500'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Question */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 md:p-7 text-center mb-5 flex-none">
          <p className="text-xl md:text-2xl font-bold leading-relaxed">{q.q}</p>
          {q.theme && <p className="text-xs text-slate-600 uppercase tracking-wider mt-3">{q.theme}</p>}
        </div>

        {/* Choices */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
          {(q.choices ?? []).map((choice, idx) => {
            const isCorrect  = idx === q.answer
            const isSelected = selectedProp === idx
            let cls = 'w-full text-left p-4 rounded-xl border-2 font-semibold transition-all duration-200 text-sm '
            if (revealed) {
              if (isCorrect)        cls += 'border-green-500 bg-green-500/15 text-green-300'
              else if (isSelected)  cls += 'border-red-500 bg-red-500/10 text-red-400 opacity-60'
              else                  cls += 'border-white/5 text-slate-600 opacity-30'
            } else if (isSelected) {
              cls += 'border-green-400 bg-green-500/15 text-green-300'
            } else if (selectedProp !== null) {
              cls += 'border-white/10 bg-white/5 text-slate-500 cursor-default opacity-50'
            } else {
              cls += 'border-white/10 bg-white/5 hover:border-green-500/40 hover:bg-green-500/8 cursor-pointer'
            }
            return (
              <button key={idx} className={cls} onClick={() => pick(idx)}>
                <span className="text-xs opacity-50 mr-2">{['A', 'B', 'C', 'D'][idx]}</span>
                {choice}
                {revealed && isCorrect && <span className="ml-2 text-green-400">✓</span>}
              </button>
            )
          })}
        </div>

        {/* Feedback après révélation */}
        {revealed && (
          <div className="animate-pop">
            {myAnswer ? (
              myAnswer.is_correct ? (
                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-center">
                  <p className="text-green-400 font-bold text-lg">
                    {myRank === 1 ? '🥇 1er !' : myRank === 2 ? '🥈 2e !' : myRank === 3 ? '🥉 3e !' : '✓ Correct !'}
                  </p>
                  <p className="text-2xl font-display text-green-300 mt-1">+{myPts ?? 1} point{(myPts ?? 1) > 1 ? 's' : ''}</p>
                </div>
              ) : (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center">
                  <p className="text-red-400 font-bold">✗ Mauvaise réponse · 0 point</p>
                </div>
              )
            ) : (
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                <p className="text-slate-500">⏱ Temps écoulé · 0 point</p>
              </div>
            )}
          </div>
        )}

        {/* Mini podium de la question */}
        {revealed && (
          <div className="mt-3 bg-white/5 border border-white/10 rounded-xl p-3">
            <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Cette question</p>
            <QuestionPodium answers={qAnswers} participants={participants} q_idx={q_idx} />
          </div>
        )}

        {/* Réponses reçues en temps réel */}
        {!revealed && (
          <div className="flex items-center gap-2 text-xs text-slate-600 mt-auto pt-2">
            <div className="flex gap-1">
              {participants.map(p => {
                const has = qAnswers.some(a => a.profile_id === p.profile_id)
                return (
                  <span key={p.id} className={`w-6 h-6 rounded-full flex items-center justify-center text-sm transition-all ${has ? 'opacity-100 scale-100' : 'opacity-20 scale-90'}`}>
                    {p.profile?.avatar ?? '🎭'}
                  </span>
                )
              })}
            </div>
            <span>{qAnswers.length}/{participants.length} réponse{qAnswers.length > 1 ? 's' : ''}</span>
          </div>
        )}
      </div>

      {/* ── Sidebar classement ── */}
      <aside className="lg:w-72 lg:min-h-screen border-t border-white/10 lg:border-t-0 lg:border-l px-4 py-4 lg:py-8 shrink-0">
        <p className="text-xs text-slate-500 uppercase tracking-widest mb-3">📊 Classement</p>
        <Scoreboard participants={participants} answers={answers} q_count={q_idx + (revealed ? 1 : 0)} currentUserId={userId} />
      </aside>
    </div>
  )
}

// ─── Podium de la question ──────────────────────────────────────
function QuestionPodium({ answers, participants, q_idx }) {
  const correct = [...answers]
    .filter(a => a.q_idx === q_idx && a.is_correct)
    .sort((a, b) => new Date(a.answered_at) - new Date(b.answered_at))
    .slice(0, 3)

  if (!correct.length) return <p className="text-slate-600 text-xs italic text-center">Personne n'a répondu correctement…</p>

  const ranks = ['🥇', '🥈', '🥉']
  const pts   = [5, 3, 2]

  return (
    <div className="flex gap-2 flex-wrap">
      {correct.map((a, i) => {
        const p = participants.find(x => x.profile_id === a.profile_id)
        return (
          <div key={a.id} className="flex items-center gap-1.5 bg-white/5 rounded-lg px-2 py-1 text-xs">
            <span>{ranks[i]}</span>
            <span>{p?.profile?.avatar ?? '🎭'}</span>
            <span className="font-medium text-slate-300">{p?.profile?.nickname ?? '?'}</span>
            <span className="text-green-400 font-bold">+{pts[i]}</span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Scoreboard sidebar ────────────────────────────────────────
function Scoreboard({ participants, answers, q_count, currentUserId }) {
  const scores = computeScores(answers, q_count)
  const ranked = [...participants]
    .map(p => ({ ...p, score: scores[p.profile_id] ?? 0 }))
    .sort((a, b) => b.score - a.score)

  return (
    <div className="space-y-1.5">
      {ranked.map((p, i) => {
        const isMe = p.profile_id === currentUserId
        return (
          <div key={p.id}
            className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition
              ${isMe ? 'bg-green-500/10 border border-green-500/20' : 'bg-white/3 hover:bg-white/5'}`}>
            <span className="w-5 text-center text-xs font-mono text-slate-500">{i + 1}</span>
            <span className="text-base">{p.profile?.avatar ?? '🎭'}</span>
            <span className={`flex-1 truncate text-xs font-medium ${isMe ? 'text-green-400' : 'text-slate-300'}`}>
              {p.profile?.nickname ?? '?'}
              {isMe && <span className="ml-1 opacity-60 text-xs">(moi)</span>}
            </span>
            <span className="tabular-nums font-bold text-white text-sm">{p.score}</span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Écran final ───────────────────────────────────────────────
function RaceFinished({ participants, answers, q_count }) {
  const scores = computeScores(answers, q_count)
  const ranked = [...participants]
    .map(p => ({ ...p, score: scores[p.profile_id] ?? 0 }))
    .sort((a, b) => b.score - a.score)

  const medals  = ['🥇', '🥈', '🥉']
  const podium  = ranked.slice(0, 3)
  const rest    = ranked.slice(3)
  const winner  = ranked[0]

  return (
    <div className="max-w-xl mx-auto px-4 py-10 space-y-6">
      <div className="text-center space-y-2">
        <div className="text-7xl animate-bounce">🏁</div>
        <h1 className="font-display text-4xl text-green-400 tracking-wider">Arrivée !</h1>
        {winner && (
          <p className="text-slate-400 text-sm">
            Victoire de <strong className="text-white">{winner.profile?.nickname}</strong> avec {winner.score} pts
          </p>
        )}
      </div>

      {/* Podium top 3 */}
      <div className="grid grid-cols-3 gap-3">
        {podium.map((p, i) => (
          <div key={p.id}
            className={`rounded-2xl p-4 text-center border
              ${i === 0 ? 'bg-yellow-500/10 border-yellow-500/30' : i === 1 ? 'bg-slate-500/10 border-slate-500/20' : 'bg-amber-800/10 border-amber-800/20'}`}>
            <div className="text-3xl mb-1">{medals[i]}</div>
            <div className="text-2xl">{p.profile?.avatar ?? '🎭'}</div>
            <div className="font-semibold text-xs mt-1 truncate">{p.profile?.nickname ?? '?'}</div>
            <div className={`font-display text-2xl mt-1 ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-slate-300' : 'text-amber-600'}`}>
              {p.score}
            </div>
            <div className="text-xs text-slate-600">pts</div>
          </div>
        ))}
      </div>

      {/* Reste du classement */}
      {rest.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          {rest.map((p, i) => (
            <div key={p.id} className="flex items-center gap-3 px-5 py-3 border-b border-white/5 last:border-0">
              <span className="text-slate-500 font-mono text-sm w-5">{i + 4}</span>
              <span className="text-xl">{p.profile?.avatar ?? '🎭'}</span>
              <span className="flex-1 font-medium text-sm">{p.profile?.nickname ?? '?'}</span>
              <span className="font-bold tabular-nums text-slate-300">{p.score} pts</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-3">
        <Link to="/multi"
          className="flex-1 py-3 text-center rounded-xl bg-green-500 text-black font-display text-lg tracking-wider hover:bg-green-400 transition">
          Nouvelle partie
        </Link>
        <Link to="/"
          className="flex-1 py-3 text-center rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white font-semibold transition text-sm">
          Accueil
        </Link>
      </div>
    </div>
  )
}

// ─── Utilitaires ───────────────────────────────────────────────
function Centered({ children }) {
  return <div className="flex flex-col items-center justify-center min-h-screen gap-3 px-4">{children}</div>
}
function Spinner() {
  return <div className="w-10 h-10 rounded-full border-2 border-green-500 border-t-transparent animate-spin" />
}
