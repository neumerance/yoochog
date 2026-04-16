import { describe, expect, it } from 'vitest'

import { PubNubSignalingClient } from './PubNubSignalingClient'
import { SignalingClient } from './SignalingClient'
import { createSignalingTransport } from './signalingFactory'

describe('createSignalingTransport', () => {
  it('prefers PubNub when both keys are set', () => {
    const t = createSignalingTransport({
      signalingBaseUrl: 'http://localhost:1',
      pubnubPublishKey: 'pub-demo',
      pubnubSubscribeKey: 'sub-demo',
    })
    expect(t).toBeInstanceOf(PubNubSignalingClient)
  })

  it('uses WebSocket when PubNub keys are incomplete', () => {
    const t = createSignalingTransport({
      signalingBaseUrl: 'http://localhost:8787',
      pubnubPublishKey: 'pub-only',
    })
    expect(t).toBeInstanceOf(SignalingClient)
  })

  it('throws when nothing is configured', () => {
    expect(() => createSignalingTransport({})).toThrow(/Configure/)
  })
})
