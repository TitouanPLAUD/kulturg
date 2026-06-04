// Photos de profil disponibles.
// Pour l'instant une seule est proposée — il suffit d'ajouter une entrée
// ici (avec une image dans /public/avatars/) pour en proposer d'autres.
export const AVATARS = [
  {
    id:    'etudiant-ingenieur',
    src:   '/avatars/etudiant-ingenieur.png',
    label: 'Étudiant ingénieur',
  },
  {
    id:    'chat-genieur',
    src:   '/avatars/chat-genieur.png',
    label: 'Chat-génieur',
  },
]

// Photo de profil par défaut des nouveaux comptes (et fallback d'affichage).
export const DEFAULT_AVATAR = AVATARS[0].src

// Un avatar « image » est un chemin (commence par / ou http).
// Sinon c'est un emoji (ancien format, conservé pour rétrocompatibilité).
export function isImageAvatar(v) {
  return typeof v === 'string' && (v.startsWith('/') || v.startsWith('http'))
}
