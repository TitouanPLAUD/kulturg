import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useGame } from '../context/GameContext.jsx'
import {
  useRaceRoom,
  computeQuestionPoints,
  computeScores,
  computePlayerStreak,
  computeStreaks,
  streakBonus,
  STREAK_THRESHOLD,
  STREAK_MAX_BONUS,
  RACE_MAX_PLAYERS,
  RACE_MIN_PLAYERS,
  Q_COUNT,
  TIMER_MS,
  POINTS,
} from '../hooks/useRaceRoom.js'
import { THEMES } from '../data/themes.js'
import Avatar from '../components/Avatar.jsx'
import { awardXPOnce, raceXP } from '../utils/multiplayerXP.js'
import { isOpenQuestion } from '../data/questions.js'
import { matchAnswer } from '../utils/answerMatch.js'
import TextAnswerInput from '../components/TextAnswerInput.jsx'

const DIFF_LABELS = { all: 'Toutes', 1: 'Facile', 2: 'Moyen', 3: 'Difficile' }

// ─── Timer ─────────────────────────────────────────────────────
function useTimer(startAt, timerMs = TIMER_MS) {
  const [timeLeft, setTimeLeft] = useState(timerMs)
  useEffect(() => {
    if (!startAt) { setTimeLeft(timerMs); return }
    const origin  = new Date(startAt).getTime()
    const initial = Math.max(0, timerMs - (Date.now() - origin))
    setTimeLeft(initial)
    if (initial === 0) return
    const tick = setInterval(() => {
      const left = Math.max(0, timerMs - (Date.now() - origin))
      setTimeLeft(left)
      if (left === 0) clearInterval(tick)
    }, 100)
    return () => clearInterval(tick)
  }, [startAt, timerMs])
  return {
    timeLeft,
    secs:    Math.ceil(timeLeft / 1000),
    pct:     (timeLeft / timerMs) * 100,
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
    isHost, submitAnswer, hostAdvance, startGame, claimHost,
  } = useRaceRoom(code)

  const [confirmQuit, setConfirmQuit] = useState(false)
  const [claiming,    setClaiming]    = useState(false)

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

      {/* Bouton « Reprendre la main » pour les non-hôtes si l'hôte est inactif */}
      {phase !== 'finished' && !isHost && (
        <button
          onClick={async () => { setClaiming(true); await claimHost(); setClaiming(false) }}
          disabled={claiming}
          title="L'hôte ne répond plus ? Reprends la main pour faire avancer la partie."
          className="fixed top-4 right-28 z-40 px-3 py-1.5 rounded-lg bg-amber-600/80 hover:bg-amber-500 border border-amber-400/30 text-white text-xs font-medium transition backdrop-blur-sm disabled:opacity-60">
          {claiming ? '…' : '🎮 Reprendre la main'}
        </button>
      )}

      {confirmQuit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="game-modal bg-[#111827] border border-white/10 rounded-2xl p-6 w-full max-w-sm text-center space-y-4 animate-pop">
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
      {phase === 'playing'  && <RacePlaying pd={pd} participants={participants} answers={answers} myAnswers={myAnswers} isHost={isHost} submitAnswer={submitAnswer} hostAdvance={hostAdvance} userId={user.id} isPublic={room.is_public} />}
      {phase === 'finished' && <RaceFinished participants={participants} answers={answers} q_count={pd.q_count ?? Q_COUNT} questions={pd.questions ?? []} myAnswers={myAnswers} userId={user.id} roomId={room.id} />}
    </Shell>
  )
}

// ─── Shell ──────────────────────────────────────────────────────
function Shell({ children }) {
  return (
    <div className="game-shell min-h-screen bg-[#07090f] text-white bg-gradient-to-b from-green-950/30 to-[#07090f] overflow-x-hidden">
      {children}
    </div>
  )
}

// ─── Lobby ──────────────────────────────────────────────────────
function RaceLobby({ room, participants, isHost, code, onStart }) {
  const [copied, setCopied] = useState(false)
  const n = participants.length
  const isPublic = room.is_public
  // Solo autorisé en partie privée ; 2 joueurs min en salon public
  const minPlayers = isPublic ? RACE_MIN_PLAYERS : 1
  const canStart = n >= minPlayers
  const settings = room.phase_data?.settings
  const qCount   = settings?.count ?? Q_COUNT
  const duration = settings?.duration ?? TIMER_MS / 1000

  // Salon public : l'hôte lance automatiquement 20s après qu'on ait atteint 2 joueurs
  const onStartRef = useRef(onStart)
  onStartRef.current = onStart
  const [countdown, setCountdown] = useState(null)
  useEffect(() => {
    if (!isPublic || !isHost || !canStart) { setCountdown(null); return }
    setCountdown(20)
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
        <img src="/logos/course-points.png" alt="Course aux Points" className="w-20 h-20 rounded-2xl object-cover mx-auto shadow-lg" draggable={false} />
        <h1 className="font-display text-4xl md:text-5xl tracking-wider">Course aux Points</h1>
        {isPublic && (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-green-500/15 text-green-400 px-3 py-1 rounded-full">
            🌍 Salon public · tout le monde peut rejoindre
          </span>
        )}
        <p className="text-slate-500 text-sm">Jusqu'à {RACE_MAX_PLAYERS} joueurs · {qCount} questions · {duration} secondes chacune</p>
      </div>

      {/* Réglages de la partie */}
      {settings && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <p className="text-xs text-slate-500 uppercase tracking-widest mb-3">⚙️ Réglages</p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <SettingRow label="Questions" value={`${qCount}`} />
            <SettingRow label="Durée / question" value={`${duration}s`} />
            <SettingRow label="Difficulté" value={DIFF_LABELS[settings.difficulty] ?? 'Toutes'} />
            <SettingRow label="Thèmes" value={
              settings.themes?.length
                ? `${settings.themes.length} choisi${settings.themes.length > 1 ? 's' : ''}`
                : 'Tous'
            } />
          </div>
          {settings.themes?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {settings.themes.map(id => (
                <span key={id} className="text-xs bg-white/5 border border-white/10 rounded-full px-2 py-0.5 text-slate-300">
                  {THEMES[id]?.emoji} {THEMES[id]?.label ?? id}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

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
              <Avatar value={p.profile?.avatar} size={30} className="text-2xl" />
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

        {/* Bonus de série */}
        <p className="text-xs text-slate-500 mt-3 text-center">
          🔥 Bonus de série dès {STREAK_THRESHOLD} bonnes réponses d'affilée (jusqu'à +{STREAK_MAX_BONUS})
        </p>
      </div>

      {isHost ? (
        <button onClick={onStart} disabled={!canStart}
          className="w-full py-4 rounded-2xl font-display text-xl tracking-wider bg-green-500 text-black hover:bg-green-400 transition disabled:opacity-40 disabled:cursor-not-allowed">
          {!canStart
            ? `⏳ En attente de joueurs (${n}/${RACE_MIN_PLAYERS} min)`
            : isPublic && countdown !== null
              ? `🚀 Lancement dans ${countdown}s — clique pour démarrer maintenant`
              : !isPublic && n === 1
                ? '▶ Lancer en solo !'
                : '▶ Lancer la course !'}
        </button>
      ) : (
        <p className="text-center text-slate-500 text-sm py-4">
          {isPublic && countdown !== null
            ? `⏳ Lancement automatique dans ${countdown}s…`
            : '⏳ En attente que l\'hôte lance la course…'}
        </p>
      )}
    </div>
  )
}

// ─── Partie en cours ────────────────────────────────────────────
function RacePlaying({ pd, participants, answers, myAnswers, isHost, submitAnswer, hostAdvance, userId, isPublic }) {
  const questions  = pd.questions ?? []
  const q_idx      = pd.q_idx ?? 0
  const q          = questions[q_idx]
  const { secs, pct, expired } = useTimer(pd.q_start_at, pd.timer_ms ?? TIMER_MS)

  const { answer } = useGame()
  const [selected, setSelected] = useState(null)
  const startedAt = pd.q_start_at ? new Date(pd.q_start_at).getTime() : Date.now()

  // ── Révélation : dérivée (identique pour TOUS les clients) ─────
  const qAnswers = answers.filter(a => a.q_idx === q_idx)
  const allAnswered = participants.length > 0 &&
    participants.every(p => qAnswers.some(a => a.profile_id === p.profile_id))
  const revealed = expired || allAnswered

  // Reset sélection à chaque nouvelle question
  useEffect(() => { setSelected(null) }, [q_idx])

  // ── Auto-avance après révélation (host only) ───────────────────
  // hostAdvance n'est pas memoized → on garde la dernière ref dans un ref
  // pour éviter que le useEffect ne se rejoue à chaque nouvel answer.
  const hostAdvanceRef = useRef(hostAdvance)
  useEffect(() => { hostAdvanceRef.current = hostAdvance })

  useEffect(() => {
    if (!isHost || !revealed) return
    const t = setTimeout(() => hostAdvanceRef.current?.(), 4000)
    return () => clearTimeout(t)
  }, [revealed, isHost, q_idx])

  async function pick(idx) {
    if (revealed || selected !== null || !q) return
    const myAns = myAnswers.find(a => a.q_idx === q_idx)
    if (myAns) return
    setSelected(idx)
    const isCorrect = idx === q.answer
    answer(q.theme ?? 'multi', q.difficulty ?? 1, isCorrect, isPublic)
    await submitAnswer({ q_idx, answer_idx: idx, is_correct: isCorrect })
  }

  async function submitText(text) {
    if (revealed || selected !== null || !q) return
    const myAns = myAnswers.find(a => a.q_idx === q_idx)
    if (myAns) return
    setSelected('typed') // marqueur pour locker l'input
    const isCorrect = matchAnswer(text, q.answer, q.accepts)
    answer(q.theme ?? 'multi', q.difficulty ?? 1, isCorrect, isPublic)
    await submitAnswer({ q_idx, answer_idx: -1, is_correct: isCorrect, answer_text: text })
  }

  if (!q) return <Centered><Spinner /></Centered>

  const myAnswer     = myAnswers.find(a => a.q_idx === q_idx)
  const qPoints      = revealed ? computeQuestionPoints(answers, q_idx) : {}
  const totalScores  = computeScores(answers, q_idx + (revealed ? 1 : 0))
  const myBase       = qPoints[userId] ?? 0
  // Série de bonnes réponses du joueur après cette question (si correcte)
  const myStreak     = revealed && myAnswer?.is_correct
    ? computePlayerStreak(answers, userId, q_idx)
    : 0
  const myBonus      = streakBonus(myStreak)
  const myPts        = myBase + myBonus      // total gagné sur cette question
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

        {/* Réponse — texte libre OU choix multiples */}
        {isOpenQuestion(q) ? (
          <div className="mb-5">
            <TextAnswerInput
              answer={q.answer}
              typed={myAnswer?.answer_text ?? null}
              revealed={revealed}
              isCorrect={myAnswer?.is_correct ?? null}
              onSubmit={submitText}
              accent="border-green-400"
            />
          </div>
        ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
          {(q.choices ?? []).map((choice, idx) => {
            const isCorrect  = idx === q.answer
            const isSelected = selectedProp === idx
            let cls = 'relative overflow-visible w-full text-left p-4 rounded-xl border-2 font-semibold transition-all duration-200 text-sm '
            if (revealed) {
              if (isCorrect)        cls += 'border-green-500 bg-green-500/15 text-green-300'
              else if (isSelected)  cls += 'border-red-500 bg-red-500/10 text-red-400'
              else                  cls += 'border-white/5 text-slate-600 opacity-30'
            } else if (isSelected) {
              // Feedback immédiat au clic : vert si correct, rouge si faux + petit bounce
              cls += isCorrect
                ? 'z-10 border-green-400 bg-green-500/15 text-green-300 animate-bounce-press'
                : 'z-10 border-red-400 bg-red-500/15 text-red-300 animate-bounce-press'
            } else if (selectedProp !== null) {
              cls += 'border-white/10 bg-white/5 text-slate-500 cursor-default opacity-50'
            } else {
              // Survol : léger soulèvement + agrandissement · clic : enfoncement
              cls += 'border-white/10 bg-white/5 cursor-pointer hover:border-green-500/40 hover:bg-green-500/10 hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-lg hover:shadow-green-500/10 active:scale-95'
            }
            return (
              <button key={idx} className={cls} onClick={() => pick(idx)}>
                {isSelected && <StarBurst color={isCorrect ? '#4ade80' : '#f87171'} />}
                <span className="relative z-[1]">
                  <span className="text-xs opacity-50 mr-2">{['A', 'B', 'C', 'D'][idx]}</span>
                  {choice}
                  {revealed && isCorrect && <span className="ml-2 text-green-400">✓</span>}
                </span>
              </button>
            )
          })}
        </div>
        )}

        {/* Feedback après révélation */}
        {revealed && (
          <div className="animate-pop">
            {myAnswer ? (
              myAnswer.is_correct ? (
                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-center">
                  <p className="text-green-400 font-bold text-lg">
                    {myRank === 1 ? '🥇 1er !' : myRank === 2 ? '🥈 2e !' : myRank === 3 ? '🥉 3e !' : '✓ Correct !'}
                  </p>
                  <p className="text-2xl font-display text-green-300 mt-1">
                    +{myPts} point{myPts > 1 ? 's' : ''}
                  </p>
                  {myBonus > 0 && (
                    <p className="text-sm text-orange-400 font-semibold mt-1">🔥 +{myBonus} bonus série</p>
                  )}
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
                  <span key={p.id} className={`w-6 h-6 rounded-full overflow-hidden flex items-center justify-center text-sm transition-all ${has ? 'opacity-100 scale-100' : 'opacity-20 scale-90'}`}>
                    <Avatar value={p.profile?.avatar} fill className="text-sm" />
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
            <Avatar value={p?.profile?.avatar} size={20} className="text-sm" />
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
  const scores  = computeScores(answers, q_count)
  const streaks = computeStreaks(answers, q_count)
  const ranked = [...participants]
    .map(p => ({ ...p, score: scores[p.profile_id] ?? 0 }))
    .sort((a, b) => b.score - a.score)

  return (
    <div className="space-y-1.5">
      {ranked.map((p, i) => {
        const isMe = p.profile_id === currentUserId
        const streak = streaks[p.profile_id] ?? 0
        return (
          <div key={p.id}
            className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition
              ${isMe ? 'bg-green-500/10 border border-green-500/20' : 'bg-white/3 hover:bg-white/5'}`}>
            <span className="w-5 text-center text-xs font-mono text-slate-500">{i + 1}</span>
            <Avatar value={p.profile?.avatar} size={22} className="text-base" />
            <span className={`flex-1 truncate text-xs font-medium ${isMe ? 'text-green-400' : 'text-slate-300'}`}>
              {p.profile?.nickname ?? '?'}
              {isMe && <span className="ml-1 opacity-60 text-xs">(moi)</span>}
            </span>
            {streak >= STREAK_THRESHOLD && (
              <span className="text-xs font-bold text-orange-400 tabular-nums" title={`Série de ${streak} · +${streakBonus(streak)}/réponse`}>
                🔥{streak}
              </span>
            )}
            <span className="tabular-nums font-bold text-white text-sm">{p.score}</span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Écran final ───────────────────────────────────────────────
function RaceFinished({ participants, answers, q_count, questions, myAnswers, userId, roomId }) {
  const scores = computeScores(answers, q_count)
  const ranked = [...participants]
    .map(p => ({ ...p, score: scores[p.profile_id] ?? 0 }))
    .sort((a, b) => b.score - a.score)

  const medals  = ['🥇', '🥈', '🥉']
  const podium  = ranked.slice(0, 3)
  const rest    = ranked.slice(3)
  const winner  = ranked[0]
  const { addXP } = useGame()

  // Récompense XP — une fois, par room+user. Basé sur le rang et le score.
  const myEntry  = ranked.find(p => p.profile_id === userId)
  const myRank   = myEntry ? ranked.indexOf(myEntry) + 1 : null
  const myScore  = myEntry?.score ?? 0
  const xpEarnedRef = useRef(null)
  useEffect(() => {
    if (xpEarnedRef.current !== null || !roomId || !userId || !myRank) return
    const amount = raceXP(myRank, myScore)
    xpEarnedRef.current = awardXPOnce(`race:${roomId}:${userId}`, amount, addXP)
  }, [roomId, userId, myRank, myScore, addXP])

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
            <div className="text-2xl"><Avatar value={p.profile?.avatar} size={30} className="text-2xl" /></div>
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
              <Avatar value={p.profile?.avatar} size={26} className="text-xl" />
              <span className="flex-1 font-medium text-sm">{p.profile?.nickname ?? '?'}</span>
              <span className="font-bold tabular-nums text-slate-300">{p.score} pts</span>
            </div>
          ))}
        </div>
      )}

      {/* Récapitulatif des questions */}
      <RaceRecap questions={questions} myAnswers={myAnswers} q_count={q_count} />

      {xpEarnedRef.current > 0 && (
        <div className="text-center text-midi-accent font-bold text-lg animate-pop">
          +{xpEarnedRef.current} XP gagnés !
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

// ─── Récapitulatif des questions ───────────────────────────────
function RaceRecap({ questions, myAnswers, q_count }) {
  const [showAll, setShowAll] = useState(false)

  const total = questions.length || q_count || 0
  if (!total) return null

  // Map q_idx → réponse du joueur
  const byIdx = {}
  for (const a of (myAnswers ?? [])) byIdx[a.q_idx] = a

  // Statut par question : 'correct' | 'wrong' | 'missed'
  const items = questions.map((q, i) => {
    const ans = byIdx[i]
    const status = ans?.is_correct ? 'correct' : ans ? 'wrong' : 'missed'
    return { q, i, ans, status }
  })

  const correctCount = items.filter(it => it.status === 'correct').length
  const toReview = items.filter(it => it.status !== 'correct')

  // Par défaut : on met en avant les questions ratées. Bouton pour tout voir.
  const visible = showAll ? items : toReview

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl tracking-wider">📋 Récapitulatif</h2>
        <span className="text-sm text-slate-400">
          <strong className="text-green-400">{correctCount}</strong>/{total} bonnes réponses
        </span>
      </div>

      {toReview.length === 0 ? (
        <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-5 text-center">
          <p className="text-green-400 font-bold text-lg">🎉 Sans-faute !</p>
          <p className="text-slate-400 text-sm mt-1">Tu as répondu correctement à toutes les questions.</p>
        </div>
      ) : (
        <p className="text-sm text-slate-400">
          <span className="text-red-400 font-semibold">{toReview.length}</span> question{toReview.length > 1 ? 's' : ''} à revoir
          {' '}— surlignée{toReview.length > 1 ? 's' : ''} en rouge ci-dessous.
        </p>
      )}

      <div className="space-y-3">
        {visible.map(({ q, i, ans, status }) => (
          <RecapCard key={i} q={q} idx={i} ans={ans} status={status} />
        ))}
      </div>

      {toReview.length !== total && (
        <button onClick={() => setShowAll(s => !s)}
          className="w-full py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 text-sm font-medium transition">
          {showAll ? 'Masquer les bonnes réponses' : `Voir toutes les questions (${total})`}
        </button>
      )}
    </div>
  )
}

function RecapCard({ q, idx, ans, status }) {
  const letters = ['A', 'B', 'C', 'D']
  const styles = {
    correct: { border: 'border-green-500/30', bg: 'bg-green-500/5',  badge: 'bg-green-500/20 text-green-400', label: '✓ Correct' },
    wrong:   { border: 'border-red-500/40',   bg: 'bg-red-500/10',   badge: 'bg-red-500/20 text-red-400',     label: '✗ Mauvaise réponse' },
    missed:  { border: 'border-amber-500/30', bg: 'bg-amber-500/5',  badge: 'bg-amber-500/20 text-amber-400', label: '⏱ Sans réponse' },
  }[status]

  return (
    <div className={`rounded-2xl border ${status === 'correct' ? styles.border : 'border-l-4 ' + styles.border} ${styles.bg} p-4`}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-xs text-slate-500 font-medium">
          Q{idx + 1}{q.theme && <span className="ml-2 uppercase tracking-wider">· {q.theme}</span>}
        </span>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${styles.badge}`}>{styles.label}</span>
      </div>

      <p className="font-semibold text-sm md:text-base mb-3">{q.q}</p>

      {isOpenQuestion(q) ? (
        <div className="space-y-1.5">
          {ans?.answer_text && (
            <div className={`flex items-center gap-2 text-sm rounded-lg px-3 py-1.5 ${
              ans.is_correct ? 'bg-green-500/15 text-green-300 font-medium' : 'bg-red-500/15 text-red-300 line-through'
            }`}>
              <span className="text-xs opacity-50">✍️</span>
              <span className="flex-1 break-words">{ans.answer_text}</span>
              <span className={`text-xs font-semibold ${ans.is_correct ? 'text-green-400' : 'text-red-400'}`}>Ta réponse</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm rounded-lg px-3 py-1.5 bg-green-500/10 text-green-300 font-medium">
            <span className="text-xs opacity-50">💡</span>
            <span className="flex-1 break-words">{q.answer}</span>
            <span className="text-green-400 text-xs font-semibold">Bonne réponse</span>
          </div>
        </div>
      ) : (
      <div className="space-y-1.5">
        {(q.choices ?? []).map((choice, ci) => {
          const isCorrect = ci === q.answer
          const isMine    = ans && ci === ans.answer_idx
          let cls = 'flex items-center gap-2 text-sm rounded-lg px-3 py-1.5 '
          if (isCorrect)      cls += 'bg-green-500/15 text-green-300 font-medium'
          else if (isMine)    cls += 'bg-red-500/15 text-red-300 line-through'
          else                cls += 'text-slate-500'
          return (
            <div key={ci} className={cls}>
              <span className="text-xs opacity-50">{letters[ci]}</span>
              <span className="flex-1">{choice}</span>
              {isCorrect && <span className="text-green-400 text-xs font-semibold">Bonne réponse</span>}
              {isMine && !isCorrect && <span className="text-red-400 text-xs font-semibold">Ta réponse</span>}
            </div>
          )
        })}
      </div>
      )}
    </div>
  )
}

// ─── Effet « étoiles » au clic sur un choix ────────────────────
// Les étoiles jaillissent du bouton après le clic. Couleur = vert (correct) / rouge (faux).
const STAR_CONFIG = [
  { s: { top: '20%', left: '20%' }, e: { top: '-80%', left: '-30%' }, w: 25, d: 1000, ease: 'cubic-bezier(0.05,0.83,0.43,0.96)' },
  { s: { top: '45%', left: '45%' }, e: { top: '-25%', left: '10%'  }, w: 15, d: 1000, ease: 'cubic-bezier(0,0.4,0,1.01)' },
  { s: { top: '40%', left: '40%' }, e: { top: '55%',  left: '25%'  }, w: 5,  d: 1000, ease: 'cubic-bezier(0,0.4,0,1.01)' },
  { s: { top: '20%', left: '40%' }, e: { top: '30%',  left: '80%'  }, w: 8,  d: 800,  ease: 'cubic-bezier(0,0.4,0,1.01)' },
  { s: { top: '25%', left: '45%' }, e: { top: '25%',  left: '115%' }, w: 15, d: 600,  ease: 'cubic-bezier(0,0.4,0,1.01)' },
  { s: { top: '5%',  left: '50%' }, e: { top: '5%',   left: '60%'  }, w: 5,  d: 800,  ease: 'ease-in-out' },
]

function StarBurst({ color }) {
  const [go, setGo] = useState(false)
  useEffect(() => {
    const raf = requestAnimationFrame(() => setGo(true))
    return () => cancelAnimationFrame(raf)
  }, [])
  return (
    <span className="pointer-events-none absolute inset-0" aria-hidden="true">
      {STAR_CONFIG.map((st, i) => {
        const pos = go ? st.e : st.s
        return (
          <span key={i} className="absolute block"
            style={{
              width: `${st.w}px`,
              top: pos.top, left: pos.left,
              zIndex: go ? 2 : -5,
              opacity: go ? 1 : 0,
              transition: `top ${st.d}ms ${st.ease}, left ${st.d}ms ${st.ease}, opacity ${st.d}ms ${st.ease}, filter ${st.d}ms ${st.ease}`,
              filter: go ? `drop-shadow(0 0 10px ${color})` : 'drop-shadow(0 0 0 transparent)',
            }}>
            <StarSvg color={color} />
          </span>
        )
      })}
    </span>
  )
}

function StarSvg({ color }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-auto" style={{ fill: color }}>
      <path d="M392.05 0c-20.9,210.08-184.06,378.41-392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93-210.06 184.09-378.37 392.05-407.74-207.98-29.38-371.16-197.69-392.06-407.78z" />
    </svg>
  )
}

// ─── Utilitaires ───────────────────────────────────────────────
function Centered({ children }) {
  return <div className="flex flex-col items-center justify-center min-h-screen gap-3 px-4">{children}</div>
}
function SettingRow({ label, value }) {
  return (
    <div className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
      <span className="text-slate-500 text-xs">{label}</span>
      <span className="font-semibold text-slate-200">{value}</span>
    </div>
  )
}
function Spinner() {
  return <div className="w-10 h-10 rounded-full border-2 border-green-500 border-t-transparent animate-spin" />
}
