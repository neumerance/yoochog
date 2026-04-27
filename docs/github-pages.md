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

If **GitHub Actions** is unavailable (e.g. billing), publish the same **`app/dist`** output using a dedicated **`gh-pages`** branch and **Deploy from a branch** (see [below](#deploy-without-github-actions-gh-pages-branch)).

**GitHub Actions availability:** Runs require Actions to be enabled and the owning **user or organization billing account** to be in good standing. If a run fails immediately with an annotation such as *account is locked due to a billing issue*, use the **`gh-pages`** branch flow [below](#deploy-without-github-actions-gh-pages-branch) or fix billing under GitHub **Settings → Billing** (user or org).

## Ways to publish

| Approach | When to use |
|----------|-------------|
| **GitHub Actions** + `deploy-pages` | Default: CI builds **`app/`** and publishes **`app/dist`** as a Pages artifact. No generated assets on `master`. |
| **`gh-pages` branch** (`npm run deploy:gh-pages`) | Actions blocked or disabled: build locally; the script pushes **`dist/` contents to the root** of remote branch **`gh-pages`**. In **Pages**, choose **Deploy from a branch** → **`gh-pages`** → **`/ (root)`**. |

GitHub’s branch UI only offers **`/(root)`** or **`/docs`** on the chosen branch. It **cannot** target **`app/dist`**. This repo’s root [`docs/`](../docs/) folder is **ADR / markdown**, not the Vue build—do **not** point Pages at **`/docs`** for the app. Use **Actions**, or a **`gh-pages`** branch whose **root** is the static site.

## Deploy without GitHub Actions (gh-pages branch)

1. **Configure the production build** — Copy [`app/.env.example`](../app/.env.example) to **`app/.env.local`** and set **`VITE_*`** (same as any local production build; values are inlined into the bundle).

2. **Publish the `gh-pages` branch** — From **`app/`**:

   ```bash
   npm run deploy:gh-pages
   ```

   This runs **`npm run build`** (including `404.html` for SPA fallback), then uses the [`gh-pages`](https://github.com/tschaub/gh-pages) CLI to commit the contents of **`app/dist/`** at the **root** of branch **`gh-pages`** and **`git push`** to **`origin`**. You need push access to the repository.

3. **Point GitHub Pages at that branch** — **Settings** → **Pages** → **Build and deployment** → **Source:** **Deploy from a branch** → Branch **`gh-pages`**, folder **`/ (root)`** → **Save**.

The build copies [`app/public/.nojekyll`](../app/public/.nojekyll) into **`dist/`** so GitHub Pages does not run Jekyll over the static files.

## One-time repository settings

1. **Pages source — pick one:**

   - **GitHub Actions** — **Settings** → **Pages** → **Source:** **GitHub Actions**. Required for the [workflow](#what-runs-in-ci) to publish.  
   - **Deploy from a branch** — Use only with branch **`gh-pages`** and **`/ (root)`** after running **`npm run deploy:gh-pages`** (see above). Do **not** select a random feature branch that still has the full monorepo layout.

2. **Workflow permissions:** This workflow sets top-level `permissions` for the `GITHUB_TOKEN`:

   - `contents: read` — clone the repo and read files.
   - `pages: write` — publish to GitHub Pages.
   - `id-token: write` — OIDC for the Pages deployment (required by `deploy-pages`).

   Forks or new repos need the same **Actions** and **Pages** features enabled; forks may not deploy Pages from Actions depending on org policy.

3. **Default branch:** The workflow triggers on **`master`**. If the default branch is renamed, update the `on.push.branches` list in the workflow file.

4. **Build-time `VITE_*` values:** The **Install and build** step reads repository **Secrets** and **Variables** (names match [`app/.env.example`](../app/.env.example)). Values are compiled into the client bundle—treat `VITE_SOCKET_URL` and similar as **public** client config. Put sensitive API keys in **Secrets** if you also restrict them in the key provider.

## GitHub CLI (`gh`)

Run these from a clone of this repo (or pass `-R owner/repo`). Requires [`gh` auth](https://cli.github.com/manual/gh_auth_login).

### Set repository secrets (sensitive)

Pipe or read the value (avoid putting secrets in shell history when possible):

```bash
# Public Socket.io base URL the browser will use in production (must match your deployed server).
gh variable set VITE_SOCKET_URL --body 'https://realtime.example.com'
# Optional — YouTube Data API key (browser-restricted key).
# gh variable set VITE_YOUTUBE_API_KEY --body 'YOUR_KEY'
```

The workflow reads **`VITE_SOCKET_URL`** from **Variables** or **Secrets** (`secrets || vars` pattern). For URLs that are not secret, prefer **Variables**.

### Set repository variables (non-sensitive optional config)

```bash
gh variable set VITE_YOUTUBE_API_KEY --body 'YOUR_KEY'
```

Use the workflow’s `secrets || vars` pattern when the build must support both (see [`.github/workflows/deploy-github-pages.yml`](../.github/workflows/deploy-github-pages.yml)).

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

### Unstick branch-based Pages (`gh-pages` source)

If **Settings → Pages** uses **Deploy from a branch** → **`gh-pages`** → **`/ (root)`**, GitHub still runs an internal Pages build after each push. Sometimes **`gh-pages` HEAD** updates but the **live site** keeps old **`index.html`** (mismatched hashed assets in view source), or **`gh api repos/{owner}/{repo}/pages`** reports **`status: "building"`** for a long time. Queue a new build from a clone (or add `-R owner/repo` to `gh repo view`):

```bash
OWNER_REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)
gh api -X POST "repos/${OWNER_REPO}/pages/builds"
```

```bash
gh api "repos/${OWNER_REPO}/pages/builds/latest" --jq '{status, created_at}'
gh api "repos/${OWNER_REPO}/pages" --jq '{status, source}'
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

- Related issues: [#76](https://github.com/neumerance/yoochog/issues/76) (GitHub Pages / CI context), [#77](https://github.com/neumerance/yoochog/issues/77) (Secrets/Variables, `workflow_dispatch`, `gh` operator docs)
- [Configuring a publishing source for GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-github-pages-site) (including **GitHub Actions** as source)
- [Using custom workflows with GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-github-pages-site#publishing-with-a-custom-github-actions-workflow)
- [`actions/deploy-pages`](https://github.com/actions/deploy-pages)
- [`actions/upload-pages-artifact`](https://github.com/actions/upload-pages-artifact)
