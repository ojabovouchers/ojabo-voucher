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
  const [sessaoValida, setSessaoValida] = useState(false)
  const [verificando, setVerificando] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    let unsubscribe = () => {}

    async function init() {
      // Escuta mudanças de autenticação PRIMEIRO antes de qualquer verificação
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
          if (session) {
            setSessaoValida(true)
            setVerificando(false)
          }
        }
      })
      unsubscribe = subscription.unsubscribe

      // Verifica se já há sessão ativa
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setSessaoValida(true)
        setVerificando(false)
        return
      }

      // Timeout de segurança — se em 5s não vier sessão, mostra link inválido
      setTimeout(() => setVerificando(false), 5000)
    }

    init()
    return () => unsubscribe()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (password !== confirm) { setError('As senhas não coincidem.'); return }
    if (password.length < 6) { setError('A senha deve ter no mínimo 6 caracteres.'); return }

    setLoading(true)
    const { error: err } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (err) { setError('Não foi possível definir a senha. O link pode ter expirado.'); return }

    // Desloga para forçar login manual com email + senha
    await supabase.auth.signOut()
    setConcluido(true)
    setTimeout(() => navigate('/login'), 3000)
  }

  if (verificando) {
    return (
      <div className="op-login" style={{ background: branding.loginBg }}>
        <div className="op-login-card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 14, color: '#6b7280' }}>Verificando link...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="op-login" style={{ background: branding.loginBg }}>
      <div className="op-login-card">
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: branding.nameColor, letterSpacing: 2 }}>{branding.name}</div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
            {window.location.hash.includes('type=invite') ? 'Criar senha de acesso' : 'Redefinir senha'}
          </div>
        </div>

        {/* Sucesso */}
        {concluido && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 44, marginBottom: 16 }}>✅</div>
            <h3 style={{ marginBottom: 10, fontSize: 16 }}>Senha definida com sucesso!</h3>
            <p style={{ color: '#6b7280', fontSize: 13, lineHeight: 1.6 }}>
              Agora você pode fazer login com seu email e senha. Redirecionando...
            </p>
          </div>
        )}

        {/* Link inválido */}
        {!concluido && !sessaoValida && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 44, marginBottom: 16 }}>⚠️</div>
            <h3 style={{ marginBottom: 10, fontSize: 16 }}>Link inválido ou expirado</h3>
            <p style={{ color: '#6b7280', fontSize: 13, lineHeight: 1.6, marginBottom: 24 }}>
              Este link não é mais válido. Solicite um novo ou entre em contato com o administrador.
            </p>
            <button onClick={() => navigate('/login')} className="btn btn-primary" style={{ justifyContent: 'center', width: '100%' }}>
              Ir para o login
            </button>
          </div>
        )}

        {/* Formulário */}
        {!concluido && sessaoValida && (
          <>
            <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 20, lineHeight: 1.6 }}>
              {window.location.hash.includes('type=invite')
                ? 'Crie uma senha para acessar o sistema.'
                : 'Digite sua nova senha abaixo.'}
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
                {loading ? 'Salvando...' : window.location.hash.includes('type=invite') ? 'Criar senha' : 'Redefinir senha'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
