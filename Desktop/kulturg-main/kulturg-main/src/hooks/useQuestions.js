import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { getCustomQuestions, subscribe } from '../utils/questionStore.js'

// Cache module — partagé entre toutes les instances du hook
let _cache = null       // null = pas encore chargé, [] = chargé (même si vide)
let _promise = null
const _listeners = new Set()

function notify() { _listeners.forEach(fn => fn()) }

function loadOnce() {
  if (_cache !== null || _promise) return
  _promise = supabase
    .from('questions')
    .select('id, theme, difficulty, q, choices, answer, explain')
    .then(({ data, error }) => {
      if (error) console.error('[useQuestions] Supabase:', error.message)
      _cache = data ?? []
      notify()
    })
}

/** Toutes les questions (Supabase + custom locales). */
export function useAllQuestions() {
  const [base, setBase] = useState(() => _cache ?? [])
  const [custom, setCustom] = useState(getCustomQuestions)

  useEffect(() => {
    if (_cache === null) {
      const update = () => setBase(_cache ?? [])
      _listeners.add(update)
      loadOnce()
      return () => _listeners.delete(update)
    }
  }, [])

  useEffect(() => subscribe(() => setCustom(getCustomQuestions())), [])

  return [...base, ...custom]
}

/** Questions personnalisées (localStorage uniquement). */
export function useCustomQuestions() {
  const [list, setList] = useState(getCustomQuestions)
  useEffect(() => subscribe(() => setList(getCustomQuestions())), [])
  return list
}

/** true quand le chargement depuis Supabase est terminé. */
export function useQuestionsLoaded() {
  const [loaded, setLoaded] = useState(_cache !== null)
  useEffect(() => {
    if (_cache === null) {
      const update = () => setLoaded(true)
      _listeners.add(update)
      loadOnce()
      return () => _listeners.delete(update)
    }
  }, [])
  return loaded
}
