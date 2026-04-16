import type { PeerInfo, SignalPayload, SignalingRole } from './protocol'

/**
 * Shared contract for WebSocket relay (`SignalingClient`) and PubNub (`PubNubSignalingClient`).
 */
export interface PartySignalingTransport {
  joinedPeers: PeerInfo[]
  subscribePeerJoined(handler: (peer: PeerInfo) => void): () => void
  onSignal: ((msg: { from: string; payload: SignalPayload }) => void) | null
  onPeerLeft: ((clientId: string) => void) | null
  connect(): Promise<void>
  join(room: string, clientId: string, role: SignalingRole): Promise<void>
  sendSignal(to: string, payload: SignalPayload): void
  close(): void
}
