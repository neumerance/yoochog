import { describe, expect, it } from 'vitest'

import { isServerToClientMessage } from './protocol'

describe('isServerToClientMessage', () => {
  it('accepts joined', () => {
    expect(
      isServerToClientMessage({
        type: 'joined',
        room: 'yoochog:party:x',
        peers: [{ clientId: 'a', role: 'host' }],
      }),
    ).toBe(true)
  })

  it('accepts signal', () => {
    expect(
      isServerToClientMessage({
        type: 'signal',
        room: 'yoochog:party:x',
        from: 'a',
        to: 'b',
        payload: { kind: 'offer', sdp: 'v=0' },
      }),
    ).toBe(true)
  })

  it('rejects invalid payloads', () => {
    expect(isServerToClientMessage({ type: 'joined', room: 'x' })).toBe(false)
  })
})
