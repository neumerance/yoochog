# Architecture Decision Records (ADR)

Short-lived decision log for cross-cutting technical choices. New ADRs should use the next number: `NNNN-short-title.md`.

| ADR | Title |
|-----|--------|
| [0001-webrtc-signaling.md](./0001-webrtc-signaling.md) | **Superseded** — WebRTC signaling (see [0006](./0006-socketio-realtime.md)) |
| [0002-party-data-channel-wire-protocol-v1.md](./0002-party-data-channel-wire-protocol-v1.md) | Party channel JSON wire protocol v1 — message kinds, size limits, forward compatibility |
| [0006-socketio-realtime.md](./0006-socketio-realtime.md) | Socket.io server, `VITE_SOCKET_URL`, `sessionId` → room, Docker dev |
| [0005-session-admin-party-v1.md](./0005-session-admin-party-v1.md) | Session admin on the party channel: `sessionAdminPeerId`, `remove_queue_row_request`, admin or row-owner actions |
