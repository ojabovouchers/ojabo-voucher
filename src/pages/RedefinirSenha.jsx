import { useBranding } from '../lib/useBranding'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function RedefinirSenha() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const branding = useBranding()
  useEffect(() => { document.title = branding.appTitle }, [branding.appTitle])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [concluido, setConcluido] = useState(false)
  const [pronto, setPronto] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    // Marca que estamos em fluxo de redefinição — impede redirecionamento automático
    sessionStorage.setItem('redefining_password', '1')

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') && session) {
        setPronto(true)
      }
    })

    // Verifica sessão já existente
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setPronto(true)
    })

    return () => {
      subscription.unsubscribe()
      sessionStorage.removeItem('redefining_password')
    }
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (password !== confirm) { setError('As senhas não coincidem.'); return }
    if (password.length < 6) { setError('A senha deve ter no mínimo 6 caracteres.'); return }

    setLoading(true)
    const { error: err } = await supabase.auth.updateUser({ password })
    if (err) { setLoading(false); setError('Erro ao salvar senha. Tente novamente.'); return }

    // Desloga e redireciona para login
    sessionStorage.removeItem('redefining_password')
    await supabase.auth.signOut()
    setLoading(false)
    setConcluido(true)
    setTimeout(() => navigate('/login'), 3000)
  }

  if (!pronto && !concluido) {
    return (
      <div className="op-login" style={{ background: branding.loginBg }}>
        <div className="op-login-card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: 14, color: '#6b7280' }}>Carregando...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="op-login" style={{ background: branding.loginBg }}>
      <div className="op-login-card">
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: branding.nameColor, letterSpacing: 2 }}>{branding.name}</div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>Criar senha de acesso</div>
        </div>

        {concluido && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 44, marginBottom: 16 }}>✅</div>
            <h3 style={{ marginBottom: 10, fontSize: 16 }}>Senha criada com sucesso!</h3>
            <p style={{ color: '#6b7280', fontSize: 13, lineHeight: 1.6 }}>
              Agora faça login com seu email e senha. Redirecionando...
            </p>
          </div>
        )}

        {pronto && !concluido && (
          <>
            <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 20, lineHeight: 1.6 }}>
              Crie uma senha para acessar o sistema.
            </p>
            {error && (
              <div style={{ background: '#fee2e2', color: '#dc2626', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Nova senha *</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres" minLength={6} required autoFocus />
              </div>
              <div className="form-group">
                <label>Confirmar senha *</label>
                <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                  placeholder="Repita a senha" minLength={6} required />
                {confirm && password !== confirm && (
                  <small style={{ color: '#dc2626', fontSize: 12, marginTop: 4, display: 'block' }}>
                    As senhas não coincidem.
                  </small>
                )}
              </div>
              <button type="submit" className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', marginTop: 6 }}
                disabled={loading || (!!confirm && password !== confirm)}>
                {loading ? 'Salvando...' : 'Criar senha'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
