import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../components/AppProvider'

export default function ChavesPix() {
  const toast = useToast()
  const [keys, setKeys] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [selected, setSelected] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ company_name: '', bank: '', agency: '', account: '', pix_key: '' })
  const [usageCounts, setUsageCounts] = useState({})

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: keysData } = await supabase
      .from('pix_keys')
      .select('*')
      .order('created_at', { ascending: false })

    const { data: clientsData } = await supabase
      .from('clients')
      .select('pix_key_id')
      .not('pix_key_id', 'is', null)

    const counts = {}
    ;(clientsData || []).forEach(c => {
      counts[c.pix_key_id] = (counts[c.pix_key_id] || 0) + 1
    })

    setKeys(keysData || [])
    setUsageCounts(counts)
    setLoading(false)
  }

  async function saveKey(e) {
    e.preventDefault()
    setSaving(true)
    try {
      if (selected) {
        const { error } = await supabase.from('pix_keys').update(form).eq('id', selected.id)
        if (error) throw error
        toast('Chave PIX atualizada!', 'success')
      } else {
        const { error } = await supabase.from('pix_keys').insert(form)
        if (error) throw error
        toast('Chave PIX cadastrada!', 'success')
      }
      setShowModal(false)
      resetForm()
      loadData()
    } catch (err) {
      toast(err.message || 'Erro ao salvar chave PIX.', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function deleteKey(key) {
    if (!window.confirm(`Excluir a chave PIX ${key.pix_key}? Esta ação não pode ser desfeita.`)) return
    const { error } = await supabase.from('pix_keys').delete().eq('id', key.id)
    if (error) { toast('Erro ao excluir chave.', 'error'); return }
    toast('Chave PIX excluída.', 'success')
    loadData()
  }

  function resetForm() {
    setForm({ company_name: '', bank: '', agency: '', account: '', pix_key: '' })
    setSelected(null)
  }

  function editKey(key) {
    setSelected(key)
    setForm({ company_name: key.company_name, bank: key.bank, agency: key.agency, account: key.account, pix_key: key.pix_key })
    setShowModal(true)
  }

  if (loading) return <div className="page-content"><p>Carregando...</p></div>

  return (
    <div className="page-content">
      <div className="topbar">
        <h1>Chaves PIX</h1>
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true) }}>
          + Nova Chave PIX
        </button>
      </div>

      <div style={{ padding: '24px 28px' }}>
        {keys.length === 0 ? (
          <div className="card">
            <div className="empty">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>
              <p>Nenhuma chave PIX cadastrada ainda.</p>
            </div>
          </div>
        ) : (
          <div className="card" style={{ padding: 0 }}>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Empresa</th>
                    <th>Banco</th>
                    <th>Agência / Conta</th>
                    <th>Chave PIX</th>
                    <th>Uso</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {keys.map(key => {
                    const inUse = (usageCounts[key.id] || 0) > 0
                    return (
                      <tr key={key.id}>
                        <td style={{ fontWeight: 500 }}>{key.company_name}</td>
                        <td>{key.bank}</td>
                        <td style={{ color: '#6b7280', fontSize: 12 }}>
                          Ag: {key.agency} · CC: {key.account}
                        </td>
                        <td>
                          <span style={{ fontFamily: 'monospace', fontSize: 13, background: '#f3f4f6', padding: '3px 8px', borderRadius: 6 }}>
                            {key.pix_key}
                          </span>
                        </td>
                        <td>
                          {inUse
                            ? <span className="badge badge-blue">{usageCounts[key.id]} cliente(s)</span>
                            : <span className="badge badge-gray">Não utilizada</span>}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="btn btn-secondary btn-sm" onClick={() => editKey(key)}>Editar</button>
                            {!inUse && (
                              <button className="btn btn-sm" style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca' }}
                                onClick={() => deleteKey(key)}>
                                Excluir
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
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2>{selected ? 'Editar Chave PIX' : 'Nova Chave PIX'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={saveKey}>
              <div className="form-group">
                <label>Nome da empresa *</label>
                <input placeholder="Ex: Cathedral Cervejaria Ltda" value={form.company_name}
                  onChange={e => setForm({ ...form, company_name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Banco *</label>
                <input placeholder="Ex: Nubank, Itaú, Bradesco..." value={form.bank}
                  onChange={e => setForm({ ...form, bank: e.target.value })} required />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Agência *</label>
                  <input placeholder="Ex: 0001" value={form.agency}
                    onChange={e => setForm({ ...form, agency: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Conta-corrente *</label>
                  <input placeholder="Ex: 12345-6" value={form.account}
                    onChange={e => setForm({ ...form, account: e.target.value })} required />
                </div>
              </div>
              <div className="form-group">
                <label>Chave PIX *</label>
                <input placeholder="CPF, CNPJ, telefone, e-mail ou chave aleatória" value={form.pix_key}
                  onChange={e => setForm({ ...form, pix_key: e.target.value })} required />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
