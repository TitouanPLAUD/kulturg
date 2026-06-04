// Bouton « shiny » avec bordure animée en dégradé conique.
// La couleur de surbrillance est pilotée par les variables CSS
// --shiny-cta-highlight / --shiny-cta-highlight-subtle, surchargeables
// via la prop `highlight` (et `highlightSubtle`) pour s'adapter à chaque jeu.
// La CSS associée vit dans src/index.css (.shiny-cta).
export default function ShinyButton({
  children,
  onClick,
  className = '',
  highlight,
  highlightSubtle,
  disabled = false,
  type = 'button',
  style,
}) {
  const vars = {
    ...(highlight ? { '--shiny-cta-highlight': highlight } : null),
    ...(highlightSubtle ? { '--shiny-cta-highlight-subtle': highlightSubtle } : null),
    ...style,
  }

  return (
    <button
      type={type}
      className={`shiny-cta ${className}`}
      onClick={onClick}
      disabled={disabled}
      style={vars}
    >
      <span>{children}</span>
    </button>
  )
}
