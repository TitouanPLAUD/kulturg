import { useState, useRef, useEffect } from 'react'

/**
 * Input pour les questions à réponse libre.
 * - Disabled tant que disableAll
 * - Une fois revealed, affiche la bonne réponse et marque la réponse du joueur
 *   en vert ou rouge.
 *
 * Props :
 *   answer       : la réponse de référence (string) — affichée au reveal
 *   typed        : ce que le joueur a tapé (string|null) — si non null, input lock
 *   revealed     : bool — quand true, on affiche correct/incorrect
 *   isCorrect    : bool|null — résultat (calculé côté parent avec matchAnswer)
 *   onSubmit     : (typed: string) => void — appelé sur Enter ou clic Valider
 *   disableAll   : bool — désactive complètement (spectateur)
 *   accent       : classe Tailwind pour la bordure focus
 */
export default function TextAnswerInput({
  answer, typed, revealed, isCorrect,
  onSubmit, disableAll = false, accent = 'border-midi-accent',
}) {
  const [value,   setValue]   = useState(typed ?? '')
  const [bounce,  setBounce]  = useState(false)
  const inputRef = useRef(null)

  // Focus auto à l'apparition
  useEffect(() => {
    if (!disableAll && !revealed && typed == null) inputRef.current?.focus()
  }, [disableAll, revealed, typed])

  // Si on a déjà répondu, refléter la valeur transmise
  useEffect(() => {
    if (typed != null) setValue(typed)
  }, [typed])

  function handleSubmit(e) {
    e.preventDefault()
    const v = value.trim()
    if (!v || revealed || disableAll || typed != null) return
    setBounce(true) // petit rebond à la validation (Entrée ou clic ↵)
    onSubmit(v)
  }

  const locked = disableAll || revealed || typed != null

  // ── Affichage au reveal ──
  if (revealed) {
    return (
      <div className="space-y-2">
        {/* Ce que le joueur a tapé (s'il a répondu) */}
        {typed != null && (
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 ${
            isCorrect
              ? 'border-green-500 bg-green-500/10'
              : 'border-red-500 bg-red-500/10'
          }`}>
            <span className="text-xl">{isCorrect ? '✓' : '✗'}</span>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-slate-500 mb-0.5">Ta réponse</div>
              <div className={`font-semibold ${isCorrect ? 'text-green-300' : 'text-red-300 line-through'} break-words`}>
                {typed}
              </div>
            </div>
          </div>
        )}
        {/* Bonne réponse */}
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-green-500/40 bg-green-500/5">
          <span className="text-xl">💡</span>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-slate-500 mb-0.5">Réponse attendue</div>
            <div className="font-semibold text-green-300 break-words">{answer}</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <div className={`flex gap-2 ${bounce ? 'animate-bounce-press' : ''}`}
        onAnimationEnd={() => setBounce(false)}>
        <input
          ref={inputRef}
          type="text"
          inputMode="text"
          autoComplete="off"
          spellCheck={false}
          placeholder={disableAll ? '—' : 'Tape ta réponse…'}
          disabled={locked}
          value={value}
          onChange={e => setValue(e.target.value)}
          maxLength={120}
          className={`flex-1 px-4 py-3 text-base rounded-xl bg-white/5 border-2 border-white/10 focus:outline-none focus:${accent} transition disabled:opacity-50`}
        />
        <button
          type="submit"
          disabled={locked || !value.trim()}
          className="px-5 py-3 rounded-xl bg-midi-accent text-white font-bold transition disabled:opacity-40 hover:bg-blue-400">
          ↵
        </button>
      </div>
      <p className="text-xs text-slate-500">
        ✍️ Question à réponse libre · les accents, majuscules et fautes mineures sont tolérés
      </p>
    </form>
  )
}
