import { describe, expect, it, vi } from 'vitest'

import { removeGuestPeer } from './partyPeerCleanup'

describe('removeGuestPeer', () => {
  it('closes pc and channel and removes map entries', () => {
    const pcClose = vi.fn()
    const chClose = vi.fn()
    const pcs = new Map([['g1', { close: pcClose }]])
    const partyChannels = new Map([['g1', { close: chClose }]])
    removeGuestPeer('g1', pcs, partyChannels)
    expect(pcClose).toHaveBeenCalled()
    expect(chClose).toHaveBeenCalled()
    expect(pcs.size).toBe(0)
    expect(partyChannels.size).toBe(0)
  })

  it('is idempotent when guest is missing', () => {
    const pcs = new Map<string, { close: () => void }>()
    const partyChannels = new Map<string, { close: () => void }>()
    removeGuestPeer('missing', pcs, partyChannels)
    expect(pcs.size).toBe(0)
  })
})
