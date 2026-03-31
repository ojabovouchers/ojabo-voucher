import { useEffect, useState } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '../../lib/supabase'
import { formatCurrency, formatDate } from '../../lib/utils'

function getVoucherStatus(v) {
  if (v.is_used) return 'used'
  if (v.expires_at && new Date(v.expires_at) < new Date()) return 'expired'
  return 'available'
}

function getValidadeInfo(v) {
  if (!v.expires_at) return { text: 'Sem validade', color: '#6b7280' }
  const expiry = new Date(v.expires_at)
  const now = new Date()
  if (v.is_used) return { text: formatDate(v.expires_at), color: '#6b7280' }
  if (expiry < now) return { text: `Expirou em ${formatDate(v.expires_at)}`, color: '#dc2626' }
  const diffDays = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24))
  if (diffDays <= 7) return { text: `Expira em ${diffDays} dia(s)`, color: '#d97706' }
  return { text: `Expira em ${diffDays} dias`, color: '#059669' }
}

export default function Relatorios() {
  const [vouchers, setVouchers] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({ status: 'all', location: '', date_from: '', date_to: '' })
  const [locations, setLocations] = useState([])

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const [vRes, lRes] = await Promise.all([
      supabase.from('vouchers')
        .select('*, clients(name, phone), operators(name), locations(name)')
        .order('created_at', { ascending: false }),
      supabase.from('locations').select('*').order('name'),
    ])
    setVouchers(vRes.data || [])
    setLocations(lRes.data || [])
    setLoading(false)
  }

  const filtered = vouchers.filter(v => {
    const status = getVoucherStatus(v)
    if (filter.status === 'used' && status !== 'used') return false
    if (filter.status === 'available' && status !== 'available') return false
    if (filter.status === 'expired' && status !== 'expired') return false
    if (filter.location && v.location_id !== filter.location) return false
    if (filter.date_from && new Date(v.used_at || v.created_at) < new Date(filter.date_from)) return false
    if (filter.date_to && new Date(v.used_at || v.created_at) > new Date(filter.date_to + 'T23:59')) return false
    return true
  })

  const usedCount = filtered.filter(v => getVoucherStatus(v) === 'used').length
  const availableCount = filtered.filter(v => getVoucherStatus(v) === 'available').length
  const expiredCount = filtered.filter(v => getVoucherStatus(v) === 'expired').length
  const totalValue = filtered.reduce((s, v) => s + (v.value || 0), 0)
  const usedValue = filtered.filter(v => v.is_used).reduce((s, v) => s + (v.value || 0), 0)

  function exportXLSX(data) {
    const now = new Date().toLocaleString('pt-BR')
    const wb = XLSX.utils.book_new()

    // === ABA 1: RELATÓRIO ===
    const headers = [
      'Código', 'Cliente', 'Telefone', 'Valor (R$)', 'Status',
      'Validade', 'Local de Uso', 'Operador', 'Data/Hora de Uso', 'Data de Emissão'
    ]

    const rows = data.map(v => {
      const status = getVoucherStatus(v)
      const statusLabel = status === 'used' ? 'Utilizado' : status === 'expired' ? 'Expirado' : 'Disponível'
      return [
        v.code,
        v.clients?.name || '',
        v.clients?.phone || '',
        v.value,
        statusLabel,
        getValidadeInfo(v).text,
        v.locations?.name || '',
        v.operators?.name || '',
        v.used_at ? new Date(v.used_at).toLocaleString('pt-BR') : '',
        new Date(v.created_at).toLocaleDateString('pt-BR'),
      ]
    })

    const wsData = [headers, ...rows]
    const ws = XLSX.utils.aoa_to_sheet(wsData)

    // Largura das colunas
    ws['!cols'] = [
      { wch: 18 }, { wch: 22 }, { wch: 18 }, { wch: 12 }, { wch: 12 },
      { wch: 22 }, { wch: 24 }, { wch: 18 }, { wch: 22 }, { wch: 16 },
    ]

    XLSX.utils.book_append_sheet(wb, ws, 'Vouchers')

    // === ABA 2: RESUMO ===
    const resumo = [
      ['RESUMO DO RELATÓRIO', ''],
      ['Gerado em', now],
      ['', ''],
      ['Total de vouchers', data.length],
      ['Disponíveis', availableCount],
      ['Utilizados', usedCount],
      ['Expirados', expiredCount],
      ['', ''],
      ['Valor total emitido', `R$ ${totalValue.toFixed(2).replace('.', ',')}`],
      ['Valor total resgatado', `R$ ${usedValue.toFixed(2).replace('.', ',')}`],
      ['Valor disponível', `R$ ${(totalValue - usedValue).toFixed(2).replace('.', ',')}`],
    ]

    const wsResumo = XLSX.utils.aoa_to_sheet(resumo)
    wsResumo['!cols'] = [{ wch: 26 }, { wch: 22 }]
    XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo')

    const date = new Date().toISOString().slice(0, 10)
    XLSX.writeFile(wb, `relatorio-vouchers-${date}.xlsx`)
  }

  if (loading) return <div className="page-content"><p>Carregando...</p></div>

  return (
    <div className="page-content">
      <div className="topbar">
        <h1>Relatórios</h1>
        <button className="btn btn-primary btn-sm" onClick={() => exportXLSX(filtered)}>
          Exportar Excel
        </button>
      </div>

      <div style={{ padding: '24px 28px' }}>
        {/* Filtros */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, overflow: 'hidden' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Status</label>
              <select value={filter.status} onChange={e => setFilter({ ...filter, status: e.target.value })}>
                <option value="all">Todos</option>
                <option value="available">Disponíveis</option>
                <option value="used">Utilizados</option>
                <option value="expired">Expirados</option>
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Local</label>
              <select value={filter.location} onChange={e => setFilter({ ...filter, location: e.target.value })}>
                <option value="">Todos os locais</option>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0, minWidth: 0 }}>
              <label>De</label>
              <input type="date" value={filter.date_from} onChange={e => setFilter({ ...filter, date_from: e.target.value })} style={{ width: '100%', boxSizing: 'border-box' }} />
            </div>
            <div className="form-group" style={{ marginBottom: 0, minWidth: 0 }}>
              <label>Até</label>
              <input type="date" value={filter.date_to} onChange={e => setFilter({ ...filter, date_to: e.target.value })} style={{ width: '100%', boxSizing: 'border-box' }} />
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="stats-grid" style={{ marginBottom: 20 }}>
          <div className="stat-card">
            <div className="label">Total filtrado</div>
            <div className="value">{filtered.length}</div>
          </div>
          <div className="stat-card">
            <div className="label">Disponíveis</div>
            <div className="value" style={{ color: '#059669' }}>{availableCount}</div>
          </div>
          <div className="stat-card">
            <div className="label">Utilizados</div>
            <div className="value gold">{usedCount}</div>
          </div>
          {expiredCount > 0 && (
            <div className="stat-card">
              <div className="label">Expirados</div>
              <div className="value" style={{ color: '#dc2626' }}>{expiredCount}</div>
            </div>
          )}
          <div className="stat-card">
            <div className="label">Valor emitido</div>
            <div className="value" style={{ fontSize: 18 }}>{formatCurrency(totalValue)}</div>
          </div>
          <div className="stat-card">
            <div className="label">Valor resgatado</div>
            <div className="value" style={{ fontSize: 18 }}>{formatCurrency(usedValue)}</div>
          </div>
        </div>

        <div className="card" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Cliente</th>
                  <th>Valor</th>
                  <th>Status</th>
                  <th>Validade</th>
                  <th>Local de uso</th>
                  <th>Operador</th>
                  <th>Data/hora de uso</th>
                  <th>Emissão</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={9} style={{ textAlign: 'center', color: '#9ca3af', padding: 32 }}>Nenhum voucher encontrado.</td></tr>
                )}
                {filtered.map(v => {
                  const status = getVoucherStatus(v)
                  const validade = getValidadeInfo(v)
                  return (
                    <tr key={v.id}>
                      <td><span className="voucher-code">{v.code}</span></td>
                      <td>{v.clients?.name || '—'}</td>
                      <td>{formatCurrency(v.value)}</td>
                      <td>
                        {status === 'used' && <span className="badge badge-red">Utilizado</span>}
                        {status === 'available' && <span className="badge badge-green">Disponível</span>}
                        {status === 'expired' && <span className="badge badge-gray">Expirado</span>}
                      </td>
                      <td style={{ color: validade.color, fontSize: 12, whiteSpace: 'nowrap' }}>
                        {validade.text}
                      </td>
                      <td>{v.locations?.name || '—'}</td>
                      <td>{v.operators?.name || '—'}</td>
                      <td style={{ color: '#6b7280' }}>{v.used_at ? new Date(v.used_at).toLocaleString('pt-BR') : '—'}</td>
                      <td style={{ color: '#6b7280' }}>{new Date(v.created_at).toLocaleDateString('pt-BR')}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
