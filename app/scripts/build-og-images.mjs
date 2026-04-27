/**
 * Generate social preview images from `yoochoog-graph.png` at sizes each platform expects.
 *
 * - Open Graph (Facebook, LinkedIn, default link previews): 1200×630 (≈1.91:1), cover crop from center.
 * - Twitter summary_large_image: 1200×600 (2:1), per Twitter’s wide card guidance.
 *
 * Writes to `public/` so Vite copies them to `dist/` unchanged.
 */
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const appRoot = join(__dirname, '..')
const src = join(appRoot, 'src/assets/images/logo/yoochoog-graph.png')
const outOg = join(appRoot, 'public/og-image.png')
const outTwitter = join(appRoot, 'public/twitter-image.png')

if (!existsSync(src)) {
  console.error(`build-og-images: missing source ${src}`)
  process.exit(1)
}

await sharp(src)
  .resize(1200, 630, { fit: 'cover', position: 'centre' })
  .png()
  .toFile(outOg)

console.log(`build-og-images: wrote ${outOg} (Open Graph 1200×630)`)

await sharp(src)
  .resize(1200, 600, { fit: 'cover', position: 'centre' })
  .png()
  .toFile(outTwitter)

console.log(`build-og-images: wrote ${outTwitter} (Twitter 2:1 1200×600)`)
