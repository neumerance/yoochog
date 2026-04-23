import { describe, expect, it } from 'vitest'

import { isGuestPartyLinkOkForVisibilityResume } from './guestPartyLinkHealth'

function fromSnap(
  s: { connectionState: RTCPeerConnectionState; iceConnectionState: RTCIceConnectionState; dataChannelReadyState?: RTCDataChannel['readyState'] },
): boolean {
  const dataChannelReadyState = s.dataChannelReadyState ?? 'open'
  return isGuestPartyLinkOkForVisibilityResume(
    { connectionState: s.connectionState, iceConnectionState: s.iceConnectionState },
    { readyState: dataChannelReadyState },
  )
}

describe('isGuestPartyLinkOkForVisibilityResume', () => {
  it('is true when party DC is open and PC/ICE are not failed or closed', () => {
    expect(fromSnap({ connectionState: 'connected', iceConnectionState: 'connected' })).toBe(true)
    expect(fromSnap({ connectionState: 'connected', iceConnectionState: 'completed' })).toBe(true)
  })

  it('treats transient disconnected as OK when the party data channel is still open', () => {
    expect(fromSnap({ connectionState: 'disconnected', iceConnectionState: 'disconnected' })).toBe(true)
    expect(fromSnap({ connectionState: 'connecting', iceConnectionState: 'checking' })).toBe(true)
  })

  it('is false when PC, party channel is null, or data channel is not open', () => {
    expect(isGuestPartyLinkOkForVisibilityResume(null, { readyState: 'open' })).toBe(false)
    expect(
      isGuestPartyLinkOkForVisibilityResume(
        { connectionState: 'connected', iceConnectionState: 'connected' },
        null,
      ),
    ).toBe(false)
    expect(fromSnap({ connectionState: 'connected', iceConnectionState: 'connected', dataChannelReadyState: 'connecting' })).toBe(false)
  })

  it('is false for terminal connection or ICE states', () => {
    expect(fromSnap({ connectionState: 'failed', iceConnectionState: 'connected' })).toBe(false)
    expect(fromSnap({ connectionState: 'closed', iceConnectionState: 'connected' })).toBe(false)
    expect(fromSnap({ connectionState: 'connected', iceConnectionState: 'failed' })).toBe(false)
    expect(fromSnap({ connectionState: 'connected', iceConnectionState: 'closed' })).toBe(false)
  })
})
