/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

// Shared with `scripts/` post-build crawl helpers (`generate-seo-static.mjs`) — keep `base` aligned.
// @ts-expect-error TS7016 — plain `.mjs`; no DTS in this package
import { productionBaseFromEnv } from './scripts/lib/productionBaseFromEnv.mjs'

const appRoot = fileURLToPath(new URL('.', import.meta.url))

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
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  server: {
    host: true,
    port: 5173,
  },
  test: {
    environment: 'node',
  },
}})
