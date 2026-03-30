import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function DevLogin() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  function handleSubmit(e) {
    e.preventDefault()
    const devPass = import.meta.env.VITE_DEV_PASSWORD
    if (password === devPass) {
      sessionStorage.setItem('dev_auth', '1')
      navigate('/dev')
    } else {
      setError('Senha incorreta.')
      setPassword('')
    }
  }

  return (
    <div className="op-login">
      <div className="op-login-card">
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>Acesso restrito</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#1a1a2e' }}>Painel do Desenvolvedor</div>
        </div>
        {error && (
          <div style={{ background: '#fee2e2', color: '#dc2626', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Senha de desenvolvedor</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required autoFocus />
          </div>
          <button type="submit" className="btn btn-dark" style={{ width: '100%', justifyContent: 'center', marginTop: 6 }}>
            Entrar
          </button>
        </form>
        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <a href="/login" style={{ fontSize: 13, color: '#6b7280' }}>← Voltar ao login</a>
        </div>
      </div>
    </div>
  )
}
