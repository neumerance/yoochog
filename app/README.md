# Yoochog (Vue app)

Frontend for [yoochog](https://github.com/neumerance/yoochog), built with Vue 3 and Vite.

## GitHub Pages (project site)

CI deploys the production build from `master` when **GitHub Actions** is available. If Actions is blocked, run **`npm run deploy:gh-pages`** from this directory (after **`npm install`**) to push **`dist/`** to the **`gh-pages`** branch; then set the repo’s **Pages** source to that branch. Details: **[docs/github-pages.md](../docs/github-pages.md)**.

- Production **`npm run build`** also emits **`dist/404.html`** (a copy of `index.html`) so GitHub Pages serves the Vue app shell for deep links and refreshes. See **Deep links / SPA routing** in that doc for behavior and tradeoffs versus hash-based routing.

This repo is published as a **project** site, not the account root. The URL shape is:

`https://<github-username>.github.io/<repository-name>/`

For this repository the path segment is **`yoochog`**. Example:

**https://neumerance.github.io/yoochog/**

**Default** production/preview builds set Vite’s [`base`](https://vite.dev/config/shared-options.html#base) to **`/yoochog/`** (GitHub Pages) unless you set **`VITE_BASE_PATH`** in `.env` / the environment. Use **`VITE_BASE_PATH=/`** (or another prefix) when serving from your own host so asset URLs and the router match nginx—see [`docs/server-deployment.md`](../docs/server-deployment.md). Vue Router uses `import.meta.env.BASE_URL`, so it stays aligned with the build.

## Verify the subpath locally

You do not need GitHub Pages live to confirm asset URLs:

```sh
cd app
npm install
npm run build
```

Inspect `dist/index.html`: bundle and favicon links should start with `/yoochog/`. For example:

```sh
rg '/yoochog/' dist/index.html
```

Then serve the production bundle (also uses `/yoochog/`):

```sh
npm run preview
```

Open the URL Vite prints (paths are under `/yoochog/`). `npm run dev` still serves the app at `/` with HMR.

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Recommended Browser Setup

- Chromium-based browsers (Chrome, Edge, Brave, etc.):
  - [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
  - [Turn on Custom Object Formatter in Chrome DevTools](http://bit.ly/object-formatters)
- Firefox:
  - [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
  - [Turn on Custom Object Formatter in Firefox DevTools](https://fxdx.dev/firefox-devtools-custom-object-formatters/)

## Type Support for `.vue` Imports in TS

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` in editors. Use [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) so the TypeScript service understands `.vue` types.

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Realtime (Socket.io — required for party)

Party messages (queue, chat, session admin) use **Socket.io** between the Vue app and a small **Node** server: [`../realtime-server/`](../realtime-server/). Room id: `yoochog:party:<sessionId>` (see [ADR 0006](../docs/adr/0006-socketio-realtime.md)).

1. **Two terminals (host machine):** start the server (`cd ../realtime-server && npm install && npm start`, default **3000**), then **`npm run dev`** in **`app/`** with:
   ```sh
   VITE_SOCKET_URL=http://localhost:3000
   ```
   in **`app/.env.local`**.
2. **Or one command:** from the **repo root**, **`docker compose -f compose.dev.yaml up --build`** (see root [`README.md`](../README.md)) — the dev compose file sets the same `VITE_SOCKET_URL` for the Vite service.

**Manual check:** Open **Host** (player) and **Guest** at **`/join/<sessionId>`** with the same session (QR / link). You should see **Connecting** then **Online** on both after the host is present. Use two tabs or profiles.

**Reconnect / background behavior:** See **[`docs/realtime-recovery.md`](../docs/realtime-recovery.md)** (Socket.io, backoff limits, tab visibility).

**Migration:** the old `signaling-dev` WebSocket relay and PubNub-based WebRTC path are **removed**; see [`signaling-dev/README.md`](../signaling-dev/README.md).

### Party queue policy (guest enqueue)

Each **YouTube video id** may appear **at most once** in the host’s ordered queue at a time (including the currently playing row). If a guest requests a video whose id is **already** in the queue, the host **does not** add another row and sends **`enqueue_rejected`** with a short **`reason`**; the guest UI shows it via `lastEnqueueError` (see [ADR 0002](../docs/adr/0002-party-data-channel-wire-protocol-v1.md)).

Each **logical guest** may have **at most one** row in the queue at a time (including the currently playing row). A second request is rejected until that guest’s row is gone (played, skipped, or removed). Rows carry a stable **`requesterGuestId`** for enforcement and sync; see [ADR 0004](../docs/adr/0004-party-queue-guest-ownership-v1.md).

**Queue list on the wire:** `queue_snapshot` in [ADR 0002](../docs/adr/0002-party-data-channel-wire-protocol-v1.md) lists **video ids in playback order** for the **current song and what is still up next** — not a log of finished tracks. The host trims consumed rows as playback moves; `currentIndex` is `0` on the first remaining row when the list is non-empty. Guests render the same compact snapshot after each broadcast (and normalize older cached snapshots on load when needed).

**Session admin:** The first guest who identifies on the party channel is **session admin** (next in join order when they disconnect). **Ending the current track** or **removing a non-playing row** is allowed for the session admin **or** the guest who requested that row (logical `requesterGuestId`). The host enforces this and includes `sessionAdminPeerId` on each `queue_snapshot`. See [ADR 0005](../docs/adr/0005-session-admin-party-v1.md).

### YouTube queue titles (optional)

Guest enqueue can resolve **video titles** via the **YouTube Data API v3** (`videos.list`) using a **browser-restricted API key** in **`app/.env.local`**:

```sh
VITE_YOUTUBE_API_KEY=your-youtube-data-api-key
```

When the variable is **unset** or the API errors, the app still enqueues by **video id**; the UI shows titles as **unknown**. Keys prefixed with **`VITE_`** are bundled into the client — restrict the key by **HTTP referrer** (and app restrictions) in Google Cloud Console. If the Data API is unavailable, the client **falls back** to [noembed.com](https://noembed.com/) for titles (third-party; no API key). See [ADR 0003](../docs/adr/0003-party-queue-metadata-v1.md) for queue metadata on the party channel.

### Type-Check, Compile and Minify for Production

```sh
npm run build
```
