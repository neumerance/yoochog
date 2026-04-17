---
name: create-plan
description: Interactive implementation planning with codebase research, optional GitHub issue posting, and phased test-first specs. Use when the user asks for an implementation plan, /create_plan, or detailed technical specs before coding.
---

# Create plan (Cursor, yoochog)

## Dependencies (read first)

1. **Always** read [github-cli](../github-cli/SKILL.md) before any `gh issue` step (fetch, comment, labels).
2. **Always** read [environment-checks](../environment-checks/SKILL.md) before deep codebase analysis for a plan (unless user explicitly waives).

## Invoking

- **With GitHub issue number** (e.g. `42` or `#42` or issue URL): skip the default prompt; `gh issue view` for full context; run environment checks; then research.
- **Without issue id**: ask for GitHub issue number / URL or a full written scope, constraints, and doc links; wait for input.

Default prompt when no ID:

```text
I'll help you create a detailed implementation plan.

Please provide:
1. GitHub issue number (e.g. 42), issue URL, or a full written description of the work
2. Constraints, acceptance criteria, or non-goals
3. Links to docs (Notion, PRDs, prior plans)

Tip: invoke with an issue directly, e.g. "create plan for #42".
```

## Step 0 — Environment

- Run checks from `environment-checks` skill.
- Default: default integration branch, clean tree, not behind `origin/<default>`.

## Step 1 — Context

Read **fully** (no partial skim) anything the user names: issues, docs, OpenAPI, prior plans.

### Project conventions (this repo)

- **Primary**: if present, read `CLAUDE.md` then `AGENTS.md` then `README.md` (in that order) for architecture and conventions.
- **Backend API**: if the plan touches HTTP APIs and a sibling checkout exists, read `../programa/docs/openapi.json` (or ask once for the correct path). Cite `operationId`, paths, scopes, and error shapes from the spec.
- If none of these exist yet, state that explicitly in the plan and derive conventions from existing code only.

### Research (Cursor)

- Prefer **parallel** exploration: use the **Task** tool with `subagent_type: explore` (or run ripgrep/read yourself) to locate files and trace behavior.
- Map legacy names from other stacks to Cursor: “codebase-locator” / “codebase-analyzer” → focused explore tasks with explicit directories and deliverables (file:line references, data flow).
- **Do not** delegate reading of user-provided issues/docs to subagents only—pull that content into the main thread yourself.

## Step 2 — Discovery loop

- If the user corrects you, **verify in repo** before accepting.
- Use `TodoWrite` for multi-step exploration.
- Present **current state**, **options**, and **real open questions**; use `AskQuestion` when options are mutually exclusive and judgment is needed.

## Step 3 — Plan structure

Propose phases (overview only); get buy-in on order and granularity before writing the long plan.

## Step 4 — Detailed plan

Use the template in [reference-template.md](reference-template.md). Every phase must include **Required tests** (what, which layer, where tests live).

Replace placeholders:

- Stack-specific paths must match **this** repository after inspection.
- “What we're NOT doing” is mandatory.

## Step 5 — GitHub delivery

When a GitHub issue number is in scope and `gh` works:

1. Post the **full** plan as a **comment** on that issue: `gh issue comment <n> --body-file <path>` (see `github-cli`).
2. Optionally add a label (e.g. `Has Plan`) with `gh issue edit <n> --add-label "Has Plan"` if your team uses it—**add** labels, do not strip existing ones without user consent.
3. Confirm issue URL (`gh issue view <n> --json url -q .url`) and ask for review (phases, success criteria, edge cases).

If `gh` is unavailable: **halt** GitHub-specific steps; deliver the plan in chat and ask whether to save to a repo doc path the user chooses.

## Quality bar

- Skeptical: flag vague requirements and risky assumptions.
- Specific: file paths and line anchors from real reads.
- Testable: automated vs manual verification separated.
- No unresolved questions in the **final** plan: resolve or ask first.

## yoochog note

This repository may be minimal early on. If there is little code, the plan should focus on scaffolding, first vertical slice, and criteria for introducing `CLAUDE.md` / OpenAPI / tests as they appear.

After a plan is reviewed and labeled (e.g. `Has Plan`), execution is driven by **`/implement_plan`** — see `.cursor/commands/implement_plan.md` or `.claude/commands/implement_plan.md` and the **`implement-plan`** / **`github-issue-integration`** skills.
