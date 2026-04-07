import { useState, useEffect } from 'react'
import { supabase } from './supabase'

const KEYS = ['sidebar_name', 'sidebar_color', 'sidebar_name_color', 'sidebar_menu_color', 'sidebar_font', 'app_title', 'voucher_prefix', 'establishment_name']

const DEFAULTS = {
  name: 'CATHEDRAL',
  color: '#1a1a2e',
  nameColor: '#e2b04a',
  menuColor: 'rgba(255,255,255,0.65)',
  font: "'Segoe UI', Arial, sans-serif",
  appTitle: 'Cathedral Vouchers',
  loginBg: '#1a1a2e',
}

function mapToBranding(map) {
  return {
    name: map.sidebar_name || DEFAULTS.name,
    color: map.sidebar_color || DEFAULTS.color,
    nameColor: map.sidebar_name_color || DEFAULTS.nameColor,
    menuColor: map.sidebar_menu_color || DEFAULTS.menuColor,
    font: map.sidebar_font || DEFAULTS.font,
    appTitle: map.app_title || DEFAULTS.appTitle,
    loginBg: map.sidebar_color || DEFAULTS.loginBg,
    voucherPrefix: map.voucher_prefix || 'CATH',
  }
}

function getFromStorage() {
  const map = {}
  KEYS.forEach(k => { map[k] = localStorage.getItem(k) || '' })
  return mapToBranding(map)
}

export function useBranding() {
  const [branding, setBranding] = useState(getFromStorage)

  async function loadFromSupabase() {
    try {
      const { data } = await supabase.from('settings').select('key, value').in('key', KEYS)
      if (!data?.length) return

      const map = {}
      data.forEach(s => {
        map[s.key] = s.value
        if (s.value) localStorage.setItem(s.key, s.value)
      })

      const updated = mapToBranding(map)
      setBranding(updated)
      if (updated.appTitle) document.title = updated.appTitle
    } catch {
      // Falha silenciosa — mantém o que está na tela
    }
  }

  function loadFromLocalStorage() {
    const updated = getFromStorage()
    setBranding(updated)
    if (updated.appTitle) document.title = updated.appTitle
  }

  useEffect(() => {
    // Aplica localStorage imediatamente (sem piscar)
    const initial = getFromStorage()
    setBranding(initial)
    if (initial.appTitle) document.title = initial.appTitle

    // Sempre busca do Supabase para garantir dados atualizados
    loadFromSupabase()

    // Escuta atualizações feitas na mesma aba (painel dev)
    window.addEventListener('sidebar-settings-updated', loadFromLocalStorage)
    return () => window.removeEventListener('sidebar-settings-updated', loadFromLocalStorage)
  }, [])

  return branding
}
