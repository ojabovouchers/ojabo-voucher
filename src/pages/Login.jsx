import { useBranding } from '../lib/useBranding'
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../components/AppProvider'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const branding = useBranding()
  useEffect(() => { document.title = branding.appTitle }, [branding.appTitle])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { user, profile } = useAuth()
  const navigate = useNavigate()

  // Detecta token de convite ou recuperação no hash da URL
  useEffect(() => {
    const hash = window.location.hash
    if (hash.includes('type=invite') || hash.includes('type=recovery')) {
      // Preserva o hash e redireciona para a página de redefinição de senha
      navigate('/redefinir-senha' + hash, { replace: true })
      return
    }
  }, [])

  // Se já está logado, redireciona para o lugar certo
  useEffect(() => {
    if (user && profile) {
      if (profile.role === 'admin') navigate('/admin', { replace: true })
      else navigate('/operador', { replace: true })
    }
  }, [user, profile])

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) throw signInError

      // Busca o perfil diretamente para redirecionar corretamente
      const { data: { user: loggedUser } } = await supabase.auth.getUser()
      if (loggedUser) {
        const { data: op } = await supabase
          .from('operators')
          .select('role')
          .eq('auth_user_id', loggedUser.id)
          .single()

        if (op?.role === 'admin') navigate('/admin', { replace: true })
        else navigate('/operador', { replace: true })
      }
    } catch (err) {
      setError('Email ou senha incorretos.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="op-login" style={{ background: branding.loginBg }}>
      <div className="op-login-card">
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: branding.nameColor, letterSpacing: 2 }}>{branding.name}</div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>Sistema de Vouchers</div>
        </div>

        {error && (
          <div style={{ background: '#fee2e2', color: '#dc2626', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
          </div>
          <div className="form-group">
            <label>Senha</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <button type="submit" className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', marginTop: 6 }}
            disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 18 }}>
          <Link to='/esqueci-senha' style={{ fontSize: 13, color: '#6b7280' }}>
            Esqueci minha senha
          </Link>
        </div>
      </div>
    </div>
  )
}
