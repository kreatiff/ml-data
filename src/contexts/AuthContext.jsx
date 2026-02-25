import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'

const AuthContext = createContext(null)

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

// Restore last-known avatar so the navbar renders instantly
function getCachedProfile() {
  try {
    const cached = localStorage.getItem('cached_profile')
    return cached ? JSON.parse(cached) : null
  } catch { return null }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(getCachedProfile)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async (userId) => {
    if (!userId) {
      setProfile(null)
      return
    }
    const { data } = await supabase
      .from('competitors')
      .select('*')
      .eq('auth_user_id', userId)
      .single()
    setProfile(data)
    // Cache for instant navbar avatar on next page load
    if (data) {
      localStorage.setItem('cached_profile', JSON.stringify({
        name: data.name, avatar_url: data.avatar_url, role: data.role
      }))
    } else {
      localStorage.removeItem('cached_profile')
    }
  }, [])

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession)
      setUser(initialSession?.user ?? null)
      if (initialSession?.user) fetchProfile(initialSession.user.id)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession)
        setUser(newSession?.user ?? null)
        fetchProfile(newSession?.user?.id)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const validateAccessCode = useCallback(async (accessCode) => {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/verify-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ password: accessCode }),
    })

    const data = await response.json()
    return data.success === true
  }, [])

  const signUp = useCallback(async (email, password, accessCode) => {
    // Validate the access code first
    const isValid = await validateAccessCode(accessCode)
    if (!isValid) {
      return { error: { message: 'Incorrect access code' } }
    }

    // Access code is valid — proceed with Supabase Auth sign up
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })

    return { data, error }
  }, [validateAccessCode])

  const signIn = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    return { data, error }
  }, [])

  const signOut = useCallback(async () => {
    // Clear legacy localStorage keys
    localStorage.removeItem('app_access_token')
    localStorage.removeItem('app_is_admin')
    localStorage.removeItem('cached_profile')

    const { error } = await supabase.auth.signOut()
    return { error }
  }, [])

  const updatePassword = useCallback(async (newPassword) => {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword
    })
    return { data, error }
  }, [])

  const isAdmin = profile?.role === 'admin'

  const value = {
    user,
    profile,
    isAdmin,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    updatePassword,
    refreshProfile: () => fetchProfile(user?.id)
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
