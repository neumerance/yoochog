# deploy — GitHub Pages release (Cursor)

Guide and execute **yoochog** deployment to **GitHub Pages** by publishing the **`gh-pages`** branch, as documented in **[`docs/github-pages.md`](../../docs/github-pages.md)**. This repo’s Vue app lives in **`app/`**; production uses Vite **`base`** **`/yoochog/`**.

**This project deploys only via the `gh-pages` branch** (`npm run deploy:gh-pages` from **`app/`**). Do not instruct or run GitHub Actions workflows for Pages here.

## When invoked

Parse text after **`/deploy`** as **`$ARGUMENT`**:

| `$ARGUMENT` | Behavior |
|-------------|----------|
| *(empty)*, **`gh-pages`**, **`manual`**, **`local`**, **`branch`**, **`help`**, **`docs`** | Use **`npm run deploy:gh-pages`** from **`app/`** (or summarize steps + link to `docs/github-pages.md` for **`help`** / **`docs`** without running destructive commands unless the user asks). |

## Required reading (agent)

Read **`docs/github-pages.md`** (full file) before running deploy steps so SPA **`404.html`**, **`VITE_*`**, and Pages settings stay correct.

## Safety (non-negotiable)

- **Never** read, print, or paste contents of **`app/.env.local`** (or any env file with real credentials) into chat.
- **`VITE_*`** values are **inlined into the client bundle** at build time.
- Do **not** commit **`app/.env.local`** or other secret files.

## Deploy — `gh-pages` branch

1. From repo root (optional): `gh auth status`; `gh repo view --json nameWithOwner -q .nameWithOwner` for the smoke URL owner.
2. **`cd app`**; ensure dependencies: **`npm ci`** or **`npm install`** as appropriate.
3. Production build uses **`app/.env.local`** when present—do not display it. If the file is missing, tell the user to copy **`app/.env.example` → `app/.env.local`** and set **`VITE_*`**, then rerun.
4. Run **`npm run deploy:gh-pages`** (runs **`npm run build`** then **`gh-pages -d dist`**). Requires **git push** access to **`origin`**.
5. **Settings → Pages → Deploy from a branch** → branch **`gh-pages`**, folder **`/ (root)`** — not **`/docs`** (that folder is ADR markdown, not the app).

## After deploy

- Smoke URL: **`https://<owner>.github.io/yoochog/`** (replace `<owner>` from `gh repo view`).
- If deep links fail without the app shell, confirm **`404.html`** exists in the published output (build script copies it from `index.html`).

## Output

Reply with: commands used or next steps, Pages settings to verify, and the public URL pattern—**no** secret values.
