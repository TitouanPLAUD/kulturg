import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  async function fetchProfile(userId) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    setProfile(data)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setProfile(null)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function refreshProfile() {
    if (user) await fetchProfile(user.id)
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  const isFounder = !!user && FOUNDER_IDS.includes(user.id)

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut, refreshProfile, isFounder }}>
      {children}
    </AuthContext.Provider>
  )
}

// Comptes fondateurs (accès à la page admin)
export const FOUNDER_IDS = [
  'cde9f634-0188-448f-915e-9e70cb82aca9', // 31avgeek
  '1375fb6b-b869-4586-8e78-c2a9248c8e3d', // edouardvasse
]

export function useAuth() {
  return useContext(AuthContext)
}
