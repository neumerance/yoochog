import { rtcDebugLog } from '@/lib/debug/rtcDebugLog'

import type { PartySignalingTransport } from './PartySignalingTransport'
import { PubNubSignalingClient } from './PubNubSignalingClient'
import { SignalingClient } from './SignalingClient'

export type SignalingEnvOptions = {
  signalingBaseUrl?: string
  pubnubPublishKey?: string
  pubnubSubscribeKey?: string
}

/**
 * **Primary:** PubNub when both keys are set (normal production and dev for this app).
 * **Fallback:** WebSocket relay via `VITE_SIGNALING_URL` when PubNub keys are incomplete (e.g. local `signaling-dev`).
 */
export function createSignalingTransport(options: SignalingEnvOptions): PartySignalingTransport {
  const pub = options.pubnubPublishKey?.trim()
  const sub = options.pubnubSubscribeKey?.trim()
  if (pub && sub) {
    rtcDebugLog('signaling', 'transport=PubNub (publish/subscribe keys set)')
    return new PubNubSignalingClient({ publishKey: pub, subscribeKey: sub })
  }
  const url = options.signalingBaseUrl?.trim()
  if (url) {
    rtcDebugLog('signaling', 'transport=WebSocket', url)
    return new SignalingClient({ signalingBaseUrl: url })
  }
  throw new Error('Configure VITE_PUBNUB_PUBLISH_KEY and VITE_PUBNUB_SUBSCRIBE_KEY, or VITE_SIGNALING_URL.')
}
