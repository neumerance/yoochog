import { describe, expect, it } from 'vitest'

import { websocketUrlFromSignalingBase } from './websocketUrl'

describe('websocketUrlFromSignalingBase', () => {
  it('maps http to ws and preserves path', () => {
    expect(websocketUrlFromSignalingBase('http://localhost:8787')).toBe('ws://localhost:8787/')
  })

  it('maps https to wss', () => {
    expect(websocketUrlFromSignalingBase('https://example.com/signaling')).toBe(
      'wss://example.com/signaling',
    )
  })

  it('passes through ws and wss', () => {
    expect(websocketUrlFromSignalingBase('ws://127.0.0.1:1/x')).toBe('ws://127.0.0.1:1/x')
    expect(websocketUrlFromSignalingBase('wss://example.com/')).toBe('wss://example.com/')
  })

  it('rejects unsupported schemes', () => {
    expect(() => websocketUrlFromSignalingBase('ftp://example.com')).toThrow(/Unsupported/)
  })
})
