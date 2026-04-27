# ADR 0006: Socket.io realtime server and party room contract

**Status:** Accepted  
**Date:** 2026-04-27  
**Context:** [Issue #91 — WebRTC + PubNub → Socket.io; Docker Compose dev](https://github.com/neumerance/yoochog/issues/91)  
**Supersedes:** [ADR 0001](./0001-webrtc-signaling.md) for transport choice; room id string remains compatible.

## Context

The static Vue app on GitHub Pages needs a **reachable** realtime service. WebRTC peer connections and separate PubNub/WebSocket signaling for ICE/SDP are **replaced** by a **single** Socket.io server that:

- Joins clients to a **named room** derived from the opaque host `sessionId`.
- Relays **party JSON** (see [ADR 0002](./0002-party-data-channel-wire-protocol-v1.md)) between host and guests.

## Decision

### Environment

- **`VITE_SOCKET_URL`** — build-time (Vite) base URL for the Socket.io server, e.g. `https://realtime.example.com` or `http://localhost:3000` for local development. The client connects with `socket.io-client`; **CORS** on the server must allow the web app origin.

### Room id

Reuse the same normative string as ADR 0001:

```text
yoochog:party:<sessionId>
```

Implemented in code as `partySessionRoomId` in [`app/src/lib/realtime/partyRoomId.ts`](../../app/src/lib/realtime/partyRoomId.ts). The server treats this as the Socket.io **room name** after clients **register** with `{ roomId, role, clientId }`.

### Auth (development)

The development server accepts any connection; **no token** is required for local work. Production deployments should sit the Socket.io service behind TLS and may add application-level connect auth in a follow-up.

### Docker Compose

[`compose.yaml`](../../compose.yaml) defines the **socket** service; [`compose.dev.yaml`](../../compose.dev.yaml) **includes** it and adds the **Vite** dev `web` service so one command brings up both; see root [`README.md`](../../README.md).

### Deprecations

- **`VITE_PUBNUB_*`**, **`VITE_SIGNALING_URL`**, ad hoc **`signaling-dev`** WebSocket relay, and **WebRTC** party transport are **removed** from the default app path.

## Consequences

- Operators **must** deploy or host a Socket.io-compatible service and set **`VITE_SOCKET_URL`** in CI for production builds.
- [ADR 0002](./0002-party-data-channel-wire-protocol-v1.md) remains the **message** contract; only the **transport** changes (server relay instead of `RTCDataChannel`).
