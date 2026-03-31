import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../components/AppProvider'
import { formatCurrency, formatDate } from '../../lib/utils'
import { useToast } from '../../components/AppProvider'

export default function ValidarVoucher() {
  const { profile } = useAuth()
  const toast = useToast()
  const [code, setCode] = useState('')
  const [voucher, setVoucher] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  async function searchVoucher(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setVoucher(null)
    setConfirmed(false)

    const { data, error: err } = await supabase
      .from('vouchers')
      .select('*, clients(name), locations(name)')
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
      })
      .eq('id', voucher.id)
      .eq('is_used', false)

    setLoading(false)

    if (err) {
      toast('Erro ao validar. Tente novamente.', 'error')
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

  return (
    <div className="page-content">
      <div className="topbar"><h1>Validar Voucher</h1></div>

      <div style={{ padding: '24px 28px', maxWidth: 480 }}>

        {/* Sucesso */}
        {confirmed && (
          <div className="card" style={{ textAlign: 'center', padding: '40px 24px' }}>
            <div style={{ fontSize: 56, marginBottom: 12 }}>✅</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#065f46', marginBottom: 8 }}>
              Voucher validado!
            </div>
            <div style={{ fontSize: 38, fontWeight: 800, color: '#1a1a2e', marginBottom: 6 }}>
              {formatCurrency(voucher.value)}
            </div>
            <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 4 }}>
              Cliente: <strong>{voucher.clients?.name}</strong>
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: 13, color: '#9ca3af', marginBottom: 28 }}>
              {voucher.code}
            </div>
            <button className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
              onClick={reset}>
              Validar outro voucher
            </button>
          </div>
        )}

        {/* Formulário */}
        {!confirmed && (
          <div className="card">
            <form onSubmit={searchVoucher}>
              <div className="form-group">
                <label>Código do voucher</label>
                <input
                  value={code}
                  onChange={e => { setCode(e.target.value); setError(''); setVoucher(null) }}
                  placeholder="CATH-XXXX-XXXX"
                  style={{ fontSize: 18, textTransform: 'uppercase', letterSpacing: 2, textAlign: 'center', padding: '14px' }}
                  autoFocus
                  autoComplete="off"
                />
              </div>
              {!voucher && (
                <button type="submit" className="btn btn-primary"
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
                  <div style={{ fontSize: 36, fontWeight: 800, color: '#1a1a2e', marginBottom: 8 }}>
                    {formatCurrency(voucher.value)}
                  </div>
                  <div style={{ fontSize: 13, color: '#374151' }}>
                    Cliente: <strong>{voucher.clients?.name}</strong>
                  </div>
                  {voucher.locations?.name && (
                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                      Válido em: {voucher.locations.name}
                    </div>
                  )}
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                    {voucher.expires_at ? `Válido até ${formatDate(voucher.expires_at)}` : 'Sem data de validade'}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={reset}>
                    Cancelar
                  </button>
                  <button className="btn btn-primary"
                    style={{ flex: 2, justifyContent: 'center', padding: '12px' }}
                    onClick={validateVoucher}
                    disabled={loading}>
                    {loading ? 'Validando...' : '✓ Confirmar uso'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
