# GitHub Pages deployment (yoochog)

This repository ships the Vue app in `app/` to **GitHub Pages** as a **project site** (URL path includes the repo name).

## What runs in CI

Workflow: [`.github/workflows/deploy-github-pages.yml`](../.github/workflows/deploy-github-pages.yml).

On every **push to `master`** (the current default branch):

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

## Public URL shape

Project sites use:

`https://<owner>.github.io/<repository>/`

For this project, production builds use Vite `base` `/yoochog/` and the router follows `import.meta.env.BASE_URL`, so assets and routes align with that prefix. Example:

**https://neumerance.github.io/yoochog/**

## References

- [Configuring a publishing source for GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-github-pages-site) (including **GitHub Actions** as source)
- [Using custom workflows with GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-github-pages-site#publishing-with-a-custom-github-actions-workflow)
- [`actions/deploy-pages`](https://github.com/actions/deploy-pages)
- [`actions/upload-pages-artifact`](https://github.com/actions/upload-pages-artifact)
