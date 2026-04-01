import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../components/AppProvider'
import { TEMPLATES, generateVoucherImage, getVoucherSettings } from '../../lib/voucherArt'

const VOUCHER_PREVIEW = {
  code: 'CATH-XXXX-0000',
  value: 100,
  expires_at: null,
}

function ColorPicker({ label, storageKey, defaultValue, onChange }) {
  const [color, setColor] = useState(() => localStorage.getItem(storageKey) || defaultValue)

  function handleChange(e) {
    setColor(e.target.value)
    onChange(storageKey, e.target.value)
  }

  function handleReset() {
    localStorage.removeItem(storageKey)
    setColor(defaultValue)
    onChange(storageKey, null)
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
      <input type="color" value={color} onChange={handleChange}
        style={{ width: 40, height: 36, border: '1px solid #e5e7eb', borderRadius: 6, cursor: 'pointer', padding: 2 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 500 }}>{label}</div>
        <div style={{ fontSize: 11, color: '#9ca3af' }}>{color}</div>
      </div>
      <button onClick={handleReset} className="btn btn-secondary btn-sm" style={{ fontSize: 11 }}>
        Padrão
      </button>
    </div>
  )
}

function TemplateCard({ template, selected, onSelect }) {
  const isCustom = template.id === 'custom'
  return (
    <div onClick={onSelect} style={{ cursor: 'pointer' }}>
      <div style={{
        width: '100%', height: 90, borderRadius: 8,
        background: template.bg, display: 'flex', flexDirection: 'column',
        justifyContent: 'space-between', padding: '10px 12px', boxSizing: 'border-box',
        marginBottom: 8, border: selected ? '2px solid #e2b04a' : '2px solid transparent',
        overflow: 'hidden', position: 'relative',
      }}>
        {isCustom ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9ca3af', fontSize: 13 }}>
            Sua imagem aqui
          </div>
        ) : (
          <>
            <div style={{ fontSize: 10, color: template.mutedColor, textTransform: 'uppercase', letterSpacing: 1 }}>Voucher de Consumação</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: template.accentColor }}>R$ 100,00</div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: template.textColor, background: template.codeBackground, padding: '3px 8px', borderRadius: 4, alignSelf: 'flex-start', border: `1px solid ${template.codeBorder}` }}>
              CATH-XXXX
            </div>
          </>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${selected ? '#e2b04a' : '#d1d5db'}`, background: selected ? '#e2b04a' : 'transparent', flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontWeight: selected ? 600 : 400 }}>{template.name}</span>
      </div>
    </div>
  )
}

export default function Configuracoes() {
  const toast = useToast()
  const [logo, setLogo] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)
  const [selectedTemplate, setSelectedTemplate] = useState('classico')
  const [customBg, setCustomBg] = useState(null)
  const [customBgPreview, setCustomBgPreview] = useState(null)
  const [footerText, setFooterText] = useState('')
  const [colorText, setColorText] = useState('')
  const [colorAccent, setColorAccent] = useState('')
  const [colorMuted, setColorMuted] = useState('')
  const [colorOverrides, setColorOverrides] = useState({})
  const [locations, setLocations] = useState([])
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [logoLoading, setLogoLoading] = useState(false)
  const [establishmentName, setEstablishmentName] = useState('')

  useEffect(() => {
    // Carrega logo do Supabase Storage
    supabase.storage.from('branding').createSignedUrl('logo', 3600).then(({ data }) => {
      if (data?.signedUrl) {
        setLogoPreview(data.signedUrl)
        localStorage.setItem('cathedral_logo', data.signedUrl)
      } else {
        const savedLogo = localStorage.getItem('cathedral_logo')
        if (savedLogo) setLogoPreview(savedLogo)
      }
    })

    // Carrega configurações do Supabase
    supabase.from('settings').select('key, value').in('key', [
      'voucher_template', 'voucher_footer_text', 'voucher_custom_bg',
      'voucher_color_text', 'voucher_color_accent', 'voucher_color_muted'
    ]).then(({ data }) => {
      if (!data) return
      const map = {}
      data.forEach(s => { map[s.key] = s.value })
      if (map.voucher_template) {
        setSelectedTemplate(map.voucher_template)
        localStorage.setItem('voucher_template', map.voucher_template)
      } else {
        setSelectedTemplate(localStorage.getItem('voucher_template') || 'classico')
      }
      if (map.voucher_footer_text) {
        setFooterText(map.voucher_footer_text)
        localStorage.setItem('voucher_footer_text', map.voucher_footer_text)
      } else {
        setFooterText(localStorage.getItem('voucher_footer_text') || 'Apresente este voucher ao operador de caixa para efetuar o desconto')
      }
      if (map.voucher_custom_bg) {
        setCustomBgPreview(map.voucher_custom_bg)
        localStorage.setItem('voucher_custom_bg', map.voucher_custom_bg)
      } else {
        const savedCustomBg = localStorage.getItem('voucher_custom_bg')
        if (savedCustomBg) setCustomBgPreview(savedCustomBg)
      }
      // Carrega cores nos estados e localStorage
      if (map.voucher_color_text) { setColorText(map.voucher_color_text); localStorage.setItem('voucher_color_text', map.voucher_color_text) }
      if (map.voucher_color_accent) { setColorAccent(map.voucher_color_accent); localStorage.setItem('voucher_color_accent', map.voucher_color_accent) }
      if (map.voucher_color_muted) { setColorMuted(map.voucher_color_muted); localStorage.setItem('voucher_color_muted', map.voucher_color_muted) }
    })

    supabase.from('locations').select('*').order('name').then(({ data }) => {
      setLocations(data || [])
    })
    supabase.from('settings').select('value').eq('key', 'establishment_name').single()
      .then(({ data }) => { if (data) setEstablishmentName(data.value || '') })
    const saved = localStorage.getItem('establishment_name')
    if (saved) setEstablishmentName(saved)
  }, [])

  function handleLogoUpload(e) {
    const file = e.target.files[0]
    if (!file || !file.type.startsWith('image/')) { toast('Selecione uma imagem.', 'error'); return }
    setLogo(file)
    const reader = new FileReader()
    reader.onload = ev => setLogoPreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  async function saveLogo() {
    if (!logo) return
    setLogoLoading(true)
    try {
      const { error } = await supabase.storage
        .from('branding')
        .upload('logo', logo, { upsert: true, contentType: logo.type })
      if (error) throw error

      const { data } = await supabase.storage.from('branding').createSignedUrl('logo', 3600)
      if (data?.signedUrl) {
        localStorage.setItem('cathedral_logo', data.signedUrl)
        setLogoPreview(data.signedUrl)
      }
      toast('Logo salva com sucesso!', 'success')
    } catch (err) {
      toast('Erro ao salvar logo: ' + err.message, 'error')
    } finally {
      setLogoLoading(false)
    }
  }

  async function removeLogo() {
    await supabase.storage.from('branding').remove(['logo'])
    localStorage.removeItem('cathedral_logo')
    setLogo(null)
    setLogoPreview(null)
    toast('Logo removida.', 'success')
  }

  function handleCustomBgUpload(e) {
    const file = e.target.files[0]
    if (!file || !file.type.startsWith('image/')) { toast('Selecione uma imagem.', 'error'); return }
    const reader = new FileReader()
    reader.onload = ev => {
      setCustomBgPreview(ev.target.result)
      setCustomBg(ev.target.result)
      setSelectedTemplate('custom')
    }
    reader.readAsDataURL(file)
  }

  function handleColorChange(key, value) {
    setColorOverrides(prev => ({ ...prev, [key]: value }))
    if (key === 'voucher_color_text') setColorText(value || '')
    if (key === 'voucher_color_accent') setColorAccent(value || '')
    if (key === 'voucher_color_muted') setColorMuted(value || '')
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  }

  async function saveTemplate() {
    if (selectedTemplate === 'custom' && !customBgPreview) {
      toast('Faça upload de uma imagem de fundo primeiro.', 'error')
      return
    }
    setSaving(true)
    try {
      localStorage.setItem('voucher_template', selectedTemplate)
      localStorage.setItem('voucher_footer_text', footerText)

      const toSave = [
        { key: 'voucher_template', value: selectedTemplate },
        { key: 'voucher_footer_text', value: footerText },
      ]

      if (selectedTemplate === 'custom' && customBg) {
        localStorage.setItem('voucher_custom_bg', customBg)
        toSave.push({ key: 'voucher_custom_bg', value: customBg })
      }

      // Salva cores personalizadas dos estados React
      if (colorText) { toSave.push({ key: 'voucher_color_text', value: colorText }); localStorage.setItem('voucher_color_text', colorText) }
      if (colorAccent) { toSave.push({ key: 'voucher_color_accent', value: colorAccent }); localStorage.setItem('voucher_color_accent', colorAccent) }
      if (colorMuted) { toSave.push({ key: 'voucher_color_muted', value: colorMuted }); localStorage.setItem('voucher_color_muted', colorMuted) }

      await Promise.all(toSave.map(({ key, value }) =>
        supabase.from('settings').upsert({ key, value }, { onConflict: 'key' })
      ))

      toast('Configurações do voucher salvas!', 'success')
    } catch {
      toast('Erro ao salvar.', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function saveEstablishment(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const { error } = await supabase
        .from('settings')
        .upsert({ key: 'establishment_name', value: establishmentName }, { onConflict: 'key' })
      if (error) throw error
      localStorage.setItem('establishment_name', establishmentName)
      toast('Nome do estabelecimento salvo!', 'success')
    } catch {
      toast('Erro ao salvar.', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handlePreview() {
    setGenerating(true)
    try {
      localStorage.setItem('voucher_template', selectedTemplate)
      localStorage.setItem('voucher_footer_text', footerText)
      if (selectedTemplate === 'custom' && customBg) localStorage.setItem('voucher_custom_bg', customBg)
      const canvas = await generateVoucherImage(VOUCHER_PREVIEW, 'Bar da Fábrica da Catedral')
      const link = document.createElement('a')
      link.download = 'preview-voucher.png'
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch {
      toast('Erro ao gerar preview.', 'error')
    } finally {
      setGenerating(false)
    }
  }

  const currentTemplate = TEMPLATES.find(t => t.id === selectedTemplate) || TEMPLATES[0]

  const allTemplates = [
    ...TEMPLATES,
    {
      id: 'custom',
      name: 'Personalizado',
      bg: customBgPreview ? `url(${customBgPreview}) center/cover no-repeat` : '#f3f4f6',
      textColor: '#ffffff', mutedColor: '#dddddd', accentColor: '#e2b04a',
      codeBackground: 'rgba(0,0,0,0.4)', codeBorder: 'rgba(255,255,255,0.3)',
    }
  ]

  return (
    <div className="page-content">
      <div className="topbar"><h1>Configurações</h1></div>

      <div style={{ padding: '24px 28px', maxWidth: 720 }}>

        {/* LOGO */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header"><h2>Logo do Estabelecimento</h2></div>
          <p style={{ color: '#6b7280', marginBottom: 16, fontSize: 13 }}>
            Aparece na arte dos vouchers. Use PNG com fundo transparente para melhor resultado.
          </p>
          {logoPreview && (
            <div style={{ marginBottom: 16, padding: 16, background: '#1a1a2e', borderRadius: 10, display: 'inline-flex' }}>
              <img src={logoPreview} alt="Logo" style={{ maxHeight: 50, maxWidth: 180, objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
            </div>
          )}
          <div className="form-group">
            <label>Selecionar arquivo</label>
            <input type="file" accept="image/*" onChange={handleLogoUpload} />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-primary" onClick={saveLogo} disabled={!logo || logoLoading}>{logoLoading ? 'Salvando...' : 'Salvar Logo'}</button>
            {logoPreview && <button className="btn btn-danger" onClick={removeLogo}>Remover</button>}
          </div>
        </div>

        {/* TEMPLATE */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header"><h2>Visual do Voucher</h2></div>

          {/* Seleção de template */}
          <h3 style={{ marginBottom: 12, fontSize: 14, color: '#374151' }}>Template de fundo</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 16, marginBottom: 20 }}>
            {allTemplates.map(t => (
              <TemplateCard key={t.id} template={t} selected={selectedTemplate === t.id} onSelect={() => setSelectedTemplate(t.id)} />
            ))}
          </div>

          {selectedTemplate === 'custom' && (
            <div className="form-group" style={{ background: '#f9fafb', padding: 14, borderRadius: 8, border: '1px solid #e5e7eb', marginBottom: 20 }}>
              <label>Imagem de fundo personalizada</label>
              <input type="file" accept="image/*" onChange={handleCustomBgUpload} />
              <small style={{ color: '#6b7280', fontSize: 12, marginTop: 4, display: 'block' }}>
                Recomendado: 1000x560px. JPG ou PNG.
              </small>
            </div>
          )}

          {/* Cores dos textos */}
          <h3 style={{ marginBottom: 12, fontSize: 14, color: '#374151' }}>Cores dos textos</h3>
          <div style={{ background: '#f9fafb', padding: 16, borderRadius: 8, border: '1px solid #e5e7eb', marginBottom: 20 }}>
            <ColorPicker
              label="Cor principal (títulos e código)"
              storageKey="voucher_color_text"
              defaultValue={currentTemplate.textColor}
              onChange={handleColorChange}
            />
            <ColorPicker
              label="Cor de destaque (valor e acento)"
              storageKey="voucher_color_accent"
              defaultValue={currentTemplate.accentColor}
              onChange={handleColorChange}
            />
            <ColorPicker
              label="Cor secundária (textos menores)"
              storageKey="voucher_color_muted"
              defaultValue={currentTemplate.mutedColor}
              onChange={handleColorChange}
            />
          </div>

          {/* Texto do rodapé */}
          <h3 style={{ marginBottom: 8, fontSize: 14, color: '#374151' }}>Texto do rodapé do voucher</h3>
          <div className="form-group" style={{ marginBottom: 20 }}>
            <textarea
              value={footerText}
              onChange={e => setFooterText(e.target.value)}
              rows={2}
              maxLength={150}
              style={{ resize: 'vertical' }}
            />
            <small style={{ color: '#9ca3af', fontSize: 11 }}>{footerText.length}/150 caracteres</small>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-primary" onClick={saveTemplate}>Salvar configurações</button>
            <button className="btn btn-secondary" onClick={handlePreview} disabled={generating}>
              {generating ? 'Gerando...' : 'Baixar preview'}
            </button>
          </div>
        </div>

        {/* ESTABELECIMENTO */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header"><h2>Nome do estabelecimento</h2></div>
          <form onSubmit={saveEstablishment}>
            <div className="form-group">
              <label>Nome do estabelecimento</label>
              <input
                value={establishmentName}
                onChange={e => setEstablishmentName(e.target.value)}
                placeholder="Ex: Cathedral Sports Bar"
                required
              />
              <small style={{ color: '#6b7280', fontSize: 12, marginTop: 4, display: 'block' }}>
                Aparece nas mensagens do WhatsApp e nos vouchers gerados.
              </small>
            </div>
            <button type="submit" className="btn btn-primary" disabled={saving}>Salvar</button>
          </form>
        </div>

        {/* SOBRE */}
        <div className="card">
          <div className="card-header"><h2>Sobre o sistema</h2></div>
          <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.8 }}>
            <p><strong>Versão:</strong> 1.0.0</p>
            <p><strong>Banco de dados:</strong> Supabase (PostgreSQL)</p>
            <p><strong>Hospedagem:</strong> Vercel</p>
            <p><strong>Custo mensal:</strong> R$ 0,00</p>
          </div>
        </div>
      </div>
    </div>
  )
}
