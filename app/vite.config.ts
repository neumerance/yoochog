import { fileURLToPath, URL } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
// GitHub Pages project site: https://<user>.github.io/yoochog/ — production + preview use this base; dev stays `/`.
export default defineConfig((env) => ({
  base:
    env.command === 'build' || env.isPreview === true
      ? '/yoochog/'
      : '/',
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
}))
