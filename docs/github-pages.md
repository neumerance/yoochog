# GitHub Pages deployment (yoochog)

This repository ships the Vue app in `app/` to **GitHub Pages** as a **project site** (URL path includes the repo name).

## What runs in CI

Workflow: [`.github/workflows/deploy-github-pages.yml`](../.github/workflows/deploy-github-pages.yml).

On every **push to `master`** (the current default branch), or when the workflow is **run manually** (`workflow_dispatch`, e.g. `gh workflow run`):

1. Check out the repository.
2. Install Node **20** (matches `app/package.json` `engines`: `^20.19.0 || >=22.12.0`).
3. In **`app/`**: `npm ci`, then `npm run build` (output: `app/dist/`).
4. Upload `app/dist` as the **GitHub Pages** deployment artifact.
5. Deploy that artifact with GitHub’s official **`actions/deploy-pages`** job.

No long-lived `gh-pages` branch is used for build output.

## Why artifact + official deploy (not `gh-pages` branch)

| Approach | Notes |
|----------|--------|
| **Artifact + `deploy-pages` (this repo)** | Build output is produced in CI, uploaded as a Pages artifact, and published by GitHub. Keeps the default branch free of generated assets; matches GitHub’s recommended path for **custom build steps**. |
| **`gh-pages` branch** | Can work for static dumps, but duplicates generated files in git history and is easy to desync from `master`. |

## One-time repository settings

1. **Pages source:** GitHub → **Settings** → **Pages** → **Build and deployment** → **Source:** **GitHub Actions**.  
   (If this is not set, the workflow’s deploy job will not publish a site.)

2. **Workflow permissions:** This workflow sets top-level `permissions` for the `GITHUB_TOKEN`:

   - `contents: read` — clone the repo and read files.
   - `pages: write` — publish to GitHub Pages.
   - `id-token: write` — OIDC for the Pages deployment (required by `deploy-pages`).

   Forks or new repos need the same **Actions** and **Pages** features enabled; forks may not deploy Pages from Actions depending on org policy.

3. **Default branch:** The workflow triggers on **`master`**. If the default branch is renamed, update the `on.push.branches` list in the workflow file.

4. **Build-time `VITE_*` values:** The **Install and build** step reads repository **Secrets** and **Variables** (names match [`app/.env.example`](../app/.env.example)). Values are compiled into the client bundle—treat them like any public web config. TURN credential stays on **Secrets** only.

## GitHub CLI (`gh`)

Run these from a clone of this repo (or pass `-R owner/repo`). Requires [`gh` auth](https://cli.github.com/manual/gh_auth_login).

### Set repository secrets (sensitive)

Pipe or read the value (avoid putting secrets in shell history when possible):

```bash
printf '%s' 'YOUR_VALUE' | gh secret set VITE_PUBNUB_PUBLISH_KEY
printf '%s' 'YOUR_VALUE' | gh secret set VITE_PUBNUB_SUBSCRIBE_KEY
# Optional — same pattern for other keys in app/.env.example, e.g.:
# printf '%s' 'YOUR_VALUE' | gh secret set VITE_TURN_CREDENTIAL
```

### Set repository variables (non-sensitive optional config)

```bash
gh variable set VITE_SIGNALING_URL --body 'https://example.com'
gh variable set VITE_YOUTUBE_API_KEY --body 'YOUR_KEY'
```

Use **either** a secret **or** a variable for optional keys where the workflow supports fallback (`VITE_SIGNALING_URL`, ICE/YouTube as documented in the workflow file).

### List what is configured

```bash
gh secret list
gh variable list
```

### Trigger a build and deploy

The workflow also runs on **push to `master`**. To run it without a new commit:

```bash
gh workflow run deploy-github-pages.yml --ref master
```

Inspect or watch the latest run:

```bash
gh run list --workflow=deploy-github-pages.yml --limit 5
gh run watch <run-id>
```

## Public URL shape

Project sites use:

`https://<owner>.github.io/<repository>/`

For this project, production builds use Vite `base` `/yoochog/` and the router follows `import.meta.env.BASE_URL`, so assets and routes align with that prefix. Example:

**https://neumerance.github.io/yoochog/**

## Deep links / SPA routing

GitHub Pages only serves **static files**. There is no server that rewrites `/yoochog/player` to `index.html`, so a **direct open** or **refresh** on an in-app path can return GitHub’s “page not found” response even though the Vue app would know how to render that route if the shell had loaded first.

### What this repo does

After each production build, the pipeline copies the built **`index.html`** to **`404.html`** in `app/dist/`. GitHub Pages serves that file for requests that do not match a real path, so the browser still receives the **same app shell** as the home page. [Vue Router](https://router.vuejs.org/) (history mode with `createWebHistory` and `BASE_URL` `/yoochog/`) then reads the URL and shows `/player`, `/join/<sessionId>`, and so on.

### Join URLs (canonical)

Guest entry uses a **single canonical** path shape (history mode, no hash):

`https://neumerance.github.io/yoochog/join/<sessionId>`

- **`<sessionId>`** is the opaque party id (same id the host tab stores for sharing; UUID-shaped today).
- **QR codes and copy-link features** must encode **exactly** this URL: same scheme, host, `/yoochog/` prefix, and path. Implementations should build the string with the shared helper [`buildGuestJoinUrl`](../app/src/lib/join-url/buildGuestJoinUrl.ts) so docs and product stay aligned.
- Local dev uses base `/`, so the same route looks like `http://localhost:5173/join/<sessionId>`.

The legacy **`/client`** route redirects to the home page; update bookmarks to `/join/<sessionId>` when sharing a party.

See [Creating a custom 404 page for your GitHub Pages site](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-custom-404-page-for-your-github-pages-site).

### Tradeoffs: `404.html` vs hash routing

| | **`404.html` (same as `index.html`)** — **this repo** | **`createWebHashHistory()`** (not used here) |
|--|--|--|
| **URLs** | Clean paths like `/yoochog/player` | Fragment-based: `yoochog/#/player` (less pretty; share links look different) |
| **Hosting** | Relies on Pages’ custom 404 behavior for “missing” paths | Single `index.html` for all routes; no 404 copy needed on static hosts |
| **Bookmarks / sharing** | Unchanged from current history-mode URLs | Would change URL shape; old bookmarks would need communication or redirects if you ever switched |
| **Elsewhere** | If you move off Pages to a host that supports SPA fallback (e.g. nginx `try_files`), you configure that there instead of duplicating HTML | Same hash URLs work anywhere without server rewrites |

**This project** keeps **HTML5 history** and the **404.html** post-build step so deep links and refreshes work on GitHub Pages without changing the public URL format.

## References

- [Configuring a publishing source for GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-github-pages-site) (including **GitHub Actions** as source)
- [Using custom workflows with GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-github-pages-site#publishing-with-a-custom-github-actions-workflow)
- [`actions/deploy-pages`](https://github.com/actions/deploy-pages)
- [`actions/upload-pages-artifact`](https://github.com/actions/upload-pages-artifact)
