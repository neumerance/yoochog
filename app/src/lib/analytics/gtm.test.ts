import { afterEach, describe, expect, it, vi } from 'vitest'

import { buildGtmLoaderUrl, injectGoogleTagManagerOnce, resetGtmInjectionForTests } from './gtm'

describe('buildGtmLoaderUrl', () => {
  it('includes container id', () => {
    expect(buildGtmLoaderUrl('GTM-ABC')).toContain('googletagmanager.com/gtm.js')
    expect(buildGtmLoaderUrl('GTM-ABC')).toContain('id=GTM-ABC')
  })
})

describe('injectGoogleTagManagerOnce', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    resetGtmInjectionForTests()
  })

  it('no-ops without document', () => {
    vi.stubGlobal('document', undefined)
    expect(injectGoogleTagManagerOnce('GTM-XX')).toBe(false)
  })

  it('returns false for invalid container id', () => {
    vi.stubGlobal('document', { createElement: () => ({}) })
    expect(injectGoogleTagManagerOnce('bad')).toBe(false)
  })

  it('inserts one script and is idempotent', () => {
    const inserted: { src: string }[] = []
    const fakeScript = { async: false as boolean, src: '' }
    const firstScript = { parentNode: { insertBefore: (node: { src: string }) => inserted.push(node) } }

    vi.stubGlobal('window', { dataLayer: [] as unknown[] })
    vi.stubGlobal('document', {
      createElement: (tag: string) => {
        expect(tag).toBe('script')
        return fakeScript
      },
      getElementsByTagName: (tag: string) => {
        expect(tag).toBe('script')
        return [firstScript]
      },
      head: {
        appendChild: (el: { src: string }) => inserted.push(el),
      },
    })

    expect(injectGoogleTagManagerOnce('GTM-ZZ9')).toBe(true)
    expect(inserted).toHaveLength(1)
    expect(inserted[0]?.src).toContain('GTM-ZZ9')
    expect(injectGoogleTagManagerOnce('GTM-ZZ9')).toBe(true)
    expect(inserted).toHaveLength(1)
  })

  it('uses head.appendChild when there is no script parent', () => {
    const inserted: { src: string }[] = []
    const fakeScript = { async: false as boolean, src: '' }
    vi.stubGlobal('window', { dataLayer: [] as unknown[] })
    vi.stubGlobal('document', {
      createElement: () => fakeScript,
      getElementsByTagName: () => [],
      head: {
        appendChild: (el: { src: string }) => inserted.push(el),
      },
    })
    expect(injectGoogleTagManagerOnce('GTM-AAA')).toBe(true)
    expect(inserted).toHaveLength(1)
  })
})
