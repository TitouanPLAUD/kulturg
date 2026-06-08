import { useState, useEffect } from 'react'

const STORAGE_KEY = 'test_banner_dismissed_at'
// Réafficher la bannière 24 h après la fermeture, pour rappeler aux testeurs
// qu'on est en phase d'essai même s'ils reviennent le lendemain.
const REAPPEAR_AFTER_MS = 24 * 60 * 60 * 1000

export default function TestBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      const dismissedAt = parseInt(localStorage.getItem(STORAGE_KEY) ?? '0', 10)
      if (!dismissedAt || Date.now() - dismissedAt > REAPPEAR_AFTER_MS) {
        setVisible(true)
      }
    } catch {
      setVisible(true)
    }
  }, [])

  function dismiss() {
    try { localStorage.setItem(STORAGE_KEY, String(Date.now())) } catch {}
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="relative bg-gradient-to-r from-midi-accent/15 via-midi-accent/10 to-midi-accent2/15 border-b border-midi-accent/30 px-4 py-2 text-center text-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 pr-8 flex-wrap">
        <span className="text-base">🧪</span>
        <span className="font-medium text-white">Phase de test</span>
        <span className="text-slate-300 hidden sm:inline">— signale les bugs et partage tes idées via le bouton</span>
        <span className="inline-flex items-center gap-1 text-midi-accent font-semibold">
          💡 en bas à gauche
        </span>
      </div>
      <button onClick={dismiss}
        title="Masquer (réapparaîtra demain)"
        className="absolute top-1/2 -translate-y-1/2 right-3 w-6 h-6 flex items-center justify-center rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition">
        ✕
      </button>
    </div>
  )
}
