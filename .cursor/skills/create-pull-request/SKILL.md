---
name: create-pull-request
description: "Creates a GitHub pull request from current branch changes: validates git state, uses yoochog branch and commit conventions, pushes with gh, and fills the PR template. Use when the user runs /pr, asks to open a PR, or says create pull request, draft PR, or link PR to a GitHub issue."
---

# Create pull request (yoochog)

## Related skills

- **GitHub Issues / `gh`**: Read [../github-cli/SKILL.md](../github-cli/SKILL.md) when linking or fetching issues. Same-repo linking uses **issue numbers** (`#42`, `42`) or `gh pr create --issue 42`.
- **Commits**: Prefer alignment with [../commit-changes/SKILL.md](../commit-changes/SKILL.md) (explicit paths, user confirmation). This PR workflow still requires **explicit user approval** before `git commit`, `git push`, and PR creation when the user has not clearly ordered those steps in the same message.

## Slash-command arguments

Parse the user message for:

| Pattern | Effect |
|--------|--------|
| First quoted string or remainder title | Custom PR title for `gh pr create --title` |
| `--draft` | Pass `--draft` to `gh pr create` |
| `--issue 42` or `--issue #42` | GitHub issue **number** in this repo: scope in commit message / PR body (`Fixes #42`), branch name hint, optional `gh pr create --issue 42` |

Combined example: `/pr "Fix login bug" --draft --issue 42`

### No parameters

If the user invokes `/pr` (or equivalent) **with no title, no `--issue`, and no obvious issue number in branch name**, reply:

```text
I'll help you create a PR.

Please provide:
1. The GitHub issue number (e.g. 42) or issue URL, if this work tracks an issue
```

Then wait for input.

## Preconditions

1. `git rev-parse --is-inside-work-tree` from repo root; if not a git repo, stop.
2. `git status` — if clean (no staged/unstaged changes) and no commits ahead of upstream to push, inform the user and stop.
3. **`gh`**: If `gh` is missing or unauthenticated, give the manual URL: `https://github.com/<owner>/<repo>/compare/<branch>?expand=1` (resolve owner/repo from `gh repo view --json nameWithOwner -q .nameWithOwner` when `gh` works; else from `git remote get-url origin`).

## Branch naming (yoochog)

- Pattern: `{github-login}/{issue-or-description}` — **lowercase kebab-case** for the slug part.
- Resolve login: `gh api user -q .login` when available; else a short local identifier from `git config user.name` slugified (document uncertainty in chat).
- If on `main` or `master` (or default branch from `git symbolic-ref refs/remotes/origin/HEAD` basename), create a feature branch before committing, e.g. `{login}/42-short-summary` when issue **42** exists, or `{login}/short-summary` if no issue yet.

## Workflow

### 1. Pre-flight

- `git status` and `git diff` / `git diff --staged`; if upstream exists, `git log @{u}..HEAD` for commits not yet on the remote tracking branch.
- Extract GitHub issue number from: `--issue` arg, branch name segments that are purely numeric (e.g. `user/42-fix`), or `Fixes #42` / `#42` in recent commit subjects.

### 2. Branch

- If on default branch with local changes, create and checkout the feature branch per naming above.

### 3. Stage and commit (only if user asked for PR end-to-end or to include uncommitted work)

- **Staging**: List paths from `git status`. Prefer **`git add <path>…`** for each changed path (same spirit as commit-changes). Use `git add -u` only if the user explicitly wants all **tracked** modifications in one commit.
- **Do not** commit unless the user confirmed the message/plan (commit-changes rule) **or** the same message clearly requests a full PR including commit (e.g. “create PR from my changes” with implied single commit).
- **Commit message** (Conventional Commits + optional issue scope):

  ```text
  type(scope): description

  optional body
  ```

  - **type**: `feat`, `fix`, `chore`, `docs`, `refactor`, `test` — infer from diff.
  - **scope**: GitHub issue number when known (e.g. `42` meaning `#42`); else omit or use a short area name.
- **Authorship**: No `Co-Authored-By`, no AI attribution lines, no “Generated with …” in message or PR body.

### 4. Push

- `git push -u origin HEAD` (or explicit branch name) after commit exists or branch already has commits. If push rejected, diagnose (auth, upstream, protected branch) and report.

### 5. PR description

1. If `.github/pull_request_template.md` exists, read it and answer every prompt/section using a thorough reading of **`git diff origin/...`** or full diff against merge base.
2. Otherwise use [reference.md](reference.md) sections (**The Why**, **How it Works**, **Risks and Compromises**, **Testing Strategy**, **Checklist**, change-type / extension notes as applicable).
3. **Analyze deeply**: trace architectural impact, breaking changes, migrations, user-visible vs internal changes.
4. **Risks**: Classify Low / Medium / High per surface area (docs/UI vs business logic vs auth/tokens/core loading).
5. At the bottom, include the `<details>` conversation summary from reference.md — **verbatim user text** where possible.

Write body to a temp file and pass `gh pr create --body-file` when the body is long.

### 6. Create PR

```bash
gh pr create --title "..." [--draft] [--issue <n>] --body-file /tmp/pr-body.md
# or --fill / --title only when appropriate
```

- Link the GitHub issue in the body with `Fixes #<n>` / `Refs #<n>` when an issue number is known; `--issue <n>` links the PR to the issue in GitHub’s UI when supported by your `gh` version.

### 7. Success output

- PR number and URL from `gh pr create` output.
- Short summary of behavioral changes.
- Next steps: review, CI, manual test areas.

## Error handling

| Failure | Action |
|--------|--------|
| `gh` missing | Print compare URL template and suggest installing GitHub CLI. |
| `gh pr create` fails | Show error; give compare URL for manual PR. |
| No template file | Use [reference.md](reference.md). |
| Issue not found | Still open PR; keep `Refs #n` text only if user asked; do not fabricate issue content. |

## Conflicts with generic “always commit” instructions

User / global rules may say not to commit unless asked. **This skill applies only when the user is explicitly requesting PR creation**; then commits and push are in scope **after** confirmation rules above are satisfied.
