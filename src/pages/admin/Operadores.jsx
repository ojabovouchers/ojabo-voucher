import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../components/AppProvider'

function EyeIcon({ open }) {
  return open ? (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path d="M3 12s3-7 9-7 9 7 9 7-3 7-9 7-9-7-9-7z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-6 0-9-8-9-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c6 0 9 8 9 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  )
}

function PasswordInput({ value, onChange, placeholder, label }) {
  const [show, setShow] = useState(false)
  return (
    <div className="form-group">
      {label && <label>{label}</label>}
      <div style={{ position: 'relative' }}>
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder || 'Mínimo 6 caracteres'}
          minLength={6}
          required
          style={{ paddingRight: 42 }}
        />
        <button
          type="button"
          onClick={() => setShow(s => !s)}
          style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex', alignItems: 'center' }}>
          <EyeIcon open={show} />
        </button>
      </div>
    </div>
  )
}

export default function Operadores() {
  const toast = useToast()
  const [operators, setOperators] = useState([])
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [showInactive, setShowInactive] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState({ name: '', email: '', location_id: '', role: 'operator' })
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const [opRes, locRes] = await Promise.all([
      supabase.from('operators').select('*, locations(name)').order('created_at', { ascending: false }),
      supabase.from('locations').select('*').order('name'),
    ])
    setOperators((opRes.data || []).filter(op => !op.is_master))
    setLocations(locRes.data || [])
    setLoading(false)
  }

  async function saveOperator(e) {
    e.preventDefault()
    setSaving(true)
    try {
      if (selected) {
        const { error } = await supabase.from('operators').update({
          name: form.name,
          location_id: form.location_id || null,
          role: form.role,
        }).eq('id', selected.id)
        if (error) throw error
        toast('Operador atualizado!', 'success')
      } else {
        const serviceKey = import.meta.env.VITE_SUPABASE_SERVICE_KEY
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL

        // Usa invite — garante hash correto e envia email de boas-vindas
        const res = await fetch(`${supabaseUrl}/auth/v1/invite`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': serviceKey,
            'Authorization': `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({
            email: form.email,
            data: { name: form.name },
          }),
        })

        const newUser = await res.json()
        if (!res.ok) throw new Error(newUser.message || 'Erro ao enviar convite.')

        const { error: opError } = await supabase.from('operators').insert({
          auth_user_id: newUser.id,
          name: form.name,
          email: form.email,
          role: form.role,
          location_id: form.location_id || null,
        })
        if (opError) throw opError

        // Envia segundo email com link de instalação do app
        const estName = localStorage.getItem('establishment_name') || localStorage.getItem('sidebar_name') || 'Cathedral Vouchers'
        const installUrl = `${window.location.origin}/instalar`
        await fetch(`${supabaseUrl}/functions/v1/send-install-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({
            to: form.email,
            name: form.name,
            establishment: estName,
            installUrl,
          }),
        }).catch(() => {}) // falha silenciosa se edge function não existir

        toast(`Convite enviado para ${form.email}! O operador receberá os emails de acesso e instalação.`, 'success')
      }
      setShowModal(false)
      resetForm()
      loadData()
    } catch (err) {
      toast(err.message || 'Erro ao salvar operador.', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteOrDeactivate(op) {
    const hasHistory = op.voucher_count > 0
    const action = hasHistory ? 'desativar' : 'deletar'
    const msg = hasHistory
      ? `Desativar ${op.name}? Ele perderá o acesso mas o histórico de validações será preservado.`
      : `Deletar ${op.name}? Esta ação não pode ser desfeita.`

    if (!window.confirm(msg)) return

    setSaving(true)
    try {
      const { data, error } = await supabase.rpc('delete_or_deactivate_operator', {
        p_operator_id: op.id,
      })
      if (error) throw error
      if (data?.action === 'deleted') toast('Operador deletado.', 'success')
      else toast('Operador desativado. Acesso bloqueado.', 'success')
      loadData()
    } catch (err) {
      toast(err.message || 'Erro ao processar operação.', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleReactivate(op) {
    if (!window.confirm(`Reativar ${op.name}? Ele voltará a ter acesso ao sistema.`)) return
    setSaving(true)
    try {
      const { error } = await supabase.rpc('reactivate_operator', { p_operator_id: op.id })
      if (error) throw error
      toast('Operador reativado com sucesso!', 'success')
      loadData()
    } catch (err) {
      toast(err.message || 'Erro ao reativar operador.', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function changePassword(e) {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      toast('As senhas não coincidem.', 'error')
      return
    }
    setSaving(true)
    try {
      const { error } = await supabase.rpc('change_operator_password', {
        p_operator_id: selected.id,
        p_new_password: newPassword,
      })
      if (error) throw error
      toast('Senha alterada com sucesso!', 'success')
      setShowPasswordModal(false)
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      toast(err.message || 'Erro ao alterar senha.', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function changeEmail(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const { error } = await supabase.rpc('change_operator_email', {
        p_operator_id: selected.id,
        p_new_email: newEmail,
      })
      if (error) throw error
      toast('Email alterado com sucesso!', 'success')
      setShowEmailModal(false)
      setNewEmail('')
      loadData()
    } catch (err) {
      toast(err.message || 'Erro ao alterar email.', 'error')
    } finally {
      setSaving(false)
    }
  }

  function resetForm() {
    setForm({ name: '', email: '', location_id: '', role: 'operator' })
    setSelected(null)
  }

  function editOperator(op) {
    setSelected(op)
    setForm({ name: op.name, email: op.email, location_id: op.location_id || '', role: op.role })
    setShowModal(true)
  }

  async function resendInvite(op) {
    setSaving(true)
    try {
      const serviceKey = import.meta.env.VITE_SUPABASE_SERVICE_KEY
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL

      const res = await fetch(`${supabaseUrl}/auth/v1/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({ email: op.email }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message)
      }
      toast(`Convite reenviado para ${op.email}!`, 'success')
    } catch (err) {
      toast(err.message || 'Erro ao reenviar convite.', 'error')
    } finally {
      setSaving(false)
    }
  }

  function openPasswordModal(op) {
    setSelected(op)
    setNewPassword('')
    setConfirmPassword('')
    setShowPasswordModal(true)
  }

  function openEmailModal(op) {
    setSelected(op)
    setNewEmail(op.email)
    setShowEmailModal(true)
  }

  // Busca contagem de vouchers por operador
  async function loadVoucherCounts(ops) {
    const ids = ops.map(o => o.id)
    if (ids.length === 0) return ops
    const { data } = await supabase
      .from('vouchers')
      .select('operator_id')
      .in('operator_id', ids)
    const counts = {}
    ;(data || []).forEach(v => {
      counts[v.operator_id] = (counts[v.operator_id] || 0) + 1
    })
    return ops.map(o => ({ ...o, voucher_count: counts[o.id] || 0 }))
  }

  const [operatorsWithCount, setOperatorsWithCount] = useState([])

  useEffect(() => {
    if (operators.length > 0) {
      loadVoucherCounts(operators).then(setOperatorsWithCount)
    } else {
      setOperatorsWithCount([])
    }
  }, [operators])

  const visibleOperators = operatorsWithCount.filter(op =>
    showInactive ? true : op.is_active !== false
  )

  const inactiveCount = operatorsWithCount.filter(op => op.is_active === false).length

  if (loading) return <div className="page-content"><p>Carregando...</p></div>

  return (
    <div className="page-content">
      <div className="topbar">
        <h1>Operadores</h1>
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true) }}>
          + Novo Operador
        </button>
      </div>

      <div style={{ padding: '24px 28px' }}>
        {/* Locais */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <h2>Locais / Unidades</h2>
            <button className="btn btn-secondary btn-sm" onClick={addLocation}>+ Novo Local</button>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {locations.map(l => (
              <span key={l.id} className="badge badge-blue"
                onClick={() => renameLocation(l)}
                title="Clique para renomear"
                style={{ padding: '6px 14px', fontSize: 13, cursor: 'pointer' }}>
                {l.name} ✏️
              </span>
            ))}
            {locations.length === 0 && <span style={{ color: '#9ca3af', fontSize: 13 }}>Nenhum local cadastrado</span>}
          </div>
        </div>

        {/* Tabela */}
        <div className="card" style={{ padding: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
            <h2 style={{ margin: 0 }}>Operadores</h2>
            {inactiveCount > 0 && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setShowInactive(s => !s)}>
                {showInactive ? 'Ocultar inativos' : `Ver inativos (${inactiveCount})`}
              </button>
            )}
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Email</th>
                  <th>Local</th>
                  <th>Perfil</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {visibleOperators.length === 0 && (
                  <tr><td colSpan={6} style={{ textAlign: 'center', color: '#9ca3af', padding: 32 }}>Nenhum operador cadastrado.</td></tr>
                )}
                {visibleOperators.map(op => {
                  const isInactive = op.is_active === false
                  const hasHistory = op.voucher_count > 0
                  return (
                    <tr key={op.id} style={{ opacity: isInactive ? 0.6 : 1 }}>
                      <td style={{ fontWeight: 500 }}>{op.name}</td>
                      <td style={{ color: '#6b7280' }}>{op.email}</td>
                      <td>{op.locations?.name || <span style={{ color: '#9ca3af' }}>—</span>}</td>
                      <td>
                        <span className={`badge ${op.role === 'admin' ? 'badge-yellow' : 'badge-gray'}`}>
                          {op.role === 'admin' ? 'Admin' : 'Operador'}
                        </span>
                      </td>
                      <td>
                        {isInactive
                          ? <span className="badge badge-red">Inativo</span>
                          : <span className="badge badge-green">Ativo</span>
                        }
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {!isInactive && (
                            <>
                              <button className="btn btn-secondary btn-sm" onClick={() => editOperator(op)}>Editar</button>
                              <button className="btn btn-secondary btn-sm" onClick={() => openEmailModal(op)}>Email</button>
                              <button className="btn btn-secondary btn-sm" onClick={() => openPasswordModal(op)}>Senha</button>
                              <button className="btn btn-sm"
                                style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}
                                onClick={() => resendInvite(op)}
                                title="Reenviar email de convite">
                                Reenviar convite
                              </button>
                            </>
                          )}
                          {isInactive ? (
                            <button
                              className="btn btn-sm"
                              style={{ background: '#d1fae5', color: '#065f46', border: '1px solid #a7f3d0' }}
                              onClick={() => handleReactivate(op)}>
                              Reativar
                            </button>
                          ) : (
                            <button
                              className="btn btn-sm"
                              style={hasHistory
                                ? { background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }
                                : { background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca' }}
                              onClick={() => handleDeleteOrDeactivate(op)}>
                              {hasHistory ? 'Desativar' : 'Deletar'}
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

      {/* Modal: Novo / Editar Operador */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2>{selected ? 'Editar Operador' : 'Novo Operador'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={saveOperator}>
              <div className="form-group">
                <label>Nome *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
              </div>
              {!selected && (
                <>
                  <div className="form-group">
                    <label>Email *</label>
                    <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
                  </div>
                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '12px 14px', marginBottom: 16, fontSize: 13, color: '#166534' }}>
                    Um email de convite será enviado automaticamente para o operador definir a própria senha.
                  </div>
                </>
              )}
              <div className="form-row">
                <div className="form-group">
                  <label>Local de trabalho</label>
                  <select value={form.location_id} onChange={e => setForm({ ...form, location_id: e.target.value })}>
                    <option value="">Selecione...</option>
                    {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Perfil</label>
                  <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                    <option value="operator">Operador</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? (selected ? 'Salvando...' : 'Enviando convite...') : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Alterar Email */}
      {showEmailModal && selected && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowEmailModal(false)}>
          <div className="modal" style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h2>Alterar Email</h2>
              <button className="modal-close" onClick={() => setShowEmailModal(false)}>×</button>
            </div>
            <p style={{ color: '#6b7280', marginBottom: 16, fontSize: 13 }}>
              Operador: <strong>{selected.name}</strong>
            </p>
            <form onSubmit={changeEmail}>
              <div className="form-group">
                <label>Novo email *</label>
                <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} required autoFocus />
                <small style={{ color: '#6b7280', fontSize: 11, marginTop: 4, display: 'block' }}>
                  O operador deverá usar este novo email para fazer login.
                </small>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowEmailModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Salvando...' : 'Alterar Email'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Alterar Senha */}
      {showPasswordModal && selected && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowPasswordModal(false)}>
          <div className="modal" style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h2>Alterar Senha</h2>
              <button className="modal-close" onClick={() => setShowPasswordModal(false)}>×</button>
            </div>
            <p style={{ color: '#6b7280', marginBottom: 16, fontSize: 13 }}>
              Operador: <strong>{selected.name}</strong>
            </p>
            <form onSubmit={changePassword}>
              <PasswordInput
                label="Nova senha *"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
              />
              <PasswordInput
                label="Confirmar nova senha *"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Repita a senha"
              />
              {confirmPassword && newPassword !== confirmPassword && (
                <small style={{ color: '#dc2626', fontSize: 12, marginTop: -10, marginBottom: 12, display: 'block' }}>
                  As senhas não coincidem.
                </small>
              )}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowPasswordModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary"
                  disabled={saving || (!!confirmPassword && newPassword !== confirmPassword)}>
                  {saving ? 'Salvando...' : 'Alterar Senha'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )

  async function renameLocation(loc) {
    const name = prompt('Novo nome para este local:', loc.name)
    if (!name?.trim() || name.trim() === loc.name) return
    const { error } = await supabase.from('locations').update({ name: name.trim() }).eq('id', loc.id)
    if (!error) { toast('Local renomeado!', 'success'); loadData() }
    else toast('Erro ao renomear local.', 'error')
  }

  async function addLocation() {
    const name = prompt('Nome do local (ex: Cathedral Centro):')
    if (!name?.trim()) return
    const { error } = await supabase.from('locations').insert({ name: name.trim() })
    if (!error) { toast('Local adicionado!', 'success'); loadData() }
    else toast('Erro ao adicionar local.', 'error')
  }
}
