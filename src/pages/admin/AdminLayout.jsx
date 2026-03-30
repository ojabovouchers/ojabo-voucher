import { useState, useEffect } from 'react'
import { useBranding } from '../../lib/useBranding'
import { Outlet, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../../components/AppProvider'
import Sidebar from '../../components/Sidebar'

export default function AdminLayout() {
  const { user, profile } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const branding = useBranding()
  useEffect(() => { document.title = branding.appTitle }, [branding.appTitle])
  const navigate = useNavigate()

  if (!user) return <Navigate to="/login" replace />
  if (profile && profile.role !== 'admin') return <Navigate to="/operador" replace />

  return (
    <div className="layout">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
      <div className="main">
        {/* Topbar global com botão de perfil */}
        <div style={{
          background: '#fff', borderBottom: '1px solid #e5e7eb',
          padding: '0 28px', height: 56, display: 'flex',
          alignItems: 'center', justifyContent: 'flex-end', flexShrink: 0,
        }}>
          <button
            onClick={() => navigate('/admin/perfil')}
            title="Meu perfil"
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'none', border: '1px solid #e5e7eb',
              borderRadius: 8, padding: '6px 14px', cursor: 'pointer',
              color: '#374151', fontSize: 13, fontWeight: 500,
            }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: branding.color, display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 12, fontWeight: 800, color: branding.nameColor,
            }}>
              {(profile?.name || user?.email || '?')[0].toUpperCase()}
            </div>
            {profile?.name || 'Perfil'}
          </button>
        </div>
        <div style={{ flex: 1, overflow: 'auto' }}>
          <Outlet />
        </div>
      </div>
    </div>
  )
}
