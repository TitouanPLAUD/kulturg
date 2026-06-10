import { supabase } from '../lib/supabase.js'

// ─── Système d'ELO (ranked) ───────────────────────────────────
// Les gains/pertes d'ELO dépendent du classement final ET du nombre de joueurs.
//
// Règles :
//  • Le 1er gagne le plus, dégressif jusqu'au milieu de la grille.
//  • Une zone neutre (0) au milieu.
//  • On ne peut PERDRE de l'ELO qu'à partir de 8 joueurs (N > 7).
//    Les pertes augmentent avec le nombre de joueurs jusqu'à −20 pour le
//    dernier d'une partie complète (15 joueurs).
//
// Exemples (cohérents avec la spec) :
//  • 15 joueurs : +20,+17,+14,+11,+8,+5,+2 (1-7), 0 (8-10), −4,−8,−12,−16,−20 (11-15)
//  • 3 joueurs  : +10 (1er), 0, 0  (aucune perte sous 8 joueurs)
//  • 2 joueurs  : +8 (1er), 0

export const ELO_START = 1000
const FULL_PLAYERS = 15
const MAX_DELTA = 20

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)) }

// Gain max du vainqueur selon le nombre de joueurs (8 → 20, plafonné).
function topGainFor(n) {
  return clamp(6 + 2 * (n - 1), 4, MAX_DELTA)
}

// Perte max (pour le dernier) : 0 sous 8 joueurs, puis rampe jusqu'à −20 à 15.
function maxLossFor(n) {
  if (n <= 7) return 0
  return clamp(Math.round(MAX_DELTA * (n - 7) / (FULL_PLAYERS - 7)), 2, MAX_DELTA)
}

/**
 * Renvoie le tableau des variations d'ELO par rang (index 0 = 1er).
 * @param {number} n nombre de joueurs classés
 * @returns {number[]} deltas, longueur n
 */
export function eloDeltas(n) {
  if (n <= 0) return []
  if (n === 1) return [0] // solo : pas de ranked

  const winners = Math.max(1, Math.floor(n / 2))
  const maxLoss = maxLossFor(n)
  const losers  = maxLoss > 0
    ? Math.max(1, n - winners - Math.floor(n / 5))
    : 0
  const neutral = n - winners - losers

  const topGain = topGainFor(n)
  const gainMin = 2

  const deltas = new Array(n).fill(0)

  // Gagnants : du topGain (1er) au gainMin (dernier gagnant), linéaire
  for (let i = 0; i < winners; i++) {
    deltas[i] = winners === 1
      ? topGain
      : Math.round(topGain - (topGain - gainMin) * i / (winners - 1))
  }

  // Zone neutre : déjà à 0 (indices winners .. winners+neutral-1)
  void neutral

  // Perdants : du plus petit (premier perdant) à −maxLoss (dernier), linéaire
  for (let j = 1; j <= losers; j++) {
    const idx = n - losers + (j - 1)
    deltas[idx] = -Math.round(maxLoss * j / losers)
  }

  return deltas
}

/**
 * Delta d'ELO pour un rang donné (1-based) dans une partie de n joueurs.
 */
export function eloDeltaForRank(rank, n) {
  const arr = eloDeltas(n)
  return arr[rank - 1] ?? 0
}

// ── Application de l'ELO (une seule fois par room+joueur) ──────
const ELO_APPLIED_KEY = 'multi_elo_applied'
function getApplied() {
  try { return new Set(JSON.parse(localStorage.getItem(ELO_APPLIED_KEY) ?? '[]')) }
  catch { return new Set() }
}
function saveApplied(set) {
  try { localStorage.setItem(ELO_APPLIED_KEY, JSON.stringify([...set].slice(-500))) } catch {}
}

/**
 * Applique le delta d'ELO au profil du joueur, une seule fois par room.
 * L'ELO peut baisser (contrairement à l'XP). Met à jour profiles.elo (RLS : own).
 * @returns {Promise<{applied:boolean, delta:number, newElo:number}>}
 */
export async function applyEloOnce({ roomId, userId, currentElo, delta }) {
  const base = Math.round(currentElo ?? ELO_START)
  if (!roomId || !userId) return { applied: false, delta: 0, newElo: base }
  const key = `${roomId}:${userId}`
  const applied = getApplied()
  if (applied.has(key)) return { applied: false, delta: 0, newElo: base }
  applied.add(key); saveApplied(applied)
  const newElo = Math.max(0, base + Math.round(delta))
  await supabase.from('profiles').update({ elo: newElo }).eq('id', userId)
  return { applied: true, delta: Math.round(delta), newElo }
}
