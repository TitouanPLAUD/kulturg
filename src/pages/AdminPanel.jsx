import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuth, FOUNDER_IDS } from '../context/AuthContext.jsx'
import { THEMES } from '../data/themes.js'
import { loadCommunityQuestions } from '../data/communityQuestions.js'

const TYPE_META = {
  bug:      { emoji: '🐛', label: 'Bug',      color: 'text-red-400' },
  idea:     { emoji: '💡', label: 'Idée',     color: 'text-amber-400' },
  comment:  { emoji: '💬', label: 'Avis',     color: 'text-blue-400' },
  question: { emoji: '❓', label: 'Question', color: 'text-green-400' },
}

export default function AdminPanel() {
  const { user, isFounder } = useAuth()
  const [tab, setTab] = useState('questions')

  if (!user)      return <Gate icon="🔒" text="Connecte-toi avec un compte fondateur." />
  if (!isFounder) return <Gate icon="⛔" text="Accès réservé à l'administration." />

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="heading text-3xl">🛡️ Administration</h1>
        <p className="text-slate-500 text-sm mt-1">Modération des feedbacks et des questions proposées par la communauté.</p>
      </div>

      <div className="flex rounded-xl bg-white/5 border border-white/10 p-1 gap-1">
        <button onClick={() => setTab('questions')}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${tab === 'questions' ? 'bg-midi-accent text-white' : 'text-slate-300'}`}>
          ❓ Questions
        </button>
        <button onClick={() => setTab('feedbacks')}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${tab === 'feedbacks' ? 'bg-midi-accent text-white' : 'text-slate-300'}`}>
          💬 Feedbacks
        </button>
        <button onClick={() => setTab('players')}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${tab === 'players' ? 'bg-midi-accent text-white' : 'text-slate-300'}`}>
          👥 Joueurs
        </button>
      </div>

      {tab === 'questions' && <QuestionsTab />}
      {tab === 'feedbacks' && <FeedbacksTab />}
      {tab === 'players'   && <PlayersTab />}
    </div>
  )
}

// ─── Questions proposées ──────────────────────────────────────
function QuestionsTab() {
  const [rows,    setRows]    = useState([])
  const [loading, setLoading] = useState(true)
  const [busy,    setBusy]    = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('feedbacks')
      .select('*, profile:user_id(id, nickname, avatar)')
      .eq('type', 'question')
      .order('created_at', { ascending: false })
    setRows(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function accept(fb) {
    if (busy) return
    setBusy(fb.id)
    const qd = fb.question_data ?? {}
    const fmt = qd.format ?? 'mcq'
    const { error } = await supabase.from('community_questions').insert({
      feedback_id: fb.id,
      proposed_by: fb.user_id,
      theme:       qd.theme ?? 'societe',
      difficulty:  qd.difficulty ?? 2,
      format:      fmt,
      q:           qd.q ?? '',
      choices:     fmt === 'mcq'  ? (qd.choices ?? null) : null,
      answer_idx:  fmt === 'mcq'  ? (qd.answer ?? 0)     : null,
      answer_text: fmt === 'open' ? (qd.answer ?? '')    : null,
      accepts:     fmt === 'open' ? (qd.accepts ?? [])   : null,
      items:       fmt === 'order' ? (qd.items ?? null)  : null,
      hint:        fmt === 'order' ? (qd.hint ?? null)   : null,
      status:      'accepted',
    })
    if (!error) {
      await supabase.from('feedbacks').update({ status: 'integrated' }).eq('id', fb.id)
      if (fb.user_id) {
        await supabase.rpc('send_admin_message', {
          target_user: fb.user_id,
          body: `🎉 Ta question « ${qd.q ?? ''} » vient d'être ajoutée au jeu ! Merci pour ta contribution. — L'équipe des Douze Coups de Minuit`,
        })
      }
      await loadCommunityQuestions()
    }
    setBusy(null)
    load()
  }

  async function reject(fb) {
    if (busy) return
    setBusy(fb.id)
    await supabase.from('feedbacks').update({ status: 'rejected' }).eq('id', fb.id)
    if (fb.user_id) {
      await supabase.rpc('send_admin_message', {
        target_user: fb.user_id,
        body: `Merci pour ta proposition de question « ${fb.question_data?.q ?? ''} ». Elle n'a pas été retenue cette fois-ci, mais continue à en proposer ! — L'équipe des Douze Coups de Minuit`,
      })
    }
    setBusy(null)
    load()
  }

  if (loading) return <Spinner />
  if (!rows.length) return <Empty icon="❓" text="Aucune question proposée pour l'instant." />

  const pending = rows.filter(r => r.status !== 'integrated' && r.status !== 'rejected')
  const done    = rows.filter(r => r.status === 'integrated' || r.status === 'rejected')

  return (
    <div className="space-y-3">
      {pending.length > 0 && (
        <p className="text-xs text-slate-500 uppercase tracking-widest">À traiter ({pending.length})</p>
      )}
      {pending.map(fb => (
        <QuestionCard key={fb.id} fb={fb} busy={busy === fb.id}
          onAccept={() => accept(fb)} onReject={() => reject(fb)} />
      ))}

      {done.length > 0 && (
        <p className="text-xs text-slate-500 uppercase tracking-widest pt-3">Traitées ({done.length})</p>
      )}
      {done.map(fb => (
        <QuestionCard key={fb.id} fb={fb} busy={false} onAccept={() => {}} onReject={() => {}} />
      ))}
    </div>
  )
}

function QuestionCard({ fb, busy, onAccept, onReject }) {
  const qd = fb.question_data ?? {}
  const theme = THEMES[qd.theme]
  const handled = fb.status === 'integrated' || fb.status === 'rejected'
  const diffLabel = { 1: 'Facile', 2: 'Moyen', 3: 'Difficile' }[qd.difficulty] ?? '?'

  return (
    <div className={`card p-4 ${handled ? 'opacity-60' : ''}`}>
      <div className="flex items-center justify-between gap-2 mb-2 text-xs flex-wrap">
        <div className="flex items-center gap-2 text-slate-400">
          <span>{fb.profile?.avatar ?? '🎭'}</span>
          <span className="font-medium">{fb.profile?.nickname ?? 'Anonyme'}</span>
          <span className="text-slate-600">· {new Date(fb.created_at).toLocaleDateString('fr-FR')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {theme && <span className="chip text-xs">{theme.emoji} {theme.label}</span>}
          <span className="chip text-xs">{diffLabel}</span>
          <span className="chip text-xs">{qd.format === 'open' ? '✍️ Libre' : qd.format === 'order' ? '🔢 Classement' : '🔘 QCM'}</span>
        </div>
      </div>

      <p className="font-semibold mb-2">{qd.q}</p>

      {qd.format === 'order' ? (
        <div className="text-sm space-y-1">
          {qd.hint && <p className="text-xs text-slate-500 mb-1">↕ {qd.hint}</p>}
          {(qd.items ?? []).map((it, i) => (
            <div key={i} className="flex items-center gap-2 px-2 py-1 rounded-lg bg-white/5">
              <span className="text-xs text-slate-500 w-4">{i + 1}.</span>
              <span className="text-slate-300">{it}</span>
            </div>
          ))}
        </div>
      ) : qd.format === 'open' ? (
        <div className="text-sm space-y-1">
          <div className="text-green-300">✓ {qd.answer}</div>
          {qd.accepts?.length > 0 && (
            <div className="text-slate-500 text-xs">Accepté aussi : {qd.accepts.join(', ')}</div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-1.5 text-sm">
          {(qd.choices ?? []).map((c, i) => (
            <div key={i} className={`px-2 py-1 rounded-lg ${i === qd.answer ? 'bg-green-500/15 text-green-300 font-medium' : 'bg-white/5 text-slate-400'}`}>
              {i === qd.answer ? '✓ ' : ['A','B','C','D'][i] + '. '}{c}
            </div>
          ))}
        </div>
      )}

      {handled ? (
        <div className={`mt-3 text-sm font-semibold ${fb.status === 'integrated' ? 'text-green-400' : 'text-red-400'}`}>
          {fb.status === 'integrated' ? '✅ Ajoutée au jeu' : '❌ Refusée'}
        </div>
      ) : (
        <div className="flex gap-2 mt-3">
          <button onClick={onAccept} disabled={busy}
            className="flex-1 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-semibold transition disabled:opacity-50">
            {busy ? '…' : '✓ Accepter'}
          </button>
          <button onClick={onReject} disabled={busy}
            className="flex-1 py-2 rounded-lg bg-white/5 hover:bg-red-500/20 text-slate-300 hover:text-red-300 text-sm font-semibold transition disabled:opacity-50">
            ✗ Refuser
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Feedbacks (bugs / idées / avis) ─────────────────────────
function FeedbacksTab() {
  const [rows,    setRows]    = useState([])
  const [loading, setLoading] = useState(true)
  const [filter,  setFilter]  = useState('all')

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('feedbacks')
      .select('*, profile:user_id(id, nickname, avatar)')
      .neq('type', 'question')
      .order('created_at', { ascending: false })
    setRows(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function toggleResolved(fb) {
    const next = fb.status === 'resolved' ? 'new' : 'resolved'
    await supabase.from('feedbacks').update({ status: next }).eq('id', fb.id)
    load()
  }

  const filtered = filter === 'all' ? rows : rows.filter(r => r.type === filter)

  if (loading) return <Spinner />

  return (
    <div className="space-y-3">
      <div className="flex gap-1.5 flex-wrap">
        {['all', 'bug', 'idea', 'comment'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${filter === f ? 'bg-midi-accent text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}>
            {f === 'all' ? 'Tout' : `${TYPE_META[f].emoji} ${TYPE_META[f].label}`}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Empty icon="📭" text="Aucun feedback." />
      ) : filtered.map(fb => {
        const m = TYPE_META[fb.type] ?? TYPE_META.comment
        const resolved = fb.status === 'resolved'
        return (
          <div key={fb.id} className={`card p-4 ${resolved ? 'opacity-50' : ''}`}>
            <div className="flex items-center justify-between gap-2 mb-2 text-xs flex-wrap">
              <div className="flex items-center gap-2">
                <span className={`font-semibold ${m.color}`}>{m.emoji} {m.label}</span>
                <span className="text-slate-500">{fb.profile?.nickname ?? 'Anonyme'}</span>
                <span className="text-slate-600">· {new Date(fb.created_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              {fb.page_url && <span className="chip text-xs font-mono">{fb.page_url}</span>}
            </div>
            <p className="text-sm text-slate-200 whitespace-pre-wrap break-words">{fb.message}</p>
            <button onClick={() => toggleResolved(fb)}
              className="mt-3 text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 transition">
              {resolved ? '↩ Rouvrir' : '✓ Marquer résolu'}
            </button>
          </div>
        )
      })}
    </div>
  )
}

// ─── Joueurs (bannissement) ──────────────────────────────────
function PlayersTab() {
  const [rows,    setRows]    = useState([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')
  const [busy,    setBusy]    = useState(null)
  const [rousteFor, setRousteFor] = useState(null) // joueur ciblé par la modale

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('id, nickname, avatar, total_xp, banned, ban_reason, banned_until')
      .order('total_xp', { ascending: false })
    setRows((data ?? []).filter(p => p.nickname !== 'Administration'))
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Applique une sanction : permanent OU timeout (durée en minutes)
  async function applyRouste({ mode, minutes, reason }) {
    const p = rousteFor
    if (!p) return
    setRousteFor(null)
    setBusy(p.id)
    const until = mode === 'timeout'
      ? new Date(Date.now() + minutes * 60 * 1000).toISOString()
      : null
    const { error } = await supabase.rpc('moderate_player', {
      target: p.id, p_banned: mode === 'ban', p_until: until, p_reason: reason || null,
    })
    setBusy(null)
    if (error) { alert('Erreur : ' + error.message); return }
    load()
  }

  async function lift(p) {
    setBusy(p.id)
    const { error } = await supabase.rpc('moderate_player', {
      target: p.id, p_banned: false, p_until: null, p_reason: null,
    })
    setBusy(null)
    if (error) { alert('Erreur : ' + error.message); return }
    load()
  }

  if (loading) return <Spinner />

  const q = search.trim().toLowerCase()
  const filtered = q ? rows.filter(p => (p.nickname ?? '').toLowerCase().includes(q)) : rows

  function statusOf(p) {
    if (p.banned) return { sanctioned: true, label: 'Banni' }
    if (p.banned_until && new Date(p.banned_until) > new Date()) {
      return { sanctioned: true, label: 'Timeout', until: new Date(p.banned_until) }
    }
    return { sanctioned: false }
  }

  return (
    <div className="space-y-3">
      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Rechercher un joueur…"
        className="input w-full text-sm" />

      {filtered.length === 0 ? (
        <Empty icon="🔍" text="Aucun joueur trouvé." />
      ) : filtered.map(p => {
        const isFounderRow = FOUNDER_IDS.includes(p.id)
        const st = statusOf(p)
        return (
          <div key={p.id} className={`card p-3 flex items-center gap-3 ${st.sanctioned ? 'border border-red-500/30 bg-red-500/5' : ''}`}>
            <span className="text-2xl shrink-0">{(p.avatar ?? '').startsWith('/') ? <img src={p.avatar} alt="" className="w-8 h-8 rounded-lg object-cover" /> : (p.avatar ?? '🎭')}</span>
            <div className="flex-1 min-w-0">
              <div className="font-semibold truncate flex items-center gap-2">
                {p.nickname}
                {isFounderRow && <span className="text-xs bg-midi-accent/20 text-midi-accent px-2 py-0.5 rounded-full">Fondateur</span>}
                {st.sanctioned && <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">{st.label}</span>}
              </div>
              <div className="text-xs text-slate-500">
                {(p.total_xp ?? 0).toLocaleString('fr-FR')} XP
                {st.until && <span className="text-red-400/70"> · jusqu'à {st.until.toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}</span>}
                {p.ban_reason && <span className="text-red-400/70"> · {p.ban_reason}</span>}
              </div>
            </div>
            {isFounderRow ? (
              <span className="text-xs text-slate-600 shrink-0">protégé</span>
            ) : st.sanctioned ? (
              <button onClick={() => lift(p)} disabled={busy === p.id}
                className="shrink-0 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-sm font-semibold transition disabled:opacity-50">
                {busy === p.id ? '…' : 'Lever'}
              </button>
            ) : (
              <button onClick={() => setRousteFor(p)} disabled={busy === p.id}
                className="shrink-0 px-3 py-1.5 rounded-lg bg-red-600/80 hover:bg-red-500 text-white text-sm font-semibold transition disabled:opacity-50">
                {busy === p.id ? '…' : '🥊 Mettre une rouste'}
              </button>
            )}
          </div>
        )
      })}

      {rousteFor && (
        <RousteModal player={rousteFor} onClose={() => setRousteFor(null)} onApply={applyRouste} />
      )}
    </div>
  )
}

// ─── Modale « Mettre une rouste » ────────────────────────────
function RousteModal({ player, onClose, onApply }) {
  const [mode,    setMode]    = useState('timeout')  // 'timeout' | 'ban'
  const [minutes, setMinutes] = useState(15)
  const [reason,  setReason]  = useState('')

  const PRESETS = [
    { label: '5 min',  m: 5 },
    { label: '15 min', m: 15 },
    { label: '1 h',    m: 60 },
    { label: '12 h',   m: 720 },
    { label: '1 jour', m: 1440 },
  ]

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="rounded-2xl border border-white/15 shadow-2xl w-full max-w-sm animate-pop" style={{ background: 'var(--bg-card)' }}>
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 className="font-display text-xl tracking-wider">🥊 Rouste · {player.nickname}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl leading-none">✕</button>
        </div>

        <div className="px-5 pb-5 space-y-4">
          {/* Choix du type */}
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setMode('timeout')}
              className={`py-2.5 rounded-xl border-2 text-sm font-semibold transition ${mode === 'timeout' ? 'border-amber-500/40 bg-amber-500/10 text-amber-300' : 'border-white/10 bg-white/5 text-slate-400'}`}>
              ⏳ Timeout
            </button>
            <button type="button" onClick={() => setMode('ban')}
              className={`py-2.5 rounded-xl border-2 text-sm font-semibold transition ${mode === 'ban' ? 'border-red-500/40 bg-red-500/10 text-red-300' : 'border-white/10 bg-white/5 text-slate-400'}`}>
              🚫 Bannissement
            </button>
          </div>

          {/* Durée (timeout uniquement) */}
          {mode === 'timeout' && (
            <div className="space-y-2">
              <label className="block text-xs text-slate-400 uppercase tracking-widest">Durée</label>
              <div className="flex flex-wrap gap-1.5">
                {PRESETS.map(pr => (
                  <button key={pr.m} type="button" onClick={() => setMinutes(pr.m)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${minutes === pr.m ? 'bg-amber-500 text-black' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}>
                    {pr.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input type="number" min={1} max={43200} value={minutes}
                  onChange={e => setMinutes(Math.max(1, Number(e.target.value) || 1))}
                  className="input w-24 text-sm" />
                <span className="text-sm text-slate-500">minutes personnalisées</span>
              </div>
            </div>
          )}

          {/* Motif */}
          <div>
            <label className="block text-xs text-slate-400 mb-1 uppercase tracking-widest">Motif <span className="text-slate-600">(facultatif, vu par le joueur)</span></label>
            <input value={reason} onChange={e => setReason(e.target.value)} maxLength={200}
              placeholder="Ex : spam dans le chat" className="input w-full text-sm" />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-semibold transition">
              Annuler
            </button>
            <button onClick={() => onApply({ mode, minutes, reason: reason.trim() })}
              className={`flex-1 py-2.5 rounded-xl text-white font-semibold transition ${mode === 'ban' ? 'bg-red-600 hover:bg-red-500' : 'bg-amber-600 hover:bg-amber-500'}`}>
              {mode === 'ban' ? '🚫 Bannir' : `⏳ Timeout ${minutes >= 60 ? Math.round(minutes/60*10)/10 + 'h' : minutes + 'min'}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Utilitaires ─────────────────────────────────────────────
function Gate({ icon, text }) {
  return (
    <div className="max-w-md mx-auto mt-20 text-center space-y-4">
      <div className="text-6xl">{icon}</div>
      <p className="text-slate-400">{text}</p>
      <Link to="/" className="btn btn-primary">Retour à l'accueil</Link>
    </div>
  )
}
function Spinner() {
  return <div className="flex justify-center py-16"><div className="w-8 h-8 rounded-full border-2 border-midi-accent border-t-transparent animate-spin" /></div>
}
function Empty({ icon, text }) {
  return <div className="card p-10 text-center text-slate-500"><div className="text-4xl mb-3">{icon}</div><p className="text-sm">{text}</p></div>
}
