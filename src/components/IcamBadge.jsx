import { useRef, useState } from 'react'

// Badge ICAM holographique, adapté en JSX (le projet est en JS/Vite/Tailwind,
// pas en TS/shadcn). Deux variantes :
//   • par défaut : barre « Membre ICAM » avec effet de tilt 3D au survol
//   • compact    : pastille ronde avec le logo (pour le podium)
// Le reflet holographique vient de la classe .icam-holo (index.css).

const LOGO = '/logos/icam.png'

export default function IcamBadge({ compact = false, size = 26, className = '' }) {
  if (compact) {
    return (
      <span
        title="Membre ICAM"
        className={`relative inline-grid place-items-center rounded-full overflow-hidden bg-white ring-2 ring-amber-300/70 shadow-sm shrink-0 ${className}`}
        style={{ width: size, height: size }}
      >
        <img src={LOGO} alt="ICAM" draggable={false} className="w-[78%] h-auto relative z-10" />
        <span className="icam-holo" />
      </span>
    )
  }

  return <IcamBar className={className} />
}

function IcamBar({ className = '' }) {
  const ref = useRef(null)
  const [transform, setTransform] = useState('perspective(600px) rotateX(0deg) rotateY(0deg)')
  const [glare, setGlare] = useState({ x: 50, y: 50, on: false })

  function onMove(e) {
    const r = ref.current?.getBoundingClientRect()
    if (!r) return
    const px = (e.clientX - r.left) / r.width
    const py = (e.clientY - r.top) / r.height
    setTransform(`perspective(600px) rotateX(${-(py - 0.5) * 14}deg) rotateY(${(px - 0.5) * 14}deg) scale(1.03)`)
    setGlare({ x: px * 100, y: py * 100, on: true })
  }
  function onLeave() {
    setTransform('perspective(600px) rotateX(0deg) rotateY(0deg)')
    setGlare(g => ({ ...g, on: false }))
  }

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={`select-none ${className}`}
      style={{ transform, transformOrigin: 'center', transition: 'transform 200ms ease-out' }}
    >
      <div className="relative overflow-hidden rounded-xl border border-amber-200/70 shadow-md bg-gradient-to-br from-white to-amber-50">
        {/* Contenu */}
        <div className="relative z-10 flex items-center gap-2.5 px-3.5 py-2">
          <img src={LOGO} alt="ICAM" draggable={false} className="h-8 w-auto shrink-0" />
          <div className="leading-tight">
            <div className="text-[8px] font-bold tracking-[0.18em] text-slate-500 uppercase">École d'ingénieurs</div>
            <div className="text-sm font-extrabold text-slate-700">Membre ICAM</div>
          </div>
        </div>
        {/* Reflet holographique animé */}
        <span className="icam-holo" />
        {/* Glare qui suit le curseur */}
        <span
          className="pointer-events-none absolute inset-0 transition-opacity duration-200"
          style={{
            background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255,255,255,0.55), transparent 45%)`,
            opacity: glare.on ? 1 : 0,
          }}
        />
      </div>
    </div>
  )
}
