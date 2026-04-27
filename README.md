# yoochog

Yoochog is a Vue 3 + Vite frontend living under [`app/`](app/). This repository is the home for that app and its GitHub Pages deployment. Use this document to **clone and run locally**; see [`app/README.md`](app/README.md) for deeper app notes (subpath checks, IDE setup, and more).

## Prerequisites

- **Git**
- **Node.js** matching [`app/package.json`](app/package.json) `engines`: `^20.19.0 || >=22.12.0`

## Local development

```sh
git clone https://github.com/neumerance/yoochog.git
cd yoochog/app
npm install
npm run dev
```

`npm run dev` serves the app at `/` (Vite dev server). **Party mode** (host + guests) needs **[`VITE_SOCKET_URL`](app/.env.example)** and the Socket.io process — see [Docker (web + socket)](#docker-web--realtime) or [`app/README.md`](app/README.md).

## Docker (web + realtime)

From the **repository root** (not only `app/`):

- **Vite + Socket.io (typical local dev):**
  ```sh
  docker compose -f compose.dev.yaml up --build
  ```
- **Socket server only** (e.g. when running the Vue app on the host with `npm run dev`):
  ```sh
  docker compose up --build
  ```

Then open **http://localhost:5173** (dev file only) with **`VITE_SOCKET_URL=http://localhost:3000`**. The `socket` service listens on **3000**. See [`compose.yaml`](compose.yaml), [`compose.dev.yaml`](compose.dev.yaml), and [ADR 0006](docs/adr/0006-socketio-realtime.md).

## Production-like local check

From **`app/`**:

```sh
npm run build
npm run preview
```

Production builds and `vite preview` use the `/yoochog/` base path; `npm run dev` uses `/`. To verify asset URLs under `/yoochog/` and inspect `dist/`, see [`app/README.md`](app/README.md).

## Deployment

Pushes to **`master`** run [`.github/workflows/deploy-github-pages.yml`](.github/workflows/deploy-github-pages.yml): CI installs dependencies in **`app/`**, runs **`npm run build`**, and publishes the static output from **`app/dist`** to **GitHub Pages**.

Example public URL (project site):

**https://neumerance.github.io/yoochog/**

For the workflow, one-time GitHub **Settings** (Pages source, permissions), and how SPA routing / `404.html` work on Pages, see **[`docs/github-pages.md`](docs/github-pages.md)**. Use **GitHub Actions** when available; if Actions is blocked, build locally and run **`npm run deploy:gh-pages`** from **`app/`**, then set Pages to **Deploy from branch `gh-pages` / `(root)`** (see that doc).

### Join URL (guests)

Canonical production guest URL:

**`https://neumerance.github.io/yoochog/join/<sessionId>`**

Use the same pattern in tests and previews, with the dev server origin and path `/join/<sessionId>`. Any QR or share UI must produce this exact shape (see **`buildGuestJoinUrl`** in [`app/src/lib/join-url/buildGuestJoinUrl.ts`](app/src/lib/join-url/buildGuestJoinUrl.ts)); details and GitHub Pages behavior are in [`docs/github-pages.md`](docs/github-pages.md).

## Runtime configuration (Vite / GitHub Pages)

| Area | Variable | Notes |
|------|-----------|--------|
| **Party realtime (Socket.io)** | `VITE_SOCKET_URL` | **Required** for host + guest party flows. Public base URL of the Socket.io server (inlined at build). See [ADR 0006](docs/adr/0006-socketio-realtime.md) and [`docs/github-pages.md`](docs/github-pages.md). |
| **YouTube titles** | `VITE_YOUTUBE_API_KEY` | Optional. |

**Do not commit secrets.** Do not add `.env` files or other files containing real credentials to this repository.

## Party queue (guest adds)

When guests enqueue by URL, the host enforces two rules: **each YouTube video id** may appear **at most once** in the queue (including the playing row), and **each guest** may have **at most one** row at a time (including the playing row). Rejected requests return a short **`reason`** on the party channel; the guest UI surfaces it via `lastEnqueueError`. See [`app/README.md`](app/README.md), [ADR 0002](docs/adr/0002-party-data-channel-wire-protocol-v1.md), and [ADR 0004](docs/adr/0004-party-queue-guest-ownership-v1.md).

## Host session ids (threat model)

The host experience stores a **random, unguessable** id per browser tab (UUID-style via `crypto.randomUUID()`, persisted in `sessionStorage`) so casual guessing or drive-by URL typing is unlikely to join the wrong party. That is **not** a full multi-tenant security, compliance, or anti-abuse boundary—there are no server-issued secrets in this repo, and join flows remain **client-side** until later epics add real membership and controls.

## More documentation

- [`app/README.md`](app/README.md) — Vue app details and subpath verification
- [`docs/github-pages.md`](docs/github-pages.md) — full GitHub Pages setup
- [`docs/realtime-recovery.md`](docs/realtime-recovery.md) — Socket.io reconnect, tab visibility recovery, and ~1 minute background behavior (Epic 4 / [#28](https://github.com/neumerance/yoochog/issues/28))
- [`docs/adr/0006-socketio-realtime.md`](docs/adr/0006-socketio-realtime.md) — Socket.io transport, `VITE_SOCKET_URL`, room ids (supersedes [0001](docs/adr/0001-webrtc-signaling.md))
- [`docs/adr/0002-party-data-channel-wire-protocol-v1.md`](docs/adr/0002-party-data-channel-wire-protocol-v1.md) — party JSON wire protocol v1 (Epic 4)
