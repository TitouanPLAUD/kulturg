import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useGame, levelFromXP, gradeFromLevel } from '../context/GameContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useRaceRoom } from '../hooks/useRaceRoom.js'
import { useTvRoom } from '../hooks/useTvRoom.js'
import { supabase } from '../lib/supabase.js'
import { findEcole } from '../data/ecoles.js'
import Avatar from '../components/Avatar.jsx'
import ShinyButton from '../components/ShinyButton.jsx'
import SchoolBadge from '../components/SchoolBadge.jsx'

export default function Home() {
  const { state } = useGame()
  const { user, profile } = useAuth()
  const myEcole = profile?.school ? findEcole(profile.school) : null
  // XP de classement (serveur) : identique au classement, n'augmente qu'en
  // partie publique. Pour les invités, on retombe sur la progression locale.
  const rankedXP   = user && profile ? (profile.total_xp ?? 0) : state.totalXP
  const answered   = user && profile ? (profile.total_answered ?? 0) : state.totalAnswered
  const correct    = user && profile ? (profile.total_correct ?? 0) : state.totalCorrect
  const level = levelFromXP(rankedXP)
  const grade = gradeFromLevel(level)
  const accuracy = answered ? Math.round((correct / answered) * 100) : 0

  return (
    <div className="space-y-6">

      {/* ── Haut : profil du joueur ── */}
      <section className="card p-5 md:p-6 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-midi-accent/10 blur-3xl pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1 min-w-0">
            {user && profile ? (
              <div className="flex items-center gap-3">
                <span className="shrink-0"><Avatar value={profile.avatar} size={48} className="text-4xl" /></span>
                <div className="min-w-0">
                  <div className="text-slate-400 text-xs uppercase tracking-widest">Bienvenue,</div>
                  <div className="font-display text-2xl text-white leading-tight truncate">{profile.nickname}</div>
                  <div className={`flex items-center gap-1.5 text-sm font-semibold mt-0.5 ${grade.color}`}>
                    <span className="truncate">{grade.name}</span>
                    <span className="text-slate-500 font-normal text-xs shrink-0">· Niv. {level}</span>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <span className="chip mb-2 inline-flex items-center gap-2">
                  <img src="/logo.png" className="h-5 w-5 rounded-md object-cover" alt="" />
                  Les Douze Coups de Minuit
                </span>
                <h1 className="heading text-3xl md:text-4xl">
                  Deviens un <span className="text-midi-accent">Maître de Minuit</span>
                </h1>
              </>
            )}
          </div>

          <div className="flex flex-wrap gap-2 shrink-0">
            {user
              ? <Link to="/profil" className="btn btn-ghost">Mon profil</Link>
              : <Link to="/auth" className="btn btn-primary">Créer un compte</Link>
            }
          </div>
        </div>

        {/* Stats */}
        <div className="relative mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Niveau" value={level} accent />
          <StatCard label="XP total" value={rankedXP.toLocaleString('fr-FR')} />
          <StatCard label="Réussite" value={`${accuracy} %`} />
          <StatCard label="Série" value={`${state.streak.current} j`} />
        </div>

        {/* Badge d'école (si l'école a un logo) */}
        {user && myEcole?.logo && (
          <div className="relative mt-4 flex justify-center sm:justify-start">
            <SchoolBadge logo={myEcole.logo} label={myEcole.label} />
          </div>
        )}
      </section>

      {/* ── Accueil nouveaux joueurs ── */}
      {(!user || state.totalXP === 0) && (
        <section className="card p-4 sm:p-5 border border-midi-accent/20 bg-midi-accent/5">
          <div className="flex-1 text-sm leading-relaxed">
            <p className="text-white font-semibold mb-1">
              {user ? 'Bienvenue dans l\'arène !' : 'Pas encore de compte ?'}
            </p>
            <p className="text-slate-400">
              {user ? (
                <>
                  Lance un <strong className="text-midi-accent">Salon public</strong> pour jouer instantanément avec d'autres,
                  ou crée une <strong className="text-midi-accent">Partie privée</strong> à partager par code avec tes amis.
                  Tu gagnes des XP à chaque partie et tu débloques des grades !
                </>
              ) : (
                <>
                  Crée un compte en 30s pour sauvegarder ta progression, gagner des XP, débloquer des grades et te mesurer à toute la promo dans le <strong className="text-white">classement</strong>.
                </>
              )}
            </p>
          </div>
        </section>
      )}

      {/* ── Bas : jeux à gauche · podium à droite ── */}
      <div className="grid lg:grid-cols-2 gap-6">

        {/* Jeux (colonne) */}
        <section className="flex flex-col">
          <div className="flex items-center justify-center mb-4" style={{ minHeight: '2.25rem' }}>
            <SectionTitle className="mb-0 uppercase tracking-wide">Jeux</SectionTitle>
          </div>
          <div className="flex-1 grid grid-rows-2 gap-4">
            <SplitGameCard
              user={user} emoji="📺" logo="/logos/jeu-tv.png" title="Jeu TV"
              desc="À 4 joueurs : reproduction de la mécanique télé en 4 phases."
              tone="from-amber-500 to-orange-600"
              useHook={() => useTvRoom(null)} route="tv"
              highlight="#4b8ef8" highlightSubtle="#a7c4ff"
            />
            <SplitGameCard
              user={user} emoji="🏁" logo="/logos/course-points.png" title="Course aux Points"
              desc="2 à 15 joueurs : le plus rapide pour scorer un max."
              tone="from-green-500 to-emerald-600"
              useHook={() => useRaceRoom(null)} route="race"
              highlight="#4ade80" highlightSubtle="#bbf7d0"
            />
          </div>
        </section>

        {/* Podium (top 3 du site) */}
        <section className="flex flex-col">
          <div className="relative flex items-center justify-center mb-4" style={{ minHeight: '2.25rem' }}>
            <SectionTitle className="mb-0 uppercase tracking-wide">Podium</SectionTitle>
            <Link to="/classement" className="absolute right-0 text-sm text-midi-accent hover:underline">Voir tout →</Link>
          </div>
          <div className="flex-1 flex flex-col">
            <Podium currentUserId={user?.id} myXP={state.totalXP} />
          </div>
        </section>
      </div>

      {/* Invite à créer un compte si non connecté */}
      {!user && (
        <section className="card p-6 flex flex-col sm:flex-row items-center gap-4 border border-midi-accent/20 bg-midi-accent/5">
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

// ─── Carte de jeu divisée : salon public · partie privée ──────
function SplitGameCard({ user, emoji, logo, title, desc, tone, useHook, route, highlight, highlightSubtle }) {
  return (
    <div className="card p-5 h-full flex flex-col">
      <div className="flex items-center gap-3 mb-4">
        {logo
          ? <img src={logo} alt={title} className="w-12 h-12 rounded-xl object-cover shadow-lg shrink-0" draggable={false} />
          : <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${tone} grid place-items-center text-2xl shadow-lg shrink-0`}>
              {emoji}
            </div>}
        <div className="min-w-0">
          <div className="font-semibold text-base">{title}</div>
          <div className="text-sm text-slate-400 leading-relaxed">{desc}</div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 mt-auto">
        <PublicSalonButton user={user} useHook={useHook} route={route}
          highlight={highlight} highlightSubtle={highlightSubtle}
          label="Salon public" />
        <Link to="/multi"
          className="w-full py-2.5 rounded-xl font-semibold text-sm text-center grid place-items-center bg-white/5 border border-white/10 text-slate-200 hover:bg-white/10 transition">
          Partie privée
        </Link>
      </div>
    </div>
  )
}

// ─── Bouton « Salon public » (matchmaking sans code) ──────────
function PublicSalonButton({ user, useHook, route, highlight, highlightSubtle, label }) {
  const navigate = useNavigate()
  const { joinPublicRoom } = useHook()
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    if (!user) { navigate('/auth'); return }
    setLoading(true)
    const { code, error } = await joinPublicRoom()
    if (code) navigate(`/${route}/${code}`)
    else { setLoading(false); alert(error ?? 'Impossible de rejoindre le salon public.') }
  }

  return (
    <ShinyButton onClick={handleClick} disabled={loading}
      className="w-full" highlight={highlight} highlightSubtle={highlightSubtle}>
      {loading ? 'Recherche…' : (label ?? 'Salon public')}
    </ShinyButton>
  )
}

// ─── Podium : top 3 joueurs du site (par XP) ──────────────────
function Podium({ currentUserId, myXP = 0 }) {
  const [top, setTop]         = useState([])
  const [loading, setLoading] = useState(true)

  // Re-fetch : au montage, quand mon XP change, quand le tab redevient visible,
  // à 1.5s (filet pour le push DB async), ET en temps réel via Supabase dès
  // qu'un total_xp change en base (pour soi comme pour les autres joueurs).
  useEffect(() => {
    let cancelled = false
    let debounce = null
    async function load() {
      const { data } = await supabase
        .from('profiles')
        .select('id, nickname, avatar, total_xp, school')
        .gt('total_xp', 0)
        .order('total_xp', { ascending: false })
        .limit(3)
      if (cancelled) return
      setTop(data ?? [])
      setLoading(false)
    }
    // Refetch groupé (évite une rafale si plusieurs UPDATE arrivent ensemble)
    function loadDebounced() {
      clearTimeout(debounce)
      debounce = setTimeout(load, 300)
    }

    load()
    const t = setTimeout(load, 1500)

    function onVisible() { if (document.visibilityState === 'visible') load() }
    document.addEventListener('visibilitychange', onVisible)

    // Abonnement temps réel aux changements de profils
    const channel = supabase
      .channel('podium-profiles')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, loadDebounced)
      .subscribe()

    return () => {
      cancelled = true
      clearTimeout(t)
      clearTimeout(debounce)
      document.removeEventListener('visibilitychange', onVisible)
      supabase.removeChannel(channel)
    }
  }, [myXP, currentUserId])

  if (loading) {
    return (
      <div className="card flex justify-center items-center py-16 h-full">
        <div className="w-6 h-6 rounded-full border-2 border-midi-accent border-t-transparent animate-spin" />
      </div>
    )
  }

  if (top.length === 0) {
    return (
      <div className="card p-8 text-center text-slate-500 h-full flex flex-col justify-center">
        <div className="text-4xl mb-3">🏜️</div>
        <p className="text-sm">Aucun joueur classé pour l'instant.</p>
        <Link to="/multi" className="text-midi-accent hover:underline text-sm">Lance une partie →</Link>
      </div>
    )
  }

  // Ordre d'affichage : 2e · 1er · 3e
  const slots = [top[1], top[0], top[2]]
  const meta = {
    0: { medal: '/medals/gold.svg',   ms: 'h-12', h: 'h-28', ring: 'ring-yellow-400/60', grad: 'from-yellow-500/25 to-yellow-500/5',  txt: 'text-yellow-400' },
    1: { medal: '/medals/silver.svg', ms: 'h-10', h: 'h-20', ring: 'ring-slate-300/50',  grad: 'from-slate-400/20 to-slate-400/5',    txt: 'text-slate-300' },
    2: { medal: '/medals/bronze.svg', ms: 'h-9',  h: 'h-16', ring: 'ring-amber-700/50',  grad: 'from-amber-700/20 to-amber-700/5',    txt: 'text-amber-600' },
  }
  const rankBySlot = [1, 0, 2] // index dans meta pour chaque slot affiché

  return (
    <div className="card p-5 h-full flex flex-col">
      <div className="flex-1 grid grid-cols-3 gap-3 items-end">
        {slots.map((p, i) => {
          const rank = rankBySlot[i]
          const m = meta[rank]
          if (!p) {
            return (
              <div key={i} className="flex flex-col items-center gap-2 opacity-30">
                <img src={m.medal} alt="" draggable={false} className={`${m.ms} w-auto grayscale opacity-40`} />
                <div className={`w-full ${m.h} rounded-t-xl bg-white/5 border border-white/10`} />
              </div>
            )
          }
          const isMe = p.id === currentUserId
          const ecole = p.school ? findEcole(p.school) : null
          return (
            <div key={p.id} className="flex flex-col items-center gap-2 text-center">
              <img src={m.medal} alt={`Rang ${rank + 1}`} title={`Rang ${rank + 1}`} draggable={false}
                className={`${m.ms} w-auto drop-shadow-lg`} />
              <div className={`w-14 h-14 rounded-full overflow-hidden grid place-items-center text-3xl bg-white/5 ring-2 ${m.ring}`}>
                <Avatar value={p.avatar} fill className="text-3xl" />
              </div>
              <div className="flex flex-col items-center gap-1 max-w-full">
                <div className={`text-sm font-semibold truncate max-w-full ${isMe ? 'text-midi-accent' : 'text-white'}`}>
                  {p.nickname}{isMe && <span className="text-xs opacity-70"> (moi)</span>}
                </div>
                {ecole && ecole.value !== 'aucune' && (
                  ecole.logo ? (
                    <span className="inline-flex items-center bg-white rounded-md px-1.5 py-0.5 border border-black/5 shadow-sm" title={ecole.label}>
                      <img src={ecole.logo} alt={ecole.label} title={ecole.label} draggable={false} className="h-3.5 w-auto" />
                    </span>
                  ) : (
                    <div className="text-[11px] text-slate-500 truncate max-w-full" title={ecole.label}>
                      🎓 {ecole.short}
                    </div>
                  )
                )}
              </div>
              <div className={`w-full ${m.h} rounded-t-xl bg-gradient-to-b ${m.grad} border border-white/10 flex flex-col items-center justify-center`}>
                <div className={`font-display text-xl ${m.txt}`}>{(p.total_xp ?? 0).toLocaleString('fr-FR')}</div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider">XP · Niv. {levelFromXP(p.total_xp ?? 0)}</div>
              </div>
            </div>
          )
        })}
      </div>
      <p className="text-xs text-slate-600 text-center mt-3">Classé par XP total</p>
    </div>
  )
}

function SectionTitle({ children, className = '' }) {
  return (
    <h2 className={`heading text-2xl mb-4 ${className}`}>{children}</h2>
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
