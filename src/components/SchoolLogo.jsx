import { useState } from 'react'

// Couleur déterministe (teinte) à partir d'une chaîne — stable par école.
function hashHue(s) {
  let h = 0
  for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) % 360
  return h
}

// 2-3 caractères significatifs pour le monogramme
function monogram(ecole) {
  const src = ecole.short || ecole.label || '?'
  const clean = src.replace(/[^A-Za-zÀ-ÿ0-9]/g, '')
  return clean.slice(0, 3).toUpperCase()
}

/**
 * Logo d'école : affiche le vrai logo si présent (et chargeable), sinon une
 * pastille colorée avec le sigle. Si un fichier logo est ajouté plus tard,
 * il remplace automatiquement le monogramme.
 */
export default function SchoolLogo({ ecole, size = 24, className = '', rounded = 'rounded-full' }) {
  const [failed, setFailed] = useState(false)
  if (!ecole) return null

  // Vrai logo
  if (ecole.logo && !failed) {
    return (
      <span
        title={ecole.label}
        className={`relative inline-grid place-items-center overflow-hidden bg-white shrink-0 ${rounded} ${className}`}
        style={{ width: size, height: size }}>
        <img
          src={ecole.logo}
          alt={ecole.label}
          draggable={false}
          onError={() => setFailed(true)}
          className="max-w-[82%] max-h-[82%] w-auto h-auto object-contain" />
      </span>
    )
  }

  // Monogramme
  const hue = hashHue(ecole.value || ecole.short || ecole.label)
  return (
    <span
      title={ecole.label}
      className={`inline-grid place-items-center shrink-0 font-bold leading-none select-none ${rounded} ${className}`}
      style={{
        width: size, height: size,
        fontSize: Math.round(size * 0.36),
        background: `hsl(${hue} 50% 26%)`,
        color: `hsl(${hue} 70% 78%)`,
        border: `1px solid hsl(${hue} 60% 45% / 0.4)`,
      }}>
      {monogram(ecole)}
    </span>
  )
}
