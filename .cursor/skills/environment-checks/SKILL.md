---
name: environment-checks
description: "Pre-flight git checks for Cursor workflows. Verifies clean working tree, default branch, and sync with origin. Used by refine_spec, create_spec, create_plan, and similar commands."
user-invocable: false
---

# Environment consistency checks (Cursor)

**When a command says to run this skill:** parse the checks below, run the shell commands from the repo root, use **AskQuestion** (Cursor’s structured question UI) wherever this file says `AskUserQuestion`, halt when required, and show the messages verbatim unless you need to substitute values.

## Resolve default branch

```bash
git rev-parse --is-inside-work-tree
```

If not a repo: stop; tell the user to open a git workspace.

```bash
DEFAULT_BRANCH=$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@')
if [ -z "$DEFAULT_BRANCH" ]; then
  DEFAULT_BRANCH=$(git branch --show-current 2>/dev/null || echo main)
fi
echo "DEFAULT_BRANCH=$DEFAULT_BRANCH"
```

Use `DEFAULT_BRANCH` as the branch name for `origin/<branch>` comparisons (usually `main` or `master`).

## 1. Uncommitted changes

```bash
git status --porcelain
```

If output is not empty:

- List the changes briefly.
- Use **AskQuestion**: “You have uncommitted changes. How would you like to proceed?”
  - Stash changes — run `git stash push -m "Pre-refine_spec stash"` (substitute the actual command name).
  - Commit changes — user commits manually, then re-runs the command.
  - Discard changes — **warn** this loses work; if they insist, require typing exactly `DISCARD` before `git reset --hard HEAD`.
  - Cancel — stop.

Halt until resolved.

## 2. Branch requirement for `refine_spec` / `create_spec`

Commands that analyze the **whole** codebase (including `refine_spec` and `create_spec`) expect:

- Current branch equals `DEFAULT_BRANCH` (see above), **or** explicitly `main` if your team standardizes on `main` only—if `DEFAULT_BRANCH` is `master`, treat `master` as the required branch for this repo.

```bash
git branch --show-current
```

If wrong branch: explain why these commands want the integration branch, then **AskQuestion**: “Branch mismatch. How proceed?”
- Switch to [DEFAULT_BRANCH] — after handling dirty tree if needed.
- Cancel.

Halt until resolved.

## 3. Sync with origin (when remote exists)

```bash
git remote get-url origin >/dev/null 2>&1 && echo HAS_ORIGIN || echo NO_ORIGIN
```

If `NO_ORIGIN`: print a warning; **AskQuestion** once whether to continue (spec-only) or stop.

If `HAS_ORIGIN`:

```bash
git rev-parse HEAD >/dev/null 2>&1 && echo HAS_COMMITS || echo NO_COMMITS
```

- **NO_COMMITS** (empty repo): print “No commits yet—skipping pull.” Continue only if the workflow makes sense without a tree (e.g. issue-only refinement with `gh`); otherwise stop.
- **HAS_COMMITS**:

```bash
git fetch origin
git rev-list --count HEAD.."origin/$DEFAULT_BRANCH" 2>/dev/null || git rev-list --count HEAD..origin/main 2>/dev/null || git rev-list --count HEAD..origin/master 2>/dev/null
```

If behind: **AskQuestion** with merge/rebase options per your team policy, or halt with instructions to pull/merge.

## 4. Success banner

```
Environment checks passed

Current branch: [branch]
Latest commit: [hash] [subject]  (or "no commits yet")
Working tree: clean
Remote: [in sync / N behind / no origin]

Proceeding with [COMMAND_NAME]...
```

## 5. Context reminder (end of command)

Print:

```
Context management tip

If you switch to a different feature next:
- Start a new chat or clear context so this spec doesn’t bleed into unrelated work.
```

Show this even when exiting early.

## Command-specific notes

| Command        | Branch              | Clean tree | Sync                    |
|----------------|---------------------|------------|-------------------------|
| `refine_spec`  | default integration | yes        | not behind origin branch |
| `create_spec`  | default integration | yes        | not behind origin branch |
| `implement_plan` | **feature** branch (not default) | **dirty OK** | warn if behind `origin/<DEFAULT_BRANCH>` |

**Reasoning:** Spec work may reference the repo layout; running on a stale or dirty branch produces misleading assumptions.

## Variant: `implement_plan` (implementation on a feature branch)

Use this instead of rows 1–3 when the active command is **`/implement_plan`** (or equivalent).

### Preconditions

- `git rev-parse --is-inside-work-tree` — if not a repo, stop.
- Resolve `DEFAULT_BRANCH` as in “Resolve default branch” above.

### 1. Branch must not be default integration

```bash
git branch --show-current
```

- If current branch equals `DEFAULT_BRANCH` (or `main`/`master` when that is the integration branch): **stop** or **AskQuestion** — implementation must not commit directly on the integration branch. Offer: create/switch to a feature branch per [create-pull-request](../create-pull-request/SKILL.md) naming (`{github-login}/{issue-number}-{slug}` when an issue exists).

### 2. Uncommitted changes

**Allowed** for `implement_plan` (work may be committed during the command). Still print a short `git status --porcelain` summary so the user sees what will ship.

### 3. Behind origin

If `origin` exists and `git rev-list --count HEAD.."origin/$DEFAULT_BRANCH"` is **> 0**: **warn** that the branch is behind integration; recommend merge/rebase per team policy. Use **AskQuestion** only if the workflow cannot safely proceed otherwise.

### 4. Success banner (implement_plan)

```
Environment checks passed (implement_plan)

Current branch: [branch]  (must not be [DEFAULT_BRANCH])
Latest commit: [hash] [subject]
Working tree: [clean | N uncommitted paths]
Remote: [in sync | N behind origin/DEFAULT_BRANCH | no origin]

Proceeding with implement_plan...
```

End with the same “Context management tip” block as section 5.
