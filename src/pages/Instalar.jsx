import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBranding } from '../lib/useBranding'

function detectDevice() {
  const ua = navigator.userAgent
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream
  const isAndroid = /Android/.test(ua)
  const isSafari = /Safari/.test(ua) && !/Chrome/.test(ua)
  const isChrome = /Chrome/.test(ua)
  return { isIOS, isAndroid, isSafari, isChrome }
}

function StepCircle({ n }) {
  return (
    <div style={{
      width: 28, height: 28, borderRadius: '50%',
      background: '#e2b04a', color: '#000',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 800, fontSize: 14, flexShrink: 0,
    }}>{n}</div>
  )
}

function StepRow({ n, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 20 }}>
      <StepCircle n={n} />
      <div style={{ fontSize: 15, lineHeight: 1.6, color: '#1a1a2e', paddingTop: 2 }}>{children}</div>
    </div>
  )
}

function IconBox({ children }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      background: '#f3f4f6', border: '1px solid #d1d5db',
      borderRadius: 8, padding: '2px 10px', margin: '0 3px',
      fontSize: 13, fontWeight: 600, verticalAlign: 'middle',
    }}>{children}</span>
  )
}

export default function Instalar() {
  const branding = useBranding()
  const navigate = useNavigate()
  const [device, setDevice] = useState(null)
  const [installed, setInstalled] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState(null)

  useEffect(() => {
    setDevice(detectDevice())

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
    })

    window.addEventListener('appinstalled', () => {
      setInstalled(true)
    })
  }, [])

  async function handleInstallAndroid() {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const result = await deferredPrompt.userChoice
      if (result.outcome === 'accepted') setInstalled(true)
    }
  }

  const [iconSrc, setIconSrc] = useState(null)

  useEffect(() => {
    const storageUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/branding/icon-192.png`
    fetch(storageUrl, { method: 'HEAD' })
      .then(r => { if (r.ok) setIconSrc(storageUrl) })
      .catch(() => {})
  }, [])

  if (installed) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: 60, marginBottom: 16 }}>✅</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#1a1a2e', marginBottom: 8 }}>
              Instalado com sucesso!
            </div>
            <div style={{ color: '#6b7280', fontSize: 15, marginBottom: 28 }}>
              Procure o ícone na sua tela inicial e abra o app.
            </div>
            <button
              onClick={() => navigate('/login')}
              style={{
                width: '100%', padding: '14px', borderRadius: 10,
                background: '#e2b04a', color: '#1a1a2e',
                border: 'none', fontWeight: 800, fontSize: 16,
                cursor: 'pointer',
              }}>
              Efetuar Login
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>

        {/* Header */}
        <div style={{ textAlign: 'center', padding: '32px 20px 24px', borderBottom: '1px solid #f3f4f6' }}>
          {iconSrc && (
            <img src={iconSrc} alt="ícone"
              style={{ width: 80, height: 80, borderRadius: 20, marginBottom: 16, display: 'block', margin: '0 auto 16px' }} />
          )}
          <div style={{ fontSize: 22, fontWeight: 800, color: '#1a1a2e' }}>
            {branding.name || 'CATHEDRAL'}
          </div>
          <div style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>
            Adicione o app à sua tela inicial
          </div>
        </div>

        <div style={{ padding: '24px 24px 32px' }}>

          {/* iOS / Safari */}
          {(device?.isIOS || device?.isSafari) && (
            <>
              <div style={badgeStyle('#1a1a2e', '#fff')}>📱 iPhone / iPad</div>
              <p style={subtitleStyle}>Siga os passos no Safari:</p>

              <StepRow n={1}>
                Toque no ícone de <IconBox>compartilhar</IconBox>
                <span style={{ fontSize: 18 }}> ⬆️</span> na barra inferior do Safari
              </StepRow>
              <StepRow n={2}>
                Role a lista e toque em <IconBox>Adicionar à Tela Inicial</IconBox>
              </StepRow>
              <StepRow n={3}>
                Confirme tocando em <IconBox>Adicionar</IconBox> no canto superior direito
              </StepRow>
              <StepRow n={4}>
                Pronto! O ícone aparece na sua tela inicial 🎉
              </StepRow>

              <div style={alertStyle}>
                ⚠️ Este passo funciona apenas no <strong>Safari</strong>. Se estiver em outro navegador, abra este link no Safari.
              </div>
            </>
          )}

          {/* Android / Chrome com prompt automático */}
          {device?.isAndroid && deferredPrompt && (
            <>
              <div style={badgeStyle('#1a1a2e', '#fff')}>📱 Android</div>
              <p style={subtitleStyle}>Toque no botão abaixo para instalar:</p>

              <button onClick={handleInstallAndroid} style={btnStyle}>
                Instalar app na tela inicial
              </button>
            </>
          )}

          {/* Android / Chrome sem prompt (fallback manual) */}
          {device?.isAndroid && !deferredPrompt && (
            <>
              <div style={badgeStyle('#1a1a2e', '#fff')}>📱 Android</div>
              <p style={subtitleStyle}>Siga os passos no Chrome:</p>

              <StepRow n={1}>
                Toque nos <IconBox>⋮</IconBox> três pontos no canto superior direito do Chrome
              </StepRow>
              <StepRow n={2}>
                Toque em <IconBox>Adicionar à tela inicial</IconBox> ou <IconBox>Instalar app</IconBox>
              </StepRow>
              <StepRow n={3}>
                Toque em <IconBox>Instalar</IconBox> na janela que aparece
              </StepRow>
              <StepRow n={4}>
                Pronto! O ícone aparece na sua tela inicial 🎉
              </StepRow>
            </>
          )}

          {/* Desktop Chrome */}
          {!device?.isIOS && !device?.isAndroid && (
            <>
              <div style={badgeStyle('#374151', '#fff')}>💻 Computador</div>

              {/* Botão automático se disponível */}
              {deferredPrompt ? (
                <>
                  <p style={subtitleStyle}>Clique no botão abaixo para instalar:</p>
                  <button onClick={handleInstallAndroid} style={btnStyle}>
                    Instalar agora
                  </button>
                </>
              ) : (
                <>
                  <p style={subtitleStyle}>Instale pelo Chrome:</p>
                  <StepRow n={1}>
                    Clique no ícone de instalar <IconBox>⬇</IconBox> que aparece na barra de endereço do Chrome
                  </StepRow>
                  <StepRow n={2}>
                    Clique em <IconBox>Instalar</IconBox> na janela que aparecer
                  </StepRow>
                  <StepRow n={3}>
                    O app abre como uma janela independente e fica no menu iniciar 🎉
                  </StepRow>
                  <div style={{ ...alertStyle, marginTop: 12 }}>
                    💡 Se o ícone <strong>⬇</strong> não aparecer na barra do Chrome, o app pode já estar instalado. Procure o nome do app no menu iniciar.
                  </div>
                </>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  )
}

const pageStyle = {
  minHeight: '100vh',
  background: '#f9fafb',
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'center',
  padding: '20px 16px',
}

const cardStyle = {
  background: '#fff',
  borderRadius: 20,
  width: '100%',
  maxWidth: 420,
  boxShadow: '0 2px 16px rgba(0,0,0,0.08)',
  overflow: 'hidden',
}

const subtitleStyle = {
  fontSize: 14,
  color: '#6b7280',
  marginBottom: 20,
  marginTop: 4,
}

const alertStyle = {
  background: '#fffbeb',
  border: '1px solid #fde68a',
  borderRadius: 10,
  padding: '12px 14px',
  fontSize: 13,
  color: '#92400e',
  marginTop: 8,
  lineHeight: 1.5,
}

const btnStyle = {
  width: '100%',
  background: '#e2b04a',
  color: '#1a1a2e',
  border: 'none',
  borderRadius: 12,
  padding: '16px',
  fontSize: 16,
  fontWeight: 700,
  cursor: 'pointer',
  marginTop: 8,
}

function badgeStyle(bg, color) {
  return {
    display: 'inline-block',
    background: bg,
    color,
    borderRadius: 8,
    padding: '4px 12px',
    fontSize: 13,
    fontWeight: 600,
    marginBottom: 12,
  }
}
