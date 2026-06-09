import { useMemo, useRef, useState, useEffect } from 'react'
import { ECOLES, ECOLES_CATEGORIES, findEcole } from '../data/ecoles.js'
import SchoolLogo from './SchoolLogo.jsx'

/**
 * Combobox d'écoles françaises avec recherche.
 * Props:
 *  - value: string | null   (valeur courante, la clé `value` de l'école)
 *  - onChange(v): callback
 *  - placeholder?: string
 */
export default function SchoolPicker({ value, onChange, placeholder = "Choisis ton école…" }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const containerRef = useRef(null)

  const selected = value ? findEcole(value) : null

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return ECOLES
    return ECOLES.filter(e =>
      e.label.toLowerCase().includes(q) ||
      e.short.toLowerCase().includes(q) ||
      e.value.toLowerCase().includes(q) ||
      e.category.toLowerCase().includes(q)
    )
  }, [query])

  // Regroupement par catégorie
  const grouped = useMemo(() => {
    const m = {}
    filtered.forEach(e => { (m[e.category] ||= []).push(e) })
    return ECOLES_CATEGORIES.filter(c => m[c]?.length).map(c => ({ category: c, items: m[c] }))
  }, [filtered])

  // Fermer en cliquant hors du composant
  useEffect(() => {
    function onClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  function pick(v) {
    onChange(v)
    setOpen(false)
    setQuery('')
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="input w-full text-left flex items-center justify-between gap-2"
      >
        <span className={selected ? '' : 'text-slate-500'}>
          {selected ? selected.label : placeholder}
        </span>
        <span className="text-slate-500 text-xs">▾</span>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-white/10 backdrop-blur-xl shadow-2xl overflow-hidden"
          style={{ background: 'var(--bg-card)' }}>
          <div className="p-2 border-b border-white/10">
            <input
              autoFocus
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Rechercher (nom, sigle, catégorie…)"
              className="input w-full text-sm"
            />
          </div>
          <div className="max-h-72 overflow-y-auto scrollbar-thin">
            {selected && (
              <button
                type="button"
                onClick={() => pick(null)}
                className="w-full text-left px-3 py-2 text-xs text-rose-500 hover:bg-white/5 border-b border-white/5"
              >
                ✕ Effacer la sélection
              </button>
            )}
            {grouped.length === 0 ? (
              <div className="px-3 py-6 text-center text-slate-500 text-sm">Aucun résultat.</div>
            ) : (
              grouped.map(g => (
                <div key={g.category}>
                  <div className="px-3 py-1.5 text-xs uppercase tracking-widest text-slate-500 sticky top-0" style={{ background: 'var(--bg-card)' }}>
                    {g.category}
                  </div>
                  {g.items.map(e => (
                    <button
                      key={e.value}
                      type="button"
                      onClick={() => pick(e.value)}
                      className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2.5 hover:bg-white/5 transition ${value === e.value ? 'bg-midi-accent/10 text-midi-accent' : ''}`}
                    >
                      {e.value !== 'aucune' && e.value !== 'autre'
                        ? <SchoolLogo ecole={e} size={22} />
                        : <span className="w-[22px] shrink-0" />}
                      <span className="truncate flex-1">{e.label}</span>
                      <span className="text-xs text-slate-500 shrink-0">{e.short}</span>
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
