import { describe, expect, it } from 'vitest'

import { handshakeStatusLabel } from './handshakeStatus'

describe('handshakeStatusLabel', () => {
  it('maps establishing and connected', () => {
    expect(handshakeStatusLabel('establishing_handshake')).toBe('Establishing handshake')
    expect(handshakeStatusLabel('connected')).toBe('Connected')
  })

  it('mentions PubNub or VITE_SIGNALING_URL for missing config', () => {
    expect(handshakeStatusLabel('missing_config')).toContain('PubNub')
  })
})
