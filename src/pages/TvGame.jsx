import { useState, useEffect, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useGame } from '../context/GameContext.jsx'
import { useTvRoom, gainForAnswer } from '../hooks/useTvRoom.js'
import { JLRProvider, useJLR } from '../components/JLRAvatar.jsx'

// ─── Métadonnées des phases ───────────────────────────────────
const PHASE_META = {
  coup_envoi:          { label: 'Le Coup d\'Envoi',    icon: '🎯', grad: 'from-amber-950/70'  },
  coup_par_coup:       { label: 'Le Coup par Coup',    icon: '⚔️',  grad: 'from-orange-950/70' },
  coup_fatal:          { label: 'Le Coup Fatal',       icon: '💀', grad: 'from-red-950/70'    },
  coup_de_maitre:      { label: 'Coup de Maître',      icon: '🏆', grad: 'from-yellow-950/70' },
  etoile_mysterieuse:  { label: 'Étoile Mystérieuse',  icon: '⭐', grad: 'from-cyan-950/70'   },
}

const DURATIONS = {
  coup_envoi:         20000,
  coup_par_coup:      18000,
  duel:               15000,
  coup_fatal:         12000,
  coup_de_maitre:     20000,
  etoile_mysterieuse: 30000,
}

// ─── Timer ────────────────────────────────────────────────────
function useTimer(startAt, duration) {
  const [timeLeft, setTimeLeft] = useState(duration)
  useEffect(() => {
    if (!startAt) { setTimeLeft(duration); return }
    const origin  = new Date(startAt).getTime()
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
  return { timeLeft, secs: Math.ceil(timeLeft / 1000), pct: (timeLeft / duration) * 100, expired: timeLeft === 0 }
}

// ─── Root ─────────────────────────────────────────────────────
export default function TvGame() {
  return <JLRProvider><TvGameCore /></JLRProvider>
}

function TvGameCore() {
  const { code } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { room, participants, answers, myAnswers, isHost, loading,
          submitAnswer, hostAdvance, startGame } = useTvRoom(code)
  const { trigger } = useJLR()

  const [showTransition, setShowTransition] = useState(false)
  const [transPhase, setTransPhase]         = useState(null)
  const [confirmQuit, setConfirmQuit]       = useState(false)
  const prevPhase = useRef(null)

  useEffect(() => {
    if (!room?.phase) return
    const prev = prevPhase.current
    prevPhase.current = room.phase
    if (prev && prev !== room.phase && room.phase !== 'lobby') {
      setTransPhase(room.phase)
      setShowTransition(true)
      const t1 = setTimeout(() => setShowTransition(false), 2800)
      const t2 = setTimeout(() => {
        const key = room.phase === 'finished' ? 'finished' : room.phase
        trigger('intro', key, 5500)
      }, 300)
      return () => { clearTimeout(t1); clearTimeout(t2) }
    }
  }, [room?.phase, trigger])

  if (loading) return <TV><Centered><Spinner /><p className="text-slate-400 mt-4">Chargement…</p></Centered></TV>
  if (!room)   return <TV><Centered><p className="text-4xl mb-3">❓</p><p className="text-slate-400 mb-6">Salle introuvable.</p><BackBtn /></Centered></TV>
  if (!user)   return <TV><Centered><p className="text-slate-400 mb-4">Connecte-toi pour jouer.</p><Link to="/auth" className="tvbtn">Connexion</Link></Centered></TV>

  const phase = room.phase
  const pd    = room.phase_data ?? {}
  const meta  = PHASE_META[phase]
  const myProfileId = participants.find(p => p.profile_id === user.id)?.profile_id ?? user.id
  const props = { room, pd, participants, answers, myAnswers, isHost, submitAnswer, hostAdvance, myProfileId }

  return (
    <TV grad={meta?.grad}>
      {showTransition && <PhaseTransition phase={transPhase} />}

      {/* Bouton quitter — toutes les phases sauf finished */}
      {phase !== 'finished' && (
        <button
          onClick={() => setConfirmQuit(true)}
          className="fixed top-4 right-4 z-40 px-3 py-1.5 rounded-lg bg-black/60 border border-white/10 text-slate-400 hover:text-white hover:border-white/30 text-xs font-medium transition backdrop-blur-sm">
          ✕ Quitter
        </button>
      )}

      {/* Modal confirmation quitter */}
      {confirmQuit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#111827] border border-white/10 rounded-2xl p-6 w-full max-w-sm text-center space-y-4 animate-pop">
            <div className="text-4xl">🚪</div>
            <h2 className="font-display text-2xl tracking-wider text-white">Quitter la partie ?</h2>
            <p className="text-slate-400 text-sm">
              {isHost
                ? 'Tu es l\'hôte. Si tu pars, la partie risque de se bloquer pour les autres.'
                : 'Tu vas quitter la partie en cours.'}
            </p>
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setConfirmQuit(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold transition">
                Rester
              </button>
              <button
                onClick={() => navigate('/multi')}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold transition">
                Quitter
              </button>
            </div>
          </div>
        </div>
      )}

      {phase !== 'lobby' && phase !== 'finished' && (
        <TopBar phase={phase} pd={pd} participants={participants} />
      )}

      <div className="max-w-2xl mx-auto px-4 pb-10">
        {phase === 'lobby'              && <LobbyPhase {...props} code={code} onStart={startGame} />}
        {phase === 'coup_envoi'         && <CoupEnvoiPhase {...props} phase="coup_envoi" />}
        {phase === 'coup_par_coup'      && <CoupEnvoiPhase {...props} phase="coup_par_coup" />}
        {phase === 'coup_fatal'         && <CoupFatalPhase {...props} />}
        {phase === 'coup_de_maitre'     && <CoupDeMaitrePhase {...props} />}
        {phase === 'etoile_mysterieuse' && <EtoileMysterieusePhase {...props} />}
        {phase === 'finished'           && <FinishedPhase pd={pd} participants={participants} answers={answers} />}
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

// ─── Phase transition ─────────────────────────────────────────
function PhaseTransition({ phase }) {
  const meta = PHASE_META[phase] ?? { label: phase, icon: '▶' }
  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center animate-pop">
      <div className="text-8xl mb-6 animate-bounce">{meta.icon}</div>
      <p className="font-display text-5xl md:text-7xl text-white tracking-wide text-center px-4">{meta.label}</p>
      <p className="mt-4 text-slate-400 text-base tracking-widest uppercase">Préparez-vous !</p>
    </div>
  )
}

// ─── Top bar ──────────────────────────────────────────────────
function TopBar({ phase, pd, participants }) {
  const meta = PHASE_META[phase] ?? { label: phase, icon: '▶' }
  const activePlayers = pd.active_players ?? participants.map(p => p.profile_id)
  const eliminated    = pd.eliminated ?? []

  // Score du Maître pour les phases finales
  const isLatePhase = phase === 'coup_de_maitre' || phase === 'etoile_mysterieuse'
  const score = pd.score ?? 0

  return (
    <div className="sticky top-0 z-20 backdrop-blur-xl bg-black/70 border-b border-white/10 px-4 py-3">
      <div className="max-w-2xl mx-auto flex items-center gap-3">
        <span className="text-xl">{meta.icon}</span>
        <span className="font-display text-base tracking-wider hidden sm:block text-slate-200">{meta.label}</span>

        {/* Compteur joueurs actifs */}
        {!isLatePhase && (
          <span className="text-xs text-slate-500 bg-white/5 px-2 py-0.5 rounded-full">
            {activePlayers.length} joueur{activePlayers.length > 1 ? 's' : ''} restant{activePlayers.length > 1 ? 's' : ''}
          </span>
        )}

        {/* Petits avatars éliminés */}
        {eliminated.length > 0 && (
          <div className="flex gap-1">
            {eliminated.map(pid => {
              const p = participants.find(x => x.profile_id === pid)
              return (
                <span key={pid} className="text-base opacity-30 line-through" title={p?.profile?.nickname ?? '?'}>
                  {p?.profile?.avatar ?? '👤'}
                </span>
              )
            })}
          </div>
        )}

        <div className="flex-1" />

        {isLatePhase ? (
          <div className="text-right">
            <div className="text-xs text-slate-500">Cagnotte</div>
            <div className="font-display text-xl text-yellow-400 leading-none">{score.toLocaleString('fr-FR')} €</div>
          </div>
        ) : (
          <div className="text-right">
            <div className="text-xs text-slate-500">Maître de Midi</div>
            <div className="font-display text-base text-white leading-none">???</div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Lobby ────────────────────────────────────────────────────
function LobbyPhase({ room, participants, isHost, onStart, code }) {
  const [copied, setCopied] = useState(false)
  const { trigger } = useJLR()
  const prevCount = useRef(participants.length)

  useEffect(() => { const t = setTimeout(() => trigger('idle', 'lobby', 0), 800); return () => clearTimeout(t) }, [trigger])
  useEffect(() => {
    if (participants.length > prevCount.current) trigger('excited', 'lobby', 4000)
    prevCount.current = participants.length
  }, [participants.length, trigger])

  function copyCode() { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000) }

  const n = participants.length
  const gameMode = n >= 4 ? 'Jeu complet (4 phases)' : n === 3 ? 'Coup par Coup → Coup Fatal' : 'Coup Fatal direct'

  return (
    <div className="min-h-screen flex flex-col items-center justify-center py-8">
      <div className="w-full space-y-6">
        <div className="text-center space-y-2">
          <div className="text-6xl">📺</div>
          <h1 className="font-display text-4xl md:text-5xl tracking-wider">Les 12 Coups de Midi</h1>
          <p className="text-slate-500 text-sm">Salle d'attente</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center">
          <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Code de la partie</p>
          <div className="flex items-center justify-center gap-3">
            <span className="font-mono text-3xl tracking-[0.3em] font-black text-yellow-400">{code}</span>
            <button onClick={copyCode} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition text-sm">
              {copied ? '✓' : '📋'}
            </button>
          </div>
          <p className="text-xs text-slate-600 mt-2">Partage ce code à tes adversaires</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Joueurs ({n}/4)</h2>
            <span className="text-xs text-yellow-500 bg-yellow-500/10 rounded-full px-2 py-0.5">{gameMode}</span>
          </div>
          <ul className="space-y-3">
            {participants.map(p => (
              <li key={p.id} className="flex items-center gap-3">
                <span className="text-3xl">{p.profile?.avatar ?? '🎭'}</span>
                <span className="font-semibold flex-1">{p.profile?.nickname ?? '…'}</span>
                {p.profile_id === room.host_id && <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">Hôte</span>}
              </li>
            ))}
            {Array.from({ length: 4 - n }).map((_, i) => (
              <li key={i} className="flex items-center gap-3 opacity-20">
                <span className="text-3xl">👤</span><span className="text-slate-500 text-sm">En attente…</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Déroulement */}
        <div className="space-y-3">
          <p className="text-xs text-slate-500 uppercase tracking-widest px-1">⚔️ Déroulement des manches</p>

          {/* Phases battle */}
          <div className="bg-white/5 border border-white/10 rounded-2xl divide-y divide-white/5 overflow-hidden text-sm">
            <div className="flex gap-3 p-4">
              <span className="text-xl shrink-0 mt-0.5">1️⃣</span>
              <div>
                <p className="font-semibold text-slate-100">Coup d'Envoi</p>
                <p className="text-slate-500 text-xs leading-relaxed mt-0.5">
                  Les 4 candidats répondent à des questions de culture générale. 2 mauvaises réponses = rouge = DUEL contre le champion — le perdant est éliminé.
                </p>
              </div>
            </div>
            <div className="flex gap-3 p-4">
              <span className="text-xl shrink-0 mt-0.5">2️⃣</span>
              <div>
                <p className="font-semibold text-slate-100">Coup par Coup</p>
                <p className="text-slate-500 text-xs leading-relaxed mt-0.5">
                  Les 3 candidats restants s'affrontent tour à tour. Élimination progressive jusqu'à ce qu'il n'en reste qu'un — le nouveau Maître de Midi.
                </p>
              </div>
            </div>
            <div className="flex gap-3 p-4">
              <span className="text-xl shrink-0 mt-0.5">3️⃣</span>
              <div>
                <p className="font-semibold text-slate-100">Coup Fatal</p>
                <p className="text-slate-500 text-xs leading-relaxed mt-0.5">
                  Épreuve éliminatoire finale entre les 2 derniers candidats. Chacun démarre avec 12 coups — chaque mauvaise réponse en coûte 2. Le premier à 0 est éliminé.
                </p>
              </div>
            </div>
          </div>

          {/* Coup de Maître */}
          <p className="text-xs text-slate-500 uppercase tracking-widest px-1 pt-1">🏆 La manche finale</p>
          <div className="bg-yellow-950/40 border border-yellow-500/25 rounded-2xl p-4 text-sm space-y-2">
            <p className="font-semibold text-yellow-300">Coup de Maître — épreuve individuelle</p>
            <p className="text-slate-400 text-xs leading-relaxed">
              Le Maître de Midi répond à <strong className="text-slate-200">5 questions</strong>. À chaque question, 3 propositions dont une masquée. La cagnotte du jour est en jeu : <strong className="text-yellow-400">10 000 €, 20 000 € ou 30 000 €</strong>.
            </p>
            <div className="grid grid-cols-3 gap-2 text-xs text-center pt-1">
              <div className="bg-yellow-500/10 rounded-xl p-2">
                <div className="text-yellow-400 font-bold text-base">5/5</div>
                <div className="text-slate-400 mt-0.5">Coup de Maître 🏆<br/>Cagnotte conservée</div>
              </div>
              <div className="bg-orange-500/10 rounded-xl p-2">
                <div className="text-orange-400 font-bold text-base">1–2 erreurs</div>
                <div className="text-slate-400 mt-0.5">Cagnotte ÷ 10<br/>à chaque erreur</div>
              </div>
              <div className="bg-red-500/10 rounded-xl p-2">
                <div className="text-red-400 font-bold text-base">3 erreurs</div>
                <div className="text-slate-400 mt-0.5">Perd tout ❌<br/>Cagnotte à 0</div>
              </div>
            </div>
            <p className="text-slate-500 text-xs italic">
              La moitié des gains quotidiens est partagée avec un téléspectateur tiré au sort.
            </p>
          </div>

          {/* Étoile Mystérieuse */}
          <p className="text-xs text-slate-500 uppercase tracking-widest px-1 pt-1">⭐ L'Étoile Mystérieuse</p>
          <div className="bg-cyan-950/40 border border-cyan-500/20 rounded-2xl p-4 text-sm space-y-2">
            <p className="font-semibold text-cyan-300">L'élément iconique de l'émission</p>
            <p className="text-slate-400 text-xs leading-relaxed">
              Un rectangle de <strong className="text-slate-200">13 × 10 cases</strong> dissimule une célébrité. Chaque bonne réponse au Coup de Maître retire une case et révèle un indice.
            </p>
            <p className="text-slate-400 text-xs leading-relaxed">
              Seul un <strong className="text-cyan-300">Coup de Maître (5/5)</strong> permet de tenter l'étoile. Il faut proposer un nom pour identifier la célébrité et remporter l'étoile — un ensemble de cadeaux dont <strong className="text-slate-200">une voiture</strong>.
            </p>
            <p className="text-slate-600 text-xs italic">
              Record : Julia Roberts — identifiée après 48 jours (10 juillet 2015).
            </p>
          </div>
        </div>

        {isHost ? (
          <button onClick={onStart} disabled={n < 4}
            className="w-full py-4 rounded-2xl font-display text-xl tracking-wider bg-yellow-500 text-black hover:bg-yellow-400 transition disabled:opacity-40 disabled:cursor-not-allowed">
            {n < 4
              ? `⏳ En attente de ${4 - n} joueur${4 - n > 1 ? 's' : ''} (${n}/4)`
              : '▶ Lancer la partie !'}
          </button>
        ) : (
          <p className="text-center text-slate-500 text-sm py-4">
            {n < 4
              ? `⏳ En attente de ${4 - n} joueur${4 - n > 1 ? 's' : ''} (${n}/4)…`
              : "⏳ En attente que l'hôte lance la partie…"}
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Coup d'Envoi / Coup par Coup ─────────────────────────────
function CoupEnvoiPhase({ phase, pd, participants, answers, myAnswers, isHost, submitAnswer, hostAdvance, myProfileId }) {
  if (pd.subphase === 'duel') {
    return <EnvoiDuel phase={phase} pd={pd} participants={participants} answers={answers}
      myAnswers={myAnswers} isHost={isHost} submitAnswer={submitAnswer} hostAdvance={hostAdvance} myProfileId={myProfileId} />
  }
  return <EnvoiQuestion phase={phase} pd={pd} participants={participants} answers={answers}
    myAnswers={myAnswers} isHost={isHost} submitAnswer={submitAnswer} hostAdvance={hostAdvance} myProfileId={myProfileId} />
}

// — Question normale —
function EnvoiQuestion({ phase, pd, participants, answers, myAnswers, isHost, submitAnswer, hostAdvance, myProfileId }) {
  const questions     = pd.questions ?? []
  const q_idx         = pd.q_idx ?? 0
  const q             = questions[q_idx]
  const activePlayers = pd.active_players ?? []
  const { secs, pct, expired } = useTimer(pd.q_start_at, DURATIONS[phase])
  const [selected, setSelected] = useState(null)
  const urgentFired = useRef(false)
  const revealFired = useRef(false)
  const startedAt   = pd.q_start_at ? new Date(pd.q_start_at).getTime() : Date.now()
  const { trigger } = useJLR()

  const { answer: awardXp } = useGame()
  const myAnswer  = myAnswers.find(a => a.phase === phase && a.q_idx === q_idx)
  const qAnswers  = answers.filter(a => a.phase === phase && a.q_idx === q_idx)
  const isActive  = activePlayers.includes(myProfileId)

  // ── Révélation dérivée : identique pour TOUS les clients (actifs + éliminés)
  const allDone  = activePlayers.length > 0 &&
    activePlayers.every(pid => qAnswers.some(a => a.profile_id === pid))
  const revealed = expired || allDone

  useEffect(() => {
    setSelected(null)
    urgentFired.current = false; revealFired.current = false
    trigger('thinking', 'thinking', 3500)
  }, [q_idx, trigger])

  useEffect(() => {
    if (secs <= 5 && secs > 0 && !revealed && !urgentFired.current) {
      urgentFired.current = true; trigger('urgent', 'urgent', 3000)
    }
  }, [secs, revealed, trigger])

  // Réaction JLR
  useEffect(() => {
    if (!revealed || revealFired.current) return
    revealFired.current = true
    if (myAnswer?.is_correct) trigger('excited', 'correct', 4000)
    else if (myAnswer) trigger('sad', 'wrong', 4000)
  }, [revealed, myAnswer, trigger])

  // Auto-advance — host only — pas de gardes inutiles : la pause varie selon
  // qu'on enchaîne (tout le monde a répondu) ou qu'on a attendu le timer
  const hostAdvanceRef = useRef(hostAdvance)
  useEffect(() => { hostAdvanceRef.current = hostAdvance })
  useEffect(() => {
    if (!isHost || !revealed) return
    const delay = allDone ? 1500 : 3000
    const t = setTimeout(() => hostAdvanceRef.current?.(), delay)
    return () => clearTimeout(t)
  }, [revealed, isHost, allDone, q_idx])

  async function pick(idx) {
    if (!isActive || myAnswer || revealed || selected !== null || !q) return
    setSelected(idx)
    const isCorrect = idx === q.answer
    awardXp(q.theme ?? 'multi', q.difficulty ?? 1, isCorrect)
    await submitAnswer({ phase, q_idx, answer_idx: idx, is_correct: isCorrect, time_ms: Date.now() - startedAt })
  }

  if (!q) return <Centered><Spinner /></Centered>

  const meta = PHASE_META[phase]

  return (
    <div className="space-y-5 pt-4">
      <QHeader icon={meta.icon} label={meta.label} sub={`Q${q_idx + 1}/${questions.length}`} secs={secs} pct={pct} />

      <QuestionCard text={q.q} theme={q.theme} />

      <ChoicesGrid choices={q.choices} answer={q.answer} revealed={revealed}
        selected={isActive ? (myAnswer?.answer_idx ?? selected) : null}
        onPick={isActive ? pick : () => {}}
        disableAll={!isActive} />

      {!isActive && <SpectatorBanner />}

      {revealed && myAnswer?.is_correct && <GainBadge gain={0} label="Survie !" />}

      <EnvoiPlayerBar participants={participants} activePlayers={activePlayers}
        qAnswers={qAnswers} revealed={revealed} answer={q.answer}
        wrongCounts={pd.wrong_counts ?? {}} eliminated={pd.eliminated ?? []} />
    </div>
  )
}

// — Duel —
function EnvoiDuel({ phase, pd, participants, answers, myAnswers, isHost, submitAnswer, hostAdvance, myProfileId }) {
  const duelPhase     = phase + '_duel'
  const duelQuestion  = pd.duel_question
  const { secs, pct, expired } = useTimer(pd.q_start_at, DURATIONS.duel)
  const [selected, setSelected] = useState(null)
  const [revealed, setRevealed] = useState(false)
  const advRef      = useRef(false)
  const revealFired = useRef(false)
  const startedAt   = pd.q_start_at ? new Date(pd.q_start_at).getTime() : Date.now()
  const { trigger } = useJLR()

  const { answer: awardXp } = useGame()
  const isDuelPlayer = myProfileId === pd.rouge_player_id || myProfileId === pd.duel_vs_id
  const myAnswer     = myAnswers.find(a => a.phase === duelPhase)
  const duelAnswers  = answers.filter(a => a.phase === duelPhase &&
    (a.profile_id === pd.rouge_player_id || a.profile_id === pd.duel_vs_id))

  const firstCorrect = duelAnswers.filter(a => a.is_correct)
    .sort((a, b) => new Date(a.answered_at) - new Date(b.answered_at))[0] ?? null

  useEffect(() => {
    setSelected(null); setRevealed(false); advRef.current = false; revealFired.current = false
    trigger('shocked', 'duel', 4000)
  }, [trigger])

  useEffect(() => { if (expired && !revealed) setRevealed(true) }, [expired, revealed])

  // Révèle 1.2s après le premier buzz correct
  useEffect(() => {
    if (revealed || !firstCorrect) return
    const t = setTimeout(() => setRevealed(true), 1200)
    return () => clearTimeout(t)
  }, [firstCorrect, revealed])

  useEffect(() => {
    if (!revealed || revealFired.current) return
    revealFired.current = true
    if (firstCorrect?.profile_id === myProfileId) trigger('excited', 'duel_win', 5000)
    else if (myAnswer && myProfileId === pd.rouge_player_id && !firstCorrect) trigger('sad', 'wrong', 4000)
    else if (myAnswer?.is_correct) trigger('excited', 'duel_win', 5000)
  }, [revealed, firstCorrect, myAnswer, myProfileId, pd.rouge_player_id, trigger])

  useEffect(() => {
    if (!isHost || !revealed || advRef.current) return
    const t = setTimeout(() => { if (!advRef.current) { advRef.current = true; hostAdvance() } }, 3500)
    return () => clearTimeout(t)
  }, [revealed, isHost, hostAdvance])

  async function pick(idx) {
    if (!isDuelPlayer || myAnswer || revealed || selected !== null || !duelQuestion) return
    setSelected(idx)
    const isCorrect = idx === duelQuestion.answer
    awardXp(duelQuestion.theme ?? 'multi', duelQuestion.difficulty ?? 1, isCorrect)
    await submitAnswer({ phase: duelPhase, q_idx: 0, answer_idx: idx, is_correct: isCorrect, time_ms: Date.now() - startedAt })
  }

  const rougeP  = participants.find(p => p.profile_id === pd.rouge_player_id)
  const vsP     = participants.find(p => p.profile_id === pd.duel_vs_id)
  const winnerP = firstCorrect ? participants.find(p => p.profile_id === firstCorrect.profile_id) : null

  return (
    <div className="space-y-5 pt-4">
      {/* Header duel */}
      <div className="text-center space-y-1 pt-2 animate-pop">
        <div className="text-5xl">⚔️</div>
        <p className="font-display text-4xl tracking-widest text-orange-400">DUEL !</p>
        <p className="text-sm text-slate-500">Le chrono tourne… Premier à buzzér correctement gagne !</p>
      </div>

      {/* Barre de timer */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-slate-500">
          <span>Temps restant</span>
          <span className={`font-display text-2xl ${secs <= 5 ? 'text-red-400 animate-pulse' : 'text-white'}`}>{secs}s</span>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-orange-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Les deux duellistes */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { player: rougeP, isRouge: true,  label: 'ROUGE' },
          { player: vsP,    isRouge: false, label: 'CHAMPION' },
        ].map(({ player, isRouge, label }) => {
          if (!player) return null
          const hasAns = duelAnswers.find(a => a.profile_id === player.profile_id)
          const isWinner = revealed && firstCorrect?.profile_id === player.profile_id
          return (
            <div key={player.id}
              className={`rounded-2xl p-4 text-center border-2 transition-all
                ${isRouge ? 'border-red-500/40 bg-red-950/30' : 'border-yellow-500/40 bg-yellow-950/20'}
                ${isWinner ? 'ring-2 ring-green-400 scale-105' : ''}
              `}>
              <span className="text-4xl block">{player.profile?.avatar ?? '🎭'}</span>
              <p className="font-semibold mt-1 text-sm">{player.profile?.nickname ?? '?'}</p>
              <span className={`text-xs font-black tracking-widest mt-1 block ${isRouge ? 'text-red-400' : 'text-yellow-400'}`}>{label}</span>
              {hasAns && !revealed && <span className="text-yellow-400 text-lg mt-1 block">⚡ Buzzé</span>}
              {revealed && (
                <span className={`text-lg mt-1 block font-bold ${isWinner ? 'text-green-400' : 'text-red-400'}`}>
                  {isWinner ? '✓ Gagne !' : '✗ Éliminé'}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* Question */}
      {duelQuestion && (
        <>
          <QuestionCard text={duelQuestion.q} />
          {isDuelPlayer ? (
            <ChoicesGrid choices={duelQuestion.choices} answer={duelQuestion.answer} revealed={revealed}
              selected={myAnswer?.answer_idx ?? selected} onPick={pick} accent="border-orange-500 bg-orange-500/15 text-orange-300" />
          ) : (
            <div className="text-center py-4 text-slate-500 text-sm bg-white/5 rounded-xl">
              🍿 Vous observez le duel…
            </div>
          )}
        </>
      )}

      {/* Spectateurs */}
      <EnvoiPlayerBar participants={participants} activePlayers={pd.active_players ?? []}
        qAnswers={duelAnswers} revealed={revealed} answer={duelQuestion?.answer ?? -1}
        wrongCounts={pd.wrong_counts ?? {}} eliminated={pd.eliminated ?? []}
        duelPlayers={[pd.rouge_player_id, pd.duel_vs_id]} />
    </div>
  )
}

// ─── Coup Fatal ───────────────────────────────────────────────
function CoupFatalPhase({ pd, participants, answers, myAnswers, isHost, submitAnswer, hostAdvance, myProfileId }) {
  const questions     = pd.questions ?? []
  const q_idx         = pd.q_idx ?? 0
  const q             = questions[q_idx]
  const activePlayers = pd.active_players ?? []
  const { secs, pct, expired } = useTimer(pd.q_start_at, DURATIONS.coup_fatal)
  const [selected, setSelected]   = useState(null)
  const [localCoups, setLocalCoups] = useState(pd.coups ?? {})
  const urgentFired = useRef(false)
  const revealFired = useRef(false)
  const startedAt   = pd.q_start_at ? new Date(pd.q_start_at).getTime() : Date.now()
  const { trigger } = useJLR()

  const { answer: awardXp } = useGame()
  const myAnswer  = myAnswers.find(a => a.phase === 'coup_fatal' && a.q_idx === q_idx)
  const qAnswers  = answers.filter(a => a.phase === 'coup_fatal' && a.q_idx === q_idx)
  const isActive  = activePlayers.includes(myProfileId)

  // Révélation dérivée — synchrone pour tous les clients
  const allDone  = activePlayers.length > 0 &&
    activePlayers.every(pid => qAnswers.some(a => a.profile_id === pid))
  const revealed = expired || allDone

  useEffect(() => {
    setSelected(null)
    urgentFired.current = false; revealFired.current = false
    setLocalCoups(pd.coups ?? {})
    trigger('thinking', 'coup_fatal', 3000)
  }, [q_idx, pd.coups, trigger])

  useEffect(() => {
    if (secs <= 3 && secs > 0 && !revealed && !urgentFired.current) {
      urgentFired.current = true; trigger('urgent', 'urgent', 2500)
    }
  }, [secs, revealed, trigger])

  useEffect(() => {
    if (!revealed || revealFired.current) return
    revealFired.current = true
    if (myAnswer?.is_correct) trigger('excited', 'correct', 3500)
    else if (myAnswer) trigger('sad', 'wrong', 3500)
  }, [revealed, myAnswer, trigger])

  const hostAdvanceRef = useRef(hostAdvance)
  useEffect(() => { hostAdvanceRef.current = hostAdvance })
  useEffect(() => {
    if (!isHost || !revealed) return
    const delay = allDone ? 1500 : 3000
    const t = setTimeout(() => hostAdvanceRef.current?.(), delay)
    return () => clearTimeout(t)
  }, [revealed, isHost, allDone, q_idx])

  async function pick(idx) {
    if (!isActive || myAnswer || revealed || selected !== null || !q) return
    setSelected(idx)
    const isCorrect = idx === q.answer
    awardXp(q.theme ?? 'multi', q.difficulty ?? 1, isCorrect)
    await submitAnswer({ phase: 'coup_fatal', q_idx, answer_idx: idx, is_correct: isCorrect, time_ms: Date.now() - startedAt })
  }

  if (!q) return <Centered><Spinner /></Centered>

  return (
    <div className="space-y-5 pt-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">💀</span>
          <span className="font-display text-2xl tracking-wider">Coup Fatal</span>
          <span className="text-xs text-slate-500 bg-white/5 px-2 py-0.5 rounded-full">
            Q{q_idx + 1}/{questions.length}
          </span>
        </div>
        <span className={`font-display text-4xl tabular-nums ${secs <= 3 ? 'text-red-400 animate-pulse' : 'text-white'}`}>{secs}s</span>
      </div>

      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${secs <= 3 ? 'bg-red-500' : 'bg-red-400'}`} style={{ width: `${pct}%` }} />
      </div>

      {/* Coups des joueurs */}
      <div className="grid grid-cols-2 gap-4">
        {activePlayers.map(pid => {
          const p     = participants.find(x => x.profile_id === pid)
          const coups = (localCoups[pid] ?? 12)
          const pct12 = (coups / 12) * 100
          const danger = coups <= 4
          const ans = qAnswers.find(a => a.profile_id === pid)
          return (
            <div key={pid} className={`rounded-2xl p-4 border-2 ${danger ? 'border-red-500/60 bg-red-950/30' : 'border-white/10 bg-white/5'}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{p?.profile?.avatar ?? '🎭'}</span>
                <span className="font-semibold text-sm truncate">{p?.profile?.nickname ?? '?'}</span>
              </div>
              {/* Barre coups */}
              <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-1">
                <div className={`h-full rounded-full transition-all duration-500 ${danger ? 'bg-red-500' : 'bg-green-400'}`}
                  style={{ width: `${pct12}%` }} />
              </div>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold ${danger ? 'text-red-400' : 'text-slate-400'}`}>{coups}/12 coups</span>
                {ans && !revealed && <span className="text-yellow-400 text-xs">✓</span>}
                {revealed && ans && (
                  <span className={ans.is_correct ? 'text-green-400 text-xs font-bold' : 'text-red-400 text-xs font-bold'}>
                    {ans.is_correct ? '+0 ✓' : '−2 ✗'}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <QuestionCard text={q.q} theme={q.theme} />

      <ChoicesGrid choices={q.choices} answer={q.answer} revealed={revealed}
        selected={isActive ? (myAnswer?.answer_idx ?? selected) : null}
        onPick={isActive ? pick : () => {}}
        disableAll={!isActive}
        accent="border-red-500 bg-red-500/15 text-red-300" />

      {!isActive && <SpectatorBanner />}
    </div>
  )
}

// ─── Coup de Maître (solo) ────────────────────────────────────
function CoupDeMaitrePhase({ pd, participants, answers, myAnswers, isHost, submitAnswer, hostAdvance, myProfileId }) {
  const questions   = pd.questions ?? []
  const q_idx       = pd.q_idx ?? 0
  const q           = questions[q_idx]
  const personality = pd.personality
  const maitre_id   = pd.maitre_id
  const isMaitre    = myProfileId === maitre_id
  const { secs, pct, expired } = useTimer(pd.q_start_at, DURATIONS.coup_de_maitre)
  const [selected, setSelected] = useState(null)
  const [revealed, setRevealed] = useState(false)
  const advRef      = useRef(false)
  const urgentFired = useRef(false)
  const revealFired = useRef(false)
  const startedAt   = pd.q_start_at ? new Date(pd.q_start_at).getTime() : Date.now()
  const { trigger } = useJLR()

  const { answer: awardXp } = useGame()
  const myAnswer   = myAnswers.find(a => a.phase === 'coup_de_maitre' && a.q_idx === q_idx)
  const maitreAns  = answers.find(a => a.phase === 'coup_de_maitre' && a.q_idx === q_idx && a.profile_id === maitre_id)
  const correctCount = pd.correct_count ?? 0
  const GAINS      = [500, 1000, 1500, 2000, 5000]

  const maitrePart = participants.find(p => p.profile_id === maitre_id)

  useEffect(() => {
    setSelected(null); setRevealed(false)
    advRef.current = false; urgentFired.current = false; revealFired.current = false
    trigger('thinking', 'coup_de_maitre', 4000)
  }, [q_idx, trigger])

  useEffect(() => { if (expired && !revealed) setRevealed(true) }, [expired, revealed])

  useEffect(() => {
    if (secs <= 5 && secs > 0 && !revealed && !urgentFired.current) {
      urgentFired.current = true; trigger('urgent', 'urgent', 3000)
    }
  }, [secs, revealed, trigger])

  useEffect(() => {
    if (!isHost || !revealed || advRef.current) return
    if (!isMaitre && !maitreAns && !expired) return
    const t = setTimeout(() => { if (!advRef.current) { advRef.current = true; hostAdvance() } }, maitreAns ? 3000 : 4000)
    return () => clearTimeout(t)
  }, [revealed, isHost, maitreAns, isMaitre, expired, hostAdvance])

  useEffect(() => {
    if (!revealed || revealFired.current) return
    revealFired.current = true
    if (maitreAns?.is_correct) trigger('excited', 'correct', 5000)
    else if (maitreAns) trigger('sad', 'wrong', 5000)
  }, [revealed, maitreAns, trigger])

  async function pick(idx) {
    if (!isMaitre || myAnswer || revealed || selected !== null || !q) return
    setSelected(idx)
    const isCorrect = idx === q.answer
    awardXp(q.theme ?? 'multi', q.difficulty ?? 1, isCorrect)
    await submitAnswer({ phase: 'coup_de_maitre', q_idx, answer_idx: idx, is_correct: isCorrect, time_ms: Date.now() - startedAt })
  }

  if (!q || !personality) return <Centered><Spinner /></Centered>

  const revealedClues = personality.clues?.slice(0, correctCount + (revealed && maitreAns?.is_correct ? 1 : 0)) ?? []

  return (
    <div className="space-y-5 pt-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏆</span>
            <span className="font-display text-2xl tracking-wider">Coup de Maître</span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Q{q_idx + 1}/5 — joue {maitrePart?.profile?.nickname ?? '?'}</p>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-500">En jeu</div>
          <div className="font-display text-2xl text-yellow-400">{(GAINS[q_idx] ?? 0).toLocaleString('fr-FR')} €</div>
          <div className="text-xs text-slate-600">{secs}s</div>
        </div>
      </div>

      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full bg-yellow-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>

      {/* Cagnotte accumulée */}
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 flex items-center justify-between">
        <span className="text-xs text-yellow-400 font-semibold uppercase tracking-wider">Cagnotte actuelle</span>
        <span className="font-display text-2xl text-yellow-400">{(pd.score ?? 0).toLocaleString('fr-FR')} €</span>
      </div>

      {/* Étoile (indices révélés) */}
      <div className="bg-cyan-950/40 border border-cyan-500/20 rounded-2xl p-5">
        <p className="text-xs text-cyan-500 uppercase tracking-widest font-semibold mb-3">⭐ Étoile Mystérieuse — Qui suis-je ?</p>
        <div className="space-y-3">
          {personality.clues?.map((clue, i) => (
            <div key={i} className={`flex gap-3 items-start ${i < revealedClues.length ? '' : 'opacity-0'}`}>
              <span className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
                ${i === revealedClues.length - 1 ? 'bg-cyan-500 text-white animate-pop' : 'bg-white/10 text-slate-500'}`}>
                {i + 1}
              </span>
              <p className={`text-sm leading-snug ${i === revealedClues.length - 1 ? 'text-white font-medium' : 'text-slate-400'}`}>
                {i < revealedClues.length ? clue : '—'}
              </p>
            </div>
          ))}
        </div>
        {revealedClues.length === 0 && (
          <p className="text-xs text-slate-600 italic mt-1">Les indices se dévoilent après chaque bonne réponse…</p>
        )}
      </div>

      {/* Question + réponses */}
      <QuestionCard text={q.q} theme={q.theme} />

      {isMaitre ? (
        <ChoicesGrid choices={q.choices} answer={q.answer} revealed={revealed}
          selected={myAnswer?.answer_idx ?? selected} onPick={pick} accent="border-yellow-500 bg-yellow-500/15 text-yellow-300" />
      ) : (
        <div className="text-center py-4 text-slate-500 text-sm bg-white/5 rounded-xl">
          🍿 {maitrePart?.profile?.nickname ?? '?'} joue le Coup de Maître…
          {maitreAns && <span className="ml-2 text-yellow-400">En cours de correction…</span>}
        </div>
      )}

      {revealed && maitreAns?.is_correct && (
        <GainBadge gain={GAINS[q_idx] ?? 0} />
      )}
      {revealed && maitreAns && !maitreAns.is_correct && (
        <div className="text-center text-slate-500 text-sm">Pas de gain sur cette question</div>
      )}
    </div>
  )
}

// ─── Étoile Mystérieuse (solo) ────────────────────────────────
function EtoileMysterieusePhase({ pd, participants, answers, myAnswers, isHost, submitAnswer, hostAdvance, myProfileId }) {
  const personality  = pd.personality
  const maitre_id    = pd.maitre_id
  const isMaitre     = myProfileId === maitre_id
  const { secs, pct, expired } = useTimer(pd.q_start_at, DURATIONS.etoile_mysterieuse)
  const [selected, setSelected] = useState(null)
  const [revealed, setRevealed] = useState(false)
  const advRef      = useRef(false)
  const urgentFired = useRef(false)
  const revealFired = useRef(false)
  const startedAt   = pd.q_start_at ? new Date(pd.q_start_at).getTime() : Date.now()
  const { trigger } = useJLR()

  const { answer: awardXp } = useGame()
  const myAnswer  = myAnswers.find(a => a.phase === 'etoile_mysterieuse')
  const maitreAns = answers.find(a => a.phase === 'etoile_mysterieuse' && a.profile_id === maitre_id)
  const maitrePart = participants.find(p => p.profile_id === maitre_id)

  useEffect(() => {
    setSelected(null); setRevealed(false); advRef.current = false
    revealFired.current = false; urgentFired.current = false
    trigger('idle', 'etoile_mysterieuse', 6000)
  }, [trigger])

  useEffect(() => { if (expired && !revealed) setRevealed(true) }, [expired, revealed])

  useEffect(() => {
    if (secs <= 8 && secs > 0 && !revealed && !urgentFired.current) {
      urgentFired.current = true; trigger('urgent', 'urgent', 3500)
    }
  }, [secs, revealed, trigger])

  useEffect(() => {
    if (!isHost || !revealed || advRef.current) return
    const t = setTimeout(() => { if (!advRef.current) { advRef.current = true; hostAdvance() } }, 5000)
    return () => clearTimeout(t)
  }, [revealed, isHost, hostAdvance])

  useEffect(() => {
    if (!revealed || revealFired.current) return
    revealFired.current = true
    if (maitreAns?.is_correct) trigger('celebrate', 'etoile_win', 0)
    else trigger('sad', 'wrong', 5000)
  }, [revealed, maitreAns, trigger])

  // Réponse du maitre → révèle
  useEffect(() => {
    if (!maitreAns || revealed) return
    const t = setTimeout(() => setRevealed(true), 1500)
    return () => clearTimeout(t)
  }, [maitreAns, revealed])

  async function pick(idx) {
    if (!isMaitre || myAnswer || revealed || selected !== null || !personality) return
    setSelected(idx)
    const isCorrect = idx === personality.answer
    awardXp(personality.theme ?? 'multi', personality.difficulty ?? 3, isCorrect)
    await submitAnswer({ phase: 'etoile_mysterieuse', q_idx: 0, answer_idx: idx, is_correct: isCorrect, time_ms: Date.now() - startedAt })
  }

  if (!personality) return <Centered><Spinner /></Centered>

  return (
    <div className="space-y-5 pt-4">
      {/* Header dramatique */}
      <div className="text-center space-y-1 pt-2">
        <div className="text-5xl animate-bounce">⭐</div>
        <p className="font-display text-3xl tracking-widest text-cyan-400">Étoile Mystérieuse</p>
        <p className="text-xs text-yellow-400 font-bold">10 000 € en jeu !</p>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-500">{secs}s</span>
        <span className="text-slate-400 text-xs">Jouée par <strong>{maitrePart?.profile?.nickname ?? '?'}</strong></span>
      </div>
      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full bg-cyan-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>

      {/* Carte célébrité avec tous les indices */}
      <div className="bg-cyan-950/50 border border-cyan-500/30 rounded-2xl p-6">
        <p className="text-xs text-cyan-500 font-semibold uppercase tracking-widest mb-4">Qui suis-je ? Tous les indices :</p>
        <div className="space-y-3">
          {personality.clues?.map((clue, i) => (
            <div key={i} className="flex gap-3 items-start animate-pop" style={{ animationDelay: `${i * 0.1}s` }}>
              <span className="shrink-0 w-7 h-7 rounded-full bg-cyan-500/30 text-cyan-300 flex items-center justify-center text-xs font-bold">{i + 1}</span>
              <p className="text-sm text-cyan-100 leading-snug">{clue}</p>
            </div>
          ))}
        </div>

        {revealed && (
          <div className={`mt-5 text-center animate-pop p-4 rounded-xl ${maitreAns?.is_correct ? 'bg-green-500/20 border border-green-500/40' : 'bg-red-500/10 border border-red-500/30'}`}>
            <p className="font-display text-3xl tracking-wide text-white">{personality.choices?.[personality.answer]}</p>
            {maitreAns?.is_correct && <p className="text-green-400 font-bold mt-2">+10 000 € 🎉</p>}
          </div>
        )}
      </div>

      {isMaitre ? (
        <ChoicesGrid choices={personality.choices} answer={personality.answer} revealed={revealed}
          selected={myAnswer?.answer_idx ?? selected} onPick={pick}
          accent="border-cyan-500 bg-cyan-500/15 text-cyan-300" />
      ) : (
        <div className="text-center py-4 text-slate-500 text-sm bg-white/5 rounded-xl">
          🌟 {maitrePart?.profile?.nickname ?? '?'} découvre l'Étoile…
        </div>
      )}
    </div>
  )
}

// ─── Finished ─────────────────────────────────────────────────
function FinishedPhase({ pd, participants, answers }) {
  const [show, setShow] = useState(false)
  const { trigger } = useJLR()

  useEffect(() => {
    const t1 = setTimeout(() => setShow(true), 400)
    const t2 = setTimeout(() => trigger('celebrate', 'finished', 0), 1000)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [trigger])

  const maitre_id    = pd.maitre_id
  const maitrePart   = participants.find(p => p.profile_id === maitre_id)
  const finalScore   = pd.final_score ?? pd.score ?? 0
  const etoileWon    = pd.etoile_correct === true
  const eliminated   = pd.eliminated ?? []

  // Ordre d'élimination (dernier éliminé = 2e, anté-dernier = 3e, etc.)
  const rankings = [
    ...[...eliminated].reverse().map((pid, i) => ({ pid, rank: i + 2 })),
    { pid: maitre_id, rank: 1 },
  ].sort((a, b) => a.rank - b.rank)

  const medals = ['🥇', '🥈', '🥉', '4️⃣']

  return (
    <div className="min-h-screen flex flex-col items-center justify-center py-10 px-4">
      <div className={`w-full max-w-md space-y-6 transition-all duration-700 ${show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>

        <div className="text-center space-y-2">
          <div className="text-7xl animate-bounce">🏆</div>
          <h1 className="font-display text-5xl text-yellow-400 tracking-wider">Maître de Midi !</h1>
          {etoileWon && (
            <p className="text-cyan-400 font-bold text-sm animate-pop">⭐ L'Étoile Mystérieuse trouvée !</p>
          )}
        </div>

        {maitrePart && (
          <div className="bg-yellow-500/10 border-2 border-yellow-500/40 rounded-2xl p-6 text-center space-y-2">
            <div className="text-6xl">{maitrePart.profile?.avatar ?? '🎭'}</div>
            <div className="font-display text-3xl text-yellow-400 tracking-wider">{maitrePart.profile?.nickname ?? 'Joueur'}</div>
            <div className="font-black text-4xl text-white">{finalScore.toLocaleString('fr-FR')} €</div>
            <div className="text-xs text-yellow-500 uppercase tracking-widest font-bold">Maître de Midi</div>
          </div>
        )}

        {/* Classement des éliminés */}
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          {rankings.map(({ pid, rank }) => {
            const p = participants.find(x => x.profile_id === pid)
            return (
              <div key={pid} className={`flex items-center gap-4 px-5 py-3 ${rank < rankings.length ? 'border-b border-white/5' : ''}`}>
                <span className="text-xl w-7 text-center">{medals[rank - 1] ?? `${rank}`}</span>
                <span className="text-2xl">{p?.profile?.avatar ?? '🎭'}</span>
                <span className="flex-1 font-semibold truncate">{p?.profile?.nickname ?? '?'}</span>
                {rank === 1 && <span className="text-yellow-400 font-black text-sm">{finalScore.toLocaleString('fr-FR')} €</span>}
                {rank > 1 && <span className="text-slate-500 text-xs">Éliminé</span>}
              </div>
            )
          })}
        </div>

        <Link to="/tv" className="block w-full py-4 text-center rounded-2xl bg-yellow-500 text-black font-display text-xl tracking-wider hover:bg-yellow-400 transition">
          Nouvelle partie
        </Link>
        <Link to="/" className="block w-full py-3 text-center rounded-2xl bg-white/5 border border-white/10 text-slate-400 hover:text-white font-semibold transition text-sm">
          Retour à l'accueil
        </Link>
      </div>
    </div>
  )
}

// ─── Composants partagés ──────────────────────────────────────

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
        <span className={`font-display text-3xl tabular-nums ${urgent ? 'text-red-400 animate-pulse' : 'text-white'}`}>{secs}s</span>
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
          <button key={idx} className={cls} onClick={() => { if (!locked) onPick(idx) }}>
            <span className="text-xs opacity-50 mr-2">{['A', 'B', 'C', 'D'][idx]}</span>
            {choice}
            {revealed && isCorrect && <span className="ml-2 text-green-400">✓</span>}
          </button>
        )
      })}
    </div>
  )
}

function GainBadge({ gain, label }) {
  return (
    <div className={`text-center text-2xl font-display tracking-wider animate-pop ${gain > 0 ? 'text-yellow-400' : 'text-slate-600'}`}>
      {label ?? (gain > 0 ? `+${gain.toLocaleString('fr-FR')} €` : 'Pas de gain')}
    </div>
  )
}

// Barre de joueurs avec indicateur de rouge (pour les phases battle)
function EnvoiPlayerBar({ participants, activePlayers, qAnswers, revealed, answer, wrongCounts, eliminated, duelPlayers }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3">
      <p className="text-xs text-slate-600 uppercase tracking-widest mb-3">Joueurs</p>
      <div className="grid grid-cols-4 gap-2">
        {participants.map(p => {
          const pid         = p.profile_id
          const isEliminated = eliminated.includes(pid)
          const isActive    = activePlayers.includes(pid)
          const wrongs      = wrongCounts[pid] ?? 0
          const isRouge     = wrongs >= 2
          const isDuelP     = duelPlayers?.includes(pid)
          const ans         = qAnswers.find(a => a.profile_id === pid)

          return (
            <div key={p.id} className={`flex flex-col items-center gap-1 text-center ${isEliminated ? 'opacity-25' : ''}`}>
              <span className={`text-2xl ${isDuelP ? 'ring-2 ring-orange-400 rounded-full' : ''}`}>
                {p.profile?.avatar ?? '🎭'}
              </span>
              <span className="text-xs text-slate-500 truncate w-full text-center leading-none">{p.profile?.nickname ?? '?'}</span>

              {/* Dots de rouge (0-2 mauvaises réponses) */}
              {isActive && !isEliminated && (
                <div className="flex gap-0.5 mt-0.5">
                  {[0, 1].map(i => (
                    <div key={i} className={`w-2 h-2 rounded-full ${i < wrongs ? (isRouge ? 'bg-red-500' : 'bg-orange-400') : 'bg-white/20'}`} />
                  ))}
                </div>
              )}

              {/* Réponse */}
              {ans && !isEliminated && (
                <span className="text-xs">
                  {revealed
                    ? (ans.is_correct ? <span className="text-green-400 font-bold">✓</span> : <span className="text-red-400 font-bold">✗</span>)
                    : <span className="text-yellow-400">•</span>
                  }
                </span>
              )}
              {!ans && isActive && !isEliminated && <span className="text-slate-700 text-xs">…</span>}
              {isEliminated && <span className="text-red-500 text-xs">Éliminé</span>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SpectatorBanner() {
  return (
    <div className="text-center py-4 text-slate-500 text-sm bg-white/5 rounded-xl border border-white/10">
      👁️ Vous observez la partie — bonne chance aux joueurs !
    </div>
  )
}

function Centered({ children }) {
  return <div className="flex flex-col items-center justify-center min-h-screen gap-3 px-4">{children}</div>
}
function Spinner() {
  return <div className="w-10 h-10 rounded-full border-2 border-yellow-500 border-t-transparent animate-spin" />
}
function BackBtn() {
  return <Link to="/tv" className="px-6 py-3 bg-yellow-500 text-black font-bold rounded-xl hover:bg-yellow-400 transition">Retour</Link>
}
