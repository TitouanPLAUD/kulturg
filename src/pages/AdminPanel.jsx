import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../context/AuthContext.jsx'
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
          ❓ Questions proposées
        </button>
        <button onClick={() => setTab('feedbacks')}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${tab === 'feedbacks' ? 'bg-midi-accent text-white' : 'text-slate-300'}`}>
          💬 Feedbacks
        </button>
      </div>

      {tab === 'questions' ? <QuestionsTab /> : <FeedbacksTab />}
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
    const { error } = await supabase.from('community_questions').insert({
      feedback_id: fb.id,
      proposed_by: fb.user_id,
      theme:       qd.theme ?? 'societe',
      difficulty:  qd.difficulty ?? 2,
      format:      qd.format ?? 'mcq',
      q:           qd.q ?? '',
      choices:     qd.format === 'open' ? null : (qd.choices ?? null),
      answer_idx:  qd.format === 'open' ? null : (qd.answer ?? 0),
      answer_text: qd.format === 'open' ? (qd.answer ?? '') : null,
      accepts:     qd.format === 'open' ? (qd.accepts ?? []) : null,
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
          <span className="chip text-xs">{qd.format === 'open' ? '✍️ Libre' : '🔘 QCM'}</span>
        </div>
      </div>

      <p className="font-semibold mb-2">{qd.q}</p>

      {qd.format === 'open' ? (
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
