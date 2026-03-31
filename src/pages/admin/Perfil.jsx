import { useState, useEffect } from 'react'
import { useBranding } from '../../lib/useBranding'
import { supabase } from '../../lib/supabase'
import { useAuth, useToast } from '../../components/AppProvider'

function Section({ title, children }) {
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="card-header"><h2>{title}</h2></div>
      {children}
    </div>
  )
}

// Declarado FORA do componente principal para evitar perda de foco
function PasswordField({ label, field, value, onChange, showPass, onToggleShow }) {
  return (
    <div className="form-group">
      <label>{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          type={showPass ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder="Mínimo 6 caracteres"
          style={{ paddingRight: 42 }}
        />
        <button type="button"
          onClick={onToggleShow}
          style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex', alignItems: 'center' }}>
          {showPass
            ? <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M3 12s3-7 9-7 9 7 9 7-3 7-9 7-9-7-9-7z"/><circle cx="12" cy="12" r="3"/></svg>
            : <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-6 0-9-8-9-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c6 0 9 8 9 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
          }
        </button>
      </div>
    </div>
  )
}

export default function Perfil() {
  const { user, profile } = useAuth()
  const branding = useBranding()
  const toast = useToast()
  const [saving, setSaving] = useState(false)

  const [nameForm, setNameForm] = useState({ name: '' })
  const [passwordForm, setPasswordForm] = useState({ new: '', confirm: '' })
  const [showPass, setShowPass] = useState({ new: false, confirm: false })

  useEffect(() => {
    if (profile) setNameForm({ name: profile.name || '' })
  }, [profile])

  async function saveName(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const { error } = await supabase
        .from('operators')
        .update({ name: nameForm.name })
        .eq('id', profile.id)
      if (error) throw error
      toast('Nome atualizado!', 'success')
    } catch {
      toast('Erro ao atualizar nome.', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function savePassword(e) {
    e.preventDefault()
    if (passwordForm.new !== passwordForm.confirm) {
      toast('As senhas não coincidem.', 'error')
      return
    }
    if (passwordForm.new.length < 6) {
      toast('A nova senha deve ter no mínimo 6 caracteres.', 'error')
      return
    }
    setSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: passwordForm.new })
      if (error) throw error
      toast('Senha alterada com sucesso!', 'success')
      setPasswordForm({ new: '', confirm: '' })
    } catch {
      toast('Erro ao alterar senha.', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page-content">
      <div className="topbar"><h1>Meu Perfil</h1></div>

      <div style={{ padding: '24px 28px', maxWidth: 560 }}>

        {/* Info da conta */}
        <div className="card" style={{ marginBottom: 16, background: branding.color, color: 'white' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800, color: branding.nameColor, flexShrink: 0 }}>
              {(profile?.name || user?.email || '?')[0].toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{profile?.name || 'Administrador'}</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>{user?.email}</div>
              <span style={{ fontSize: 11, background: 'rgba(0,0,0,0.2)', color: branding.nameColor, padding: '2px 10px', borderRadius: 999, marginTop: 6, display: 'inline-block' }}>
                Administrador
              </span>
            </div>
          </div>
        </div>

        {/* Nome */}
        <Section title="Dados pessoais">
          <form onSubmit={saveName}>
            <div className="form-group">
              <label>Seu nome</label>
              <input value={nameForm.name} onChange={e => setNameForm({ name: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input value={user?.email || ''} disabled style={{ background: '#f9fafb', color: '#9ca3af' }} />
              <small style={{ color: '#9ca3af', fontSize: 12, marginTop: 4, display: 'block' }}>
                Para alterar o email, acesse Operadores → botão Email.
              </small>
            </div>
            <button type="submit" className="btn btn-primary" disabled={saving}>Salvar nome</button>
          </form>
        </Section>

        {/* Senha */}
        <Section title="Alterar senha">
          <form onSubmit={savePassword}>
            <PasswordField
              label="Nova senha *"
              field="new"
              value={passwordForm.new}
              onChange={e => setPasswordForm(f => ({ ...f, new: e.target.value }))}
              showPass={showPass.new}
              onToggleShow={() => setShowPass(s => ({ ...s, new: !s.new }))}
            />
            <PasswordField
              label="Confirmar nova senha *"
              field="confirm"
              value={passwordForm.confirm}
              onChange={e => setPasswordForm(f => ({ ...f, confirm: e.target.value }))}
              showPass={showPass.confirm}
              onToggleShow={() => setShowPass(s => ({ ...s, confirm: !s.confirm }))}
            />
            {passwordForm.confirm && passwordForm.new !== passwordForm.confirm && (
              <small style={{ color: '#dc2626', fontSize: 12, display: 'block', marginTop: -10, marginBottom: 12 }}>
                As senhas não coincidem.
              </small>
            )}
            <button type="submit" className="btn btn-primary"
              disabled={saving || (!!passwordForm.confirm && passwordForm.new !== passwordForm.confirm)}>
              Alterar senha
            </button>
          </form>
        </Section>

      </div>
    </div>
  )
}
