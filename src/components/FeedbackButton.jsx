import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../context/AuthContext.jsx'
import { THEME_LIST } from '../data/themes.js'

const TYPES = [
  { id: 'bug',      label: 'Bug',      emoji: '🐛', color: 'bg-red-500/15 border-red-500/30 text-red-300',        placeholder: 'Décris le bug : ce que tu faisais, ce qui s\'est passé, ce que tu attendais…' },
  { id: 'idea',     label: 'Idée',     emoji: '💡', color: 'bg-amber-500/15 border-amber-500/30 text-amber-300',  placeholder: 'Une suggestion d\'amélioration, une fonctionnalité qui te manque…' },
  { id: 'comment',  label: 'Avis',     emoji: '💬', color: 'bg-blue-500/15 border-blue-500/30 text-blue-300',     placeholder: 'Ce que tu penses, ce qui t\'a plu/déplu, retour libre…' },
  { id: 'question', label: 'Question', emoji: '❓', color: 'bg-green-500/15 border-green-500/30 text-green-300',   placeholder: '' },
]

const DIFFICULTIES = [
  { value: 1, label: 'Facile' },
  { value: 2, label: 'Moyen' },
  { value: 3, label: 'Difficile' },
]

export default function FeedbackButton() {
  const { user } = useAuth()
  const [open,    setOpen]    = useState(false)
  const [type,    setType]    = useState('bug')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent,    setSent]    = useState(false)

  // Champs de proposition de question
  const [qText,   setQText]   = useState('')
  const [qFormat, setQFormat] = useState('mcq')      // 'mcq' | 'open' | 'order'
  const [qTheme,  setQTheme]  = useState('histoire')
  const [qDiff,   setQDiff]   = useState(1)
  const [choices, setChoices] = useState(['', '', '', ''])
  const [correct, setCorrect] = useState(0)
  const [answer,  setAnswer]  = useState('')
  const [accepts, setAccepts] = useState('')
  const [items,   setItems]   = useState(['', '', '', '']) // classement : dans le bon ordre
  const [hint,    setHint]    = useState('')

  function resetAll() {
    setMessage(''); setQText(''); setQFormat('mcq'); setQTheme('histoire')
    setQDiff(1); setChoices(['', '', '', '']); setCorrect(0); setAnswer(''); setAccepts('')
    setItems(['', '', '', '']); setHint('')
  }

  // Validation selon le type
  function isValid() {
    if (type !== 'question') return message.trim().length > 0
    if (!qText.trim()) return false
    if (qFormat === 'mcq')   return choices.every(c => c.trim())
    if (qFormat === 'order') return hint.trim() && items.every(it => it.trim())
    return answer.trim().length > 0
  }

  async function submit(e) {
    e.preventDefault()
    if (!isValid()) return
    setSending(true)

    let question_data = null
    let msg = message.trim()

    if (type === 'question') {
      const base = { q: qText.trim(), theme: qTheme, difficulty: qDiff }
      if (qFormat === 'mcq') {
        question_data = { ...base, format: 'mcq', choices: choices.map(c => c.trim()), answer: correct }
      } else if (qFormat === 'order') {
        question_data = { ...base, format: 'order', items: items.map(it => it.trim()), hint: hint.trim() }
      } else {
        question_data = { ...base, format: 'open', answer: answer.trim(),
          accepts: accepts.split(',').map(a => a.trim()).filter(Boolean) }
      }
      const fmtLabel = qFormat === 'mcq' ? 'QCM' : qFormat === 'order' ? 'classement' : 'libre'
      msg = `[Proposition ${fmtLabel}] ${qText.trim()}`
    }

    const { error } = await supabase.from('feedbacks').insert({
      user_id:       user?.id ?? null,
      type,
      message:       msg,
      question_data,
      page_url:      typeof window !== 'undefined' ? window.location.pathname : null,
      user_agent:    typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 200) : null,
    })
    setSending(false)
    if (error) return
    setSent(true)
    resetAll()
    setTimeout(() => { setOpen(false); setSent(false) }, 2000)
  }

  const current = TYPES.find(t => t.id === type)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Donner un feedback"
        className="fixed bottom-4 left-4 sm:left-6 z-40 w-12 h-12 rounded-full shadow-xl shadow-black/40 flex items-center justify-center text-xl transition-all duration-200
          bg-midi-accent2 hover:bg-blue-500 hover:scale-105">
        💡
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
          onMouseDown={e => e.target === e.currentTarget && setOpen(false)}>
          <div className="bg-midi-surface border border-white/15 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto animate-pop"
            style={{ background: 'var(--bg-card)' }}>

            <div className="flex items-center justify-between px-5 pt-5 pb-3 sticky top-0" style={{ background: 'var(--bg-card)' }}>
              <h2 className="font-display text-xl tracking-wider">💡 Ton feedback</h2>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-white text-xl leading-none">✕</button>
            </div>

            {sent ? (
              <div className="px-5 pb-6 pt-2 text-center space-y-2">
                <div className="text-5xl">✅</div>
                <p className="font-semibold text-green-400">Merci pour ton retour !</p>
                <p className="text-sm text-slate-400">
                  {type === 'question' ? 'Ta question a été proposée, elle sera peut-être ajoutée au jeu !' : 'Il a bien été enregistré.'}
                </p>
              </div>
            ) : (
              <form onSubmit={submit} className="px-5 pb-5 space-y-4">

                {/* Type selector */}
                <div className="grid grid-cols-4 gap-2">
                  {TYPES.map(t => (
                    <button key={t.id} type="button" onClick={() => setType(t.id)}
                      className={`py-2.5 rounded-xl border-2 text-xs font-semibold transition
                        ${type === t.id ? t.color : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10'}`}>
                      <div className="text-lg mb-0.5">{t.emoji}</div>
                      {t.label}
                    </button>
                  ))}
                </div>

                {/* ── Formulaire feedback standard ── */}
                {type !== 'question' && (
                  <div>
                    <label className="block text-xs text-slate-400 mb-1 uppercase tracking-widest">Ton message</label>
                    <textarea rows={5} autoFocus value={message} onChange={e => setMessage(e.target.value)}
                      placeholder={current.placeholder} maxLength={2000}
                      className="input w-full resize-none" />
                    <div className="text-xs text-slate-600 mt-1 text-right">{message.length}/2000</div>
                  </div>
                )}

                {/* ── Formulaire proposition de question ── */}
                {type === 'question' && (
                  <div className="space-y-3">
                    {/* Énoncé */}
                    <div>
                      <label className="block text-xs text-slate-400 mb-1 uppercase tracking-widest">Question</label>
                      <textarea rows={2} autoFocus value={qText} onChange={e => setQText(e.target.value)}
                        placeholder="Ex : Quelle est la capitale de l'Italie ?" maxLength={300}
                        className="input w-full resize-none" />
                    </div>

                    {/* Format */}
                    <div className="grid grid-cols-3 gap-2">
                      <button type="button" onClick={() => setQFormat('mcq')}
                        className={`py-2 rounded-lg text-xs font-semibold border-2 transition ${qFormat === 'mcq' ? 'border-green-500/40 bg-green-500/10 text-green-300' : 'border-white/10 bg-white/5 text-slate-400'}`}>
                        🔘 QCM
                      </button>
                      <button type="button" onClick={() => setQFormat('open')}
                        className={`py-2 rounded-lg text-xs font-semibold border-2 transition ${qFormat === 'open' ? 'border-green-500/40 bg-green-500/10 text-green-300' : 'border-white/10 bg-white/5 text-slate-400'}`}>
                        ✍️ Libre
                      </button>
                      <button type="button" onClick={() => setQFormat('order')}
                        className={`py-2 rounded-lg text-xs font-semibold border-2 transition ${qFormat === 'order' ? 'border-green-500/40 bg-green-500/10 text-green-300' : 'border-white/10 bg-white/5 text-slate-400'}`}>
                        🔢 Classement
                      </button>
                    </div>

                    {/* QCM : 4 choix + bouton radio */}
                    {qFormat === 'mcq' && (
                      <div className="space-y-2">
                        <label className="block text-xs text-slate-400 uppercase tracking-widest">Réponses (coche la bonne)</label>
                        {choices.map((c, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <button type="button" onClick={() => setCorrect(i)}
                              title="Marquer comme bonne réponse"
                              className={`w-7 h-7 shrink-0 rounded-full border-2 flex items-center justify-center text-xs font-bold transition
                                ${correct === i ? 'border-green-500 bg-green-500 text-white' : 'border-white/20 text-slate-500'}`}>
                              {correct === i ? '✓' : ['A','B','C','D'][i]}
                            </button>
                            <input value={c} maxLength={120}
                              onChange={e => { const next = [...choices]; next[i] = e.target.value; setChoices(next) }}
                              placeholder={`Réponse ${['A','B','C','D'][i]}`}
                              className="input flex-1 text-sm" />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Libre : réponse + variantes */}
                    {qFormat === 'open' && (
                      <div className="space-y-2">
                        <div>
                          <label className="block text-xs text-slate-400 mb-1 uppercase tracking-widest">Réponse attendue</label>
                          <input value={answer} onChange={e => setAnswer(e.target.value)} maxLength={120}
                            placeholder="Ex : Rome" className="input w-full text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-400 mb-1 uppercase tracking-widest">Variantes acceptées <span className="text-slate-600">(facultatif, séparées par des virgules)</span></label>
                          <input value={accepts} onChange={e => setAccepts(e.target.value)} maxLength={200}
                            placeholder="Ex : Roma, la ville de Rome" className="input w-full text-sm" />
                        </div>
                      </div>
                    )}

                    {/* Classement : sens + 4 items dans le bon ordre */}
                    {qFormat === 'order' && (
                      <div className="space-y-2">
                        <div>
                          <label className="block text-xs text-slate-400 mb-1 uppercase tracking-widest">Sens du classement</label>
                          <input value={hint} onChange={e => setHint(e.target.value)} maxLength={80}
                            placeholder="Ex : du plus ancien au plus récent" className="input w-full text-sm" />
                        </div>
                        <label className="block text-xs text-slate-400 uppercase tracking-widest">
                          Items <span className="text-slate-600">(dans le BON ordre : 1 = premier)</span>
                        </label>
                        {items.map((it, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <span className="w-7 h-7 shrink-0 rounded-full border-2 border-white/20 flex items-center justify-center text-xs font-bold text-slate-400">{i + 1}</span>
                            <input value={it} maxLength={80}
                              onChange={e => { const next = [...items]; next[i] = e.target.value; setItems(next) }}
                              placeholder={`${i + 1}${i === 0 ? 'er' : 'e'} de la liste`}
                              className="input flex-1 text-sm" />
                          </div>
                        ))}
                        <p className="text-xs text-slate-600">Les items seront mélangés aux joueurs ; c'est cet ordre qui fait foi.</p>
                      </div>
                    )}

                    {/* Thème + difficulté */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-slate-400 mb-1 uppercase tracking-widest">Thème</label>
                        <select value={qTheme} onChange={e => setQTheme(e.target.value)} className="input w-full text-sm">
                          {THEME_LIST.map(t => <option key={t.id} value={t.id}>{t.emoji} {t.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1 uppercase tracking-widest">Difficulté</label>
                        <select value={qDiff} onChange={e => setQDiff(Number(e.target.value))} className="input w-full text-sm">
                          {DIFFICULTIES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={() => setOpen(false)}
                    className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-semibold transition">
                    Annuler
                  </button>
                  <button type="submit" disabled={!isValid() || sending}
                    className="flex-1 py-2.5 rounded-xl bg-midi-accent2 hover:bg-blue-500 text-white font-semibold transition disabled:opacity-50">
                    {sending ? '…' : type === 'question' ? 'Proposer' : 'Envoyer'}
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
