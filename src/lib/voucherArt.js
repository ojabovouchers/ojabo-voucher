import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import { supabase } from './supabase'
import { formatCurrency, formatDate } from './utils'

export const TEMPLATES = [
  {
    id: 'classico',
    name: 'Clássico Escuro',
    bg: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    textColor: '#ffffff', mutedColor: '#aaaaaa', accentColor: '#e2b04a',
    codeBackground: 'rgba(255,255,255,0.1)', codeBorder: 'rgba(255,255,255,0.2)',
    circle1: 'rgba(226,176,74,0.07)', circle2: 'rgba(226,176,74,0.04)',
    logoFilter: 'brightness(0) invert(1)',
  },
  {
    id: 'dourado',
    name: 'Dourado Elegante',
    bg: 'linear-gradient(135deg, #2c1810 0%, #4a2c1a 50%, #6b3f22 100%)',
    textColor: '#fff8ee', mutedColor: '#d4a876', accentColor: '#f0c060',
    codeBackground: 'rgba(240,192,96,0.15)', codeBorder: 'rgba(240,192,96,0.4)',
    circle1: 'rgba(240,192,96,0.08)', circle2: 'rgba(240,192,96,0.04)',
    logoFilter: 'brightness(0) invert(1) sepia(1) saturate(2) hue-rotate(10deg)',
  },
  {
    id: 'moderno',
    name: 'Moderno Claro',
    bg: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 50%, #dee2e6 100%)',
    textColor: '#1a1a2e', mutedColor: '#6b7280', accentColor: '#0f3460',
    codeBackground: 'rgba(15,52,96,0.08)', codeBorder: 'rgba(15,52,96,0.2)',
    circle1: 'rgba(15,52,96,0.04)', circle2: 'rgba(15,52,96,0.03)',
    logoFilter: 'none',
  },
  {
    id: 'premium',
    name: 'Premium Preto',
    bg: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0d0d0d 100%)',
    textColor: '#ffffff', mutedColor: '#888888', accentColor: '#c9a84c',
    codeBackground: 'rgba(201,168,76,0.1)', codeBorder: 'rgba(201,168,76,0.3)',
    circle1: 'rgba(201,168,76,0.06)', circle2: 'rgba(201,168,76,0.03)',
    logoFilter: 'brightness(0) invert(1)',
  },
]

// Busca configurações do Supabase e atualiza localStorage como cache
export async function loadVoucherSettings() {
  try {
    const keys = [
      'voucher_template', 'voucher_footer_text', 'voucher_custom_bg',
      'voucher_color_text', 'voucher_color_accent', 'voucher_color_muted',
    ]
    const { data } = await supabase.from('settings').select('key, value').in('key', keys)
    if (data) {
      data.forEach(({ key, value }) => {
        if (value) localStorage.setItem(key, value)
      })
    }

    // Logo do Storage
    const { data: logoData } = await supabase.storage.from('branding').createSignedUrl('logo', 3600)
    if (logoData?.signedUrl) localStorage.setItem('cathedral_logo', logoData.signedUrl)
  } catch {
    // Falha silenciosa — usa cache do localStorage
  }
}

export function getVoucherSettings() {
  const savedId = localStorage.getItem('voucher_template') || 'classico'
  const customBg = localStorage.getItem('voucher_custom_bg')

  let template
  if (savedId === 'custom' && customBg) {
    template = {
      id: 'custom',
      bg: `url(${customBg}) center/cover no-repeat`,
      textColor: '#ffffff', mutedColor: '#dddddd', accentColor: '#e2b04a',
      codeBackground: 'rgba(0,0,0,0.4)', codeBorder: 'rgba(255,255,255,0.3)',
      circle1: 'transparent', circle2: 'transparent',
      logoFilter: 'brightness(0) invert(1)',
    }
  } else {
    template = TEMPLATES.find(t => t.id === savedId) || TEMPLATES[0]
  }

  const customTextColor = localStorage.getItem('voucher_color_text')
  const customAccentColor = localStorage.getItem('voucher_color_accent')
  const customMutedColor = localStorage.getItem('voucher_color_muted')

  return {
    ...template,
    textColor: customTextColor || template.textColor,
    accentColor: customAccentColor || template.accentColor,
    mutedColor: customMutedColor || template.mutedColor,
    footerText: localStorage.getItem('voucher_footer_text') || 'Apresente este voucher ao operador de caixa para efetuar o desconto',
  }
}

async function urlToBase64(url) {
  try {
    const res = await fetch(url)
    const blob = await res.blob()
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

export async function generateVoucherImage(voucher, locationName) {
  // Sempre busca as configurações mais recentes do Supabase antes de gerar
  await loadVoucherSettings()

  const t = getVoucherSettings()
  const logoUrl = localStorage.getItem('cathedral_logo') || null

  let logoSrc = null
  if (logoUrl) {
    logoSrc = logoUrl.startsWith('data:') ? logoUrl : await urlToBase64(logoUrl)
  }

  const logoHtml = logoSrc
    ? `<img src="${logoSrc}" style="height:38px; object-fit:contain; filter:${t.logoFilter};" />`
    : `<span style="font-size:22px; font-weight:800; letter-spacing:2px; color:${t.accentColor};">CATHEDRAL</span>`

  const locationText = locationName ? `Válido em: ${locationName}` : 'Válido em todas as unidades'

  const container = document.createElement('div')
  container.style.cssText = `
    position: fixed; top: -9999px; left: -9999px;
    width: 500px; height: 280px;
    background: ${t.bg};
    border-radius: 16px;
    padding: 24px 32px;
    font-family: 'Segoe UI', Arial, sans-serif;
    color: ${t.textColor};
    box-sizing: border-box;
    overflow: hidden;
  `

  container.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:14px;">
      <div>${logoHtml}</div>
      <div style="text-align:right;">
        <div style="font-size:11px; color:${t.mutedColor}; text-transform:uppercase; letter-spacing:1px;">Voucher de Consumação</div>
        <div style="font-size:11px; color:${t.mutedColor}; margin-top:2px;">${voucher.expires_at ? 'Válido até ' + formatDate(voucher.expires_at) : 'Sem data de validade'}</div>
        <div style="font-size:11px; color:${t.accentColor}; margin-top:2px; font-weight:600;">${locationText}</div>
      </div>
    </div>
    <div style="margin-bottom:14px;">
      <div style="font-size:13px; color:${t.mutedColor}; margin-bottom:4px;">Valor</div>
      <div style="font-size:40px; font-weight:800; color:${t.accentColor}; line-height:1;">${formatCurrency(voucher.value)}</div>
    </div>
    <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:12px;">
      <div>
        <div style="font-size:11px; color:${t.mutedColor}; margin-bottom:6px; text-transform:uppercase; letter-spacing:1px;">Código</div>
        <div style="font-size:20px; font-weight:700; letter-spacing:3px; color:${t.textColor}; background:${t.codeBackground}; padding:8px 14px; border-radius:8px; border:1px solid ${t.codeBorder};">${voucher.code}</div>
      </div>
    </div>
    <div style="font-size:10px; color:${t.mutedColor}; line-height:1.5; border-top:1px solid ${t.codeBorder}; padding-top:8px;">
      ${t.footerText}
    </div>
    <div style="position:absolute; top:-40px; right:-40px; width:160px; height:160px; border-radius:50%; background:${t.circle1};"></div>
    <div style="position:absolute; bottom:-60px; left:-30px; width:200px; height:200px; border-radius:50%; background:${t.circle2};"></div>
  `

  document.body.appendChild(container)
  try {
    const canvas = await html2canvas(container, { scale: 2, backgroundColor: null, useCORS: true, allowTaint: true })
    document.body.removeChild(container)
    return canvas
  } catch (e) {
    document.body.removeChild(container)
    throw e
  }
}

export async function downloadVoucherPNG(voucher, locationName) {
  const canvas = await generateVoucherImage(voucher, locationName)
  const link = document.createElement('a')
  link.download = `voucher-${voucher.code}.png`
  link.href = canvas.toDataURL('image/png')
  link.click()
}

export async function downloadVoucherPDF(voucher, locationName) {
  const canvas = await generateVoucherImage(voucher, locationName)
  const imgData = canvas.toDataURL('image/png')
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [500, 280] })
  pdf.addImage(imgData, 'PNG', 0, 0, 500, 280)
  pdf.save(`voucher-${voucher.code}.pdf`)
}
