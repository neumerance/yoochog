/**
 * Resize `src/assets/images/ogs/*` into `public/` (Vite copies unchanged).
 * 1200×630 (Facebook, Discord, WhatsApp), 1200×627 (LinkedIn), 1200×600 (Twitter card); centre cover crop.
 * `og-image.png` and `twitter-image.png` mirror the Facebook and Twitter exports so `index.html` URLs stay stable.
 */
import { existsSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const appRoot = join(__dirname, '..')
const ogsDir = join(appRoot, 'src/assets/images/ogs')
const publicDir = join(appRoot, 'public')
const W = 1200

/** @type {{ input: string; w: number; h: number; outs: string[] }[]} */
const tasks = [
  { input: 'facebook.png', w: W, h: 630, outs: ['og-facebook.png', 'og-image.png'] },
  { input: 'linkedin.png', w: W, h: 627, outs: ['og-linkedin.png'] },
  { input: 'Discord.png', w: W, h: 630, outs: ['og-discord.png'] },
  { input: 'WhatsApp.png', w: W, h: 630, outs: ['og-whatsapp.png'] },
  { input: 'twitter.png', w: W, h: 600, outs: ['og-twitter.png', 'twitter-image.png'] },
]

for (const { input, w, h, outs } of tasks) {
  const src = join(ogsDir, input)
  if (!existsSync(src)) {
    console.error(`build-og-images: missing source ${src}`)
    process.exit(1)
  }

  const buf = await sharp(src)
    .resize(w, h, { fit: 'cover', position: 'centre' })
    .png()
    .toBuffer()

  for (const name of outs) {
    writeFileSync(join(publicDir, name), buf)
  }

  console.log(`build-og-images: wrote ${outs.join(', ')} (${w}×${h} from ${input})`)
}
