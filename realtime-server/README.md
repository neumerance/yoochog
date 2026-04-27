# yoochog-realtime-server

Small **Socket.io** server that joins host and guests in a room per party id (`yoochog:party:<sessionId>`) and relays JSON party payloads. See [ADR 0006](../docs/adr/0006-socketio-realtime.md).

## Run locally

```bash
npm install
npm start
```

Default port **3000** (`PORT` env overrides). **CORS** defaults to allow any origin; set `SOCKET_CORS_ORIGIN` to restrict (e.g. `https://neumerance.github.io`).

The Vue app expects **`VITE_SOCKET_URL`** (e.g. `http://localhost:3000`) in `app/.env.local`.

## Docker

Used as the `socket` service in root [`compose.yaml`](../compose.yaml) (and included from [`compose.dev.yaml`](../compose.dev.yaml) for local dev with Vite).
