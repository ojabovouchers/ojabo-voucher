import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from './AppProvider'
import { useBranding } from '../lib/useBranding'

const links = [
  { to: '/admin', label: 'Dashboard', icon: '⊞', end: true },
  { to: '/admin/clientes', label: 'Clientes & Vouchers', icon: '◈' },
  { to: '/admin/operadores', label: 'Operadores', icon: '◉' },
  { to: '/admin/chaves-pix', label: 'Chaves PIX', icon: '₿' },
  { to: '/admin/relatorios', label: 'Relatórios', icon: '◧' },
  { to: '/admin/validar', label: 'Validar Voucher', icon: '✓' },
  { to: '/admin/configuracoes', label: 'Configurações', icon: '◎' },
]

export default function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }) {
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const branding = useBranding()

  const sidebarName = branding.name || 'CATHEDRAL'
  const sidebarColor = branding.color || '#1a1a2e'
  const sidebarNameColor = branding.nameColor || '#e2b04a'
  const sidebarMenuColor = branding.menuColor || 'rgba(255,255,255,0.65)'
  const sidebarFont = branding.font || "'Segoe UI', Arial, sans-serif"

  async function handleLogout() {
    await signOut()
    navigate('/login')
  }

  function handleNavClick() {
    if (onMobileClose) onMobileClose()
  }

  // Mobile: drawer deslizante sobre o conteúdo
  const isMobileMode = typeof mobileOpen !== 'undefined'

  if (isMobileMode) {
    return (
      <>
        {/* Overlay escuro ao fundo */}
        {mobileOpen && (
          <div
            onClick={onMobileClose}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
              zIndex: 100, transition: 'opacity 0.2s',
            }}
          />
        )}

        {/* Drawer lateral */}
        <div style={{
          position: 'fixed', top: 0, left: 0, bottom: 0,
          width: 240,
          background: sidebarColor,
          fontFamily: sidebarFont,
          zIndex: 101,
          display: 'flex', flexDirection: 'column',
          transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.25s ease',
          boxShadow: mobileOpen ? '4px 0 20px rgba(0,0,0,0.3)' : 'none',
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 20px 20px' }}>
            <div>
              <span style={{ color: sidebarNameColor, fontSize: 18, fontWeight: 800, letterSpacing: 1 }}>
                {sidebarName || 'CATHEDRAL'}
              </span>
              <small style={{ display: 'block', color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 2 }}>
                Sistema de Vouchers
              </small>
            </div>
            <button onClick={onMobileClose}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', padding: 4 }}>
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>

          {/* Nav */}
          <nav style={{ flex: 1, padding: '8px 0', display: 'flex', flexDirection: 'column' }}>
            {links.map(l => (
              <NavLink key={l.to} to={l.to} end={l.end}
                onClick={handleNavClick}
                className={({ isActive }) => isActive ? 'active' : ''}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '14px 20px', color: sidebarMenuColor,
                  fontSize: 15, width: '100%', textDecoration: 'none',
                }}>
                <span style={{ fontSize: 17, flexShrink: 0, width: 20, textAlign: 'center' }}>{l.icon}</span>
                <span>{l.label}</span>
              </NavLink>
            ))}
          </nav>

          {/* Sair */}
          <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <button onClick={handleLogout} className="btn btn-secondary btn-sm"
              style={{ width: '100%', justifyContent: 'center', color: 'rgba(255,255,255,0.5)', borderColor: 'rgba(255,255,255,0.1)' }}>
              Sair
            </button>
          </div>
        </div>
      </>
    )
  }

  // Desktop: sidebar fixa como antes
  return (
    <div className="sidebar" style={{
      width: collapsed ? 56 : 220,
      transition: 'width 0.2s ease',
      overflow: 'hidden',
      background: sidebarColor,
      fontFamily: sidebarFont,
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
    }}>
      <div className="sidebar-logo" style={{
        display: 'flex', alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        padding: collapsed ? '20px 0' : '24px 20px 20px',
      }}>
        {!collapsed && (
          <div>
            <span style={{ color: sidebarNameColor, fontSize: 18, fontWeight: 800, letterSpacing: 1 }}>
              {sidebarName || 'CATHEDRAL'}
            </span>
            <small style={{ display: 'block', color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 2 }}>
              Sistema de Vouchers
            </small>
          </div>
        )}
        <button onClick={onToggle} title={collapsed ? 'Expandir menu' : 'Recolher menu'}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', padding: 4, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            {collapsed ? <path d="M9 18l6-6-6-6"/> : <path d="M15 18l-6-6 6-6"/>}
          </svg>
        </button>
      </div>

      <nav style={{ padding: '12px 0', flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        {links.map(l => (
          <NavLink key={l.to} to={l.to} end={l.end}
            title={collapsed ? l.label : ''}
            className={({ isActive }) => isActive ? 'active' : ''}
            style={{ justifyContent: collapsed ? 'center' : 'flex-start', padding: collapsed ? '10px 0' : '10px 20px', color: sidebarMenuColor }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>{l.icon}</span>
            {!collapsed && l.label}
          </NavLink>
        ))}
      </nav>

      <div style={{ padding: collapsed ? '12px 0' : '16px 20px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
        {collapsed ? (
          <button onClick={handleLogout} title="Sair"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center' }}>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
            </svg>
          </button>
        ) : (
          <button onClick={handleLogout} className="btn btn-secondary btn-sm"
            style={{ width: '100%', justifyContent: 'center', color: 'rgba(255,255,255,0.5)', borderColor: 'rgba(255,255,255,0.1)' }}>
            Sair
          </button>
        )}
      </div>
    </div>
  )
}
