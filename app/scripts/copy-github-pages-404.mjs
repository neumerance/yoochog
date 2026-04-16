import { copyFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const distDir = join(__dirname, '..', 'dist')
const indexPath = join(distDir, 'index.html')
const destPath = join(distDir, '404.html')

if (!existsSync(indexPath)) {
  console.error(`copy-github-pages-404: missing ${indexPath}`)
  process.exit(1)
}

copyFileSync(indexPath, destPath)
console.log(`copy-github-pages-404: wrote ${destPath}`)
