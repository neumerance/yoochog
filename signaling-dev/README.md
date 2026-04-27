# Deprecated: `signaling-dev`

The old **WebSocket-only** relay for WebRTC signaling is **removed**. Use the **Socket.io** server instead:

- **[`../realtime-server/`](../realtime-server/)** — `npm install && npm start` (default port **3000**)
- **Docker:** from the repo root, `docker compose -f compose.dev.yaml up` for web + socket, or `docker compose up` for the socket only (see root [`README.md`](../README.md))

Set **`VITE_SOCKET_URL`** in `app/.env.local` to the same origin your browser uses (e.g. `http://localhost:3000` when the realtime server is published on port 3000).

Migration: issue [#91](https://github.com/neumerance/yoochog/issues/91), [ADR 0006](../docs/adr/0006-socketio-realtime.md).
