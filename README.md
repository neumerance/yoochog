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

`npm run dev` serves the app at `/` (Vite dev server). See **Production-like local check** below for how that differs from production builds.

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

For the workflow, one-time GitHub **Settings** (Pages source, permissions), and how SPA routing / `404.html` work on Pages, see **[`docs/github-pages.md`](docs/github-pages.md)**.

## Future configuration (placeholders)

Reserved **environment variable names** for possible future WebRTC-related configuration. These follow Vite’s `VITE_*` convention and are **unused until implemented**. List **names only** — no values here and none committed to the repo.

| Area | Placeholder names (examples) |
|------|------------------------------|
| **Signaling** (WebRTC signaling / WebSocket service URL) | `VITE_SIGNALING_URL` |
| **TURN** (TURN/STUN / ICE server configuration) | `VITE_TURN_URLS` and/or additional `VITE_TURN_*` names as needed |

**Do not commit secrets.** Do not add `.env` files or other files containing real credentials to this repository.

## Host session ids (threat model)

The host experience stores a **random, unguessable** id per browser tab (UUID-style via `crypto.randomUUID()`, persisted in `sessionStorage`) so casual guessing or drive-by URL typing is unlikely to join the wrong party. That is **not** a full multi-tenant security, compliance, or anti-abuse boundary—there are no server-issued secrets in this repo, and join flows remain **client-side** until later epics add real membership and controls.

## More documentation

- [`app/README.md`](app/README.md) — Vue app details and subpath verification
- [`docs/github-pages.md`](docs/github-pages.md) — full GitHub Pages setup
