import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useGame, levelFromXP, gradeFromLevel } from '../context/GameContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useRaceRoom } from '../hooks/useRaceRoom.js'
import { supabase } from '../lib/supabase.js'
import { THEME_LIST } from '../data/themes.js'
import { useAllQuestions } from '../hooks/useQuestions.js'
import { findEcole } from '../data/ecoles.js'

const games = [
  { to: '/qcm',            title: 'QCM Culture G',      desc: 'Sessions chronométrées par thème.',     emoji: '❓', tone: 'from-amber-500 to-orange-600' },
  { to: '/duel',           title: 'Duel rapide',         desc: '60 s pour enchaîner un max de bonnes.', emoji: '⚔️', tone: 'from-rose-500 to-red-600' },
  { to: '/coup-de-maitre', title: 'Coup de Maître',      desc: 'Devine la personnalité avec des indices.', emoji: '🎯', tone: 'from-indigo-500 to-violet-600' },
  { to: '/mot',            title: 'Mot Mystérieux',      desc: 'Trouve le mot à partir de sa définition.', emoji: '🔤', tone: 'from-emerald-500 to-teal-600' },
  { to: '/etoile',         title: 'Étoile Mystérieuse',  desc: 'Une silhouette se révèle au fil des indices.', emoji: '⭐', tone: 'from-yellow-400 to-amber-600' },
  { to: '/revision',       title: 'Mode Révision',       desc: 'Flashcards et répétition espacée.',     emoji: '🃏', tone: 'from-sky-500 to-blue-600' },
]

export default function Home() {
  const { state } = useGame()
  const { user, profile } = useAuth()
  const QUESTIONS = useAllQuestions()
  const level = levelFromXP(state.totalXP)
  const grade = gradeFromLevel(level)
  // Phrase aléatoire tirée une seule fois au montage (change à chaque connexion)
  const gradeMessage = useMemo(
    () => grade.messages[Math.floor(Math.random() * grade.messages.length)],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )
  const accuracy = state.totalAnswered
    ? Math.round((state.totalCorrect / state.totalAnswered) * 100)
    : 0

  return (
    <div className="space-y-10">

      {/* Hero */}
      <section className="card p-8 md:p-10 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-midi-accent/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-10 w-72 h-72 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

        <div className="relative">
          {/* Identité + Grade */}
          {user && profile ? (
            <div className="flex items-center gap-3 mb-5">
              <span className="text-4xl">{profile.avatar}</span>
              <div>
                <div className="text-slate-400 text-xs uppercase tracking-widest">Bienvenue,</div>
                <div className="font-display text-2xl text-white leading-tight">{profile.nickname}</div>
                <div className={`flex items-center gap-1.5 text-sm font-semibold mt-0.5 ${grade.color}`}>
                  <span>{grade.emoji}</span>
                  <span>{grade.name}</span>
                  <span className="text-slate-500 font-normal text-xs">· Niv. {level}</span>
                </div>
              </div>
            </div>
          ) : (
            <span className="chip mb-4 inline-flex items-center gap-2">
              <img src="/logo.png" className="h-5 w-5 rounded-md object-cover" alt="" />
              Les Douze Coups de Minuit
            </span>
          )}

          <h1 className="heading text-4xl md:text-5xl mb-3">
            {user && profile
              ? <>{grade.emoji} <span className="text-midi-accent">{grade.name}</span></>
              : <>Deviens un <span className="text-midi-accent">Maître de Minuit</span></>
            }
          </h1>
          <p className="text-slate-400 max-w-2xl text-sm md:text-base">
            {user && profile
              ? `${gradeMessage} · ${QUESTIONS.length} questions, dix thèmes t'attendent.`
              : `Six mini-jeux, dix thèmes, ${QUESTIONS.length} questions. Suis ta progression, débloque des badges et bats tes records.`
            }
          </p>

          {/* Stats */}
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Niveau" value={level} accent />
            <StatCard label="XP total" value={state.totalXP.toLocaleString('fr-FR')} />
            <StatCard label="Réussite" value={`${accuracy} %`} />
            <StatCard label="Série 🔥" value={`${state.streak.current} j`} />
          </div>

          {/* CTA */}
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/qcm" className="btn btn-primary">▶ Commencer un QCM</Link>
            <PublicSalonButton user={user} />
            <Link to="/duel" className="btn btn-secondary">⚔️ Lancer un duel</Link>
            {user
              ? <Link to="/profil" className="btn btn-ghost">Mon profil</Link>
              : <Link to="/auth" className="btn btn-ghost">Créer un compte</Link>
            }
          </div>
        </div>
      </section>

      {/* Mini-jeux */}
      <section>
        <SectionTitle>Mini-jeux</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {games.map(g => (
            <Link key={g.to} to={g.to}
              className="card p-5 group hover:-translate-y-1 transition-all duration-200">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${g.tone} grid place-items-center text-2xl mb-4 shadow-lg`}>
                {g.emoji}
              </div>
              <div className="font-semibold text-base">{g.title}</div>
              <div className="text-sm text-slate-400 mt-1 leading-relaxed">{g.desc}</div>
              <div className="mt-4 text-sm text-midi-accent group-hover:translate-x-1 transition-transform">
                Jouer →
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Thèmes */}
      <section>
        <SectionTitle>Thèmes</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {THEME_LIST.map(t => {
            const s = state.byTheme[t.id] || { answered: 0, correct: 0 }
            const acc = s.answered ? Math.round((s.correct / s.answered) * 100) : null
            return (
              <Link key={t.id} to={`/qcm?theme=${t.id}`}
                className="card p-4 hover:bg-white/5 transition group">
                <div className="text-3xl mb-2">{t.emoji}</div>
                <div className="font-semibold text-sm">{t.label}</div>
                {acc !== null
                  ? <div className="text-xs text-midi-accent mt-1">{acc} % réussite</div>
                  : <div className="text-xs text-slate-500 mt-1">Non joué</div>
                }
              </Link>
            )
          })}
        </div>
      </section>

      {/* Classement */}
      <LeaderboardWidget currentUserId={user?.id} />

      {/* Invite à créer un compte si non connecté */}
      {!user && (
        <section className="card p-6 flex flex-col sm:flex-row items-center gap-4 border border-midi-accent/20 bg-midi-accent/5">
          <div className="text-4xl">🔐</div>
          <div className="flex-1 text-center sm:text-left">
            <div className="font-semibold text-white">Sauvegarde ta progression</div>
            <div className="text-sm text-slate-400 mt-1">Crée un compte gratuit pour ne pas perdre tes stats, tes badges et tes amis.</div>
          </div>
          <Link to="/auth" className="btn btn-primary shrink-0">Créer un compte</Link>
        </section>
      )}
    </div>
  )
}

function PublicSalonButton({ user }) {
  const navigate = useNavigate()
  const { joinPublicRoom } = useRaceRoom(null)
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    if (!user) { navigate('/auth'); return }
    setLoading(true)
    const { code, error } = await joinPublicRoom()
    if (code) navigate(`/race/${code}`)
    else { setLoading(false); alert(error ?? 'Impossible de rejoindre le salon public.') }
  }

  return (
    <button onClick={handleClick} disabled={loading}
      className="btn bg-green-500 hover:bg-green-400 text-black disabled:opacity-60">
      {loading ? 'Recherche…' : '🌍 Salon public'}
    </button>
  )
}

function LeaderboardWidget({ currentUserId }) {
  const [rows, setRows]       = useState([])
  const [loading, setLoading] = useState(true)
  const medals = ['🥇', '🥈', '🥉']

  useEffect(() => {
    async function load() {
      const [{ data: profiles }, { data: scores }] = await Promise.all([
        supabase.from('profiles').select('id, nickname, avatar, city, country, is_icam, school'),
        supabase.from('tv_participants').select('profile_id, score'),
      ])
      const scoreMap = {}
      for (const s of (scores ?? [])) {
        scoreMap[s.profile_id] = (scoreMap[s.profile_id] ?? 0) + (s.score ?? 0)
      }
      const ranked = (profiles ?? [])
        .map(p => ({ ...p, total_score: scoreMap[p.id] ?? 0 }))
        .sort((a, b) => b.total_score - a.total_score)
        .slice(0, 8)
      setRows(ranked)
      setLoading(false)
    }
    load()
  }, [])

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <SectionTitle>🏆 Classement</SectionTitle>
        <Link to="/classement" className="text-sm text-midi-accent hover:underline">
          Voir tout →
        </Link>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 rounded-full border-2 border-midi-accent border-t-transparent animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <p className="text-center text-slate-500 py-10 text-sm">
            Aucune partie TV jouée pour l'instant.<br />
            <Link to="/multi" className="text-midi-accent hover:underline">Lance une partie →</Link>
          </p>
        ) : (
          <div>
            {rows.map((row, i) => {
              const isMe = row.id === currentUserId
              return (
                <div key={row.id}
                  className={`flex items-center gap-3 px-5 py-3 border-b border-white/5 last:border-0
                    ${isMe ? 'bg-midi-accent/5' : 'hover:bg-white/3 transition-colors'}`}>
                  <span className="w-7 text-center shrink-0">
                    {i < 3
                      ? <span className="text-lg">{medals[i]}</span>
                      : <span className="text-slate-500 text-sm font-mono">{i + 1}</span>}
                  </span>
                  <span className="text-xl shrink-0">{row.avatar ?? '🎭'}</span>
                  <div className="flex-1 min-w-0">
                    <span className={`font-semibold truncate block ${isMe ? 'text-midi-accent' : 'text-white'}`}>
                      {row.nickname}{isMe && <span className="ml-1 text-xs opacity-60">(moi)</span>}
                    </span>
                    {(row.city || row.country) && (
                      <span className="text-xs text-slate-600">
                        {[row.city, row.country].filter(Boolean).join(', ')}
                      </span>
                    )}
                  </div>
                  {(() => {
                    const schoolKey = row.school || (row.is_icam ? 'icam' : null)
                    const ecole = schoolKey ? findEcole(schoolKey) : null
                    return ecole ? (
                      <span title={ecole.label}
                        className="text-xs bg-midi-accent/20 text-midi-accent px-2 py-0.5 rounded-full font-semibold shrink-0 whitespace-nowrap">
                        {ecole.short}
                      </span>
                    ) : null
                  })()}
                  <span className="font-bold tabular-nums text-midi-accent shrink-0 min-w-[60px] text-right">
                    {row.total_score > 0
                      ? row.total_score.toLocaleString('fr-FR') + ' €'
                      : <span className="text-slate-600 font-normal">—</span>}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}

function SectionTitle({ children }) {
  return (
    <h2 className="heading text-2xl mb-4">{children}</h2>
  )
}

function StatCard({ label, value, accent }) {
  return (
    <div className={`rounded-xl border px-4 py-3 ${accent
      ? 'bg-midi-accent/10 border-midi-accent/30'
      : 'bg-white/5 border-white/10'}`}>
      <div className={`text-xs mb-0.5 ${accent ? 'text-midi-accent' : 'text-slate-400'}`}>{label}</div>
      <div className={`text-2xl font-bold tabular-nums ${accent ? 'text-midi-accent' : 'text-white'}`}>{value}</div>
    </div>
  )
}
