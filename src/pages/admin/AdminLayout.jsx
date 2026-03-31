import { useState, useEffect } from 'react'
import { useBranding } from '../../lib/useBranding'
import { Outlet, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../../components/AppProvider'
import Sidebar from '../../components/Sidebar'

function useIsMobile() {
  const [mobile, setMobile] = useState(window.innerWidth < 768)
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < 768)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return mobile
}

export default function AdminLayout() {
  const { user, profile } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const branding = useBranding()
  const isMobile = useIsMobile()
  const navigate = useNavigate()

  useEffect(() => { document.title = branding.appTitle }, [branding.appTitle])

  if (!user) return <Navigate to="/login" replace />
  if (profile && profile.role !== 'admin') return <Navigate to="/operador" replace />

  return (
    <div className="layout">

      {/* Desktop: sidebar fixa */}
      {!isMobile && (
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
      )}

      {/* Mobile: drawer */}
      {isMobile && (
        <Sidebar
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
        />
      )}

      <div className="main">
        {/* Topbar */}
        <div style={{
          background: '#fff', borderBottom: '1px solid #e5e7eb',
          padding: '0 16px', height: 56, display: 'flex',
          alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        }}>
          {/* Botão hambúrguer no mobile */}
          {isMobile && (
            <button onClick={() => setMobileOpen(true)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, display: 'flex', alignItems: 'center' }}>
              <svg width="22" height="22" fill="none" stroke="#374151" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M3 12h18M3 6h18M3 18h18"/>
              </svg>
            </button>
          )}

          {/* Nome no mobile */}
          {isMobile && (
            <span style={{ color: branding.nameColor || '#e2b04a', fontWeight: 800, fontSize: 15, letterSpacing: 1 }}>
              {branding.name || 'CATHEDRAL'}
            </span>
          )}

          {!isMobile && <div />}

          {/* Botão de perfil */}
          <button
            onClick={() => navigate('/admin/perfil')}
            title="Meu perfil"
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'none', border: '1px solid #e5e7eb',
              borderRadius: 8, padding: '6px 12px', cursor: 'pointer',
              color: '#374151', fontSize: 13, fontWeight: 500,
            }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: branding.color, display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 12, fontWeight: 800, color: branding.nameColor,
            }}>
              {(profile?.name || user?.email || '?')[0].toUpperCase()}
            </div>
            {!isMobile && (profile?.name || 'Perfil')}
          </button>
        </div>

        <div style={{ flex: 1, overflow: 'auto' }}>
          <Outlet />
        </div>
      </div>
    </div>
  )
}
