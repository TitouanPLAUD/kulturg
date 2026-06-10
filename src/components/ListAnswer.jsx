import { useState, useRef, useEffect } from 'react'
import { matchAnswer } from '../utils/answerMatch.js'

/**
 * Question « liste » : citer le plus de bonnes réponses possible en 30 s.
 * Chaque réponse présente dans le pool compte (et rapporte des points).
 *
 * Props :
 *   pool      : string[] — réponses acceptées
 *   accepted  : [{ poolIdx, label }] — réponses déjà validées par le joueur (contrôlé par le parent)
 *   onChange  : (next) => void — met à jour `accepted`
 *   locked    : bool — saisie désactivée (révélé / spectateur)
 *   accent    : couleur de bordure focus
 */
export default function ListAnswer({ pool = [], accepted = [], onChange, locked = false, accent = 'border-green-400' }) {
  const [value, setValue] = useState('')
  const [flash, setFlash] = useState(null) // 'ok' | 'dup' | 'no'
  const inputRef = useRef(null)

  useEffect(() => { if (!locked) inputRef.current?.focus() }, [locked])

  function handleSubmit(e) {
    e.preventDefault()
    if (locked) return
    const v = value.trim()
    if (!v) return
    setValue('')

    const taken = new Set(accepted.map(a => a.poolIdx))
    // Première entrée du pool qui matche et pas encore prise
    const idx = pool.findIndex((p, i) => !taken.has(i) && matchAnswer(v, p))
    if (idx !== -1) {
      onChange([...accepted, { poolIdx: idx, label: pool[idx] }])
      setFlash('ok')
    } else {
      // Déjà trouvée ? (matche une entrée déjà prise) sinon fausse
      const already = pool.some((p, i) => taken.has(i) && matchAnswer(v, p))
      setFlash(already ? 'dup' : 'no')
    }
    setTimeout(() => setFlash(null), 800)
  }

  const flashMsg = flash === 'ok' ? '✓ Bonne réponse !'
    : flash === 'dup' ? '↺ Déjà citée'
    : flash === 'no' ? '✗ Pas dans la liste'
    : ''
  const flashColor = flash === 'ok' ? 'text-green-400'
    : flash === 'dup' ? 'text-amber-400'
    : flash === 'no' ? 'text-red-400' : ''

  return (
    <div className="space-y-3">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          autoComplete="off"
          spellCheck={false}
          placeholder={locked ? '—' : 'Tape une réponse puis Entrée…'}
          disabled={locked}
          value={value}
          onChange={e => setValue(e.target.value)}
          maxLength={60}
          className={`flex-1 px-4 py-3 text-base rounded-xl bg-white/5 border-2 border-white/10 focus:outline-none focus:${accent} transition disabled:opacity-50`}
        />
        <button type="submit" disabled={locked || !value.trim()}
          className="px-5 py-3 rounded-xl bg-green-500 text-black font-bold transition disabled:opacity-40 hover:bg-green-400">
          + Ajouter
        </button>
      </form>

      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-400">
          <strong className="text-green-400 text-base">{accepted.length}</strong> bonne{accepted.length > 1 ? 's' : ''} réponse{accepted.length > 1 ? 's' : ''}
          <span className="text-slate-600"> · +{accepted.length * 2} pts</span>
        </span>
        {flashMsg && <span className={`font-semibold ${flashColor}`}>{flashMsg}</span>}
      </div>

      {accepted.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {accepted.map((a, i) => (
            <span key={i} className="inline-flex items-center bg-green-500/15 text-green-300 border border-green-500/30 rounded-lg px-2.5 py-1 text-sm font-medium">
              {a.label}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
