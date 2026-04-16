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

### Signaling (real-time handshake, dev)

Epic 4 uses a **separate** WebSocket signaling service (not GitHub Pages). This repo includes a small **dev relay** under [`signaling-dev/`](../signaling-dev/) (see `server.mjs` and `package.json`) that matches the client’s JSON envelope (`join`, `signal`, room id `yoochog:party:<sessionId>` per [ADR 0001](../docs/adr/0001-webrtc-signaling.md)).

1. In one terminal, start the relay (default port **8787**):

   ```sh
   cd signaling-dev
   npm install
   npm start
   ```

2. In **`app/`**, create **`.env.local`** (not committed) with the **name-only** placeholder:

   ```sh
   VITE_SIGNALING_URL=http://localhost:8787
   ```

3. Run **`npm run dev`** in **`app/`**, open **Host** at `/player` and **Guest** at `/join/<sessionId>` using the **same** opaque party id as the host (QR / join link). You should see **“Establishing handshake”** then **Connected** when the WebRTC peer connection reaches `connected`.

**Manual check:** Two browser tabs (or profiles) with the same `VITE_SIGNALING_URL` and matching session id; DevTools → Network shows an open WebSocket to the signaling URL.

### Signaling via PubNub (hosted)

The app can use **[PubNub](https://www.pubnub.com/)** pub/sub on **one channel per party** (same string as ADR 0001: `yoochog:party:<sessionId>`). If both keys are set in **`.env.local`**, they take priority over `VITE_SIGNALING_URL`.

```sh
VITE_PUBNUB_PUBLISH_KEY=your-publish-key
VITE_PUBNUB_SUBSCRIBE_KEY=your-subscribe-key
```

Use keys from the PubNub admin portal (dev app). Production should use **Access Manager** / token auth instead of long-lived publish keys in clients; this wiring is suitable for **development and demos**.

**If the browser console shows `403` on `pndsn.com` subscribe or publish:** PubNub is rejecting the request. Common fixes:

1. Use **Publish Key** and **Subscribe Key** from the **same keyset** (same app in the Admin portal)—do not mix keys from different apps.
2. For **local development**, turn **Access Manager** **off** on that keyset (when PAM is on with no grants, clients get 403). Alternatively keep PAM on and configure grants for your channels.
3. Confirm the keyset is **active** and **Pub/Sub** is allowed for the client.

### Type-Check, Compile and Minify for Production

```sh
npm run build
```
