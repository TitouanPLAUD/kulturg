import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../context/AuthContext.jsx'

const TYPES = [
  { id: 'bug',     label: 'Bug',     emoji: '🐛', color: 'bg-red-500/15 border-red-500/30 text-red-300',     placeholder: 'Décris le bug : ce que tu faisais, ce qui s\'est passé, ce que tu attendais…' },
  { id: 'idea',    label: 'Idée',    emoji: '💡', color: 'bg-amber-500/15 border-amber-500/30 text-amber-300', placeholder: 'Une suggestion d\'amélioration, une fonctionnalité qui te manque…' },
  { id: 'comment', label: 'Avis',    emoji: '💬', color: 'bg-blue-500/15 border-blue-500/30 text-blue-300',   placeholder: 'Ce que tu penses, ce qui t\'a plu/déplu, retour libre…' },
]

export default function FeedbackButton() {
  const { user } = useAuth()
  const [open,     setOpen]     = useState(false)
  const [type,     setType]     = useState('bug')
  const [message,  setMessage]  = useState('')
  const [sending,  setSending]  = useState(false)
  const [sent,     setSent]     = useState(false)

  async function submit(e) {
    e.preventDefault()
    if (!message.trim()) return
    setSending(true)
    const { error } = await supabase.from('feedbacks').insert({
      user_id:    user?.id ?? null,
      type,
      message:    message.trim(),
      page_url:   typeof window !== 'undefined' ? window.location.pathname : null,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 200) : null,
    })
    setSending(false)
    if (error) return
    setSent(true)
    setMessage('')
    setTimeout(() => { setOpen(false); setSent(false) }, 2000)
  }

  const current = TYPES.find(t => t.id === type)

  return (
    <>
      {/* Bouton flottant */}
      <button
        onClick={() => setOpen(true)}
        title="Donner un feedback"
        className="fixed bottom-4 left-4 sm:left-6 z-40 w-12 h-12 rounded-full shadow-xl shadow-black/40 flex items-center justify-center text-xl transition-all duration-200
          bg-midi-accent2 hover:bg-blue-500 hover:scale-105">
        💡
      </button>

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
          onMouseDown={e => e.target === e.currentTarget && setOpen(false)}>
          <div className="bg-midi-surface border border-white/15 rounded-2xl shadow-2xl w-full max-w-md animate-pop"
            style={{ background: 'var(--bg-card)' }}>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <h2 className="font-display text-xl tracking-wider">💡 Donne ton feedback</h2>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-white text-xl leading-none">✕</button>
            </div>

            {sent ? (
              <div className="px-5 pb-6 pt-2 text-center space-y-2">
                <div className="text-5xl">✅</div>
                <p className="font-semibold text-green-400">Merci pour ton retour !</p>
                <p className="text-sm text-slate-400">Il a bien été enregistré.</p>
              </div>
            ) : (
              <form onSubmit={submit} className="px-5 pb-5 space-y-4">

                {/* Type selector */}
                <div className="grid grid-cols-3 gap-2">
                  {TYPES.map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setType(t.id)}
                      className={`py-3 rounded-xl border-2 text-sm font-semibold transition
                        ${type === t.id ? t.color : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10'}`}>
                      <div className="text-xl mb-0.5">{t.emoji}</div>
                      {t.label}
                    </button>
                  ))}
                </div>

                {/* Message */}
                <div>
                  <label className="block text-xs text-slate-400 mb-1 uppercase tracking-widest">Ton message</label>
                  <textarea
                    rows={5}
                    autoFocus
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder={current.placeholder}
                    maxLength={2000}
                    className="input w-full resize-none" />
                  <div className="text-xs text-slate-600 mt-1 text-right">{message.length}/2000</div>
                </div>

                {/* Page contextuelle */}
                <p className="text-xs text-slate-500">
                  Page actuelle : <span className="font-mono text-slate-400">{typeof window !== 'undefined' ? window.location.pathname : ''}</span>
                </p>

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={() => setOpen(false)}
                    className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-semibold transition">
                    Annuler
                  </button>
                  <button type="submit" disabled={!message.trim() || sending}
                    className="flex-1 py-2.5 rounded-xl bg-midi-accent2 hover:bg-blue-500 text-white font-semibold transition disabled:opacity-50">
                    {sending ? '…' : 'Envoyer'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
