import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  const supabaseUrl  = env.VITE_SUPABASE_URL   || ''
  const appName      = env.VITE_APP_NAME        || 'Cathedral Vouchers'
  const appShortName = env.VITE_APP_SHORT_NAME  || 'Cathedral'

  // Manifest gerado dinamicamente com os dados do cliente vindos do .env / Vercel
  const manifestContent = JSON.stringify({
    "name": appName,
    "short_name": appShortName,
    "description": `Sistema de vouchers ${appShortName}`,
    "start_url": "/",
    "display": "standalone",
    "background_color": "#000000",
    "theme_color": "#000000",
    "icons": [
      {
        "src": `${supabaseUrl}/storage/v1/object/public/branding/icon-192.png`,
        "sizes": "192x192",
        "type": "image/png",
        "purpose": "any maskable"
      },
      {
        "src": `${supabaseUrl}/storage/v1/object/public/branding/icon-512.png`,
        "sizes": "512x512",
        "type": "image/png",
        "purpose": "any maskable"
      }
    ],
    "shortcuts": [
      {
        "name": "Operador",
        "short_name": "Operador",
        "url": "/operador",
        "icons": [
          {
            "src": `${supabaseUrl}/storage/v1/object/public/branding/icon-192.png`,
            "sizes": "192x192"
          }
        ]
      },
      {
        "name": "Admin",
        "short_name": "Admin",
        "url": "/admin",
        "icons": [
          {
            "src": `${supabaseUrl}/storage/v1/object/public/branding/icon-192.png`,
            "sizes": "192x192"
          }
        ]
      }
    ]
  }, null, 2)

  return {
    plugins: [
      react(),
      {
        name: 'dynamic-manifest',

        // Durante npm run dev — serve o manifest dinamicamente com dados reais
        configureServer(server) {
          server.middlewares.use('/manifest.json', (req, res) => {
            res.setHeader('Content-Type', 'application/manifest+json')
            res.end(manifestContent)
          })
        },

        // Durante npm run build — emite o manifest como asset com dados reais
        generateBundle() {
          this.emitFile({
            type: 'asset',
            fileName: 'manifest.json',
            source: manifestContent
          })
        }
      }
    ]
  }
})
