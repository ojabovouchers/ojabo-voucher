import { useBranding } from '../../lib/useBranding'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../components/AppProvider'
import { formatCurrency, formatDate, generateVoucherCode } from '../../lib/utils'

export default function Operador() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const branding = useBranding()
  useEffect(() => { document.title = branding.appTitle }, [branding.appTitle])

  // Aba ativa
  const [tab, setTab] = useState('validar')
  const [canGenerate, setCanGenerate] = useState(false)

  // Validação
  const [code, setCode] = useState('')
  const [voucher, setVoucher] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  // Geração
  const [clients, setClients] = useState([])
  const [locations, setLocations] = useState([])
  const [genForm, setGenForm] = useState({ client_id: '', value: '', location_id: '', no_expiry: true, expires_at: '' })
  const [genSuccess, setGenSuccess] = useState(null)
  const [genLoading, setGenLoading] = useState(false)

  useEffect(() => {
    if (!user) navigate('/login', { replace: true })
  }, [user])

  useEffect(() => {
    // Verifica permissão de gerar vouchers
    supabase.from('settings').select('value').eq('key', 'operator_can_generate').single()
      .then(({ data }) => {
        if (data?.value === 'true') {
          setCanGenerate(true)
          loadClientsAndLocations()
        }
      })
  }, [])

  async function loadClientsAndLocations() {
    const [c, l] = await Promise.all([
      supabase.from('clients').select('id, name').order('name'),
      supabase.from('locations').select('*').order('name'),
    ])
    setClients(c.data || [])
    setLocations(l.data || [])
  }

  // --- VALIDAÇÃO ---
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

    if (err || !data) { setError('Voucher não encontrado. Verifique o código digitado.'); return }
    if (data.is_used) { setError(`Voucher já utilizado em ${data.used_at ? new Date(data.used_at).toLocaleString('pt-BR') : 'data desconhecida'}.`); return }
    if (data.expires_at && new Date(data.expires_at) < new Date()) { setError(`Voucher expirado em ${formatDate(data.expires_at)}.`); return }

    setVoucher(data)
  }

  async function validateVoucher() {
    if (!voucher) return
    setLoading(true)

    const { error: err } = await supabase.from('vouchers').update({
      is_used: true,
      used_at: new Date().toISOString(),
      operator_id: profile?.id || null,
      location_id: profile?.location_id || null,
    }).eq('id', voucher.id).eq('is_used', false)

    setLoading(false)
    if (err) { setError('Erro ao validar. Tente novamente.'); return }
    setConfirmed(true)
    setCode('')
  }

  function resetValidacao() {
    setCode(''); setVoucher(null); setError(''); setConfirmed(false)
  }

  // --- GERAÇÃO ---
  async function generateVoucher(e) {
    e.preventDefault()
    setGenLoading(true)
    try {
      const expires_at = genForm.no_expiry ? null : genForm.expires_at || null
      const { data, error: err } = await supabase.from('vouchers').insert({
        client_id: genForm.client_id,
        code: generateVoucherCode(),
        value: parseFloat(genForm.value),
        expires_at,
        location_id: genForm.location_id || null,
        is_used: false,
      }).select('*, clients(name)').single()

      if (err) throw err
      setGenSuccess(data)
      setGenForm({ client_id: '', value: '', location_id: '', no_expiry: true, expires_at: '' })
    } catch (err) {
      alert('Erro ao gerar voucher: ' + err.message)
    } finally {
      setGenLoading(false)
    }
  }

  if (!user) return null

  return (
    <div className="op-main" style={{ background: branding.loginBg }}>
      <div className="op-card">

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: branding.nameColor, letterSpacing: 1 }}>{branding.name}</div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>Sistema de Vouchers</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12, fontWeight: 500 }}>{profile?.name || user?.email}</div>
            <div style={{ fontSize: 11, color: '#6b7280' }}>{profile?.locations?.name || 'Sem local'}</div>
            <button onClick={async () => { await signOut(); navigate('/login', { replace: true }) }}
              style={{ fontSize: 11, color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', marginTop: 4, padding: 0 }}>
              Sair
            </button>
          </div>
        </div>

        {/* Abas — só aparece se puder gerar */}
        {canGenerate && (
          <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '2px solid #f3f4f6' }}>
            {['validar', 'gerar'].map(t => (
              <button key={t} onClick={() => setTab(t)}
                style={{
                  flex: 1, padding: '10px', background: 'none', border: 'none', cursor: 'pointer',
                  fontWeight: tab === t ? 700 : 400, fontSize: 14,
                  color: tab === t ? '#1a1a2e' : '#9ca3af',
                  borderBottom: tab === t ? '2px solid #1a1a2e' : '2px solid transparent',
                  marginBottom: -2,
                }}>
                {t === 'validar' ? '✓ Validar' : '+ Gerar'}
              </button>
            ))}
          </div>
        )}

        {/* ABA VALIDAR */}
        {tab === 'validar' && (
          <>
            {confirmed && (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <div style={{ fontSize: 52, marginBottom: 12 }}>✅</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#065f46', marginBottom: 6 }}>Voucher validado!</div>
                <div style={{ fontSize: 36, fontWeight: 800, color: '#1a1a2e', marginBottom: 4 }}>{formatCurrency(voucher.value)}</div>
                <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>Cliente: {voucher.clients?.name}</div>
                <div style={{ fontFamily: 'monospace', fontSize: 13, color: '#9ca3af', marginBottom: 28 }}>{voucher.code}</div>
                <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px' }} onClick={resetValidacao}>
                  Validar outro voucher
                </button>
              </div>
            )}

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
                      autoFocus autoComplete="off"
                    />
                  </div>
                  {!voucher && (
                    <button type="submit" className="btn btn-dark" style={{ width: '100%', justifyContent: 'center', padding: '12px' }} disabled={!code || loading}>
                      {loading ? 'Buscando...' : 'Verificar voucher'}
                    </button>
                  )}
                </form>

                {error && (
                  <div style={{ background: '#fee2e2', color: '#dc2626', padding: '12px 16px', borderRadius: 8, marginTop: 16, fontSize: 13, textAlign: 'center' }}>
                    {error}
                  </div>
                )}

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
                      <button className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={resetValidacao}>Cancelar</button>
                      <button className="btn btn-primary" style={{ flex: 2, justifyContent: 'center', padding: '12px' }} onClick={validateVoucher} disabled={loading}>
                        {loading ? 'Validando...' : '✓ Confirmar uso'}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* ABA GERAR */}
        {tab === 'gerar' && (
          <>
            {genSuccess && (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🎟️</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#065f46', marginBottom: 6 }}>Voucher gerado!</div>
                <div style={{ fontFamily: 'monospace', fontSize: 20, fontWeight: 800, color: '#1a1a2e', letterSpacing: 2, marginBottom: 4 }}>{genSuccess.code}</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: '#1a1a2e', marginBottom: 4 }}>{formatCurrency(genSuccess.value)}</div>
                <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 24 }}>Cliente: {genSuccess.clients?.name}</div>
                <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px' }} onClick={() => setGenSuccess(null)}>
                  Gerar outro voucher
                </button>
              </div>
            )}

            {!genSuccess && (
              <form onSubmit={generateVoucher}>
                <div className="form-group">
                  <label>Cliente *</label>
                  <select value={genForm.client_id} onChange={e => setGenForm({ ...genForm, client_id: e.target.value })} required>
                    <option value="">Selecione o cliente...</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Valor (R$) *</label>
                  <input type="number" step="0.01" min="1" placeholder="50.00"
                    value={genForm.value} onChange={e => setGenForm({ ...genForm, value: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Válido em</label>
                  <select value={genForm.location_id} onChange={e => setGenForm({ ...genForm, location_id: e.target.value })}>
                    <option value="">Todas as unidades</option>
                    {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input type="checkbox" checked={genForm.no_expiry}
                      onChange={e => setGenForm({ ...genForm, no_expiry: e.target.checked })}
                      style={{ width: 'auto' }} />
                    Sem data de validade
                  </label>
                </div>
                {!genForm.no_expiry && (
                  <div className="form-group">
                    <label>Data de validade</label>
                    <input type="date" value={genForm.expires_at} onChange={e => setGenForm({ ...genForm, expires_at: e.target.value })} />
                  </div>
                )}
                <button type="submit" className="btn btn-dark" style={{ width: '100%', justifyContent: 'center', padding: '12px' }} disabled={genLoading}>
                  {genLoading ? 'Gerando...' : '+ Gerar voucher'}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  )
}
