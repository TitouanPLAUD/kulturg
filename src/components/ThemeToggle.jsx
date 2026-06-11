import { useSettings } from '../context/SettingsContext.jsx'

// Icônes (style lucide) en inline pour éviter une dépendance.
function MoonIcon({ className = '' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  )
}
function SunIcon({ className = '' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  )
}

export default function ThemeToggle({ className = '' }) {
  const { settings, update } = useSettings()

  // Thème effectif (gère le mode 'auto')
  const effective = settings.theme === 'auto'
    ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
    : settings.theme
  const isDark = effective === 'dark'

  function toggle() {
    update({ theme: isDark ? 'light' : 'dark' })
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Basculer le thème clair / sombre"
      title={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
      onClick={toggle}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle() } }}
      data-no-invert
      className={`flex w-16 h-8 p-1 rounded-full cursor-pointer transition-all duration-300 shrink-0 ${
        isDark ? 'bg-zinc-950 border border-zinc-800' : 'bg-white border border-zinc-200'
      } ${className}`}
    >
      <div className="flex justify-between items-center w-full">
        <div className={`flex justify-center items-center w-6 h-6 rounded-full transition-transform duration-300 ${
          isDark ? 'translate-x-0 bg-zinc-800' : 'translate-x-8 bg-gray-200'
        }`}>
          {isDark
            ? <MoonIcon className="w-4 h-4 text-white" />
            : <SunIcon className="w-4 h-4 text-gray-700" />}
        </div>
        <div className={`flex justify-center items-center w-6 h-6 rounded-full transition-transform duration-300 ${
          isDark ? 'bg-transparent' : '-translate-x-8'
        }`}>
          {isDark
            ? <SunIcon className="w-4 h-4 text-gray-500" />
            : <MoonIcon className="w-4 h-4 text-black" />}
        </div>
      </div>
    </div>
  )
}
