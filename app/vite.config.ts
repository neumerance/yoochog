import { fileURLToPath, URL } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

const appRoot = fileURLToPath(new URL('.', import.meta.url))

/**
 * Production / preview `base` for static hosting.
 * Default matches GitHub Pages project-site layout (`/yoochog/`).
 * Set `VITE_BASE_PATH` for a self-hosted build (e.g. `/` on a custom domain); see `docs/server-deployment.md`.
 */
function productionBaseFromEnv(env: Record<string, string>): string {
  const raw = env.VITE_BASE_PATH
  if (raw === undefined || raw === '') {
    return '/yoochog/'
  }
  const t = raw.trim()
  if (t === '' || t === '/') {
    return '/'
  }
  return t.endsWith('/') ? t : `${t}/`
}

// https://vite.dev/config/
// GitHub Pages project site: https://<user>.github.io/yoochog/ — default production + preview base; dev stays `/`.
export default defineConfig((configEnv) => {
  const mode = configEnv.mode
  const env = loadEnv(mode, appRoot, '')
  const isProdLayout =
    configEnv.command === 'build' ||
    ('isPreview' in configEnv && configEnv.isPreview === true)

  const base = isProdLayout ? productionBaseFromEnv(env) : '/'

  return {
  base,
  plugins: [
    vue(),
    vueDevTools(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  server: {
    host: true,
    port: 5173,
  },
}})
