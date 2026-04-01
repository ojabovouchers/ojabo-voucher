export default async function handler(req, res) {
  const SUPABASE_URL = 'https://useudmzyutaezwjdmdad.supabase.co'
  const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || ''

  let icon192 = `${SUPABASE_URL}/storage/v1/object/public/branding/icon-192.png`
  let icon512 = `${SUPABASE_URL}/storage/v1/object/public/branding/icon-512.png`
  let appName = 'Cathedral Vouchers'
  let appShortName = 'Cathedral'

  try {
    const settingsRes = await fetch(
      `${SUPABASE_URL}/rest/v1/settings?key=in.(app_title,sidebar_name)&select=key,value`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    )
    if (settingsRes.ok) {
      const settings = await settingsRes.json()
      const map = {}
      settings.forEach(s => { map[s.key] = s.value })
      if (map.app_title) appName = map.app_title
      if (map.sidebar_name) appShortName = map.sidebar_name || appName
    }
  } catch {
    // Usa defaults
  }

  const manifest = {
    name: appName,
    short_name: appShortName,
    description: `Sistema de vouchers — ${appShortName}`,
    start_url: '/',
    display: 'standalone',
    background_color: '#000000',
    theme_color: '#000000',
    icons: [
      { src: icon192, sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
      { src: icon512, sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
    ],
    shortcuts: [
      { name: 'Operador', short_name: 'Operador', url: '/operador', icons: [{ src: icon192, sizes: '192x192' }] },
      { name: 'Admin', short_name: 'Admin', url: '/admin', icons: [{ src: icon192, sizes: '192x192' }] },
    ]
  }

  res.setHeader('Content-Type', 'application/manifest+json')
  res.setHeader('Cache-Control', 'no-cache')
  res.status(200).json(manifest)
}
```

A diferença principal é que agora a URL do Supabase está **fixa dentro do código** — não depende de variável de ambiente. Depois:
```
git add .
git commit -m "manifest url storage fixa"
git push origin main