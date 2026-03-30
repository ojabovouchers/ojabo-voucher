import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)
const ToastContext = createContext(null)

export function AppProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [toasts, setToasts] = useState([])

  const toast = useCallback((message, type = 'default') => {
    const id = Date.now()
    setToasts(t => [...t, { id, message, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500)
  }, [])

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

  async function fetchProfile(userId) {
    const { data } = await supabase
      .from('operators')
      .select('*, locations(name)')
      .eq('auth_user_id', userId)
      .single()
    if (data) setProfile(data)
  }

  async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  async function signOut() {
    await supabase.auth.signOut()
    setProfile(null)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a1a2e' }}>
      <div style={{ color: '#e2b04a', fontSize: 18, fontWeight: 700 }}>Carregando...</div>
    </div>
  )

  return (
    <ToastContext.Provider value={toast}>
      <AuthContext.Provider value={{ user, profile, signIn, signOut }}>
        {children}
        <div className="toast-container">
          {toasts.map(t => (
            <div key={t.id} className={`toast ${t.type}`}>{t.message}</div>
          ))}
        </div>
      </AuthContext.Provider>
    </ToastContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
export const useToast = () => useContext(ToastContext)
