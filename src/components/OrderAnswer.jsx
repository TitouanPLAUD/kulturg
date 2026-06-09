import { useState, useEffect, useMemo } from 'react'

// Mélange déterministe basé sur l'id de la question (stable entre re-renders)
function shuffleStable(arr, seed) {
  const a = [...arr]
  let s = 0
  for (const c of String(seed)) s = (s * 31 + c.charCodeAt(0)) % 1000000007
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) % 2147483648
    const j = s % (i + 1)
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * Question de classement : le joueur ordonne 4 items.
 *
 * Props :
 *   qid        : id de la question (pour un mélange stable)
 *   items      : items dans le BON ordre (référence)
 *   hint       : libellé du sens du classement
 *   submitted  : ordre soumis par le joueur (array) ou null
 *   revealed   : bool — affiche correct/incorrect
 *   isCorrect  : bool|null
 *   onSubmit   : (orderedItems: string[]) => void
 *   disableAll : bool — spectateur
 *   accent     : 'green' | 'blue' | 'red' (couleur du bouton/valider)
 */
export default function OrderAnswer({
  qid, items, hint, submitted, revealed, isCorrect,
  onSubmit, disableAll = false, accent = 'green',
}) {
  // Ordre de travail du joueur — initialisé avec un mélange stable
  const initial = useMemo(() => shuffleStable(items, qid), [qid, items])
  const [order, setOrder] = useState(initial)

  useEffect(() => { setOrder(initial) }, [initial])
  // Si déjà soumis, refléter l'ordre soumis
  useEffect(() => { if (submitted) setOrder(submitted) }, [submitted])

  const locked = disableAll || revealed || submitted != null
  const [dragIndex, setDragIndex] = useState(null)

  function move(i, dir) {
    if (locked) return
    const j = i + dir
    if (j < 0 || j >= order.length) return
    const next = [...order]
    ;[next[i], next[j]] = [next[j], next[i]]
    setOrder(next)
  }

  // ── Glisser-déposer à la souris ──
  function handleDragStart(i) {
    if (locked) return
    setDragIndex(i)
  }
  function handleDragOver(e, j) {
    if (locked || dragIndex === null || dragIndex === j) return
    e.preventDefault()
    setOrder(prev => {
      const next = [...prev]
      const [moved] = next.splice(dragIndex, 1)
      next.splice(j, 0, moved)
      return next
    })
    setDragIndex(j)
  }
  function handleDragEnd() {
    setDragIndex(null)
  }

  const accentBtn = {
    green: 'bg-green-500 hover:bg-green-400 text-black',
    blue:  'bg-midi-accent hover:bg-blue-400 text-white',
    red:   'bg-red-500 hover:bg-red-400 text-white',
  }[accent] ?? 'bg-green-500 hover:bg-green-400 text-black'

  // ── Affichage au reveal : ordre du joueur vs ordre correct ──
  if (revealed) {
    return (
      <div className="space-y-3">
        <p className="text-xs text-slate-500 uppercase tracking-widest">{hint}</p>
        <div className="space-y-1.5">
          {items.map((correctItem, i) => {
            const playerItem = submitted?.[i]
            const ok = playerItem === correctItem
            return (
              <div key={i} className="flex items-center gap-2">
                <span className="w-6 h-6 shrink-0 rounded-lg bg-white/10 grid place-items-center text-xs font-bold text-slate-400">{i + 1}</span>
                <div className={`flex-1 px-3 py-2 rounded-lg text-sm border ${ok ? 'border-green-500/40 bg-green-500/10 text-green-300' : 'border-red-500/40 bg-red-500/10 text-red-300'}`}>
                  {correctItem}
                  {submitted && !ok && playerItem && (
                    <span className="text-red-400/60 text-xs"> · tu avais mis : {playerItem}</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-400 uppercase tracking-widest flex items-center gap-2">
        🔢 Classement · <span className="text-slate-300 normal-case font-semibold tracking-normal">{hint}</span>
      </p>

      <div className="space-y-1.5">
        {order.map((item, i) => (
          <div key={item}
            draggable={!locked}
            onDragStart={() => handleDragStart(i)}
            onDragOver={e => handleDragOver(e, i)}
            onDrop={e => e.preventDefault()}
            onDragEnd={handleDragEnd}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 transition select-none
              ${locked ? 'border-white/10 bg-white/5 opacity-70'
                       : 'border-white/10 bg-white/5 cursor-grab active:cursor-grabbing hover:border-white/20'}
              ${dragIndex === i ? 'opacity-60 ring-2 ring-midi-accent/50 scale-[1.02]' : ''}`}>
            {!locked && (
              <span className="shrink-0 text-slate-500 leading-none" title="Glisser pour réordonner" aria-hidden="true">⠿</span>
            )}
            <span className="w-6 h-6 shrink-0 rounded-lg bg-white/10 grid place-items-center text-xs font-bold text-slate-300">{i + 1}</span>
            <span className="flex-1 text-sm font-medium break-words">{item}</span>
            {!locked && (
              <div className="flex flex-col gap-0.5 shrink-0">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0}
                  className="w-6 h-5 rounded bg-white/10 hover:bg-white/20 text-xs leading-none disabled:opacity-20">▲</button>
                <button type="button" onClick={() => move(i, +1)} disabled={i === order.length - 1}
                  className="w-6 h-5 rounded bg-white/10 hover:bg-white/20 text-xs leading-none disabled:opacity-20">▼</button>
              </div>
            )}
          </div>
        ))}
      </div>

      {!locked && (
        <p className="text-center text-[11px] text-slate-600">Glisse les réponses ou utilise les flèches</p>
      )}

      {!locked && (
        <button type="button" onClick={() => onSubmit(order)}
          className={`w-full py-2.5 rounded-xl font-bold text-sm transition ${accentBtn}`}>
          Valider le classement
        </button>
      )}
      {!disableAll && submitted && !revealed && (
        <p className="text-center text-xs text-slate-500">Classement envoyé · en attente des autres…</p>
      )}
    </div>
  )
}
