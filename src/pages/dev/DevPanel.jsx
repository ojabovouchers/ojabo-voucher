import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import * as XLSX from 'xlsx'

const SIDEBAR_COLORS = [
  { label: 'Escuro (padrão)', value: '#1a1a2e' },
  { label: 'Preto', value: '#0a0a0a' },
  { label: 'Cinza escuro', value: '#1f2937' },
  { label: 'Verde escuro', value: '#064e3b' },
  { label: 'Azul escuro', value: '#1e3a5f' },
  { label: 'Vinho', value: '#4a0e2e' },
]

const FONTS = [
  { label: 'Segoe UI (padrão)', value: "'Segoe UI', Arial, sans-serif" },
  { label: 'Inter', value: "'Inter', sans-serif" },
  { label: 'Roboto', value: "'Roboto', sans-serif" },
  { label: 'Poppins', value: "'Poppins', sans-serif" },
  { label: 'Montserrat', value: "'Montserrat', sans-serif" },
]

function Section({ title, danger, children }) {
  return (
    <div className="card" style={{ marginBottom: 16, borderColor: danger ? '#fecaca' : undefined }}>
      <div className="card-header">
        <h2 style={{ color: danger ? '#dc2626' : undefined }}>{title}</h2>
      </div>
      {children}
    </div>
  )
}

export default function DevPanel() {
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)

  // Sidebar
  const [sidebarName, setSidebarName] = useState('')
  const [sidebarColor, setSidebarColor] = useState('#1a1a2e')
  const [sidebarFont, setSidebarFont] = useState("'Segoe UI', Arial, sans-serif")
  const [sidebarNameColor, setSidebarNameColor] = useState('#e2b04a')
  const [sidebarMenuColor, setSidebarMenuColor] = useState('rgba(255,255,255,0.65)')
  const [appTitle, setAppTitle] = useState('Cathedral Vouchers')
  const [voucherPrefix, setVoucherPrefix] = useState('CATH')

  // Admins
  const [admins, setAdmins] = useState([])
  const [masterAdmin, setMasterAdmin] = useState(null)
  const [showNewAdmin, setShowNewAdmin] = useState(false)
  const [adminForm, setAdminForm] = useState({ name: '', email: '', password: '' })
  const [masterEmail, setMasterEmail] = useState('')
  const [showSetMaster, setShowSetMaster] = useState(false)

  // Configurações do sistema
  const [operatorCanGenerate, setOperatorCanGenerate] = useState(false)

  // Clear
  const [confirmClear, setConfirmClear] = useState({})

  useEffect(() => {
    if (sessionStorage.getItem('dev_auth') !== '1') {
      navigate('/dev/login')
      return
    }
    loadSettings()
    loadAdmins()
  }, [])

  async function getAdminClient() {
    const { createClient } = await import('@supabase/supabase-js')
    return createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_SERVICE_KEY
    )
  }

  async function loadSettings() {
    const client = await getAdminClient()
    const { data } = await client.from('settings').select('key, value')
    const map = {}
    ;(data || []).forEach(s => { map[s.key] = s.value })
    if (map.sidebar_name) setSidebarName(map.sidebar_name)
    if (map.sidebar_color) setSidebarColor(map.sidebar_color)
    if (map.sidebar_font) setSidebarFont(map.sidebar_font)
    if (map.sidebar_name_color) setSidebarNameColor(map.sidebar_name_color)
    if (map.sidebar_menu_color) setSidebarMenuColor(map.sidebar_menu_color)
    if (map.app_title) { setAppTitle(map.app_title); document.title = map.app_title }
    if (map.voucher_prefix) setVoucherPrefix(map.voucher_prefix)
    setOperatorCanGenerate(map.operator_can_generate === 'true')
  }

  async function loadAdmins() {
    const client = await getAdminClient()
    const { data } = await client
      .from('operators')
      .select('*')
      .eq('role', 'admin')
      .order('created_at')
    const all = data || []
    setMasterAdmin(all.find(a => a.is_master) || null)
    setAdmins(all.filter(a => !a.is_master))
  }

  async function saveSetting(key, value) {
    const client = await getAdminClient()
    await client.from('settings').upsert({ key, value }, { onConflict: 'key' })
    localStorage.setItem(key, value)
  }

  async function saveSidebarSettings(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await Promise.all([
        saveSetting('sidebar_name', sidebarName),
        saveSetting('sidebar_color', sidebarColor),
        saveSetting('sidebar_font', sidebarFont),
        saveSetting('sidebar_name_color', sidebarNameColor),
        saveSetting('sidebar_menu_color', sidebarMenuColor),
        saveSetting('app_title', appTitle),
        saveSetting('voucher_prefix', voucherPrefix.toUpperCase().slice(0, 6)),
      ])
      document.title = appTitle
      window.dispatchEvent(new Event('sidebar-settings-updated'))
      // Limpa localStorage para forçar rebusca do Supabase na próxima vez
      ;['sidebar_name','sidebar_color','sidebar_font','sidebar_name_color','sidebar_menu_color','app_title'].forEach(k => localStorage.removeItem(k))
      alert('Configurações salvas! Recarregue o painel admin para ver as mudanças.')
    } finally {
      setSaving(false)
    }
  }

  async function saveSystemSettings() {
    setSaving(true)
    try {
      await saveSetting('operator_can_generate', String(operatorCanGenerate))
      alert('Configurações do sistema salvas!')
    } finally {
      setSaving(false)
    }
  }

  async function createAdmin(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const serviceKey = import.meta.env.VITE_SUPABASE_SERVICE_KEY
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL

      const res = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` },
        body: JSON.stringify({ email: adminForm.email, password: adminForm.password, email_confirm: true }),
      })
      const newUser = await res.json()
      if (!res.ok) throw new Error(newUser.message)

      const { createClient } = await import('@supabase/supabase-js')
      const adminClient = createClient(supabaseUrl, serviceKey)
      const { error: opError } = await adminClient.from('operators').insert({
        auth_user_id: newUser.id,
        name: adminForm.name,
        email: adminForm.email,
        role: 'admin',
      })
      if (opError) throw opError

      alert('Administrador criado com sucesso!')
      setAdminForm({ name: '', email: '', password: '' })
      setShowNewAdmin(false)
      loadAdmins()
    } catch (err) {
      alert('Erro: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  async function toggleAdmin(admin) {
    const client = await getAdminClient()
    const newStatus = admin.is_active === false ? true : false
    await client.from('operators').update({ is_active: newStatus }).eq('id', admin.id)
    if (!newStatus) {
      await client.rpc('delete_or_deactivate_operator', { p_operator_id: admin.id })
    } else {
      await client.rpc('reactivate_operator', { p_operator_id: admin.id })
    }
    loadAdmins()
  }

  async function setMasterByEmail(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const client = await getAdminClient()
      // Remove master anterior
      await client.from('operators').update({ is_master: false }).eq('is_master', true)
      // Define novo master
      const { data, error } = await client
        .from('operators')
        .update({ is_master: true })
        .eq('email', masterEmail)
        .eq('role', 'admin')
        .select()
      if (error || !data?.length) throw new Error('Admin não encontrado com esse email.')
      alert(`${data[0].name} definido como Master com sucesso!`)
      setMasterEmail('')
      setShowSetMaster(false)
      loadAdmins()
    } catch (err) {
      alert('Erro: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  async function removeMaster() {
    if (!masterAdmin) return
    if (!window.confirm(`Remover ${masterAdmin.name} como Master? Ele continuará como admin normal.`)) return
    const client = await getAdminClient()
    await client.from('operators').update({ is_master: false }).eq('id', masterAdmin.id)
    loadAdmins()
  }

  // Relatórios
  async function downloadClientesExcel() {
    setSaving(true)
    try {
      const client = await getAdminClient()
      const { data: vouchers } = await client
        .from('vouchers')
        .select('*, clients(name, phone, payment_method, pix_account, created_at), locations(name)')
        .order('created_at', { ascending: false })

      const wb = XLSX.utils.book_new()
      const headers = ['Cliente', 'Telefone', 'Forma de Pagamento', 'Chave PIX', 'Código', 'Valor (R$)', 'Status', 'Válido em', 'Cadastro', 'Geração', 'Uso']
      const rows = (vouchers || []).map(v => {
        const status = v.is_used ? 'Utilizado' : (v.expires_at && new Date(v.expires_at) < new Date() ? 'Expirado' : 'Disponível')
        return [v.clients?.name || '', v.clients?.phone || '', v.clients?.payment_method || '', v.clients?.pix_account || '',
          v.code, v.value, status, v.locations?.name || 'Todas as unidades',
          v.clients?.created_at ? new Date(v.clients.created_at).toLocaleDateString('pt-BR') : '',
          new Date(v.created_at).toLocaleDateString('pt-BR'),
          v.used_at ? new Date(v.used_at).toLocaleString('pt-BR') : '']
      })
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
      XLSX.utils.book_append_sheet(wb, ws, 'Vouchers por Cliente')
      XLSX.writeFile(wb, `clientes-vouchers-${new Date().toISOString().slice(0, 10)}.xlsx`)
    } finally {
      setSaving(false)
    }
  }

  async function downloadRelatorioExcel() {
    setSaving(true)
    try {
      const client = await getAdminClient()
      const { data: vouchers } = await client
        .from('vouchers')
        .select('*, clients(name, phone), locations(name), operators(name)')
        .order('created_at', { ascending: false })

      const wb = XLSX.utils.book_new()
      const headers = ['Código', 'Cliente', 'Telefone', 'Valor (R$)', 'Status', 'Local', 'Operador', 'Criado em', 'Usado em']
      const rows = (vouchers || []).map(v => {
        const status = v.is_used ? 'Utilizado' : (v.expires_at && new Date(v.expires_at) < new Date() ? 'Expirado' : 'Disponível')
        return [v.code, v.clients?.name || '', v.clients?.phone || '', v.value, status,
          v.locations?.name || 'Todas as unidades', v.operators?.name || '',
          new Date(v.created_at).toLocaleDateString('pt-BR'),
          v.used_at ? new Date(v.used_at).toLocaleString('pt-BR') : '']
      })
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
      XLSX.utils.book_append_sheet(wb, ws, 'Relatório Geral')
      XLSX.writeFile(wb, `relatorio-geral-${new Date().toISOString().slice(0, 10)}.xlsx`)
    } finally {
      setSaving(false)
    }
  }

  async function clearItem(key, label) {
    if (!confirmClear[key]) {
      setConfirmClear(c => ({ ...c, [key]: true }))
      return
    }
    setSaving(true)
    try {
      const client = await getAdminClient()
      const serviceKey = import.meta.env.VITE_SUPABASE_SERVICE_KEY
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL

      async function deleteOperators() {
        const { data: ops } = await client.from('operators').select('id, auth_user_id').eq('role', 'operator')
        if (!ops?.length) return
        for (const op of ops) {
          if (op.auth_user_id) {
            await fetch(`${supabaseUrl}/auth/v1/admin/users/${op.auth_user_id}`, {
              method: 'DELETE',
              headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` }
            })
          }
        }
        await client.from('operators').delete().eq('role', 'operator')
      }

      if (key === 'all') {
        await client.from('vouchers').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        await client.from('clients').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        await client.from('pix_keys').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        await deleteOperators()
        await client.from('locations').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      } else if (key === 'operators') {
        await deleteOperators()
      } else {
        await client.from(key).delete().neq('id', '00000000-0000-0000-0000-000000000000')
      }

      alert(`${label} limpo com sucesso!`)
      setConfirmClear(c => ({ ...c, [key]: false }))
    } catch (err) {
      alert('Erro ao limpar: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  function logout() {
    sessionStorage.removeItem('dev_auth')
    navigate('/login')
  }

  const clearItems = [
    { key: 'vouchers', label: 'Vouchers' },
    { key: 'clients', label: 'Clientes' },
    { key: 'pix_keys', label: 'Chaves PIX' },
    { key: 'operators', label: 'Operadores (não admins)' },
    { key: 'locations', label: 'Locais / Unidades' },
    { key: 'all', label: 'TUDO (exceto admins)', danger: true },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <div style={{ background: '#1a1a2e', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ color: '#e2b04a', fontWeight: 800, fontSize: 18 }}>PAINEL DO DESENVOLVEDOR</div>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 2 }}>Acesso restrito</div>
        </div>
        <button onClick={logout} className="btn btn-secondary btn-sm"
          style={{ color: 'rgba(255,255,255,0.5)', borderColor: 'rgba(255,255,255,0.2)' }}>
          Sair
        </button>
      </div>

      <div style={{ padding: '28px 32px', maxWidth: 700, margin: '0 auto' }}>

        {/* SIDEBAR */}
        <Section title="Personalização da Sidebar">
          <form onSubmit={saveSidebarSettings}>
            <div className="form-row">
              <div className="form-group">
                <label>Nome exibido no topo da sidebar</label>
                <input value={sidebarName} onChange={e => setSidebarName(e.target.value)} placeholder="Ex: CATHEDRAL" />
                <small style={{ color: '#6b7280', fontSize: 12, marginTop: 4, display: 'block' }}>Deixe em branco para usar o padrão "CATHEDRAL".</small>
              </div>
              <div className="form-group">
                <label>Título da aba do navegador</label>
                <input value={appTitle} onChange={e => setAppTitle(e.target.value)} placeholder="Ex: Cathedral Vouchers" />
              </div>
            </div>

            <div className="form-group">
              <label>Prefixo dos códigos de voucher</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <input value={voucherPrefix}
                  onChange={e => setVoucherPrefix(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                  placeholder="Ex: CATH"
                  style={{ maxWidth: 140, fontFamily: 'monospace', fontWeight: 700, letterSpacing: 2 }} />
                <div style={{ background: '#1a1a2e', color: '#e2b04a', padding: '8px 16px', borderRadius: 8, fontFamily: 'monospace', fontWeight: 700, letterSpacing: 2, fontSize: 15 }}>
                  {voucherPrefix || 'CATH'}-XXXX-XXXX
                </div>
              </div>
              <small style={{ color: '#6b7280', fontSize: 12, marginTop: 6, display: 'block' }}>Máximo 6 caracteres. Afeta apenas novos vouchers.</small>
            </div>

            <div className="form-group">
              <label>Cor de fundo da sidebar</label>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
                {SIDEBAR_COLORS.map(c => (
                  <div key={c.value} onClick={() => setSidebarColor(c.value)}
                    style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 8,
                      border: `2px solid ${sidebarColor === c.value ? '#e2b04a' : '#e5e7eb'}`, background: '#fff', fontSize: 13 }}>
                    <div style={{ width: 20, height: 20, borderRadius: 4, background: c.value, border: '1px solid rgba(0,0,0,0.1)' }} />
                    {c.label}
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
                <label style={{ fontSize: 13, color: '#6b7280', marginBottom: 0 }}>Cor personalizada:</label>
                <input type="color" value={sidebarColor} onChange={e => setSidebarColor(e.target.value)}
                  style={{ width: 44, height: 36, border: '1px solid #e5e7eb', borderRadius: 6, cursor: 'pointer', padding: 2 }} />
                <span style={{ fontSize: 12, color: '#9ca3af' }}>{sidebarColor}</span>
              </div>
            </div>

            <div className="form-group">
              <label>Fonte</label>
              <select value={sidebarFont} onChange={e => setSidebarFont(e.target.value)}>
                {FONTS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Cor do nome no topo</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input type="color" value={sidebarNameColor} onChange={e => setSidebarNameColor(e.target.value)}
                    style={{ width: 44, height: 36, border: '1px solid #e5e7eb', borderRadius: 6, cursor: 'pointer', padding: 2 }} />
                  <span style={{ fontSize: 12, color: '#9ca3af' }}>{sidebarNameColor}</span>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSidebarNameColor('#e2b04a')}>Padrão</button>
                </div>
              </div>
              <div className="form-group">
                <label>Cor dos itens do menu</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input type="color" value={sidebarMenuColor.startsWith('rgba') ? '#aaaaaa' : sidebarMenuColor}
                    onChange={e => setSidebarMenuColor(e.target.value)}
                    style={{ width: 44, height: 36, border: '1px solid #e5e7eb', borderRadius: 6, cursor: 'pointer', padding: 2 }} />
                  <span style={{ fontSize: 12, color: '#9ca3af' }}>{sidebarMenuColor}</span>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSidebarMenuColor('rgba(255,255,255,0.65)')}>Padrão</button>
                </div>
              </div>
            </div>

            {/* Preview */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 8 }}>Preview</label>
              <div style={{ width: 180, background: sidebarColor, borderRadius: 10, padding: '16px 0', fontFamily: sidebarFont }}>
                <div style={{ padding: '0 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <div style={{ color: sidebarNameColor, fontSize: 15, fontWeight: 800, letterSpacing: 1 }}>{sidebarName || 'CATHEDRAL'}</div>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, marginTop: 2 }}>{appTitle || 'Sistema de Vouchers'}</div>
                </div>
                {['Dashboard', 'Clientes', 'Operadores'].map(item => (
                  <div key={item} style={{ padding: '9px 16px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, color: sidebarMenuColor }}>◈</span>
                    <span style={{ color: sidebarMenuColor }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar configurações da sidebar'}
            </button>
          </form>
        </Section>

        {/* CONFIGURAÇÕES DO SISTEMA */}
        <Section title="Configurações do sistema">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f3f4f6', marginBottom: 16 }}>
            <div>
              <div style={{ fontWeight: 500, fontSize: 14 }}>Operador pode gerar vouchers</div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                Quando ativo, o painel do operador exibe uma aba para gerar vouchers além de validar.
              </div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: 8 }}>
              <div style={{ position: 'relative', width: 44, height: 24 }} onClick={() => setOperatorCanGenerate(v => !v)}>
                <div style={{ width: 44, height: 24, borderRadius: 12, background: operatorCanGenerate ? '#059669' : '#d1d5db', transition: 'background 0.2s', cursor: 'pointer' }} />
                <div style={{ position: 'absolute', top: 2, left: operatorCanGenerate ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
              </div>
              <span style={{ fontSize: 13, color: operatorCanGenerate ? '#059669' : '#9ca3af', fontWeight: 500 }}>
                {operatorCanGenerate ? 'Ativo' : 'Inativo'}
              </span>
            </label>
          </div>
          <button className="btn btn-primary btn-sm" onClick={saveSystemSettings} disabled={saving}>
            Salvar configurações
          </button>
        </Section>

        {/* USUÁRIO MASTER */}
        <Section title="Usuário Master">
          <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
            O Master é o administrador principal. Ele não pode ser editado, desativado ou excluído por outros admins.
          </p>

          {masterAdmin ? (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>👑 {masterAdmin.name}</div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{masterAdmin.email}</div>
              </div>
              <button className="btn btn-sm"
                style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca' }}
                onClick={removeMaster}>
                Remover Master
              </button>
            </div>
          ) : (
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '12px 16px', marginBottom: 12, fontSize: 13, color: '#92400e' }}>
              Nenhum usuário Master definido. Defina um abaixo.
            </div>
          )}

          {!showSetMaster ? (
            <button className="btn btn-secondary btn-sm" onClick={() => setShowSetMaster(true)}>
              {masterAdmin ? 'Trocar Master' : 'Definir Master'}
            </button>
          ) : (
            <form onSubmit={setMasterByEmail} style={{ background: '#f9fafb', padding: 16, borderRadius: 8, border: '1px solid #e5e7eb' }}>
              <div className="form-group" style={{ marginBottom: 12 }}>
                <label>Email do administrador que será Master</label>
                <input type="email" value={masterEmail} onChange={e => setMasterEmail(e.target.value)}
                  placeholder="email@exemplo.com" required />
                <small style={{ color: '#6b7280', fontSize: 12, marginTop: 4, display: 'block' }}>
                  O admin já deve estar cadastrado no sistema.
                </small>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowSetMaster(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
                  {saving ? 'Salvando...' : 'Definir como Master'}
                </button>
              </div>
            </form>
          )}
        </Section>

        {/* ADMINISTRADORES */}
        <Section title="Administradores do sistema">
          <div className="table-wrap" style={{ marginBottom: 16 }}>
            <table>
              <thead>
                <tr><th>Nome</th><th>Email</th><th>Status</th><th>Ação</th></tr>
              </thead>
              <tbody>
                {admins.length === 0 && (
                  <tr><td colSpan={4} style={{ textAlign: 'center', color: '#9ca3af', padding: 20 }}>Nenhum administrador cadastrado.</td></tr>
                )}
                {admins.map(a => (
                  <tr key={a.id}>
                    <td style={{ fontWeight: 500 }}>{a.name}</td>
                    <td style={{ color: '#6b7280' }}>{a.email}</td>
                    <td><span className={`badge ${a.is_active === false ? 'badge-red' : 'badge-green'}`}>{a.is_active === false ? 'Inativo' : 'Ativo'}</span></td>
                    <td>
                      <button className="btn btn-secondary btn-sm" onClick={() => toggleAdmin(a)}>
                        {a.is_active === false ? 'Reativar' : 'Desativar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!showNewAdmin ? (
            <button className="btn btn-primary btn-sm" onClick={() => setShowNewAdmin(true)}>+ Novo Administrador</button>
          ) : (
            <form onSubmit={createAdmin} style={{ background: '#f9fafb', padding: 16, borderRadius: 8, border: '1px solid #e5e7eb' }}>
              <h3 style={{ marginBottom: 14, fontSize: 14 }}>Novo Administrador</h3>
              <div className="form-group">
                <label>Nome *</label>
                <input value={adminForm.name} onChange={e => setAdminForm({ ...adminForm, name: e.target.value })} required />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Email *</label>
                  <input type="email" value={adminForm.email} onChange={e => setAdminForm({ ...adminForm, email: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Senha *</label>
                  <input type="password" minLength={6} value={adminForm.password} onChange={e => setAdminForm({ ...adminForm, password: e.target.value })} required />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowNewAdmin(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>{saving ? 'Criando...' : 'Criar administrador'}</button>
              </div>
            </form>
          )}
        </Section>

        {/* RELATÓRIOS */}
        <Section title="Relatórios">
          <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
            Baixe os relatórios completos do sistema em Excel.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" onClick={downloadClientesExcel} disabled={saving}>
              Clientes & Vouchers (.xlsx)
            </button>
            <button className="btn btn-secondary" onClick={downloadRelatorioExcel} disabled={saving}>
              Relatório Geral (.xlsx)
            </button>
          </div>
        </Section>

        {/* LIMPAR BANCO */}
        <Section title="Limpar banco de dados" danger>
          <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
            Estas ações são <strong>irreversíveis</strong>. Use apenas para resetar o sistema para um novo cliente.
          </p>
          <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 12 }}>
            Ordem recomendada: Vouchers → Clientes → Chaves PIX → Operadores → Locais → ou use "TUDO" de uma vez.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {clearItems.map(item => (
              <div key={item.key} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 16px', background: item.key === 'all' ? '#fff5f5' : '#fff',
                border: `1px solid ${item.key === 'all' ? '#fca5a5' : '#fecaca'}`, borderRadius: 8,
              }}>
                <div>
                  <div style={{ fontWeight: item.key === 'all' ? 700 : 500, fontSize: 14, color: item.key === 'all' ? '#dc2626' : undefined }}>{item.label}</div>
                  {confirmClear[item.key] && (
                    <div style={{ fontSize: 12, color: '#dc2626', marginTop: 2, fontWeight: 600 }}>Tem certeza? Clique novamente — irreversível!</div>
                  )}
                </div>
                <button className="btn btn-sm"
                  style={{ background: confirmClear[item.key] ? '#dc2626' : '#fee2e2', color: confirmClear[item.key] ? '#fff' : '#dc2626', border: '1px solid #fecaca', fontWeight: confirmClear[item.key] ? 700 : 400 }}
                  onClick={() => clearItem(item.key, item.label)} disabled={saving}>
                  {confirmClear[item.key] ? 'CONFIRMAR EXCLUSÃO' : 'Limpar'}
                </button>
              </div>
            ))}
          </div>
        </Section>

      </div>
    </div>
  )
}
