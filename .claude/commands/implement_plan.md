# implement_plan — Execute an approved plan for a GitHub issue (Claude Code)

You implement an **approved technical plan** (usually produced by `/create_plan`) for the **SketchUp extension** in this repo. Plans have phases, “Required tests”, and success criteria.

## Skills and commands (Claude + Cursor)

**Skill roots:** `.claude/skills/<name>/SKILL.md` → `.cursor/skills/<name>/SKILL.md` (first match wins).

**Command roots:** `.claude/commands/` and `.cursor/commands/` — keep behavior aligned when both exist.

### Required skills (read fully before workflow steps)

1. **`github-issue-integration`** — GitHub `gh` patterns for issues, comments, labels, plan/complexity/decomposition discovery, errors. **This replaces any legacy `linear-integration` requirement for yoochog.**
2. **`github-cli`** — JSON fields, commenting, label add/remove, auth.
3. **`environment-checks`** — run using the **`implement_plan` variant** (feature branch; dirty tree allowed; warn if behind default branch).

If **`github-issue-integration`** is missing from **both** skill roots, **stop** and tell the user:

`Required skill github-issue-integration could not be loaded. Verify .claude/skills/github-issue-integration/SKILL.md or .cursor/skills/github-issue-integration/SKILL.md exists in the repository.`

Optional pointer: **`implement-plan`** skill summarizes dependencies and links back to this file for the long checklist.

## Parameters

- **Arguments after `/implement_plan`**: GitHub issue number (`42`, `#42`), issue URL for this repo, or a **path/URL to a plan document** if the user is not issue-driven.
- If **no issue and no plan path**: ask once for GitHub issue **number/URL** or the **on-disk plan path**, then continue.

## Step 0 — Environment

Run **`environment-checks`** per its skill file, but apply the **`implement_plan` variant** (not the default-branch/clean-tree rules used by `refine_spec`).

**Required state for this command**

- **Branch:** a **feature** branch (not the repo default integration branch). Naming should follow `.claude/skills/create-pull-request/SKILL.md` or `.cursor/skills/create-pull-request/SKILL.md` when present: `{github-login}/{issue-number}-{slug}` when tracking issue `#<number>`.
- **Working tree:** **may** have uncommitted changes (expected to be committed during implementation when the user asks).
- **Integration branch:** **warn** if the branch is **significantly behind** `origin/<DEFAULT_BRANCH>`.

**Reasoning:** This command changes product code; it must not run as “commit directly on main” by accident.

## Step 1 — GitHub availability

Follow **`github-issue-integration`**: `gh auth status`, `gh repo view`, confirm repo before any `gh issue` mutation.

## Step 2 — Resolve issue and load ticket context

When an issue number is in scope:

```bash
gh issue view <n> --json number,title,body,url,state,labels,author,comments
```

Use **`github-cli`** parsing rules for numbers vs URLs. Pull the **full thread** when comments matter (`gh api repos/<owner>/<repo>/issues/<n>/comments` if needed).

## Step 3 — CRITICAL: Complexity assessment (GitHub)

Mirror the **intent** of the Linear workflow using **labels + comments** (see `github-issue-integration` table).

1. **Labels:** inspect `labels[].name` for **`Complexity Assessed`**.
2. **Score:** from the **most recent** `/assess_complexity` style comment (or any comment) containing `Complexity Score: X.X/10` — extract `X.X`.
3. **If score &lt; 8.5 (“red/yellow” zone):**
   - Check **`Decomposed`** label **or** a comment containing **`Decomposition Summary`**.
   - **If no breakdown found:** **STOP** and refuse with this message (substitute `[ISSUE-ID]` / `[SCORE]`):

   ```
   Cannot implement [ISSUE-ID] (complexity: [SCORE]/10)

   This issue is too complex for non-engineer implementation without breakdown.

   You must:
   1. Run /breakdown [ISSUE-ID] (or your team’s decomposition workflow) to create smaller sub-issues
   2. Clear context with /clear
   3. Run /create_plan on the first sub-issue
   4. Run /implement_plan on that sub-issue only

   Never implement red-scored issues (<8.5) directly.
   ```

   - **If breakdown found:** parse **child issue numbers** from the decomposition comment (`#123`, `/issues/123`). For each child, `gh issue view` and repeat complexity checks. Validate **blocking** hints (`Blocked by #…`, `Blocks #…`). If validation fails, show the **warning block** from the original Linear spec (adapted to GitHub issue numbers) and use **AskQuestion**:
     - Proceed anyway — Not recommended  
     - Stop — Re-run breakdown to fix issues first  

   If the user declines “proceed anyway”, exit and ask them to fix breakdown.

   If the parent is decomposed and the user should not implement the parent, **list sub-issues** (id, title, state), list blocking pairs, identify the **first unblocked** issue, and use **AskQuestion** to ask **“Which sub-issue would you like to implement?”** with one option per **unblocked** sub-issue (`#n: Title`). Continue with the **chosen** issue only.

4. **If score ≥ 8.5:** proceed.
5. **If no assessment found:** **WARN** and proceed (legacy issues).

## Step 4 — CRITICAL: Implementation plan present

1. Label **`Has Plan`** on the issue **or**
2. **Fallback:** most recent issue **comment** whose body starts with **`# Implementation Plan for`**

**If no plan found:** **STOP** with:

```
Cannot implement [ISSUE-ID] - no implementation plan found

You must create a plan before implementing:
1. Run /create_plan [ISSUE-ID]
2. Review the plan to ensure phases are clear
3. Re-run /implement_plan [ISSUE-ID]

Never implement without a plan.
```

**If plan found:** treat that comment’s body (or the user-provided plan path) as the **authoritative plan text**.

## Step 5 — Duplicate / overlap check

There is **no** `duplicate-checker` agent in this repo. Instead:

- `gh pr list --state open --limit 50 --json number,title,url`
- For suspicious PRs, `gh pr view <n> --json files,title` and compare paths to files named in the plan.

If **significant overlap** exists, **surface** it and use **AskQuestion** before coding.

## Step 6 — Read code and track work

- Read **every extension file** the plan names (**full files**, no `limit`/`offset` on Read).
- Read `CLAUDE.md` / `AGENTS.md` when present for SketchUp extension conventions.
- Use **TodoWrite** for multi-phase execution.

## Implementation philosophy

- Follow the plan’s **intent**; adapt if the repo has evolved—explain mismatches clearly.
- **TDD is mandatory per phase** (see below).
- Finish each phase before the next.
- Update **checkboxes** in the plan (issue comment or file) as you complete sections **when the user asked to maintain the plan artifact**; otherwise summarize progress in chat.
- Run **`bundle exec rspec`** as specified in Verification.

## Phase execution: RED → GREEN → REFACTOR

**Do not** write production implementation before tests for that phase exist and **fail for the right reason**.

### 1. RED — failing tests

- From the phase: **Required tests** — write **all** specified tests first (RSpec; TestUp when the phase hits real SketchUp APIs).
- Run targeted specs: `bundle exec rspec spec/path/to/new_spec.rb` — failures must be “missing behavior”, not syntax/setup errors.

### 2. GREEN — minimal code

- Implement the smallest change that satisfies the phase and tests.

### 3. REFACTOR

- Clean up; re-run phase tests and **`bundle exec rspec`** for regressions.
- `ruby -c` on touched Ruby files when useful.

### TestUp (SketchUp integration)

When the phase uses **real SketchUp APIs** (HtmlDialog lifecycle, `start_operation` / `commit_operation`, menus/toolbars, extension load/reload), a **TestUp** test is **required** if the plan says so; if the plan omits it but the phase clearly touches those APIs, **add one** and note the plan gap.

**May skip TestUp** for pure logic (RSpec + stubs), HTML/CSS/JS-only changes (manual SketchUp check), or internals with no host API.

**RSpec:** use `spec/support/sketchup_stubs.rb` when present; test private methods via `described_class.send(:method_name, ...)` when appropriate.

### Mismatch protocol

If a phase cannot be followed:

```
Issue in Phase [N]:
Expected: [what the plan says]
Found: [actual situation]
Why this matters: [explanation]

How should I proceed?
```

## Verification

- After RED: confirm “good” failures.
- After GREEN/REFACTOR: phase specs + full `bundle exec rspec` where applicable; manual steps from the plan in SketchUp when UI is touched.

## If stuck

Read surrounding code, compare to `CLAUDE.md`, check panel/auth patterns. Use **Task** `explore` sparingly for broad discovery.

## Resuming

If the plan artifact already has checkmarks, trust completed work unless something fails; pick up at the first unchecked item.

## Context tip

When switching features afterward, start a fresh session or `/clear` so this plan does not bleed into unrelated work.
