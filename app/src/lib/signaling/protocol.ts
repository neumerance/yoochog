/** Role in the dev signaling relay (one host tab + guest tabs per party room). */
export type SignalingRole = 'host' | 'guest'

export type PeerInfo = { clientId: string; role: SignalingRole }

export type SignalPayload =
  | { kind: 'offer'; sdp: string }
  | { kind: 'answer'; sdp: string }
  | { kind: 'ice'; candidate: RTCIceCandidateInit | null }

export type JoinClientMessage = {
  type: 'join'
  room: string
  clientId: string
  role: SignalingRole
}

export type SignalClientMessage = {
  type: 'signal'
  room: string
  from: string
  to: string
  payload: SignalPayload
}

export type JoinedServerMessage = {
  type: 'joined'
  room: string
  peers: Array<{ clientId: string; role: SignalingRole }>
}

export type PeerJoinedServerMessage = {
  type: 'peer-joined'
  room: string
  clientId: string
  role: SignalingRole
}

export type PeerLeftServerMessage = {
  type: 'peer-left'
  room: string
  clientId: string
}

export type ErrorServerMessage = {
  type: 'error'
  message: string
}

export type ServerToClientMessage =
  | JoinedServerMessage
  | PeerJoinedServerMessage
  | PeerLeftServerMessage
  | SignalClientMessage
  | ErrorServerMessage

export function isJoinClientMessage(v: unknown): v is JoinClientMessage {
  if (typeof v !== 'object' || v === null) {
    return false
  }
  const o = v as Record<string, unknown>
  return (
    o.type === 'join' &&
    typeof o.room === 'string' &&
    typeof o.clientId === 'string' &&
    (o.role === 'host' || o.role === 'guest')
  )
}

export function isServerToClientMessage(v: unknown): v is ServerToClientMessage {
  if (typeof v !== 'object' || v === null) {
    return false
  }
  const o = v as Record<string, unknown>
  if (o.type === 'joined') {
    return typeof o.room === 'string' && Array.isArray(o.peers)
  }
  if (o.type === 'peer-joined') {
    return (
      typeof o.room === 'string' &&
      typeof o.clientId === 'string' &&
      (o.role === 'host' || o.role === 'guest')
    )
  }
  if (o.type === 'peer-left') {
    return typeof o.room === 'string' && typeof o.clientId === 'string'
  }
  if (o.type === 'signal') {
    return (
      typeof o.room === 'string' &&
      typeof o.from === 'string' &&
      typeof o.to === 'string' &&
      typeof o.payload === 'object' &&
      o.payload !== null
    )
  }
  if (o.type === 'error') {
    return typeof o.message === 'string'
  }
  return false
}
