const DISALLOW_SEGMENTS = ['host', 'join', 'player', 'client']

/**
 * @param {string} raw
 * @returns {string} Normalized HTTPS origin (`https://host` — no trailing slash).
 */
export function normalizePublicSiteOrigin(raw) {
  if (raw === undefined || raw === '') {
    throw new Error(
      'VITE_PUBLIC_SITE_ORIGIN is required for production builds (scheme + host, no path). Examples: https://neumerance.github.io or https://yoochoog.app',
    )
  }
  let s = String(raw).trim()
  if (!s) {
    throw new Error('VITE_PUBLIC_SITE_ORIGIN is empty')
  }
  s = s.replace(/\/+$/, '')
  if (!/^https?:\/\//i.test(s)) {
    s = `https://${s}`
  }
  let u
  try {
    u = new URL(s)
  } catch {
    throw new Error(`VITE_PUBLIC_SITE_ORIGIN is not a valid URL: ${raw}`)
  }
  const pathOnly = u.pathname.endsWith('/') && u.pathname !== '/' ? u.pathname.slice(0, -1) : u.pathname
  if (pathOnly !== '/' && pathOnly !== '') {
    throw new Error(`VITE_PUBLIC_SITE_ORIGIN must not include a path (got ${u.pathname})`)
  }
  u.protocol = 'https:'
  u.hash = ''
  u.search = ''
  u.pathname = '/'
  return u.origin
}

/**
 * @param {string} basePath from {@link productionBaseFromEnv}
 * @param {string} segment single path segment, no slashes
 */
export function disallowPrefixForSegment(basePath, segment) {
  if (basePath === '/') {
    return `/${segment}`
  }
  const trimmed = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath
  return `${trimmed}/${segment}`
}

/**
 * Canonical public home URL (trailing slash for non-root bases where Vite uses a directory-style base).
 *
 * @param {string} siteOrigin from {@link normalizePublicSiteOrigin}
 * @param {string} basePath
 */
export function homeCanonicalUrl(siteOrigin, basePath) {
  const u = new URL(`${siteOrigin.endsWith('/') ? siteOrigin.slice(0, -1) : siteOrigin}/`)
  if (basePath === '/') {
    u.pathname = '/'
  } else {
    const p = basePath.endsWith('/') ? basePath : `${basePath}/`
    u.pathname = p
  }
  return u.toString()
}

/**
 * @param {string} siteOrigin
 * @param {string} basePath
 */
export function sitemapXmlAbsoluteUrl(siteOrigin, basePath) {
  const u = new URL(`${siteOrigin.endsWith('/') ? siteOrigin.slice(0, -1) : siteOrigin}/`)
  if (basePath === '/') {
    u.pathname = '/sitemap.xml'
  } else {
    const prefix = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath
    u.pathname = `${prefix}/sitemap.xml`
  }
  return u.toString()
}

function escapeXmlText(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/**
 * @param {{ origin: string, basePath: string }} opts `origin`: normalized HTTPS origin string
 */
export function makeRobotsTxt(opts) {
  const { origin, basePath } = opts
  const lines = [
    'User-agent: facebookexternalhit',
    'Disallow:',
    '',
    'User-agent: Facebot',
    'Disallow:',
    '',
    'User-agent: meta-externalagent',
    'Disallow:',
    '',
    'User-agent: meta-externalfetcher',
    'Disallow:',
    '',
    'User-agent: *',
  ]
  for (const seg of DISALLOW_SEGMENTS) {
    lines.push(`Disallow: ${disallowPrefixForSegment(basePath, seg)}`)
  }
  lines.push('')
  lines.push(`Sitemap: ${sitemapXmlAbsoluteUrl(origin, basePath)}`)
  lines.push('')
  return lines.join('\n')
}

/**
 * @param {{ origin: string, basePath: string }} opts
 */
export function makeSitemapXml(opts) {
  const loc = escapeXmlText(homeCanonicalUrl(opts.origin, opts.basePath))
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${loc}</loc>
  </url>
</urlset>
`
}
