// Badge d'achievement — adapté en JSX (projet JS/Vite/Tailwind, pas TS/shadcn ;
// pas de lucide-react). Anneau de progression vers le palier suivant + médaille
// colorée selon le palier (bronze / argent / or), grisée si verrouillé.

const TIER_STYLE = {
  0: { ring: '#64748b', from: '#334155', to: '#1e293b' },  // verrouillé
  1: { ring: '#d98a4a', from: '#c8843f', to: '#8c5a24' },  // bronze
  2: { ring: '#cbd5e1', from: '#e2e8f0', to: '#94a3b8' },  // argent
  3: { ring: '#fbbf24', from: '#fcd34d', to: '#d97706' },  // or
}

export default function AchievementBadge({ achievement, size = 52 }) {
  const { baseName, emoji, tier, tierLabel, unlocked, progress, value, nextThreshold, desc } = achievement
  const st = TIER_STYLE[tier] ?? TIER_STYLE[0]

  const stroke = 4
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (Math.min(100, progress) / 100) * circ

  const title = nextThreshold
    ? `${baseName}${tierLabel ? ' ' + tierLabel : ''} · ${desc} : ${value}/${nextThreshold}`
    : `${baseName} ${tierLabel} · ${desc} : palier max atteint`

  return (
    <div className="flex flex-col items-center gap-1 w-[60px]" title={title}>
      <div className="relative" style={{ width: size, height: size }}>
        {/* Anneau de progression */}
        <svg width={size} height={size} className="absolute inset-0 -rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(148,163,184,0.18)" strokeWidth={stroke} />
          {progress > 0 && (
            <circle
              cx={size / 2} cy={size / 2} r={r} fill="none"
              stroke={unlocked ? st.ring : 'rgba(148,163,184,0.55)'}
              strokeWidth={stroke} strokeLinecap="round"
              strokeDasharray={circ} strokeDashoffset={offset}
            />
          )}
        </svg>

        {/* Médaille */}
        <div
          className={`absolute inset-[6px] rounded-full grid place-items-center shadow-inner transition ${unlocked ? '' : 'grayscale opacity-50'}`}
          style={{ background: `radial-gradient(circle at 32% 26%, ${st.from}, ${st.to})` }}
        >
          <span className="text-lg leading-none" aria-hidden="true">{emoji}</span>
        </div>

        {/* Pastille de palier */}
        {unlocked && (
          <span
            className="absolute -bottom-1 -right-1 min-w-[16px] text-center text-[9px] font-black leading-[14px] px-1 rounded-full border"
            style={{ color: '#0a0f1e', background: st.ring, borderColor: 'rgba(255,255,255,0.5)' }}
          >
            {tierLabel}
          </span>
        )}
      </div>

      <span className={`text-[10px] font-semibold leading-tight text-center truncate w-full ${unlocked ? 'text-slate-200' : 'text-slate-500'}`}>
        {baseName}
      </span>
    </div>
  )
}
