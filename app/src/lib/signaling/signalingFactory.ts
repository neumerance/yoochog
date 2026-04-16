import type { PartySignalingTransport } from './PartySignalingTransport'
import { PubNubSignalingClient } from './PubNubSignalingClient'
import { SignalingClient } from './SignalingClient'

export type SignalingEnvOptions = {
  signalingBaseUrl?: string
  pubnubPublishKey?: string
  pubnubSubscribeKey?: string
}

/**
 * Prefer PubNub when both keys are set; otherwise WebSocket relay via `VITE_SIGNALING_URL`.
 */
export function createSignalingTransport(options: SignalingEnvOptions): PartySignalingTransport {
  const pub = options.pubnubPublishKey?.trim()
  const sub = options.pubnubSubscribeKey?.trim()
  if (pub && sub) {
    return new PubNubSignalingClient({ publishKey: pub, subscribeKey: sub })
  }
  const url = options.signalingBaseUrl?.trim()
  if (url) {
    return new SignalingClient({ signalingBaseUrl: url })
  }
  throw new Error('Configure VITE_PUBNUB_PUBLISH_KEY and VITE_PUBNUB_SUBSCRIBE_KEY, or VITE_SIGNALING_URL.')
}
