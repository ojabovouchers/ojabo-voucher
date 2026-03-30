import { useBranding } from '../lib/useBranding'
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function EsqueciSenha() {
  const [email, setEmail] = useState('')
  const branding = useBranding()
  useEffect(() => { document.title = branding.appTitle }, [branding.appTitle])
  const [loading, setLoading] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    })

    setLoading(false)

    if (err) {
      setError('Não foi possível enviar o email. Verifique o endereço digitado.')
      return
    }

    setEnviado(true)
  }

  return (
    <div className="op-login" style={{ background: branding.loginBg }}>
      <div className="op-login-card">
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: branding.nameColor, letterSpacing: 2 }}>{branding.name}</div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>Recuperação de senha</div>
        </div>

        {enviado ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 44, marginBottom: 16 }}>📧</div>
            <h3 style={{ marginBottom: 10, fontSize: 16 }}>Email enviado!</h3>
            <p style={{ color: '#6b7280', fontSize: 13, lineHeight: 1.6, marginBottom: 24 }}>
              Enviamos um link de redefinição para <strong>{email}</strong>.
              Verifique sua caixa de entrada e spam.
            </p>
            <Link to="/login" style={{ fontSize: 13, color: '#e2b04a' }}>
              Voltar para o login
            </Link>
          </div>
        ) : (
          <>
            <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 20, lineHeight: 1.6 }}>
              Digite seu email de acesso. Enviaremos um link para você criar uma nova senha.
            </p>

            {error && (
              <div style={{ background: '#fee2e2', color: '#dc2626', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="seu@email.com.br"
                  required
                  autoFocus
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', marginTop: 6 }}
                disabled={loading}>
                {loading ? 'Enviando...' : 'Enviar link de recuperação'}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: 20 }}>
              <Link to="/login" style={{ fontSize: 13, color: '#6b7280' }}>
                ← Voltar para o login
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
