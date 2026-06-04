import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useGame, levelFromXP, gradeFromLevel } from '../context/GameContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useRaceRoom } from '../hooks/useRaceRoom.js'
import { supabase } from '../lib/supabase.js'

export default function Home() {
  const { state } = useGame()
  const { user, profile } = useAuth()
  const level = levelFromXP(state.totalXP)
  const grade = gradeFromLevel(level)
  const accuracy = state.totalAnswered
    ? Math.round((state.totalCorrect / state.totalAnswered) * 100)
    : 0

  return (
    <div className="space-y-6">

      {/* ── Haut : profil du joueur ── */}
      <section className="card p-5 md:p-6 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-midi-accent/10 blur-3xl pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1 min-w-0">
            {user && profile ? (
              <div className="flex items-center gap-3">
                <span className="text-4xl shrink-0">{profile.avatar}</span>
                <div className="min-w-0">
                  <div className="text-slate-400 text-xs uppercase tracking-widest">Bienvenue,</div>
                  <div className="font-display text-2xl text-white leading-tight truncate">{profile.nickname}</div>
                  <div className={`flex items-center gap-1.5 text-sm font-semibold mt-0.5 ${grade.color}`}>
                    <span>{grade.emoji}</span>
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
          <StatCard label="XP total" value={state.totalXP.toLocaleString('fr-FR')} />
          <StatCard label="Réussite" value={`${accuracy} %`} />
          <StatCard label="Série 🔥" value={`${state.streak.current} j`} />
        </div>
      </section>

      {/* ── Bas : jeux à gauche · podium à droite ── */}
      <div className="grid lg:grid-cols-2 gap-6 items-start">

        {/* Jeux (colonne) */}
        <section>
          <SectionTitle>🎮 Jeux</SectionTitle>
          <div className="space-y-4">
            <GameCard
              to="/multi" emoji="📺" title="Jeu TV"
              desc="À 4 joueurs : reproduction de la mécanique télé en 4 phases."
              tone="from-amber-500 to-orange-600"
            />
            <GameCard
              to="/multi" emoji="⚔️" title="Frappe Express"
              desc="2 joueurs : premier à 5 bonnes réponses gagne le duel."
              tone="from-blue-500 to-cyan-600"
            />

            {/* Course aux Points — divisée en deux */}
            <div className="card p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 grid place-items-center text-2xl shadow-lg shrink-0">
                  🏁
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-base">Course aux Points</div>
                  <div className="text-sm text-slate-400 leading-relaxed">2 à 15 joueurs · le plus rapide pour scorer un max.</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <PublicSalonButton user={user}
                  className="w-full py-2.5 rounded-xl font-semibold text-sm bg-green-500 hover:bg-green-400 text-black transition disabled:opacity-60"
                  label="🌍 Salon public" />
                <Link to="/multi"
                  className="w-full py-2.5 rounded-xl font-semibold text-sm text-center bg-white/5 border border-white/10 text-slate-200 hover:bg-white/10 transition">
                  🔒 Partie privée
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Podium (top 3 du site) */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <SectionTitle className="mb-0">🏆 Podium</SectionTitle>
            <Link to="/classement" className="text-sm text-midi-accent hover:underline">Voir tout →</Link>
          </div>
          <Podium currentUserId={user?.id} />
        </section>
      </div>

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

// ─── Carte de jeu (colonne de gauche) ─────────────────────────
function GameCard({ to, emoji, title, desc, tone }) {
  return (
    <Link to={to} className="card p-5 group hover:-translate-y-1 transition-all duration-200 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${tone} grid place-items-center text-2xl shadow-lg shrink-0`}>
        {emoji}
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-base">{title}</div>
        <div className="text-sm text-slate-400 mt-0.5 leading-relaxed">{desc}</div>
      </div>
      <div className="text-sm text-midi-accent group-hover:translate-x-1 transition-transform shrink-0">→</div>
    </Link>
  )
}

// ─── Bouton « Salon public » (matchmaking sans code) ──────────
function PublicSalonButton({ user, className, label }) {
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
      className={className ?? 'btn bg-green-500 hover:bg-green-400 text-black disabled:opacity-60'}>
      {loading ? 'Recherche…' : (label ?? '🌍 Salon public')}
    </button>
  )
}

// ─── Podium : top 3 joueurs du site (ratio victoires/parties) ──
function Podium({ currentUserId }) {
  const [top, setTop]         = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: profiles } = await supabase
        .from('profiles').select('id, nickname, avatar')
      if (!profiles) { setLoading(false); return }

      const [{ data: tvRooms }, { data: tvParts }, { data: duelRooms }] = await Promise.all([
        supabase.from('tv_rooms').select('id, phase_data').eq('phase', 'finished'),
        supabase.from('tv_participants').select('room_id, profile_id'),
        supabase.from('duel_rooms').select('host_id, guest_id, phase_data').eq('phase', 'finished'),
      ])

      const stats = {}
      const ensure = id => { if (!stats[id]) stats[id] = { wins: 0, losses: 0 } }

      const tvRoomMap = Object.fromEntries((tvRooms ?? []).map(r => [r.id, r]))
      for (const p of (tvParts ?? [])) {
        const room = tvRoomMap[p.room_id]
        if (!room) continue
        ensure(p.profile_id)
        if (room.phase_data?.maitre_id === p.profile_id) stats[p.profile_id].wins++
        else stats[p.profile_id].losses++
      }
      for (const r of (duelRooms ?? [])) {
        const { host_id, guest_id, phase_data } = r
        if (!host_id || !guest_id) continue
        for (const pid of [host_id, guest_id]) {
          ensure(pid)
          if (phase_data?.winner_id === pid) stats[pid].wins++
          else if (phase_data?.winner_id) stats[pid].losses++
        }
      }

      const ranked = profiles
        .map(p => {
          const s = stats[p.id] ?? { wins: 0, losses: 0 }
          const total = s.wins + s.losses
          return { ...p, wins: s.wins, total, ratio: total > 0 ? s.wins / total : -1 }
        })
        .filter(p => p.total > 0)
        .sort((a, b) => (b.ratio - a.ratio) || (b.wins - a.wins) || (b.total - a.total))
        .slice(0, 3)

      setTop(ranked)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="card flex justify-center py-16">
        <div className="w-6 h-6 rounded-full border-2 border-midi-accent border-t-transparent animate-spin" />
      </div>
    )
  }

  if (top.length === 0) {
    return (
      <div className="card p-8 text-center text-slate-500">
        <div className="text-4xl mb-3">🏜️</div>
        <p className="text-sm">Aucune partie multijoueur terminée pour l'instant.</p>
        <Link to="/multi" className="text-midi-accent hover:underline text-sm">Lance une partie →</Link>
      </div>
    )
  }

  // Ordre d'affichage : 2e · 1er · 3e
  const slots = [top[1], top[0], top[2]]
  const meta = {
    0: { medal: '🥇', h: 'h-28', ring: 'ring-yellow-400/60', grad: 'from-yellow-500/25 to-yellow-500/5',  txt: 'text-yellow-400' },
    1: { medal: '🥈', h: 'h-20', ring: 'ring-slate-300/50',  grad: 'from-slate-400/20 to-slate-400/5',    txt: 'text-slate-300' },
    2: { medal: '🥉', h: 'h-16', ring: 'ring-amber-700/50',  grad: 'from-amber-700/20 to-amber-700/5',    txt: 'text-amber-600' },
  }
  const rankBySlot = [1, 0, 2] // index dans meta pour chaque slot affiché

  return (
    <div className="card p-5">
      <div className="grid grid-cols-3 gap-3 items-end">
        {slots.map((p, i) => {
          const rank = rankBySlot[i]
          const m = meta[rank]
          if (!p) {
            return (
              <div key={i} className="flex flex-col items-center gap-2 opacity-30">
                <span className="text-3xl">👤</span>
                <div className={`w-full ${m.h} rounded-t-xl bg-white/5 border border-white/10`} />
              </div>
            )
          }
          const isMe = p.id === currentUserId
          return (
            <div key={p.id} className="flex flex-col items-center gap-2 text-center">
              <div className="text-2xl">{m.medal}</div>
              <div className={`w-14 h-14 rounded-2xl grid place-items-center text-3xl bg-white/5 ring-2 ${m.ring}`}>
                {p.avatar ?? '🎭'}
              </div>
              <div className={`text-sm font-semibold truncate max-w-full ${isMe ? 'text-midi-accent' : 'text-white'}`}>
                {p.nickname}{isMe && <span className="text-xs opacity-70"> (moi)</span>}
              </div>
              <div className={`w-full ${m.h} rounded-t-xl bg-gradient-to-b ${m.grad} border border-white/10 flex flex-col items-center justify-center`}>
                <div className={`font-display text-xl ${m.txt}`}>{Math.round(p.ratio * 100)}%</div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider">{p.wins}V · {p.total}j</div>
              </div>
            </div>
          )
        })}
      </div>
      <p className="text-xs text-slate-600 text-center mt-3">Classé par ratio de victoires en multijoueur</p>
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
