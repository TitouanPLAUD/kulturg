import { QUESTIONS as BUILTIN } from '../data/questions.js'

const KEY = 'minuit.customQuestions.v1'
const LEGACY_KEY = 'kulturg.customQuestions.v1'
// Migration douce
try {
  if (!localStorage.getItem(KEY) && localStorage.getItem(LEGACY_KEY)) {
    localStorage.setItem(KEY, localStorage.getItem(LEGACY_KEY))
    localStorage.removeItem(LEGACY_KEY)
  }
} catch {}

function loadCustom() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] }
}
function saveCustom(list) {
  localStorage.setItem(KEY, JSON.stringify(list))
}

// listeners for live UI updates
const listeners = new Set()
function notify() { listeners.forEach(fn => fn()) }
export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn) }

export function getAllQuestions() {
  return [...BUILTIN, ...loadCustom()]
}

export function getCustomQuestions() {
  return loadCustom()
}

export function addCustomQuestion(q) {
  const list = loadCustom()
  const id = `c${Date.now()}${Math.floor(Math.random() * 1000)}`
  list.push({ ...q, id, custom: true })
  saveCustom(list)
  notify()
  return id
}

export function deleteCustomQuestion(id) {
  saveCustom(loadCustom().filter(q => q.id !== id))
  notify()
}

export function updateCustomQuestion(id, patch) {
  const list = loadCustom().map(q => q.id === id ? { ...q, ...patch } : q)
  saveCustom(list)
  notify()
}

export function exportCustomJSON() {
  return JSON.stringify(loadCustom(), null, 2)
}

export function importCustomJSON(json) {
  const arr = JSON.parse(json)
  if (!Array.isArray(arr)) throw new Error('JSON invalide : tableau attendu')
  const cleaned = arr.filter(q =>
    q.theme && q.q && Array.isArray(q.choices) && q.choices.length >= 2 && typeof q.answer === 'number'
  ).map(q => ({ ...q, id: q.id || `c${Date.now()}${Math.floor(Math.random()*1e6)}`, custom: true }))
  saveCustom([...loadCustom(), ...cleaned])
  notify()
  return cleaned.length
}
