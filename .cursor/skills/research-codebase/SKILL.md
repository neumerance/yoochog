---
name: research-codebase
description: "Plans and executes read-only codebase research: decomposes questions, runs parallel Task subagents for discovery and analysis, gathers git/GitHub metadata, and writes a dated markdown report under docs/research/. Use for /research_codebase, \"research the codebase\", architecture tours, tracing how a feature works, or mapping callers before a refactor."
---

# Research codebase (yoochog + Cursor)

## Relationship to other skills

- **Deep research (GitHub issue)**: `.cursor/skills/deep-research/SKILL.md` — ticket-driven feasibility and external docs. Use **this** skill when the primary source of truth should be **this repository** and local behavior, not an issue thread.
- **GitHub metadata / permalinks**: Before any `gh` usage, read `.cursor/skills/github-cli/SKILL.md` from the repo root.

## When invoked (first message)

If the user has **not** yet given a concrete research question, reply:

```text
I'm ready to research the codebase. Please provide your research question or area of interest, and I'll analyze it thoroughly by exploring relevant components and connections.
```

Then wait. If they already included the question in the same message, **skip** this boilerplate and start at step 1.

## Step 1 — Read user-mentioned sources first (main agent)

**Do this in the main conversation before spawning Task subagents.**

- If the user names **specific files**, read them **fully** with the Read tool (no `limit` / `offset`).
- If they name a **Sentry issue** and a Sentry MCP is configured, use it; otherwise WebFetch the Sentry URL.
- If they give a **GitHub issue/PR URL or number**, use `gh` per github-cli (or Read if they pointed at a local export).

Goal: anchor decomposition in the user’s exact scope.

## Step 2 — Decompose and plan

- Split the question into **independent** research tracks (e.g. “where is X defined”, “who calls X”, “how is X configured”, “tests for X”).
- Use **TodoWrite** to track each track and synthesis steps.
- Prefer **parallel** work across tracks (separate Task invocations in one assistant turn when possible).

## Step 3 — Parallel Task subagents (read-only)

Use the **Task** tool with `subagent_type: explore` for fast repo-wide location, and `generalPurpose` when a track needs deeper multi-file reasoning. Guidelines:

- **One clear objective per agent** (what to find or explain), not step-by-step search instructions.
- Ask for **file paths, symbols, and call sites** with enough context to cite **line numbers** in the final doc.
- Encourage **usage examples**, not only definitions.

**Wait until every Task completes** before moving to synthesis.

## Step 4 — Gather metadata (shell, repo root)

Run and record (handle failures gracefully — document `n/a` with reason):

```bash
git rev-parse HEAD 2>/dev/null || echo "not a git repository"
git branch --show-current 2>/dev/null || echo "n/a"
date -Iseconds
```

Repository name:

```bash
gh repo view --json owner,name -q '"\(.owner.login)/\(.name)"' 2>/dev/null \
  || git remote get-url origin 2>/dev/null \
  || echo "unknown"
```

**Researcher** field in the doc: use `Cursor Agent` unless the user asks for a different name.

## Step 5 — GitHub permalinks (optional)

If `git` works and the commit is meaningful:

- If `gh` works, resolve `owner` and `name` as in github-cli.
- Prefer permalinks when the commit is **likely reachable on GitHub** (e.g. on `main` / default branch, or user confirms push). Format:

  `https://github.com/<owner>/<repo>/blob/<git_commit>/<path>#L<line>`

Use **local** `` `path:line` `` references when the repo is not linked to GitHub or the commit is not pushed.

## Step 6 — Write the research document

- **Directory**: `docs/research/` (create it if missing).
- **Filename**: `YYYY-MM-DD-<short-slug>.md` (slug from the topic; lowercase, hyphens).
- **Content**: Follow [reference-template.md](reference-template.md). **Never** ship placeholder frontmatter values — every field must reflect commands you actually ran.
- **Evidence**: Prefer line-level citations; connect components across findings.

## Step 7 — Present to the user

Give a **short** summary in chat, list **key paths** (and permalinks if used), and invite follow-ups.

## Step 8 — Follow-ups

For additional questions on the **same** topic:

1. Reuse the same file under `docs/research/` when appropriate.
2. Update frontmatter: `last_updated`, `last_updated_by`, `last_updated_note` (see template).
3. Append `## Follow-up Research [<ISO timestamp>]` with new findings.
4. Spawn new Task agents if more exploration is needed; merge into the same doc.

## Quality bar

- **Live repo first**; do not rely on stale notes elsewhere unless labeled as historical.
- Cite **paths and lines** the next engineer can open immediately.
- Keep the **main agent** focused on coordination and synthesis; heavy reading lives in subagents **after** user-mentioned files are read in the main context.
