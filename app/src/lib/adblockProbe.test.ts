import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  AD_BLOCK_PROBE_SCRIPT_URL,
  isBaitElementLikelyBlocked,
  probeNetworkAdRequestLikelyBlocked,
} from '@/lib/adblockProbe'

describe('isBaitElementLikelyBlocked', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns true when display is none', () => {
    const el = {
      offsetHeight: 10,
      offsetWidth: 10,
    } as HTMLElement
    vi.stubGlobal(
      'getComputedStyle',
      vi.fn().mockReturnValue({
        display: 'none',
        visibility: 'visible',
        opacity: '1',
      } as CSSStyleDeclaration),
    )
    expect(isBaitElementLikelyBlocked(el)).toBe(true)
  })

  it('returns true when width and height are zero', () => {
    const el = { offsetHeight: 0, offsetWidth: 0 } as HTMLElement
    vi.stubGlobal(
      'getComputedStyle',
      vi.fn().mockReturnValue({
        display: 'block',
        visibility: 'visible',
        opacity: '1',
      } as CSSStyleDeclaration),
    )
    expect(isBaitElementLikelyBlocked(el)).toBe(true)
  })
})

describe('probeNetworkAdRequestLikelyBlocked', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns false when fetch resolves', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response()))
    const r = await probeNetworkAdRequestLikelyBlocked(AD_BLOCK_PROBE_SCRIPT_URL, 1000)
    expect(r).toBe(false)
  })

  it('returns true when fetch rejects with TypeError', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    const r = await probeNetworkAdRequestLikelyBlocked(AD_BLOCK_PROBE_SCRIPT_URL, 1000)
    expect(r).toBe(true)
  })

  it('returns null on AbortError (timeout)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
        return new Promise((_resolve, reject) => {
          const s = init?.signal
          if (!s) {
            reject(new Error('expected AbortSignal'))
            return
          }
          const onAbort = () => reject(new DOMException('Aborted', 'AbortError'))
          if (s.aborted) {
            onAbort()
            return
          }
          s.addEventListener('abort', onAbort, { once: true })
        })
      }),
    )
    const r = await probeNetworkAdRequestLikelyBlocked(AD_BLOCK_PROBE_SCRIPT_URL, 25)
    expect(r).toBe(null)
  })
})
