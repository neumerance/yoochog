# Yoochog (Vue app)

Frontend for [yoochog](https://github.com/neumerance/yoochog), built with Vue 3 and Vite.

## GitHub Pages (project site)

CI deploys the production build from `master`; see the root doc **[docs/github-pages.md](../docs/github-pages.md)** for the workflow, one-time GitHub settings, and permissions.

- Production **`npm run build`** also emits **`dist/404.html`** (a copy of `index.html`) so GitHub Pages serves the Vue app shell for deep links and refreshes. See **Deep links / SPA routing** in that doc for behavior and tradeoffs versus hash-based routing.

This repo is published as a **project** site, not the account root. The URL shape is:

`https://<github-username>.github.io/<repository-name>/`

For this repository the path segment is **`yoochog`**. Example:

**https://neumerance.github.io/yoochog/**

Production builds set Vite’s [`base`](https://vite.dev/config/shared-options.html#base) to `/yoochog/` so scripts, styles, and assets resolve under that prefix. Vue Router uses `import.meta.env.BASE_URL`, so it stays aligned with the build.

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

### Signaling (PubNub — primary)

**PubNub is the main signaling transport** for this app: WebRTC offers/answers and ICE flow over PubNub pub/sub on **one channel per party** (room id `yoochog:party:<sessionId>` per [ADR 0001](../docs/adr/0001-webrtc-signaling.md)). The client chooses PubNub when **both** keys are set in **`app/.env.local`** (see [`signalingFactory`](src/lib/signaling/signalingFactory.ts)).

```sh
VITE_PUBNUB_PUBLISH_KEY=your-publish-key
VITE_PUBNUB_SUBSCRIBE_KEY=your-subscribe-key
```

Use keys from the PubNub admin portal (dev app). Production should use **Access Manager** / token auth instead of long-lived publish keys in clients; this wiring is suitable for **development and demos**.

**Manual check:** Run **`npm run dev`** in **`app/`**, open **Host** (player route) and **Guest** at **`/join/<sessionId>`** with the **same** session id (QR / join link). You should see **“Establishing handshake”** then **Connected** when the WebRTC peer connection reaches `connected`. Use two browser tabs or profiles with the same `.env.local`.

**Reconnect / background behavior:** See **[`docs/realtime-recovery.md`](../docs/realtime-recovery.md)** for what happens after network drops or when the tab was backgrounded ~1 minute (guest recovery, backoff limits, and when to refresh).

**If the browser console shows `403` on `pndsn.com` subscribe or publish:** PubNub is rejecting the request. Common fixes:

1. Use **Publish Key** and **Subscribe Key** from the **same keyset** (same app in the Admin portal)—do not mix keys from different apps.
2. For **local development**, turn **Access Manager** **off** on that keyset (when PAM is on with no grants, clients get 403). Alternatively keep PAM on and configure grants for your channels.
3. Confirm the keyset is **active** and **Pub/Sub** is allowed for the client.

### Optional: local WebSocket relay (not primary)

For **offline** work or debugging the signaling envelope without PubNub, this repo includes a small **dev relay** under [`signaling-dev/`](../signaling-dev/) (`server.mjs`). It is **not** the product’s main path—use it only when you omit PubNub keys and set:

```sh
VITE_SIGNALING_URL=http://localhost:8787
```

Start the relay (`cd signaling-dev && npm install && npm start`, default port **8787**). If both PubNub keys **and** `VITE_SIGNALING_URL` are set, **PubNub is used**; unset the PubNub keys to force the WebSocket client.

**Manual check (relay only):** DevTools → Network may show an open WebSocket to the relay URL.

### Party queue deduplication (guest enqueue)

Each **YouTube video id** may appear **at most once** in the host’s ordered queue at a time (including the currently playing row). If a guest requests a video whose id is **already** in the queue, the host **does not** add another row and sends **`enqueue_rejected`** with a short, friendly **`reason`**; the guest UI shows it via `lastEnqueueError` (see [ADR 0002](../docs/adr/0002-party-data-channel-wire-protocol-v1.md)).

### YouTube queue titles (optional)

Guest enqueue can resolve **video titles** via the **YouTube Data API v3** (`videos.list`) using a **browser-restricted API key** in **`app/.env.local`**:

```sh
VITE_YOUTUBE_API_KEY=your-youtube-data-api-key
```

When the variable is **unset** or the API errors, the app still enqueues by **video id**; the UI shows titles as **unknown**. Keys prefixed with **`VITE_`** are bundled into the client — restrict the key by **HTTP referrer** (and app restrictions) in Google Cloud Console. If the Data API is unavailable, the client **falls back** to [noembed.com](https://noembed.com/) for titles (third-party; no API key). See [ADR 0003](../docs/adr/0003-party-queue-metadata-v1.md) for queue metadata on the party channel.

### WebRTC ICE (STUN + optional TURN)

Party WebRTC peer connections use ICE servers from Vite env (`import.meta.env`). Variable names only here — set real values in **`app/.env.local`** (gitignored), not in the repo.

| Variable | Role |
|----------|------|
| `VITE_STUN_URLS` | Optional. Comma-separated STUN discovery URLs (`stun:` / `stuns:`). When unset or empty, the app uses the same default public STUN as before (Google `stun.l.google.com:19302`). |
| `VITE_TURN_URLS` | Optional. Comma-separated TURN relay URLs (`turn:` / `turns:`). |
| `VITE_TURN_USERNAME` | Required for TURN when `VITE_TURN_URLS` is set — together with `VITE_TURN_CREDENTIAL`. |
| `VITE_TURN_CREDENTIAL` | TURN password or REST-style credential string. |

**Security:** Anything prefixed with `VITE_` is **bundled into the client** at build time. Treat long-lived TURN passwords as visible to anyone who can download your JS. For production, prefer **short-lived** credentials (for example coturn **TURN REST** / `use-auth-secret`): your backend or deploy pipeline mints a temporary `username` (often expiry-based) and `credential` (HMAC) and injects them into build or runtime env — the browser still receives plain `username` + `credential` on `RTCIceServer`; the **shared secret** never ships in the front-end bundle.

**Static username/password (typical for local dev):** set all four variables in `.env.local` against your coturn `user=…` style config.

**Partial config:** If `VITE_TURN_URLS` is set but username or credential is missing, TURN entries are skipped and the console warns once so operators can fix configuration.

**Manual check (relay path):** Automated E2E for relay selection is out of scope; verify by hand when TURN is configured:

1. Put TURN credentials in **`app/.env.local`** and restart **`npm run dev`** (or rebuild for preview).
2. Use two browsers (or profiles) on the **same party** as usual (PubNub or relay signaling).
3. Force a **relay-heavy** network: e.g. join one side from a **phone hotspot** or with a **VPN** so a direct peer/reflexive path is unlikely.
4. Confirm the party still reaches **Connected**. Optionally open **`chrome://webrtc-internals`** (Chromium) and inspect the peer connection’s ICE candidates — you should see **`relay`**-type candidates when TURN is in use.

### Type-Check, Compile and Minify for Production

```sh
npm run build
```
