import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { formatCurrency } from '../../lib/utils'

export default function Dashboard() {
  const [stats, setStats] = useState({
    clients: 0, vouchers: 0, used: 0, expired: 0, available: 0, totalValue: 0, usedValue: 0
  })
  const [recent, setRecent] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const [clientsRes, vouchersRes, recentRes] = await Promise.all([
      supabase.from('clients').select('id', { count: 'exact', head: true }),
      supabase.from('vouchers').select('id, is_used, value, expires_at'),
      supabase.from('vouchers')
        .select('code, value, is_used, used_at, clients(name), locations(name)')
        .eq('is_used', true)
        .order('used_at', { ascending: false })
        .limit(5),
    ])

    const vouchers = vouchersRes.data || []
    const now = new Date()

    const used = vouchers.filter(v => v.is_used)
    const expired = vouchers.filter(v => !v.is_used && v.expires_at && new Date(v.expires_at) < now)
    const available = vouchers.filter(v => !v.is_used && !(v.expires_at && new Date(v.expires_at) < now))
    const totalValue = vouchers.reduce((s, v) => s + (v.value || 0), 0)
    const usedValue = used.reduce((s, v) => s + (v.value || 0), 0)

    setStats({
      clients: clientsRes.count || 0,
      vouchers: vouchers.length,
      used: used.length,
      expired: expired.length,
      available: available.length,
      totalValue,
      usedValue,
    })
    setRecent(recentRes.data || [])
    setLoading(false)
  }

  if (loading) return <div className="page-content"><p>Carregando...</p></div>

  return (
    <div className="page-content">
      <div className="topbar" style={{ marginBottom: 0 }}>
        <h1>Dashboard</h1>
        <span style={{ fontSize: 12, color: '#6b7280' }}>
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
        </span>
      </div>

      <div style={{ padding: '24px 28px' }}>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="label">Clientes cadastrados</div>
            <div className="value">{stats.clients}</div>
          </div>
          <div className="stat-card">
            <div className="label">Vouchers gerados</div>
            <div className="value gold">{stats.vouchers}</div>
          </div>
          <div className="stat-card">
            <div className="label">Disponíveis</div>
            <div className="value" style={{ color: '#059669' }}>{stats.available}</div>
          </div>
          <div className="stat-card">
            <div className="label">Utilizados</div>
            <div className="value">{stats.used}</div>
          </div>
          {stats.expired > 0 && (
            <div className="stat-card">
              <div className="label">Expirados</div>
              <div className="value" style={{ color: '#dc2626' }}>{stats.expired}</div>
            </div>
          )}
          <div className="stat-card">
            <div className="label">Valor total emitido</div>
            <div className="value" style={{ fontSize: 18 }}>{formatCurrency(stats.totalValue)}</div>
          </div>
          <div className="stat-card">
            <div className="label">Valor resgatado</div>
            <div className="value" style={{ fontSize: 18 }}>{formatCurrency(stats.usedValue)}</div>
          </div>
        </div>

        {recent.length > 0 && (
          <div className="card">
            <div className="card-header">
              <h2>Últimas validações</h2>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Cliente</th>
                    <th>Valor</th>
                    <th>Local</th>
                    <th>Data</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map(v => (
                    <tr key={v.code}>
                      <td><span className="voucher-code">{v.code}</span></td>
                      <td>{v.clients?.name || '—'}</td>
                      <td>{formatCurrency(v.value)}</td>
                      <td>{v.locations?.name || '—'}</td>
                      <td>{v.used_at ? new Date(v.used_at).toLocaleString('pt-BR') : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {recent.length === 0 && (
          <div className="card">
            <div className="empty">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
              </svg>
              <p>Nenhuma validação ainda. Os vouchers aparecerão aqui após serem utilizados.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
