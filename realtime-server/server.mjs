import { createServer } from 'node:http'
import { Server } from 'socket.io'

/** Keep in sync with `app/src/lib/party/partyMessages.ts` (ADR 0002). */
const PARTY_MESSAGE_MAX_RAW_BYTES = 256_000

const port = Number(process.env.PORT || 3000)
const allowOrigin = process.env.SOCKET_CORS_ORIGIN?.trim() || true

const httpServer = createServer()
const io = new Server(httpServer, {
  cors: { origin: allowOrigin, methods: ['GET', 'POST'] },
  maxHttpBufferSize: PARTY_MESSAGE_MAX_RAW_BYTES + 64_000,
})

/** @typedef {{ socket: import('socket.io').Socket, role: 'host' | 'guest' }} ClientEntry */
/** @type {Map<string, Map<string, ClientEntry>>} roomId -> clientId -> entry */
const rooms = new Map()

function getOrCreateRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, new Map())
  }
  return rooms.get(roomId)
}

function getRoom(roomId) {
  return rooms.get(roomId)
}

io.on('connection', (socket) => {
  /** @type {{ roomId: string, clientId: string, role: 'host' | 'guest' } | null} */
  let reg = null

  function cleanupRegistration() {
    if (!reg) {
      return
    }
    const m = getRoom(reg.roomId)
    if (!m) {
      reg = null
      return
    }
    m.delete(reg.clientId)
    if (m.size === 0) {
      rooms.delete(reg.roomId)
    } else {
      if (reg.role === 'host') {
        socket.to(reg.roomId).emit('host_left', { reason: 'host_disconnected' })
      } else {
        const host = findHostSocket(m)
        if (host) {
          host.emit('guest_left', { guestId: reg.clientId })
        }
      }
    }
    reg = null
  }

  /**
   * @param {Map<string, ClientEntry>} m
   * @returns {import('socket.io').Socket | null}
   */
  function findHostSocket(m) {
    for (const e of m.values()) {
      if (e.role === 'host') {
        return e.socket
      }
    }
    return null
  }

  /**
   * @param {import('socket.io').Socket} hostSock
   * @param {Map<string, ClientEntry>} m
   */
  function tellHostAboutAllGuests(hostSock, m) {
    for (const [id, e] of m) {
      if (e.role === 'guest') {
        hostSock.emit('guest_joined', { guestId: id })
      }
    }
  }

  /**
   * @param {import('socket.io').Socket} sock
   * @param {string} roomId
   * @param {Map<string, ClientEntry>} m
   */
  function notifyGuestsSessionReady(sock, roomId, m) {
    for (const e of m.values()) {
      if (e.role === 'guest' && e.socket.id !== sock.id) {
        e.socket.emit('session_ready', {})
      }
    }
  }

  socket.on('register', (payload) => {
    if (reg) {
      socket.emit('register_error', { error: 'Already registered' })
      return
    }
    if (!payload || typeof payload !== 'object') {
      socket.emit('register_error', { error: 'Invalid register payload' })
      return
    }
    const { roomId, clientId, role } = /** @type {{ roomId?: unknown, clientId?: unknown, role?: unknown }} */ (payload)
    if (typeof roomId !== 'string' || roomId.length < 3 || roomId.length > 256) {
      socket.emit('register_error', { error: 'Invalid room' })
      return
    }
    if (typeof clientId !== 'string' || clientId.length < 1 || clientId.length > 128) {
      socket.emit('register_error', { error: 'Invalid clientId' })
      return
    }
    if (role !== 'host' && role !== 'guest') {
      socket.emit('register_error', { error: 'Invalid role' })
      return
    }

    const m = getOrCreateRoom(roomId)
    if (role === 'host') {
      for (const [id, e] of [...m.entries()]) {
        if (e.role === 'host') {
          m.delete(id)
          try {
            e.socket.disconnect(true)
          } catch {
            // ignore
          }
          break
        }
      }
    }

    if (m.has(clientId)) {
      const prev = m.get(clientId)
      if (prev) {
        try {
          prev.socket.disconnect(true)
        } catch {
          // ignore
        }
      }
      m.delete(clientId)
    }

    void socket.join(roomId)
    m.set(clientId, { socket, role })
    reg = { roomId, clientId, role }
    socket.data.yoochog = reg

    if (role === 'host') {
      tellHostAboutAllGuests(socket, m)
      notifyGuestsSessionReady(socket, roomId, m)
    } else {
      const hostSock = findHostSocket(m)
      if (hostSock) {
        socket.emit('session_ready', {})
        hostSock.emit('guest_joined', { guestId: clientId })
      }
    }

    socket.emit('registered', { ok: true })
  })

  socket.on('party_send', (payload) => {
    if (!reg) {
      return
    }
    if (!payload || typeof payload !== 'object' || typeof payload.raw !== 'string') {
      return
    }
    const { raw, targetGuestId } = /** @type {{ raw: string, targetGuestId?: unknown }} */ (payload)
    if (raw.length > PARTY_MESSAGE_MAX_RAW_BYTES) {
      return
    }
    const m = getRoom(reg.roomId)
    if (!m) {
      return
    }
    if (reg.role === 'guest') {
      const hostSock = findHostSocket(m)
      if (hostSock) {
        hostSock.emit('party', { from: reg.clientId, raw })
      }
      return
    }
    if (reg.role === 'host') {
      if (typeof targetGuestId === 'string' && targetGuestId.length > 0) {
        const target = m.get(targetGuestId)
        if (target && target.role === 'guest') {
          target.socket.emit('party', { raw })
        }
        return
      }
      for (const e of m.values()) {
        if (e.role === 'guest') {
          e.socket.emit('party', { raw })
        }
      }
    }
  })

  socket.on('disconnect', () => {
    cleanupRegistration()
  })
})

httpServer.listen(port, () => {
  console.log(`[yoochog-realtime] listening on ${port} (CORS: ${allowOrigin === true ? 'all' : allowOrigin})`)
})
