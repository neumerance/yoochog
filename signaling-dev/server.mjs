import { WebSocketServer } from 'ws'

const PORT = Number(process.env.PORT ?? 8787)

/** @type {Map<string, Map<string, { ws: import('ws').WebSocket, role: string }>>} */
const rooms = new Map()

function broadcastToRoom(room, exceptClientId, msg) {
  const r = rooms.get(room)
  if (!r) {
    return
  }
  const payload = JSON.stringify(msg)
  for (const [id, peer] of r) {
    if (id === exceptClientId) {
      continue
    }
    if (peer.ws.readyState === 1) {
      peer.ws.send(payload)
    }
  }
}

function sendToClient(room, clientId, msg) {
  const r = rooms.get(room)
  if (!r) {
    return
  }
  const peer = r.get(clientId)
  if (peer && peer.ws.readyState === 1) {
    peer.ws.send(JSON.stringify(msg))
  }
}

const wss = new WebSocketServer({ port: PORT })

wss.on('connection', (ws) => {
  let clientRoom = null
  let clientId = null

  ws.on('message', (raw) => {
    let msg
    try {
      msg = JSON.parse(raw.toString())
    } catch {
      return
    }
    if (msg.type === 'join') {
      const room = msg.room
      const cid = msg.clientId
      const role = msg.role
      if (!room || !cid || (role !== 'host' && role !== 'guest')) {
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid join payload.' }))
        return
      }
      clientRoom = room
      clientId = cid
      if (!rooms.has(room)) {
        rooms.set(room, new Map())
      }
      const r = rooms.get(room)
      const peers = []
      for (const [id, peer] of r) {
        peers.push({ clientId: id, role: peer.role })
      }
      r.set(cid, { ws, role })
      ws.send(JSON.stringify({ type: 'joined', room, peers }))
      broadcastToRoom(room, cid, { type: 'peer-joined', room, clientId: cid, role })
      return
    }
    if (msg.type === 'signal') {
      if (!msg.room || !msg.to || !msg.from) {
        return
      }
      sendToClient(msg.room, msg.to, msg)
    }
  })

  ws.on('close', () => {
    if (!clientRoom || !clientId) {
      return
    }
    const r = rooms.get(clientRoom)
    if (!r) {
      return
    }
    r.delete(clientId)
    broadcastToRoom(clientRoom, clientId, { type: 'peer-left', room: clientRoom, clientId })
    if (r.size === 0) {
      rooms.delete(clientRoom)
    }
  })
})

console.log(`yoochog signaling dev listening on ws://localhost:${PORT}`)
