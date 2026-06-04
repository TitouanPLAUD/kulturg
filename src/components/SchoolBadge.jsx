import { useEffect, useRef, useState } from 'react'

// Badge d'école holographique — adapté en JSX (projet JS/Vite/Tailwind, pas TS/shadcn)
// à partir du composant « award-badge » (effet Product Hunt) :
//   • inclinaison 3D (matrix3d) qui suit la souris
//   • reflet holographique : polygones colorés en rotation, masqués au badge,
//     en mix-blend-mode "overlay"
// Générique : on lui passe le logo + le libellé de l'école.
// Variante `compact` : pastille ronde avec le logo (utilisée dans le classement).

const identityMatrix =
  '1, 0, 0, 0, ' +
  '0, 1, 0, 0, ' +
  '0, 0, 1, 0, ' +
  '0, 0, 0, 1'

const maxRotate = 0.25
const minRotate = -0.25
const maxScale = 1
const minScale = 0.97

export default function SchoolBadge({
  logo,
  label = '',
  subtitle = 'Membre',
  title,
  compact = false,
  size = 26,
  className = '',
}) {
  if (compact) {
    return (
      <span
        title={title || label}
        className={`relative inline-grid place-items-center rounded-full overflow-hidden bg-white ring-2 ring-amber-300/70 shadow-sm shrink-0 ${className}`}
        style={{ width: size, height: size }}
      >
        <img src={logo} alt={label} draggable={false} className="w-[80%] h-auto relative z-10" />
        <span className="icam-holo" />
      </span>
    )
  }
  return <SchoolBar logo={logo} label={label} subtitle={subtitle} className={className} />
}

function SchoolBar({ logo, label, subtitle, className = '' }) {
  const ref = useRef(null)
  const [firstOverlayPosition, setFirstOverlayPosition] = useState(0)
  const [matrix, setMatrix] = useState(identityMatrix)
  const [currentMatrix, setCurrentMatrix] = useState(identityMatrix)
  const [disableInOutOverlayAnimation, setDisableInOutOverlayAnimation] = useState(true)
  const [disableOverlayAnimation, setDisableOverlayAnimation] = useState(false)
  const [isTimeoutFinished, setIsTimeoutFinished] = useState(false)
  const enterTimeout = useRef(null)
  const leaveTimeout1 = useRef(null)
  const leaveTimeout2 = useRef(null)
  const leaveTimeout3 = useRef(null)

  const getDimensions = () => {
    const r = ref.current?.getBoundingClientRect()
    return { left: r?.left || 0, right: r?.right || 0, top: r?.top || 0, bottom: r?.bottom || 0 }
  }

  const getMatrix = (clientX, clientY) => {
    const { left, right, top, bottom } = getDimensions()
    const xCenter = (left + right) / 2
    const yCenter = (top + bottom) / 2

    const scale = [
      maxScale - (maxScale - minScale) * Math.abs(xCenter - clientX) / (xCenter - left),
      maxScale - (maxScale - minScale) * Math.abs(yCenter - clientY) / (yCenter - top),
      maxScale - (maxScale - minScale) * (Math.abs(xCenter - clientX) + Math.abs(yCenter - clientY)) / (xCenter - left + yCenter - top),
    ]

    const rotate = {
      x1: 0.25 * ((yCenter - clientY) / yCenter - (xCenter - clientX) / xCenter),
      x2: maxRotate - (maxRotate - minRotate) * Math.abs(right - clientX) / (right - left),
      x3: 0,
      y0: 0,
      y2: maxRotate - (maxRotate - minRotate) * (top - clientY) / (top - bottom),
      y3: 0,
      z0: -(maxRotate - (maxRotate - minRotate) * Math.abs(right - clientX) / (right - left)),
      z1: (0.2 - (0.2 + 0.6) * (top - clientY) / (top - bottom)),
      z3: 0,
    }
    return `${scale[0]}, ${rotate.y0}, ${rotate.z0}, 0, ` +
      `${rotate.x1}, ${scale[1]}, ${rotate.z1}, 0, ` +
      `${rotate.x2}, ${rotate.y2}, ${scale[2]}, 0, ` +
      `${rotate.x3}, ${rotate.y3}, ${rotate.z3}, 1`
  }

  const getOppositeMatrix = (_matrix, clientY, onEnter) => {
    const { top, bottom } = getDimensions()
    const oppositeY = bottom - clientY + top
    const weakening = onEnter ? 0.7 : 4
    const multiplier = onEnter ? -1 : 1

    return _matrix.split(', ').map((item, index) => {
      if (index === 2 || index === 4 || index === 8) {
        return -parseFloat(item) * multiplier / weakening
      } else if (index === 0 || index === 5 || index === 10) {
        return '1'
      } else if (index === 6) {
        return multiplier * (maxRotate - (maxRotate - minRotate) * (top - oppositeY) / (top - bottom)) / weakening
      } else if (index === 9) {
        return (maxRotate - (maxRotate - minRotate) * (top - oppositeY) / (top - bottom)) / weakening
      }
      return item
    }).join(', ')
  }

  const onMouseEnter = (e) => {
    clearTimeout(leaveTimeout1.current)
    clearTimeout(leaveTimeout2.current)
    clearTimeout(leaveTimeout3.current)
    setDisableOverlayAnimation(true)

    const { left, right, top, bottom } = getDimensions()
    const xCenter = (left + right) / 2
    const yCenter = (top + bottom) / 2

    setDisableInOutOverlayAnimation(false)
    enterTimeout.current = setTimeout(() => setDisableInOutOverlayAnimation(true), 350)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setFirstOverlayPosition((Math.abs(xCenter - e.clientX) + Math.abs(yCenter - e.clientY)) / 1.5)
      })
    })

    const m = getMatrix(e.clientX, e.clientY)
    setMatrix(getOppositeMatrix(m, e.clientY, true))
    setIsTimeoutFinished(false)
    setTimeout(() => setIsTimeoutFinished(true), 200)
  }

  const onMouseMove = (e) => {
    const { left, right, top, bottom } = getDimensions()
    const xCenter = (left + right) / 2
    const yCenter = (top + bottom) / 2
    setTimeout(() => setFirstOverlayPosition((Math.abs(xCenter - e.clientX) + Math.abs(yCenter - e.clientY)) / 1.5), 150)
    if (isTimeoutFinished) setCurrentMatrix(getMatrix(e.clientX, e.clientY))
  }

  const onMouseLeave = (e) => {
    const oppositeMatrix = getOppositeMatrix(matrix, e.clientY)
    clearTimeout(enterTimeout.current)
    setCurrentMatrix(oppositeMatrix)
    setTimeout(() => setCurrentMatrix(identityMatrix), 200)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setDisableInOutOverlayAnimation(false)
        leaveTimeout1.current = setTimeout(() => setFirstOverlayPosition(p => -p / 4), 150)
        leaveTimeout2.current = setTimeout(() => setFirstOverlayPosition(0), 300)
        leaveTimeout3.current = setTimeout(() => {
          setDisableOverlayAnimation(false)
          setDisableInOutOverlayAnimation(true)
        }, 500)
      })
    })
  }

  useEffect(() => {
    if (isTimeoutFinished) setMatrix(currentMatrix)
  }, [currentMatrix, isTimeoutFinished])

  const overlayAnimations = [...Array(10).keys()].map((e) => (
    `@keyframes schoolOverlay${e + 1} {
      0%   { transform: rotate(${e * 10}deg); }
      50%  { transform: rotate(${(e + 1) * 10}deg); }
      100% { transform: rotate(${e * 10}deg); }
    }`
  )).join(' ')

  const polygons = [
    'hsl(358, 100%, 62%)', 'hsl(30, 100%, 50%)', 'hsl(60, 100%, 50%)', 'hsl(96, 100%, 50%)',
    'hsl(233, 85%, 47%)', 'hsl(271, 85%, 47%)', 'hsl(300, 20%, 35%)', 'transparent', 'transparent', 'white',
  ]

  // Taille de police adaptée à la longueur du nom (évite le débordement du SVG)
  const labelSize = label.length > 13 ? 11 : label.length > 9 ? 13 : 16

  return (
    <div
      ref={ref}
      onMouseEnter={onMouseEnter}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className={`block w-[210px] sm:w-[240px] h-auto cursor-pointer select-none ${className}`}
    >
      <style>{overlayAnimations}</style>
      <div style={{ transform: `perspective(700px) matrix3d(${matrix})`, transformOrigin: 'center center', transition: 'transform 200ms ease-out' }}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 54" className="w-full h-auto block">
          <defs>
            <filter id="schoolBlur"><feGaussianBlur in="SourceGraphic" stdDeviation="3" /></filter>
            <mask id="schoolMask"><rect width="260" height="54" fill="white" rx="10" /></mask>
          </defs>

          <rect width="260" height="54" rx="10" fill="#fafaf8" />
          <rect x="4" y="4" width="252" height="46" rx="8" fill="transparent" stroke="#dcd9d2" strokeWidth="1" />

          {/* Logo de l'école */}
          <image href={logo} x="12" y="14" width="50" height="26" preserveAspectRatio="xMidYMid meet" />

          {/* Textes */}
          <text fontFamily="Helvetica-Bold, Helvetica, Arial" fontSize="8.5" fontWeight="bold" fill="#9a948a" x="74" y="22" letterSpacing="1">
            {subtitle?.toUpperCase()}
          </text>
          <text fontFamily="Helvetica-Bold, Helvetica, Arial" fontSize={labelSize} fontWeight="bold" fill="#5b5b5b" x="73" y="41">
            {label}
          </text>

          {/* Reflet holographique */}
          <g style={{ mixBlendMode: 'overlay' }} mask="url(#schoolMask)">
            {polygons.map((fill, i) => (
              <g key={i} style={{
                transform: `rotate(${firstOverlayPosition + i * 10}deg)`,
                transformOrigin: 'center center',
                transition: !disableInOutOverlayAnimation ? 'transform 200ms ease-out' : 'none',
                animation: disableOverlayAnimation ? 'none' : `schoolOverlay${i + 1} 5s infinite`,
                willChange: 'transform',
              }}>
                <polygon points="0,0 260,54 260,0 0,54" fill={fill} filter="url(#schoolBlur)" opacity="0.5" />
              </g>
            ))}
          </g>
        </svg>
      </div>
    </div>
  )
}
