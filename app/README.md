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

### Type-Check, Compile and Minify for Production

```sh
npm run build
```
