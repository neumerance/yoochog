import { existsSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { loadEnv } from 'vite'

import { makeRobotsTxt, makeSitemapXml, normalizePublicSiteOrigin } from './lib/buildCrawlArtifacts.mjs'
import { productionBaseFromEnv } from './lib/productionBaseFromEnv.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const appRoot = join(__dirname, '..')
const distDir = join(appRoot, 'dist')

if (!existsSync(distDir)) {
  console.error(`generate-seo-static: missing ${distDir}; run vite build first`)
  process.exit(1)
}

const env = loadEnv('production', appRoot, '')

let origin
try {
  origin = normalizePublicSiteOrigin(env.VITE_PUBLIC_SITE_ORIGIN)
} catch (e) {
  console.error(`generate-seo-static: ${/** @type {Error} */ (e).message}`)
  process.exit(1)
}

const basePath = productionBaseFromEnv(env)

writeFileSync(join(distDir, 'robots.txt'), makeRobotsTxt({ origin, basePath }), 'utf8')
writeFileSync(join(distDir, 'sitemap.xml'), makeSitemapXml({ origin, basePath }), 'utf8')

console.log('generate-seo-static: wrote robots.txt and sitemap.xml')
