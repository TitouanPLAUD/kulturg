import { supabase } from '../lib/supabase.js'

// Questions communautaires acceptées, chargées depuis la DB au démarrage et
// injectées dans le pool de questions des modes multijoueur (sans rebuild).
let _community = []
const listeners = new Set()

export function getCommunityQuestions() { return _community }
export function subscribeCommunity(fn) { listeners.add(fn); return () => listeners.delete(fn) }

function rowToQuestion(row) {
  const base = { id: `cq_${row.id}`, theme: row.theme, difficulty: row.difficulty ?? 2, q: row.q }
  if (row.format === 'open') {
    return { ...base, type: 'open', answer: row.answer_text ?? '', accepts: row.accepts ?? [] }
  }
  return { ...base, choices: row.choices ?? [], answer: row.answer_idx ?? 0 }
}

export async function loadCommunityQuestions() {
  const { data, error } = await supabase
    .from('community_questions')
    .select('*')
    .eq('status', 'accepted')
  if (error || !data) return _community
  _community = data.map(rowToQuestion)
  listeners.forEach(fn => fn())
  return _community
}
