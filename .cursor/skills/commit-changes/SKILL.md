---
name: commit-changes
description: Creates focused git commits from session work by reviewing status and diffs, planning atomic commits, confirming with the user, then staging explicit paths and committing. Use when the user asks to commit changes, create commits, or wrap up a session with git commits.
---

# Commit changes (yoochog)

## When to use

Apply this skill whenever the user wants commits created from current working tree changes (including “commit changes”, “stage and commit”, “wrap up with commits”).

## Preconditions

1. Run `git rev-parse --is-inside-work-tree` (or `git status`) from the **repository root**; if not a git repo, stop and tell the user.
2. Do not stage or commit unless the user has confirmed the plan (see Confirmation).

## Workflow

### 1. Understand what changed

- Use conversation history for intent and scope of the session.
- Run `git status` to list modified, added, and untracked files.
- Run `git diff` for unstaged changes; `git diff --staged` if anything is already staged.
- Decide whether one commit or **multiple logical commits** (group by feature, fix, refactor, or dependency boundaries).

### 2. Plan commits

For each planned commit:

- **Files**: list exact paths to `git add` (no globs that sweep unrelated files).
- **Message**: imperative mood, concise subject; body optional but should explain **why** when non-obvious.
- Prefer small, reviewable commits over one large dump.

### 3. Confirm with the user

Before any `git add` or `git commit`:

- Present the plan: number of commits, files per commit, and full commit message(s).
- Use **AskUserQuestion** when available:

  - **Title**: Commit plan
  - **Question**: I plan to create [N] commit(s) with these changes. Shall I proceed?
  - **Options**:
    - Yes — Create the commit(s)
    - No — Let me adjust first

If AskUserQuestion is unavailable, ask the same question in chat and wait for an explicit yes.

### 4. Execute after “Yes”

1. **`git add`**: pass **specific file paths only** — never `git add -A`, `git add .`, or other catch-all forms.
2. **`git commit -m`** (and `-m` again for body if needed): use the agreed messages verbatim.
3. Show result: `git log --oneline -n` with an appropriate count (e.g. number of new commits or 10).

## Commit message and authorship rules

- Write messages as the **user** would: no AI attribution, no “Generated with …” lines.
- **Never** add `Co-Authored-By:` or any co-author / assistant trailers.
- Do **not** stage, commit, or push unless the user asked for that step (this skill covers commit creation; push only if explicitly requested).

## Cursor / tooling notes

- Prefer running git commands in the terminal from the repo root.
- If multiple worktrees exist, operate only in the **primary** workspace root unless the user specifies another path.

## Optional alignment with repo conventions

If the project later documents a commit style (e.g. Conventional Commits), follow that document when present; otherwise default to clear imperative subjects and grouped commits as above.
