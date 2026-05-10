import { describe, expect, it } from 'vitest'

import {
  disallowPrefixForSegment,
  homeCanonicalUrl,
  makeRobotsTxt,
  makeSitemapXml,
  normalizePublicSiteOrigin,
  sitemapXmlAbsoluteUrl,
} from './buildCrawlArtifacts.mjs'

describe('normalizePublicSiteOrigin', () => {
  it('strips trailing slash and forces https', () => {
    expect(normalizePublicSiteOrigin('https://neumerance.github.io/')).toBe('https://neumerance.github.io')
  })

  it('adds https when scheme omitted', () => {
    expect(normalizePublicSiteOrigin('yoochoog.app')).toBe('https://yoochoog.app')
  })

  it('rejects origins with a non-root path', () => {
    expect(() => normalizePublicSiteOrigin('https://example.com/foo')).toThrow(/must not include a path/)
  })

  it('rejects empty / unset', () => {
    expect(() => normalizePublicSiteOrigin(undefined)).toThrow(/required/)
    expect(() => normalizePublicSiteOrigin('')).toThrow(/required/)
  })
})

describe('disallowPrefixForSegment', () => {
  it('uses root-deploy prefixes when base is /', () => {
    expect(disallowPrefixForSegment('/', 'host')).toBe('/host')
    expect(disallowPrefixForSegment('/', 'join')).toBe('/join')
  })

  it('prepends subdirectory base path for GitHub Pages default', () => {
    expect(disallowPrefixForSegment('/yoochog/', 'host')).toBe('/yoochog/host')
    expect(disallowPrefixForSegment('/yoochog/', 'join')).toBe('/yoochog/join')
    expect(disallowPrefixForSegment('/yoochog/', 'player')).toBe('/yoochog/player')
    expect(disallowPrefixForSegment('/yoochog/', 'client')).toBe('/yoochog/client')
  })
})

describe('makeRobotsTxt', () => {
  it('allowlists Meta link-preview crawlers before the generic block', () => {
    const robots = makeRobotsTxt({
      origin: 'https://yoochoog.app',
      basePath: '/',
    })
    const ixFb = robots.indexOf('User-agent: facebookexternalhit')
    const ixStar = robots.indexOf('\nUser-agent: *\n')
    expect(ixFb).toBeGreaterThanOrEqual(0)
    expect(ixStar).toBeGreaterThan(ixFb)
    expect(robots).toContain('User-agent: Facebot')
    expect(robots).toContain('User-agent: meta-externalagent')
    expect(robots).toContain('User-agent: meta-externalfetcher')
    // Empty Disallow is the universally-honored "allow everything" form;
    // some Meta robots-parsers ignore the Google-extension Allow: directive.
    expect(robots).toMatch(/User-agent: facebookexternalhit\nDisallow:\n/)
  })

  it('matches GitHub Pages + neumerance host', () => {
    const robots = makeRobotsTxt({
      origin: 'https://neumerance.github.io',
      basePath: '/yoochog/',
    })
    expect(robots).toContain('Disallow: /yoochog/host')
    expect(robots).toContain('Disallow: /yoochog/join')
    expect(robots).toContain('Disallow: /yoochog/player')
    expect(robots).toContain('Disallow: /yoochog/client')
    expect(robots).toContain(
      'Sitemap: https://neumerance.github.io/yoochog/sitemap.xml',
    )
  })

  it('matches root deploy on yoochoog.app', () => {
    const robots = makeRobotsTxt({
      origin: 'https://yoochoog.app',
      basePath: '/',
    })
    expect(robots).toContain('Disallow: /host')
    expect(robots).toContain('Sitemap: https://yoochoog.app/sitemap.xml')
  })
})

describe('makeSitemapXml', () => {
  it('lists only the home loc for Pages base', () => {
    const xml = makeSitemapXml({
      origin: 'https://neumerance.github.io',
      basePath: '/yoochog/',
    })
    expect(xml).toContain('<loc>https://neumerance.github.io/yoochog/</loc>')
    expect(xml).not.toContain('/host')
    expect(xml).not.toContain('/join')
  })

  it('lists site root for VITE_BASE_PATH=/', () => {
    const xml = makeSitemapXml({ origin: 'https://yoochoog.app', basePath: '/' })
    expect(xml).toContain('<loc>https://yoochoog.app/</loc>')
  })
})

describe('homeCanonicalUrl + sitemapXmlAbsoluteUrl', () => {
  it('keeps slash joining consistent with join-url helpers', () => {
    expect(homeCanonicalUrl('https://neumerance.github.io', '/yoochog/')).toBe(
      'https://neumerance.github.io/yoochog/',
    )
    expect(sitemapXmlAbsoluteUrl('https://neumerance.github.io', '/yoochog/')).toBe(
      'https://neumerance.github.io/yoochog/sitemap.xml',
    )
  })
})
