// État de sanction d'un profil.
// Renvoie { active, permanent, until?, reason? }
export function banState(profile) {
  if (!profile) return { active: false }
  if (profile.banned) {
    return { active: true, permanent: true, reason: profile.ban_reason }
  }
  if (profile.banned_until) {
    const until = new Date(profile.banned_until)
    if (until > new Date()) {
      return { active: true, permanent: false, until, reason: profile.ban_reason }
    }
  }
  return { active: false }
}
