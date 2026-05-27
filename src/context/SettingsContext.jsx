import { createContext, useContext, useEffect, useState } from 'react'

const KEY = 'kulturg.settings.v1'

const defaults = {
  theme: 'dark',          // 'dark' | 'light' | 'auto'
  fontSize: 'normal',     // 'small' | 'normal' | 'large'
  animations: true,
  sound: true,
  reducedMotion: false,
  highContrast: false,
  showExplanations: true,
  defaultDifficulty: 0,   // 0 = toutes, 1-3
  qcmTimer: 20,           // secondes par question QCM
  language: 'fr',
}

const SettingsContext = createContext(null)

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...defaults }
    return { ...defaults, ...JSON.parse(raw) }
  } catch { return { ...defaults } }
}

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(load)

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(settings))
    // Appliquer thème sur <html>
    const root = document.documentElement
    const effective = settings.theme === 'auto'
      ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
      : settings.theme
    root.dataset.theme = effective
    root.dataset.fontSize = settings.fontSize
    root.dataset.animations = settings.animations ? 'on' : 'off'
    root.dataset.contrast = settings.highContrast ? 'high' : 'normal'
    root.dataset.reducedMotion = settings.reducedMotion ? 'on' : 'off'
  }, [settings])

  function update(patch) {
    setSettings(s => ({ ...s, ...patch }))
  }
  function reset() {
    setSettings({ ...defaults })
  }

  return (
    <SettingsContext.Provider value={{ settings, update, reset }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider')
  return ctx
}
