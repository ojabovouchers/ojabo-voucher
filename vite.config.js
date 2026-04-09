import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const supabaseUrl = env.VITE_SUPABASE_URL || ''

  return {
    plugins: [
      react(),
      {
        // Este plugin substitui %VITE_SUPABASE_URL% no manifest.json durante o build
        // Assim os ícones do app instalado apontam para o Supabase do cliente correto
        name: 'manifest-icons-env',
        generateBundle(_, bundle) {
          const manifestAsset = bundle['manifest.json']
          if (manifestAsset && manifestAsset.type === 'asset') {
            manifestAsset.source = String(manifestAsset.source).replace(
              /%VITE_SUPABASE_URL%/g,
              supabaseUrl
            )
          }
        }
      }
    ]
  }
})
