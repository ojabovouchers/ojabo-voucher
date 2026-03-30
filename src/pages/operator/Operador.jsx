import { useBranding } from '../../lib/useBranding'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../components/AppProvider'
import { formatCurrency, formatDate } from '../../lib/utils'

export default function Operador() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [voucher, setVoucher] = useState(null)
  const [error, setError] = useState('')
  const branding = useBranding()
  useEffect(() => { document.title = branding.appTitle }, [branding.appTitle])
  const [loading, setLoading] = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  // Redireciona se não estiver logado (via useEffect, não durante render)
  useEffect(() => {
    if (!user) navigate('/login', { replace: true })
  }, [user])

  async function searchVoucher(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setVoucher(null)
    setConfirmed(false)

    const { data, error: err } = await supabase
      .from('vouchers')
      .select('*, clients(name)')
      .eq('code', code.trim().toUpperCase())
      .single()

    setLoading(false)

    if (err || !data) {
      setError('Voucher não encontrado. Verifique o código digitado.')
      return
    }

    if (data.is_used) {
      setError(`Voucher já utilizado em ${data.used_at ? new Date(data.used_at).toLocaleString('pt-BR') : 'data desconhecida'}.`)
      return
    }

    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      setError(`Voucher expirado em ${formatDate(data.expires_at)}.`)
      return
    }

    setVoucher(data)
  }

  async function validateVoucher() {
    if (!voucher) return
    setLoading(true)

    const { error: err } = await supabase
      .from('vouchers')
      .update({
        is_used: true,
        used_at: new Date().toISOString(),
        operator_id: profile?.id || null,
        location_id: profile?.location_id || null,
      })
      .eq('id', voucher.id)
      .eq('is_used', false)

    setLoading(false)

    if (err) {
      setError('Erro ao validar. Tente novamente.')
      return
    }

    setConfirmed(true)
    setCode('')
  }

  function reset() {
    setCode('')
    setVoucher(null)
    setError('')
    setConfirmed(false)
  }

  async function handleLogout() {
    await signOut()
    navigate('/login', { replace: true })
  }

  if (!user) return null

  return (
    <div className="op-main" style={{ background: branding.loginBg }}>
      <div className="op-card">

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: branding.nameColor, letterSpacing: 1 }}>{branding.name}</div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>Validação de Vouchers</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12, fontWeight: 500 }}>{profile?.name || user?.email}</div>
            <div style={{ fontSize: 11, color: '#6b7280' }}>{profile?.locations?.name || 'Sem local'}</div>
            <button
              onClick={handleLogout}
              style={{ fontSize: 11, color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', marginTop: 4, padding: 0 }}>
              Sair
            </button>
          </div>
        </div>

        {/* Sucesso */}
        {confirmed && (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>✅</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#065f46', marginBottom: 6 }}>Voucher validado!</div>
            <div style={{ fontSize: 36, fontWeight: 800, color: '#1a1a2e', marginBottom: 4 }}>{formatCurrency(voucher.value)}</div>
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>Cliente: {voucher.clients?.name}</div>
            <div style={{ fontFamily: 'monospace', fontSize: 13, color: '#9ca3af', marginBottom: 28 }}>{voucher.code}</div>
            <button
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
              onClick={reset}>
              Validar outro voucher
            </button>
          </div>
        )}

        {/* Formulário */}
        {!confirmed && (
          <>
            <form onSubmit={searchVoucher}>
              <div className="form-group">
                <label>Código do voucher</label>
                <input
                  value={code}
                  onChange={e => { setCode(e.target.value); setError(''); setVoucher(null) }}
                  placeholder="CATH-XXXX-XXXX"
                  style={{ fontSize: 18, textTransform: 'uppercase', letterSpacing: 2, textAlign: 'center', padding: '12px' }}
                  autoFocus
                  autoComplete="off"
                />
              </div>
              {!voucher && (
                <button
                  type="submit"
                  className="btn btn-dark"
                  style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
                  disabled={!code || loading}>
                  {loading ? 'Buscando...' : 'Verificar voucher'}
                </button>
              )}
            </form>

            {/* Erro */}
            {error && (
              <div style={{ background: '#fee2e2', color: '#dc2626', padding: '12px 16px', borderRadius: 8, marginTop: 16, fontSize: 13, textAlign: 'center' }}>
                {error}
              </div>
            )}

            {/* Voucher encontrado */}
            {voucher && !error && (
              <div style={{ marginTop: 20 }}>
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '20px', marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 2 }}>Voucher disponível</div>
                      <div style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 700 }}>{voucher.code}</div>
                    </div>
                    <span className="badge badge-green">Válido</span>
                  </div>
                  <div style={{ fontSize: 36, fontWeight: 800, color: '#1a1a2e', marginBottom: 8 }}>{formatCurrency(voucher.value)}</div>
                  <div style={{ fontSize: 13, color: '#374151' }}>Cliente: <strong>{voucher.clients?.name}</strong></div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                    {voucher.expires_at ? `Válido até ${formatDate(voucher.expires_at)}` : 'Sem data de validade'}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={reset}>
                    Cancelar
                  </button>
                  <button
                    className="btn btn-primary"
                    style={{ flex: 2, justifyContent: 'center', padding: '12px' }}
                    onClick={validateVoucher}
                    disabled={loading}>
                    {loading ? 'Validando...' : '✓ Confirmar uso'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
