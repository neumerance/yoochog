import type { PartySignalingTransport } from './PartySignalingTransport'
import {
  isServerToClientMessage,
  type JoinClientMessage,
  type PeerInfo,
  type SignalClientMessage,
  type SignalingRole,
  type SignalPayload,
} from './protocol'
import { websocketUrlFromSignalingBase } from './websocketUrl'

export type { PeerInfo } from './protocol'

export type SignalingClientOptions = {
  /** Base URL from `VITE_SIGNALING_URL` (http/https/ws/wss). */
  signalingBaseUrl: string
}

/**
 * WebSocket client for the yoochog dev signaling relay (`signaling-dev/`).
 * Wire format matches `signaling-dev/server.mjs`.
 */
export class SignalingClient implements PartySignalingTransport {
  private ws: WebSocket | null = null
  private clientId: string | null = null
  private room: string | null = null

  /** Peers already in the room when the server acks `join` (snapshot). */
  joinedPeers: PeerInfo[] = []

  private peerJoinedListeners = new Set<(peer: PeerInfo) => void>()

  onSignal: ((msg: { from: string; payload: SignalPayload }) => void) | null = null
  onPeerLeft: ((clientId: string) => void) | null = null

  private pendingJoin: { resolve: () => void; reject: (e: Error) => void } | null = null

  constructor(private readonly options: SignalingClientOptions) {}

  get resolvedWebSocketUrl(): string {
    return websocketUrlFromSignalingBase(this.options.signalingBaseUrl)
  }

  /** Subscribe to `peer-joined` broadcasts (including after your own join). */
  subscribePeerJoined(handler: (peer: PeerInfo) => void): () => void {
    this.peerJoinedListeners.add(handler)
    return () => {
      this.peerJoinedListeners.delete(handler)
    }
  }

  async connect(): Promise<void> {
    const url = this.resolvedWebSocketUrl
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url)
      this.ws = ws
      ws.onopen = () => resolve()
      ws.onerror = () => {
        reject(new Error('Could not connect to signaling.'))
      }
      ws.onmessage = (ev) => {
        this.handleMessage(String(ev.data))
      }
      ws.onclose = () => {
        if (this.pendingJoin) {
          this.pendingJoin.reject(new Error('Signaling connection closed before join completed.'))
          this.pendingJoin = null
        }
      }
    })
  }

  join(room: string, clientId: string, role: SignalingRole): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return Promise.reject(new Error('WebSocket is not open.'))
    }
    this.room = room
    this.clientId = clientId
    const msg: JoinClientMessage = { type: 'join', room, clientId, role }
    this.ws.send(JSON.stringify(msg))
    return new Promise((resolve, reject) => {
      this.pendingJoin = { resolve, reject }
    })
  }

  sendSignal(to: string, payload: SignalPayload): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not open.')
    }
    if (!this.room || !this.clientId) {
      throw new Error('Join the signaling room before sending signals.')
    }
    const msg: SignalClientMessage = {
      type: 'signal',
      room: this.room,
      from: this.clientId,
      to,
      payload,
    }
    this.ws.send(JSON.stringify(msg))
  }

  close(): void {
    try {
      this.ws?.close()
    } catch {
      // ignore
    }
    this.ws = null
    this.pendingJoin = null
    this.room = null
    this.clientId = null
  }

  private handleMessage(raw: string): void {
    let data: unknown
    try {
      data = JSON.parse(raw)
    } catch {
      return
    }
    if (!isServerToClientMessage(data)) {
      return
    }
    switch (data.type) {
      case 'joined':
        this.joinedPeers = data.peers
        if (this.pendingJoin) {
          this.pendingJoin.resolve()
          this.pendingJoin = null
        }
        return
      case 'peer-joined': {
        const peer: PeerInfo = { clientId: data.clientId, role: data.role }
        for (const h of this.peerJoinedListeners) {
          h(peer)
        }
        return
      }
      case 'peer-left':
        this.onPeerLeft?.(data.clientId)
        return
      case 'signal':
        this.onSignal?.({ from: data.from, payload: data.payload })
        return
      case 'error':
        if (this.pendingJoin) {
          this.pendingJoin.reject(new Error(data.message))
          this.pendingJoin = null
        }
        return
      default:
        return
    }
  }
}
