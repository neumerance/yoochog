import { describe, expect, it } from 'vitest'

import { handshakeStatusLabel } from './handshakeStatus'

describe('handshakeStatusLabel', () => {
  it('maps to Online, Connecting, or Offline', () => {
    expect(handshakeStatusLabel('connected')).toBe('Online')
    expect(handshakeStatusLabel('connecting_signaling')).toBe('Connecting')
    expect(handshakeStatusLabel('establishing_handshake')).toBe('Connecting')
    expect(handshakeStatusLabel('reconnecting')).toBe('Connecting')
    expect(handshakeStatusLabel('idle')).toBe('Offline')
    expect(handshakeStatusLabel('failed')).toBe('Offline')
    expect(handshakeStatusLabel('missing_config')).toBe('Offline')
  })
})
