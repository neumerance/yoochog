---
name: github-issue-integration
description: "GitHub issue patterns for agent workflows: gh preflight, fetch issue + thread, labels, plan/complexity/decomposition discovery, and error handling. Use before /implement_plan, /create_plan issue steps, or any ticket-driven implementation."
user-invocable: false
---

# GitHub issue integration (yoochog)

**Replaces Linear MCP** for this repository: all “fetch issue”, “list comments”, and “labels” steps use **`gh`**, not Linear tools.

## Skill resolution

Read with the Read tool in order until a file exists:

1. `.cursor/skills/github-issue-integration/SKILL.md`
2. `.claude/skills/github-issue-integration/SKILL.md`

If neither exists when a command requires this skill, **stop** and tell the user:

`Required skill github-issue-integration could not be loaded. Verify .cursor/skills/github-issue-integration/SKILL.md or .claude/skills/github-issue-integration/SKILL.md exists in the repository.`

Also read [github-cli](../github-cli/SKILL.md) for shared `gh` patterns (parse issue numbers, JSON fields, `--body-file`, errors).

## MCP / tool availability check (mandatory before writes)

1. From repo root: `gh auth status` — on failure, follow `github-cli` (login / SSO refresh).
2. `gh repo view --json nameWithOwner,url,defaultBranchRef -q .` — confirm the intended repository.
3. Before `gh issue comment`, `gh issue edit`, or label changes: confirm the issue number and that the user’s message authorizes mutating that issue.

Do **not** assume GitHub MCP servers are configured; **shell `gh` is the source of truth** for this repo.

## Fetch issue and full discussion

```bash
gh issue view <n> --json number,title,body,url,state,labels,author,comments,projectItems
```

- **`labels`**: each item has `.name` — use for `Has Plan`, `Complexity Assessed`, `Decomposed`, etc.
- If `comments` is truncated or you need raw order/metadata:

```bash
OWNER_REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)
gh api "repos/$OWNER_REPO/issues/<n>/comments" --paginate
```

## Discover plan, complexity, and decomposition (comment fallbacks)

Scan **labels first**, then **comments from oldest to newest** (or newest first when the workflow asks for “most recent”):

| Intent | Label (preferred) | Comment fallback |
|--------|--------------------|------------------|
| Has an implementation plan | `Has Plan` | Most recent comment whose body starts with `# Implementation Plan for` |
| Complexity assessed | `Complexity Assessed` | Most recent comment containing `Complexity Score:` and `/assess_complexity` or score line `Complexity Score: X.X/10` |
| Work decomposed | `Decomposed` | Comment containing `Decomposition Summary` |

**Extract complexity score**: regex `Complexity Score:\s*([0-9]+(?:\.[0-9]+)?)/10` (case-sensitive enough for agent parsing).

**Extract child issue numbers** (GitHub has no Linear `parentId`):

- From `Decomposition Summary` (or similar): all matches of `(?:#|issues/)(\d+)` in that comment’s body.
- Optional team convention: sub-issues mention `Parent: #<n>` in body — parse if present.

**Blocking hints** (no standard GitHub field): parse phrases like `Blocked by #123`, `Blocks #456`, or explicit checklist ` - [ ] blocked on #123` in issue/comment bodies; verify with `gh issue view`.

## Labels (non-destructive)

- Add: `gh issue edit <n> --add-label "Has Plan"` (repeat `--add-label` as needed).
- Remove only when the user explicitly asked: `gh issue edit <n> --remove-label "name"`.

## Errors (symptoms → action)

| Symptom | Action |
|--------|--------|
| `gh` not found | Install [GitHub CLI](https://cli.github.com/); halt issue-backed steps. |
| 401 / not logged in | `gh auth login`. |
| 404 on issue | Wrong number or repo; re-resolve `gh repo view`. |
| 403 | Org SSO / permissions; `gh auth refresh -h github.com -s read:org` per `github-cli`. |

Use **AskQuestion** when the user must choose a different issue or proceed without GitHub updates.
