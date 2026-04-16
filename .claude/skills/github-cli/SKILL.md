---
name: github-cli
description: "GitHub CLI (gh) for repos, PRs, issues, API, Actions, and releases. Required before refine_spec, create_spec, or create-plan steps that fetch, comment on, create, or edit GitHub issues."
user-invocable: false
---

# GitHub CLI (`gh`) — yoochog

## When to use this skill

- **Specs and plans tied to GitHub Issues** (`/refine_spec`, `/create_spec`, `/create_plan`, research): read this file first, then run `gh` from the shell.
- **Opening a PR with yoochog conventions** (branch names, template): read `.cursor/skills/create-pull-request/SKILL.md` (it embeds `gh` for PRs).

## Preconditions

1. Run from the **repository root** (or a directory where `git` / `gh` resolve the intended repo).
2. If `gh` is missing: point to [GitHub CLI](https://cli.github.com/).
3. Auth: `gh auth status`. On failure: `gh auth login` (HTTPS or SSH). Org SSO: `gh auth refresh -h github.com -s read:org` when `HTTP 403` suggests SSO.

## Repo context

```bash
gh repo view --json nameWithOwner,url,defaultBranchRef -q .
```

Fallback: `git remote get-url origin`.

## JSON and long bodies

- Prefer `gh ... --json field1,field2 -q 'jqexpr'` for stable parsing.
- For long markdown (specs, plans): write to a temp file, then `--body-file` on `gh issue create`, `gh issue comment`, `gh issue edit`, `gh pr create`, etc.

## GitHub Issues — patterns for agents

### Parse “which issue?” from user text

Treat as **existing issue in this repo** when `ARG` matches any of:

- `^\d+$` or `^#\d+$` → issue number (strip `#`).
- URL `https://github.com/<owner>/<repo>/issues/<n>` (optionally with query string) → use `<n>` when `owner/repo` matches current `gh repo view`, otherwise **AskQuestion** whether to use that repo or default to current.
- Rare: `owner/repo#<n>` → pass `-R owner/repo` to `gh` when different from cwd repo.

Otherwise treat `ARG` as **free-text concept** (new issue flow), not an issue number.

If ambiguous (e.g. `"12 fixes login"` could be title vs issue 12), use **AskQuestion**: refine issue 12 vs new issue with that title.

### Fetch issue + discussion

```bash
gh issue view <n> --json number,title,body,url,state,labels,author,comments
```

If `comments` is missing or empty but you need thread history, use:

```bash
gh api "repos/<owner>/<repo>/issues/<n>/comments"
```

Resolve `<owner>/<repo>` from `gh repo view --json nameWithOwner -q .nameWithOwner`.

### Add a comment (keeps existing description)

```bash
gh issue comment <n> --body-file <path>
```

### Replace issue body (overwrite description)

```bash
gh issue edit <n> --body-file <path>
```

### Create a new issue

```bash
gh issue create --title "..." --body-file <path> [--label "name" ...]
```

Capture URL from command output or:

```bash
gh issue view <n> --json url -q .url
```

### Labels

- **Add** labels without removing others: `gh issue edit <n> --add-label "Has Plan"` (repeat `--add-label` as needed).
- **Remove**: `gh issue edit <n> --remove-label "name"`.
- Do **not** assume Linear-style “replace entire list” semantics; prefer `--add-label` / `--remove-label`.

### Defaults for new issues (this repo)

See `.claude/commands/github-issues.md` when present. Otherwise: create **open** issues, title from user/spec, body = refined markdown; add labels only if the user asks or the repo’s contributing guide says so.

## Common commands (short reference)

| Goal | Command sketch |
|------|----------------|
| Who am I? | `gh api user -q .login` |
| List issues | `gh issue list --json number,title,state,url` |
| View issue | `gh issue view <n> --json title,body,url,comments,...` |
| Comment | `gh issue comment <n> --body-file ...` |
| Edit body | `gh issue edit <n> --body-file ...` |
| Create | `gh issue create --title "..." --body-file ...` |
| PRs | `gh pr list`, `gh pr view`, `gh pr create`, `gh pr comment`, … |

## Safety

- Do **not** paste tokens or `gh auth token` output into chat.
- Destructive actions (close issue, delete, merge): require clear intent in-thread.

## Errors

| Symptom | Action |
|--------|--------|
| `gh` not found | Install CLI; link above. |
| HTTP 401 / not logged in | `gh auth status` → `gh auth login`. |
| Wrong repo | `cd` to repo root; verify `gh repo view`. |
| HTTP 404 on issue | Wrong number, repo, or missing `repo` scope for private repos. |
| HTTP 403 | SSO or permissions; `gh auth refresh` / check org access. |

Use **AskQuestion** for “retry / different issue number / save spec locally only” when appropriate.

## Execution

Use the project shell to run `gh` after checks above; echo issue/PR URLs in the final user message when available.
