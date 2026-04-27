import { io, type Socket } from 'socket.io-client'

import { connectionStepLog, rtcDebugLog, rtcFailureLog } from '@/lib/debug/rtcDebugLog'
import type { HandshakeUiState } from '@/lib/realtime/handshakeStatus'
import { partySessionRoomId } from '@/lib/realtime/partyRoomId'
import {
  YOOCHOG_GUEST_JOINED,
  YOOCHOG_GUEST_LEFT,
  YOOCHOG_HOST_LEFT,
  YOOCHOG_PARTY,
  YOOCHOG_PARTY_SEND,
  YOOCHOG_REGISTER,
  YOOCHOG_REGISTERED,
  YOOCHOG_REGISTER_ERROR,
  YOOCHOG_SESSION_READY,
} from '@/lib/realtime/partySocketEvents'

export type PartySocketCallbacks = {
  onStatus: (s: HandshakeUiState) => void
  onError: (message: string) => void
}

export type HostPartySocketOptions = {
  sessionId: string
  signal: AbortSignal
  onPartyChannelOpen?: (guestId: string) => void
  onPartyMessage?: (guestId: string, raw: string) => void
  onGuestConnectionLost?: (guestId: string, detail: string) => void
} & PartySocketCallbacks

export type HostPartySocketHandle = {
  dispose: () => void
  sendPartyToGuest: (guestId: string, raw: string) => void
  broadcastParty: (raw: string) => void
}

export type GuestPartySocketOptions = {
  sessionId: string
  signal: AbortSignal
  onPartyChannelOpen?: () => void
  onPartyMessage?: (raw: string) => void
  onConnectionLost?: (detail: string) => void
} & PartySocketCallbacks

export type GuestPartySocketHandle = {
  dispose: () => void
  sendPartyRaw: (raw: string) => void
  localPartyPeerId: string
  isPartyLinkOkForVisibilityResume: () => boolean
}

function socketBaseUrl(): string {
  return import.meta.env.VITE_SOCKET_URL?.trim() ?? ''
}

function createNoReconnectSocket(url: string): Socket {
  return io(url, {
    autoConnect: false,
    reconnection: false,
    transports: ['websocket', 'polling'],
  })
}

/**
 * Host: Socket.io to the realtime server; guests join the same party room, messages relayed server-side.
 */
export function runHostPartySocket(options: HostPartySocketOptions): HostPartySocketHandle {
  const clientId = crypto.randomUUID()
  const url = socketBaseUrl()
  const roomId = partySessionRoomId(options.sessionId)
  const socket = createNoReconnectSocket(url)
  let reportedConnected = false

  const sendPartyToGuest: HostPartySocketHandle['sendPartyToGuest'] = (guestId, raw) => {
    socket.emit(YOOCHOG_PARTY_SEND, { raw, targetGuestId: guestId })
  }

  const broadcastParty: HostPartySocketHandle['broadcastParty'] = (raw) => {
    socket.emit(YOOCHOG_PARTY_SEND, { raw })
  }

  const dispose = () => {
    socket.removeAllListeners()
    socket.close()
  }

  options.signal.addEventListener('abort', dispose, { once: true })

  void (async () => {
    const reportStatus = (s: HandshakeUiState) => {
      connectionStepLog('host', 'realtime:status', s)
      rtcDebugLog('realtime', 'host status', s)
      options.onStatus(s)
    }

    connectionStepLog('host', 'realtime:start', { sessionId: options.sessionId, roomId, clientId })
    rtcDebugLog('realtime', 'host start', { sessionId: options.sessionId, roomId, clientId })

    reportStatus('connecting_signaling')

    socket.on('connect', () => {
      connectionStepLog('host', 'realtime:socket:connect:ok', roomId)
      reportStatus('establishing_handshake')
      socket.emit(YOOCHOG_REGISTER, { roomId, role: 'host', clientId })
    })

    socket.on('connect_error', (err: Error) => {
      const msg = err?.message || 'Connect failed'
      connectionStepLog('host', 'realtime:socket:connect_error', msg)
      rtcFailureLog('realtime', 'host connect error', err)
      reportStatus('failed')
      options.onError(msg)
    })

    socket.on('disconnect', (reason) => {
      connectionStepLog('host', 'realtime:socket:disconnect', String(reason))
      if (options.signal.aborted) {
        return
      }
      reportStatus('failed')
      options.onError(`Disconnected (${String(reason)}).`)
    })

    socket.on(YOOCHOG_REGISTER_ERROR, (p: { error?: string } | null) => {
      const m = p?.error ?? 'Register failed'
      connectionStepLog('host', 'realtime:register_error', m)
      rtcFailureLog('realtime', 'host register', m)
      reportStatus('failed')
      options.onError(m)
    })

    socket.on(YOOCHOG_REGISTERED, () => {
      connectionStepLog('host', 'realtime:registered', 'host')
    })

    socket.on(YOOCHOG_GUEST_JOINED, (p: { guestId?: string } | null) => {
      const guestId = p?.guestId
      if (typeof guestId !== 'string' || !guestId) {
        return
      }
      connectionStepLog('host', 'realtime:guest_joined', guestId)
      options.onPartyChannelOpen?.(guestId)
      if (!reportedConnected) {
        reportedConnected = true
        reportStatus('connected')
      }
    })

    socket.on(YOOCHOG_GUEST_LEFT, (p: { guestId?: string } | null) => {
      const guestId = p?.guestId
      if (typeof guestId !== 'string' || !guestId) {
        return
      }
      connectionStepLog('host', 'realtime:guest_left', guestId)
      options.onGuestConnectionLost?.(guestId, 'Guest left')
    })

    socket.on(
      YOOCHOG_PARTY,
      (p: { from?: unknown; raw?: unknown } | null) => {
        if (!p || typeof p.raw !== 'string') {
          return
        }
        const from = p.from
        if (typeof from !== 'string' || !from) {
          return
        }
        options.onPartyMessage?.(from, p.raw)
      },
    )

    /** Host is alone until first guest; host_left from server targets guests, not host. */
    socket.on(YOOCHOG_HOST_LEFT, () => {
      // no-op (guests)
    })

    try {
      socket.connect()
    } catch (e) {
      rtcFailureLog('realtime', 'host socket connect threw', e)
      reportStatus('failed')
      options.onError(e instanceof Error ? e.message : 'Connect failed')
    }
  })()

  return { dispose, sendPartyToGuest, broadcastParty }
}

/**
 * Guest: joins party room, waits for `session_ready` (host in room) before sending party messages.
 */
export function runGuestPartySocket(options: GuestPartySocketOptions): GuestPartySocketHandle {
  const clientId = crypto.randomUUID()
  const url = socketBaseUrl()
  const roomId = partySessionRoomId(options.sessionId)
  const socket = createNoReconnectSocket(url)

  const sendPartyRaw: GuestPartySocketHandle['sendPartyRaw'] = (raw) => {
    socket.emit(YOOCHOG_PARTY_SEND, { raw })
  }

  const dispose = () => {
    socket.removeAllListeners()
    socket.close()
  }

  const isPartyLinkOkForVisibilityResume: GuestPartySocketHandle['isPartyLinkOkForVisibilityResume'] = () => {
    return socket.connected
  }

  options.signal.addEventListener('abort', dispose, { once: true })

  void (async () => {
    const reportStatus = (s: HandshakeUiState) => {
      connectionStepLog('guest', 'realtime:status', s)
      rtcDebugLog('realtime', 'guest status', s)
      options.onStatus(s)
    }

    connectionStepLog('guest', 'realtime:start', { sessionId: options.sessionId, roomId, clientId })
    rtcDebugLog('realtime', 'guest start', { sessionId: options.sessionId, roomId, clientId })
    let handshakeOpen = false

    reportStatus('connecting_signaling')

    const notifyLost = (detail: string) => {
      if (!handshakeOpen) {
        reportStatus('failed')
        options.onError(detail)
        dispose()
        return
      }
      options.onConnectionLost?.(detail)
    }

    socket.on('connect', () => {
      connectionStepLog('guest', 'realtime:socket:connect:ok', roomId)
      reportStatus('establishing_handshake')
      socket.emit(YOOCHOG_REGISTER, { roomId, role: 'guest', clientId })
    })

    socket.on('connect_error', (err: Error) => {
      const msg = err?.message || 'Connect failed'
      connectionStepLog('guest', 'realtime:socket:connect_error', msg)
      rtcFailureLog('realtime', 'guest connect error', err)
      if (!options.signal.aborted) {
        reportStatus('failed')
        options.onError(msg)
      }
    })

    socket.on('disconnect', (reason) => {
      connectionStepLog('guest', 'realtime:socket:disconnect', String(reason))
      if (options.signal.aborted) {
        return
      }
      if (!handshakeOpen) {
        reportStatus('failed')
        options.onError(`Disconnected (${String(reason)}).`)
        return
      }
      notifyLost(`Socket disconnected: ${String(reason)}`)
    })

    socket.on(YOOCHOG_REGISTER_ERROR, (p: { error?: string } | null) => {
      const m = p?.error ?? 'Register failed'
      connectionStepLog('guest', 'realtime:register_error', m)
      rtcFailureLog('realtime', 'guest register', m)
      if (!options.signal.aborted) {
        reportStatus('failed')
        options.onError(m)
      }
    })

    socket.on(YOOCHOG_SESSION_READY, () => {
      connectionStepLog('guest', 'realtime:session_ready')
      handshakeOpen = true
      options.onPartyChannelOpen?.()
      reportStatus('connected')
    })

    socket.on(YOOCHOG_HOST_LEFT, () => {
      notifyLost('Host left the party')
    })

    socket.on(YOOCHOG_PARTY, (p: { raw?: unknown } | null) => {
      if (!p || typeof p.raw !== 'string') {
        return
      }
      options.onPartyMessage?.(p.raw)
    })

    try {
      socket.connect()
    } catch (e) {
      rtcFailureLog('realtime', 'guest socket connect threw', e)
      reportStatus('failed')
      options.onError(e instanceof Error ? e.message : 'Connect failed')
    }
  })()

  return {
    dispose,
    sendPartyRaw,
    localPartyPeerId: clientId,
    isPartyLinkOkForVisibilityResume,
  }
}
