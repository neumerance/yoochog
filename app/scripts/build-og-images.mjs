/**
 * Resize `src/assets/images/ogs/*` into `public/` as JPEG (Vite copies unchanged).
 * Stays under ~600 KB for link previews (e.g. WhatsApp). Facebook- and Twitter-sourced
 * tasks get a bottom banner with headline + CTA for richer previews.
 * `og-image.jpg` / `twitter-image.jpg` mirror the Facebook / Twitter exports for stable URLs.
 */
import { existsSync, unlinkSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const appRoot = join(__dirname, '..')
const ogsDir = join(appRoot, 'src/assets/images/ogs')
const publicDir = join(appRoot, 'public')
const W = 1200
/** WhatsApp and similar recommend keeping OG images under ~600 KB */
const MAX_JPEG_BYTES = 580_000

/** @type {{ input: string; w: number; h: number; outs: string[]; overlay?: { headline: string; cta: string } }[]} */
const tasks = [
  {
    input: 'facebook.png',
    w: W,
    h: 630,
    outs: ['og-facebook.jpg', 'og-image.jpg'],
    overlay: { headline: 'Group karaoke for friends', cta: 'Start a free room →' },
  },
  { input: 'linkedin.png', w: W, h: 627, outs: ['og-linkedin.jpg'] },
  { input: 'Discord.png', w: W, h: 630, outs: ['og-discord.jpg'] },
  { input: 'WhatsApp.png', w: W, h: 630, outs: ['og-whatsapp.jpg'] },
  {
    input: 'twitter.png',
    w: W,
    h: 600,
    outs: ['og-twitter.jpg', 'twitter-image.jpg'],
    overlay: { headline: 'Group karaoke for friends', cta: 'Start a free room →' },
  },
]

const deprecatedPng = [
  'og-image.png',
  'twitter-image.png',
  'og-facebook.png',
  'og-linkedin.png',
  'og-discord.png',
  'og-twitter.png',
  'og-whatsapp.png',
]

function escapeXml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function bannerSvg(w, h, headline, cta) {
  const bandH = Math.round(h * 0.24)
  const bandY = h - bandH
  const fsHead = h >= 620 ? 36 : 32
  const fsCta = h >= 620 ? 22 : 20
  const headlineY = bandY + Math.round(bandH * 0.42)
  const ctaY = bandY + Math.round(bandH * 0.78)
  return Buffer.from(
    `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="${bandY}" width="${w}" height="${bandH}" fill="rgba(0,0,0,0.62)"/><text x="${w / 2}" y="${headlineY}" text-anchor="middle" font-family="system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" font-size="${fsHead}" font-weight="700" fill="#ffffff">${escapeXml(headline)}</text><text x="${w / 2}" y="${ctaY}" text-anchor="middle" font-family="system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" font-size="${fsCta}" font-weight="600" fill="#fcd34d">${escapeXml(cta)}</text></svg>`,
  )
}

async function rasterizeForSlide({ src, w, h, overlay }) {
  let pipe = sharp(src).resize(w, h, { fit: 'cover', position: 'centre' })
  if (overlay) {
    pipe = pipe.composite([{ input: bannerSvg(w, h, overlay.headline, overlay.cta), top: 0, left: 0 }])
  }
  return pipe.png().toBuffer()
}

async function jpegUnderMax(pngBuffer) {
  for (let q = 88; q >= 48; q -= 4) {
    const buf = await sharp(pngBuffer).jpeg({ quality: q, mozjpeg: true }).toBuffer()
    if (buf.length <= MAX_JPEG_BYTES) {
      return { buf, q }
    }
  }
  const buf = await sharp(pngBuffer).jpeg({ quality: 46, mozjpeg: true }).toBuffer()
  return { buf, q: 46 }
}

for (const { input, w, h, outs, overlay } of tasks) {
  const srcPath = join(ogsDir, input)
  if (!existsSync(srcPath)) {
    console.error(`build-og-images: missing source ${srcPath}`)
    process.exit(1)
  }

  const pngBuf = await rasterizeForSlide({ src: srcPath, w, h, overlay })
  const { buf, q } = await jpegUnderMax(pngBuf)
  if (buf.length > MAX_JPEG_BYTES) {
    console.warn(
      `build-og-images: ${outs[0]} still ${(buf.length / 1024).toFixed(0)} KB at quality ${q} (cap ${MAX_JPEG_BYTES / 1024} KB)`,
    )
  }

  for (const name of outs) {
    writeFileSync(join(publicDir, name), buf)
  }

  console.log(`build-og-images: wrote ${outs.join(', ')} (${w}×${h} from ${input}, jpeg q≈${q}, ${(buf.length / 1024).toFixed(0)} KB)`)
}

for (const name of deprecatedPng) {
  const p = join(publicDir, name)
  if (existsSync(p)) {
    unlinkSync(p)
    console.log(`build-og-images: removed deprecated ${name}`)
  }
}
