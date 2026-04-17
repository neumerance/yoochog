# deploy — GitHub Pages release (Cursor)

Guide and execute **yoochog** deployment to **GitHub Pages** using the flows documented in **[`docs/github-pages.md`](../../docs/github-pages.md)**. This repo’s Vue app lives in **`app/`**; production uses Vite **`base`** **`/yoochog/`**.

## When invoked

Parse text after **`/deploy`** as **`$ARGUMENT`**:

| `$ARGUMENT` | Behavior |
|-------------|----------|
| *(empty)*, **`ci`**, **`actions`**, **`workflow`** | Prefer **GitHub Actions** deploy (workflow on `master` or manual `workflow_dispatch`). |
| **`manual`**, **`gh-pages`**, **`local`**, **`branch`** | Use **`npm run deploy:gh-pages`** from **`app/`** (pushes static **`dist/`** to remote branch **`gh-pages`**). |
| **`help`** or **`docs`** | Summarize both paths + link to `docs/github-pages.md`; do not run destructive commands unless the user asks. |

If the user’s intent is unclear, ask once: **CI (Actions)** or **manual (`gh-pages` branch)**?

## Required reading (agent)

Read **`docs/github-pages.md`** (full file) before running deploy steps so SPA **`404.html`**, **`VITE_*`**, and Pages settings stay correct.

## Safety (non-negotiable)

- **Never** read, print, or paste contents of **`app/.env.local`** (or any env file with real credentials) into chat.
- **`VITE_*`** values are **inlined into the client bundle** at build time—GitHub “Secrets” do not hide them from browsers.
- Do **not** commit **`app/.env.local`** or other secret files.

## Path A — GitHub Actions

1. From repo root: `gh auth status`; `gh repo view --json nameWithOwner -q .nameWithOwner`.
2. If the user wants a run now: `gh workflow run deploy-github-pages.yml --ref master` then `gh run list --workflow=deploy-github-pages.yml --limit 3` and `gh run watch <id>` (or tell them to use the Actions tab).
3. Remind: **Settings → Pages → Source: GitHub Actions** must be set for **`actions/deploy-pages`** to publish. If Actions fails with **billing / account locked**, switch to Path B or fix billing per that doc.

**Build-time env in CI:** repository **Secrets** / **Variables** mapped in **`.github/workflows/deploy-github-pages.yml`** (names align with **`app/.env.example`**).

## Path B — `gh-pages` branch (no Actions / billing blocked)

1. **`cd app`**; ensure dependencies: **`npm ci`** or **`npm install`** as appropriate.
2. Production build uses **`app/.env.local`** when present—do not display it. If the file is missing, tell the user to copy **`app/.env.example` → `app/.env.local`** and set **`VITE_*`**, then rerun.
3. Run **`npm run deploy:gh-pages`** (runs **`npm run build`** then **`gh-pages -d dist`**). Requires **git push** access to **`origin`**.
4. Remind: **Settings → Pages → Deploy from a branch** → branch **`gh-pages`**, folder **`/ (root)`** — not **`/docs`** (that folder is ADR markdown, not the app).

## After deploy

- Smoke URL: **`https://<owner>.github.io/yoochog/`** (replace `<owner>` from `gh repo view`).
- If deep links fail without the app shell, confirm **`404.html`** exists in the published output (build script copies it from `index.html`).

## Output

Reply with: which path ran (or was instructed), exact commands used or next steps, Pages settings to verify, and the public URL pattern—**no** secret values.
