import { useEffect, useState } from 'react'
import { getAllQuestions, getCustomQuestions, subscribe } from '../utils/questionStore.js'

export function useAllQuestions() {
  const [list, setList] = useState(getAllQuestions)
  useEffect(() => subscribe(() => setList(getAllQuestions())), [])
  return list
}

export function useCustomQuestions() {
  const [list, setList] = useState(getCustomQuestions)
  useEffect(() => subscribe(() => setList(getCustomQuestions())), [])
  return list
}
