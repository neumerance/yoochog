import { describe, expect, it, vi } from 'vitest'

import { broadcastToPartyDataChannels, type MinimalDataChannel } from './broadcastPartyDataChannels'

describe('broadcastToPartyDataChannels', () => {
  it('sends to each open channel', () => {
    const a: MinimalDataChannel = { readyState: 'open', send: vi.fn() }
    const b: MinimalDataChannel = { readyState: 'open', send: vi.fn() }
    const closed: MinimalDataChannel = { readyState: 'closing', send: vi.fn() }
    const map = new Map<string, MinimalDataChannel>([
      ['1', a],
      ['2', b],
      ['3', closed],
    ])
    broadcastToPartyDataChannels(map, '{"v":1}')
    expect(a.send).toHaveBeenCalledWith('{"v":1}')
    expect(b.send).toHaveBeenCalledWith('{"v":1}')
    expect(closed.send).not.toHaveBeenCalled()
  })

})
