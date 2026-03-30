import { useBranding } from '../lib/useBranding'
import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
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
  const navigate = useNavigate()

  useEffect(() => {
    // O Supabase injeta a sessão automaticamente via hash na URL
    // quando o usuário clica no link do email
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSessaoValida(true)
      } else {
        // Aguarda um momento para o Supabase processar o hash da URL
        setTimeout(() => {
          supabase.auth.getSession().then(({ data: { session: s } }) => {
            setSessaoValida(!!s)
          })
        }, 1000)
      }
    })

    // Escuta recuperação de senha E convite de novo operador
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setSessaoValida(true)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (password !== confirm) {
      setError('As senhas não coincidem.')
      return
    }
    if (password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres.')
      return
    }

    setLoading(true)

    const { error: err } = await supabase.auth.updateUser({ password })

    setLoading(false)

    if (err) {
      setError('Não foi possível redefinir a senha. O link pode ter expirado.')
      return
    }

    setConcluido(true)
    // Redireciona para login após 3 segundos
    setTimeout(() => navigate('/login'), 3000)
  }

  return (
    <div className="op-login" style={{ background: branding.loginBg }}>
      <div className="op-login-card">
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: branding.nameColor, letterSpacing: 2 }}>{branding.name}</div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>Redefinir senha</div>
        </div>

        {/* Sucesso */}
        {concluido && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 44, marginBottom: 16 }}>✅</div>
            <h3 style={{ marginBottom: 10, fontSize: 16 }}>Senha redefinida!</h3>
            <p style={{ color: '#6b7280', fontSize: 13, lineHeight: 1.6 }}>
              Sua senha foi alterada com sucesso. Redirecionando para o login...
            </p>
          </div>
        )}

        {/* Link inválido ou expirado */}
        {!concluido && !sessaoValida && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 44, marginBottom: 16 }}>⚠️</div>
            <h3 style={{ marginBottom: 10, fontSize: 16 }}>Link inválido ou expirado</h3>
            <p style={{ color: '#6b7280', fontSize: 13, lineHeight: 1.6, marginBottom: 24 }}>
              Este link de recuperação não é mais válido. Solicite um novo link.
            </p>
            <Link to="/esqueci-senha" className="btn btn-primary" style={{ justifyContent: 'center' }}>
              Solicitar novo link
            </Link>
          </div>
        )}

        {/* Formulário */}
        {!concluido && sessaoValida && (
          <>
            <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 20, lineHeight: 1.6 }}>
              Digite sua nova senha abaixo.
            </p>

            {error && (
              <div style={{ background: '#fee2e2', color: '#dc2626', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Nova senha *</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  minLength={6}
                  required
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label>Confirmar nova senha *</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="Repita a senha"
                  minLength={6}
                  required
                />
                {confirm && password !== confirm && (
                  <small style={{ color: '#dc2626', fontSize: 12, marginTop: 4, display: 'block' }}>
                    As senhas não coincidem.
                  </small>
                )}
              </div>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', marginTop: 6 }}
                disabled={loading || (!!confirm && password !== confirm)}>
                {loading ? 'Salvando...' : 'Redefinir senha'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
