import { isImageAvatar, DEFAULT_AVATAR } from '../data/avatars.js'

// Affiche une photo de profil ronde (image) ou un emoji (ancien format).
//
//  • value  : l'avatar stocké (chemin d'image ou emoji). Vide → photo par défaut.
//  • size   : diamètre en px en mode image (ignoré si `fill`).
//  • fill   : l'image remplit le conteneur parent (w-full h-full) — utile quand
//             un cadre rond englobe déjà l'avatar.
//  • className : classes appliquées (taille de police pour l'emoji, marges, etc.).
export default function Avatar({ value, size = 32, fill = false, className = '', fallback }) {
  const v = value || fallback || DEFAULT_AVATAR

  if (isImageAvatar(v)) {
    return (
      <img
        src={v}
        alt=""
        draggable={false}
        className={`object-cover rounded-full select-none ${fill ? 'w-full h-full' : 'inline-block align-middle'} ${className}`}
        style={fill ? undefined : { width: size, height: size }}
      />
    )
  }

  return <span className={className}>{v}</span>
}
