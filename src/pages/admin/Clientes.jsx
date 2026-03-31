import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { generateVoucherCode, formatCurrency, formatDate, whatsappLink } from '../../lib/utils'
import { downloadVoucherPNG, downloadVoucherPDF } from '../../lib/voucherArt'
import { useToast } from '../../components/AppProvider'
import * as XLSX from 'xlsx'

const PAYMENT_METHODS = ['PIX', 'Dinheiro', 'Cartão de Crédito', 'Cartão de Débito', 'Brinde/Grátis', 'Outro']

export default function Clientes() {
  const toast = useToast()
  const [clients, setClients] = useState([])
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [showClientModal, setShowClientModal] = useState(false)
  const [showVoucherModal, setShowVoucherModal] = useState(false)
  const [showVouchersOf, setShowVouchersOf] = useState(null)
  const [showEditVoucher, setShowEditVoucher] = useState(null)
  const [selectedClient, setSelectedClient] = useState(null)
  const [search, setSearch] = useState('')

  const [clientForm, setClientForm] = useState({ name: '', phone: '', payment_method: 'PIX', pix_account: '' })
  const [voucherForm, setVoucherForm] = useState({ quantity: 1, value: '', expires_at: '', no_expiry: true, location_id: '' })
  const [editVoucherForm, setEditVoucherForm] = useState({ value: '', expires_at: '', no_expiry: true, location_id: '' })
  const [saving, setSaving] = useState(false)
  const [pixKeys, setPixKeys] = useState([])
  const [pixSearch, setPixSearch] = useState('')
  const [showPixDropdown, setShowPixDropdown] = useState(false)

  useEffect(() => {
    loadClients()
    supabase.from('locations').select('*').order('name').then(({ data }) => setLocations(data || []))
    supabase.from('pix_keys').select('*').order('company_name').then(({ data }) => setPixKeys(data || []))
  }, [])

  async function loadClients() {
    const { data } = await supabase
      .from('clients')
      .select('*, vouchers(id, code, is_used, value, expires_at, location_id, locations(name))')
      .order('created_at', { ascending: false })
    setClients(data || [])
    setLoading(false)
  }

  async function saveClient(e) {
    e.preventDefault()
    setSaving(true)
    try {
      if (selectedClient) {
        const { error } = await supabase.from('clients').update(clientForm).eq('id', selectedClient.id)
        if (error) throw error
        toast('Cliente atualizado!', 'success')
      } else {
        const { error } = await supabase.from('clients').insert({ ...clientForm, purchase_date: new Date().toISOString() })
        if (error) throw error
        toast('Cliente cadastrado!', 'success')
      }
      setShowClientModal(false)
      setClientForm({ name: '', phone: '', payment_method: 'PIX', pix_account: '' })
      setPixSearch('')
      setShowPixDropdown(false)
      setSelectedClient(null)
      loadClients()
    } catch {
      toast('Erro ao salvar cliente.', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function generateVouchers(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const qty = parseInt(voucherForm.quantity)
      const value = parseFloat(voucherForm.value)
      const expires_at = voucherForm.no_expiry ? null : (voucherForm.expires_at ? voucherForm.expires_at + 'T23:59:59.000Z' : null)
      const location_id = voucherForm.location_id || null

      const vouchers = Array.from({ length: qty }, () => ({
        client_id: selectedClient.id,
        code: generateVoucherCode(),
        value,
        expires_at,
        location_id,
        is_used: false,
      }))

      const { error } = await supabase.from('vouchers').insert(vouchers)
      if (error) throw error

      toast(`${qty} voucher(s) gerado(s) com sucesso!`, 'success')
      setShowVoucherModal(false)
      setVoucherForm({ quantity: 1, value: '', expires_at: '', no_expiry: true, location_id: '' })
      loadClients()

      const { data: updatedClient } = await supabase.from('clients').select('*').eq('id', selectedClient.id).single()
      if (updatedClient) openVouchers(updatedClient)
    } catch {
      toast('Erro ao gerar vouchers.', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function saveEditVoucher(e) {
    e.preventDefault()
    if (!showEditVoucher) return
    setSaving(true)
    try {
      const expires_at = editVoucherForm.no_expiry ? null : (editVoucherForm.expires_at ? editVoucherForm.expires_at + 'T23:59:59.000Z' : null)
      const { error } = await supabase.from('vouchers').update({
        value: parseFloat(editVoucherForm.value),
        expires_at,
        location_id: editVoucherForm.location_id || null,
      }).eq('id', showEditVoucher.id)
      if (error) throw error
      toast('Voucher atualizado!', 'success')
      setShowEditVoucher(null)
      const client = showVouchersOf?.client
      if (client) openVouchers(client)
    } catch {
      toast('Erro ao atualizar voucher.', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function deleteVoucher(voucher) {
    if (!window.confirm(`Deletar voucher ${voucher.code}? Esta ação não pode ser desfeita.`)) return
    const { error } = await supabase.from('vouchers').delete().eq('id', voucher.id)
    if (error) { toast('Erro ao deletar voucher.', 'error'); return }
    toast('Voucher deletado.', 'success')
    const client = showVouchersOf?.client
    if (client) openVouchers(client)
    loadClients()
  }

  async function openVouchers(client) {
    const { data } = await supabase
      .from('vouchers')
      .select('*, locations(name)')
      .eq('client_id', client.id)
      .order('created_at', { ascending: false })
    setShowVouchersOf({ client, vouchers: data || [] })
  }

  function openEditVoucher(v) {
    setEditVoucherForm({
      value: v.value,
      expires_at: v.expires_at ? v.expires_at.slice(0, 10) : '',
      no_expiry: !v.expires_at,
      location_id: v.location_id || '',
    })
    setShowEditVoucher(v)
  }

  function editClient(client) {
    setSelectedClient(client)
    setClientForm({
      name: client.name,
      phone: client.phone,
      payment_method: client.payment_method,
      pix_account: client.pix_account || '',
    })
    setShowClientModal(true)
  }

  function openGenerateVouchers(client) {
    setSelectedClient(client)
    setShowVoucherModal(true)
  }

  function sendWhatsApp(client, vouchers) {
    const available = vouchers.filter(v => !v.is_used)
    const lines = available.map(v => {
      const local = v.locations?.name ? `\nVálido em: ${v.locations.name}` : '\nVálido em todas as unidades'
      const validade = v.expires_at ? `\nVálido até: ${formatDate(v.expires_at)}` : ''
      return `Código: *${v.code}*\nValor: ${formatCurrency(v.value)}${validade}${local}`
    }).join('\n\n')
    const estName = localStorage.getItem('establishment_name') || 'Cathedral Sports Bar'
    const msg = `Olá, ${client.name}!\n\nSeus vouchers de consumação estão prontos:\n\n${lines}\n\nApresente o código ao operador de caixa para usar o desconto.\n\n*${estName}*`
    window.open(whatsappLink(client.phone, msg), '_blank')
  }

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  )

  async function exportXLSX() {
    // Busca todos os vouchers com dados completos
    const { data: vouchers } = await supabase
      .from('vouchers')
      .select('*, clients(name, phone, payment_method, pix_account, created_at), locations(name)')
      .order('created_at', { ascending: false })

    const wb = XLSX.utils.book_new()

    // === ABA 1: VOUCHERS POR CLIENTE ===
    const headers = [
      'Cliente', 'Telefone', 'Forma de Pagamento', 'Chave PIX',
      'Código do Voucher', 'Valor (R$)', 'Status', 'Válido em',
      'Data do Cadastro', 'Data de Geração do Voucher', 'Data de Uso'
    ]

    const rows = (vouchers || []).map(v => {
      const status = v.is_used ? 'Utilizado' : (v.expires_at && new Date(v.expires_at) < new Date() ? 'Expirado' : 'Disponível')
      return [
        v.clients?.name || '',
        v.clients?.phone || '',
        v.clients?.payment_method || '',
        v.clients?.pix_account || '',
        v.code,
        v.value,
        status,
        v.locations?.name || 'Todas as unidades',
        v.clients?.created_at ? new Date(v.clients.created_at).toLocaleDateString('pt-BR') : '',
        new Date(v.created_at).toLocaleDateString('pt-BR'),
        v.used_at ? new Date(v.used_at).toLocaleString('pt-BR') : '',
      ]
    })

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
    ws['!cols'] = [
      { wch: 22 }, { wch: 16 }, { wch: 18 }, { wch: 26 },
      { wch: 18 }, { wch: 12 }, { wch: 12 }, { wch: 24 },
      { wch: 18 }, { wch: 20 }, { wch: 20 },
    ]
    XLSX.utils.book_append_sheet(wb, ws, 'Vouchers por Cliente')

    // === ABA 2: RESUMO POR CLIENTE ===
    const clientMap = {}
    ;(vouchers || []).forEach(v => {
      const name = v.clients?.name || 'Desconhecido'
      if (!clientMap[name]) {
        clientMap[name] = {
          name,
          phone: v.clients?.phone || '',
          payment: v.clients?.payment_method || '',
          pix: v.clients?.pix_account || '',
          total: 0, used: 0, available: 0, expired: 0, totalValue: 0, usedValue: 0
        }
      }
      clientMap[name].total++
      clientMap[name].totalValue += v.value || 0
      if (v.is_used) { clientMap[name].used++; clientMap[name].usedValue += v.value || 0 }
      else if (v.expires_at && new Date(v.expires_at) < new Date()) clientMap[name].expired++
      else clientMap[name].available++
    })

    const resumoHeaders = ['Cliente', 'Telefone', 'Pagamento', 'Chave PIX', 'Total Vouchers', 'Disponíveis', 'Utilizados', 'Expirados', 'Valor Total (R$)', 'Valor Resgatado (R$)']
    const resumoRows = Object.values(clientMap).map(c => [
      c.name, c.phone, c.payment, c.pix,
      c.total, c.available, c.used, c.expired,
      c.totalValue, c.usedValue
    ])

    const wsResumo = XLSX.utils.aoa_to_sheet([resumoHeaders, ...resumoRows])
    wsResumo['!cols'] = [
      { wch: 22 }, { wch: 16 }, { wch: 18 }, { wch: 26 },
      { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 12 },
      { wch: 18 }, { wch: 20 },
    ]
    XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo por Cliente')

    const date = new Date().toISOString().slice(0, 10)
    XLSX.writeFile(wb, `clientes-vouchers-${date}.xlsx`)
  }

  if (loading) return <div className="page-content"><p>Carregando...</p></div>

  return (
    <div className="page-content">
      <div className="topbar">
        <h1>Clientes & Vouchers</h1>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary btn-sm" onClick={exportXLSX}>
            Exportar Excel
          </button>
          <button className="btn btn-primary" onClick={() => {
            setSelectedClient(null)
            setClientForm({ name: '', phone: '', payment_method: 'PIX', pix_account: '' })
            setPixSearch('')
            setShowPixDropdown(false)
            setShowClientModal(true)
          }}>
            + Novo Cliente
          </button>
        </div>
      </div>

      <div style={{ padding: '24px 28px' }}>
        <div style={{ marginBottom: 16 }}>
          <input type="text" placeholder="Buscar por nome ou telefone..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ maxWidth: 340, padding: '9px 14px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, width: '100%' }} />
        </div>

        <div className="card" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Telefone</th>
                  <th>Pagamento</th>
                  <th>Vouchers</th>
                  <th>Valor total</th>
                  <th>Cadastro</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={7} style={{ textAlign: 'center', color: '#9ca3af', padding: 32 }}>Nenhum cliente cadastrado ainda.</td></tr>
                )}
                {filtered.map(client => {
                  const total = client.vouchers?.length || 0
                  const used = client.vouchers?.filter(v => v.is_used).length || 0
                  const totalValue = (client.vouchers || []).reduce((s, v) => s + (v.value || 0), 0)
                  return (
                    <tr key={client.id}>
                      <td style={{ fontWeight: 500 }}>{client.name}</td>
                      <td>{client.phone}</td>
                      <td>
                        <span className="badge badge-blue">{client.payment_method}</span>
                        {client.pix_account && <span style={{ color: '#6b7280', fontSize: 11, marginLeft: 6 }}>{client.pix_account}</span>}
                      </td>
                      <td>
                        {total > 0
                          ? <button onClick={() => openVouchers(client)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1e40af', fontSize: 13 }}>
                              {total - used} disponíveis / {total} total
                            </button>
                          : <span style={{ color: '#9ca3af' }}>Nenhum</span>}
                      </td>
                      <td style={{ fontWeight: 600, color: '#1a1a2e' }}>{formatCurrency(totalValue)}</td>
                      <td style={{ color: '#6b7280' }}>{new Date(client.created_at).toLocaleDateString('pt-BR')}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => openGenerateVouchers(client)}>+ Voucher</button>
                          <button className="btn btn-secondary btn-sm" onClick={() => editClient(client)}>Editar</button>
                          {total > 0 && (
                            <button className="btn btn-sm" style={{ background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0' }}
                              onClick={() => sendWhatsApp(client, client.vouchers || [])}>
                              WhatsApp
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal: Cadastro de cliente */}
      {showClientModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowClientModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2>{selectedClient ? 'Editar Cliente' : 'Novo Cliente'}</h2>
              <button className="modal-close" onClick={() => setShowClientModal(false)}>×</button>
            </div>
            <form onSubmit={saveClient}>
              <div className="form-group">
                <label>Nome completo *</label>
                <input value={clientForm.name} onChange={e => setClientForm({ ...clientForm, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>WhatsApp (com DDD) *</label>
                <input placeholder="(44) 99999-9999" value={clientForm.phone} onChange={e => setClientForm({ ...clientForm, phone: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Forma de pagamento *</label>
                <select value={clientForm.payment_method} onChange={e => setClientForm({ ...clientForm, payment_method: e.target.value })}>
                  {PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
              {clientForm.payment_method === 'PIX' && (
                <div className="form-group" style={{ position: 'relative' }}>
                  <label>Chave PIX utilizada <span style={{ color: '#9ca3af', fontWeight: 400 }}>(opcional)</span></label>
                  {clientForm.pix_account && !showPixDropdown ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 8, background: '#f9fafb' }}>
                      <span style={{ flex: 1, fontSize: 13 }}>{clientForm.pix_account}</span>
                      <button type="button" onClick={() => { setClientForm({ ...clientForm, pix_account: '' }); setPixSearch(''); }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 16, lineHeight: 1 }}>×</button>
                    </div>
                  ) : (
                    <>
                      <input
                        placeholder="Buscar chave cadastrada ou digitar manualmente..."
                        value={pixSearch}
                        onChange={e => { setPixSearch(e.target.value); setShowPixDropdown(true) }}
                        onFocus={() => setShowPixDropdown(true)}
                        autoComplete="off"
                      />
                      {showPixDropdown && (
                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 100, maxHeight: 200, overflowY: 'auto' }}>
                          {pixKeys
                            .filter(k =>
                              k.company_name.toLowerCase().includes(pixSearch.toLowerCase()) ||
                              k.bank.toLowerCase().includes(pixSearch.toLowerCase()) ||
                              k.pix_key.toLowerCase().includes(pixSearch.toLowerCase())
                            )
                            .map(k => (
                              <div key={k.id}
                                onClick={() => { setClientForm({ ...clientForm, pix_account: k.pix_key }); setPixSearch(''); setShowPixDropdown(false) }}
                                style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #f3f4f6' }}
                                onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                                onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                                <div style={{ fontWeight: 500, fontSize: 13 }}>{k.company_name} — {k.bank}</div>
                                <div style={{ fontSize: 12, color: '#6b7280', fontFamily: 'monospace' }}>{k.pix_key}</div>
                              </div>
                            ))
                          }
                          {pixSearch && !pixKeys.some(k => k.pix_key === pixSearch) && (
                            <div
                              onClick={() => { setClientForm({ ...clientForm, pix_account: pixSearch }); setPixSearch(''); setShowPixDropdown(false) }}
                              style={{ padding: '10px 14px', cursor: 'pointer', color: '#374151', fontSize: 13 }}
                              onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                              onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                              Usar "<strong>{pixSearch}</strong>" como chave
                            </div>
                          )}
                          {pixKeys.length === 0 && !pixSearch && (
                            <div style={{ padding: '10px 14px', color: '#9ca3af', fontSize: 13 }}>
                              Nenhuma chave PIX cadastrada ainda.
                            </div>
                          )}
                          <div
                            onClick={() => { setPixSearch(''); setShowPixDropdown(false) }}
                            style={{ padding: '8px 14px', cursor: 'pointer', color: '#9ca3af', fontSize: 12, borderTop: '1px solid #f3f4f6', textAlign: 'center' }}>
                            Fechar
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowClientModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Gerar Vouchers */}
      {showVoucherModal && selectedClient && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowVoucherModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2>Gerar Vouchers</h2>
              <button className="modal-close" onClick={() => setShowVoucherModal(false)}>×</button>
            </div>
            <p style={{ color: '#6b7280', marginBottom: 18, fontSize: 13 }}>Cliente: <strong>{selectedClient.name}</strong></p>
            <form onSubmit={generateVouchers}>
              <div className="form-row">
                <div className="form-group">
                  <label>Quantidade *</label>
                  <input type="number" min="1" max="50" value={voucherForm.quantity}
                    onChange={e => setVoucherForm({ ...voucherForm, quantity: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Valor de cada voucher (R$) *</label>
                  <input type="number" step="0.01" min="1" placeholder="50.00" value={voucherForm.value}
                    onChange={e => setVoucherForm({ ...voucherForm, value: e.target.value })} required />
                </div>
              </div>
              <div className="form-group">
                <label>Válido em</label>
                <select value={voucherForm.location_id} onChange={e => setVoucherForm({ ...voucherForm, location_id: e.target.value })}>
                  <option value="">Todas as unidades</option>
                  {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input type="checkbox" checked={voucherForm.no_expiry}
                    onChange={e => setVoucherForm({ ...voucherForm, no_expiry: e.target.checked })}
                    style={{ width: 'auto', accentColor: '#e2b04a' }} />
                  Sem data de validade
                </label>
              </div>
              {!voucherForm.no_expiry && (
                <div className="form-group">
                  <label>Data de validade</label>
                  <input type="date" value={voucherForm.expires_at}
                    onChange={e => setVoucherForm({ ...voucherForm, expires_at: e.target.value })} />
                </div>
              )}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowVoucherModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Gerando...' : `Gerar ${voucherForm.quantity} voucher(s)`}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Lista de Vouchers do cliente */}
      {showVouchersOf && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowVouchersOf(null)}>
          <div className="modal" style={{ maxWidth: 660 }}>
            <div className="modal-header">
              <div>
                <h2>Vouchers de {showVouchersOf.client.name}</h2>
                <p style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                  {showVouchersOf.vouchers.filter(v => !v.is_used).length} disponíveis · {showVouchersOf.vouchers.filter(v => v.is_used).length} utilizados
                </p>
              </div>
              <button className="modal-close" onClick={() => setShowVouchersOf(null)}>×</button>
            </div>
            <div className="voucher-grid">
              {showVouchersOf.vouchers.map(v => (
                <div key={v.id} className="voucher-item" style={{ opacity: v.is_used ? 0.6 : 1 }}>
                  <div className="voucher-code">{v.code}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#1a1a2e' }}>{formatCurrency(v.value)}</div>
                  <div style={{ fontSize: 11, color: '#6b7280' }}>
                    {v.expires_at ? `Válido até ${formatDate(v.expires_at)}` : 'Sem validade'}
                  </div>
                  <div style={{ fontSize: 11, color: '#6b7280' }}>
                    📍 {v.locations?.name || 'Todas as unidades'}
                  </div>
                  <span className={`badge ${v.is_used ? 'badge-red' : 'badge-green'}`} style={{ alignSelf: 'flex-start' }}>
                    {v.is_used ? 'Utilizado' : 'Disponível'}
                  </span>
                  {!v.is_used && (
                    <div className="voucher-actions">
                      <button className="btn btn-secondary btn-sm" onClick={() => downloadVoucherPNG(v, v.locations?.name)}>PNG</button>
                      <button className="btn btn-secondary btn-sm" onClick={() => downloadVoucherPDF(v, v.locations?.name)}>PDF</button>
                      <button className="btn btn-sm" style={{ background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0' }}
                        onClick={() => sendWhatsApp(showVouchersOf.client, [v])}>WA</button>
                      <button className="btn btn-secondary btn-sm" onClick={() => openEditVoucher(v)}>✏️</button>
                      <button className="btn btn-sm" title="Deletar"
                        style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca', fontWeight: 700, fontSize: 15 }}
                        onClick={() => deleteVoucher(v)}>✕</button>
                    </div>
                  )}
                  {v.is_used && v.used_at && (
                    <div style={{ fontSize: 11, color: '#9ca3af' }}>{new Date(v.used_at).toLocaleString('pt-BR')}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Editar Voucher */}
      {showEditVoucher && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowEditVoucher(null)}>
          <div className="modal" style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <h2>Editar Voucher</h2>
              <button className="modal-close" onClick={() => setShowEditVoucher(null)}>×</button>
            </div>
            <p style={{ color: '#6b7280', marginBottom: 16, fontSize: 13 }}>
              Código: <strong>{showEditVoucher.code}</strong>
            </p>
            <form onSubmit={saveEditVoucher}>
              <div className="form-group">
                <label>Valor (R$) *</label>
                <input type="number" step="0.01" min="1" value={editVoucherForm.value}
                  onChange={e => setEditVoucherForm({ ...editVoucherForm, value: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Válido em</label>
                <select value={editVoucherForm.location_id} onChange={e => setEditVoucherForm({ ...editVoucherForm, location_id: e.target.value })}>
                  <option value="">Todas as unidades</option>
                  {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input type="checkbox" checked={editVoucherForm.no_expiry}
                    onChange={e => setEditVoucherForm({ ...editVoucherForm, no_expiry: e.target.checked })}
                    style={{ width: 'auto', accentColor: '#e2b04a' }} />
                  Sem data de validade
                </label>
              </div>
              {!editVoucherForm.no_expiry && (
                <div className="form-group">
                  <label>Data de validade</label>
                  <input type="date" value={editVoucherForm.expires_at}
                    onChange={e => setEditVoucherForm({ ...editVoucherForm, expires_at: e.target.value })} />
                </div>
              )}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowEditVoucher(null)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Salvando...' : 'Salvar alterações'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
