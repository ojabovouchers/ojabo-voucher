import { useState, useEffect } from 'react'
import { supabase } from './supabase'

function getFromStorage() {
  return {
    name: localStorage.getItem('sidebar_name') || '',
    color: localStorage.getItem('sidebar_color') || '#1a1a2e',
    nameColor: localStorage.getItem('sidebar_name_color') || '#e2b04a',
    menuColor: localStorage.getItem('sidebar_menu_color') || 'rgba(255,255,255,0.65)',
    font: localStorage.getItem('sidebar_font') || "'Segoe UI', Arial, sans-serif",
    appTitle: localStorage.getItem('app_title') || 'Cathedral Vouchers',
    loginBg: localStorage.getItem('sidebar_color') || '#1a1a2e',
  }
}

export function useBranding() {
  const [branding, setBranding] = useState(getFromStorage)

  async function loadFromSupabase() {
    try {
      const { data } = await supabase.from('settings').select('key, value')
      if (!data) return
      const map = {}
      data.forEach(s => { map[s.key] = s.value })

      const keys = ['sidebar_name', 'sidebar_color', 'sidebar_name_color', 'sidebar_menu_color', 'sidebar_font', 'app_title', 'voucher_prefix', 'establishment_name']
      keys.forEach(k => { if (map[k]) localStorage.setItem(k, map[k]) })

      const updated = getFromStorage()
      setBranding(updated)
      // Atualiza o título imediatamente após buscar do banco
      if (updated.appTitle) document.title = updated.appTitle
    } catch {
      // Falha silenciosa — usa localStorage como fallback
    }
  }

  function loadFromLocalStorage() {
    const updated = getFromStorage()
    setBranding(updated)
    if (updated.appTitle) document.title = updated.appTitle
  }

  useEffect(() => {
    // Aplica imediatamente do localStorage (sem esperar o Supabase)
    const initial = getFromStorage()
    if (initial.appTitle) document.title = initial.appTitle
    // Depois busca do banco para garantir que está atualizado
    loadFromSupabase()
    window.addEventListener('sidebar-settings-updated', loadFromLocalStorage)
    return () => window.removeEventListener('sidebar-settings-updated', loadFromLocalStorage)
  }, [])

  return branding
}
