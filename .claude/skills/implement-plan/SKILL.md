---
name: implement-plan
description: "Execute an approved GitHub-issue implementation plan with TDD, SketchUp extension conventions, and pre-flight complexity/plan checks. Use for /implement_plan or when the user says implement plan for issue N."
user-invocable: false
---

# Implement plan (yoochog)

## Read first (order matters)

1. [github-issue-integration](../github-issue-integration/SKILL.md) — `gh` preflight, issue + comments, labels, plan/complexity/decomposition discovery.
2. [github-cli](../github-cli/SKILL.md) — issue URLs, JSON, commenting, label edits.
3. [environment-checks](../environment-checks/SKILL.md) — use the **implement_plan** variant (feature branch; dirty tree allowed; warn if behind default branch).

Project conventions: read `CLAUDE.md`, `AGENTS.md`, `README.md` when present (in that order).

## Command entry points

- **Cursor**: `.cursor/commands/implement_plan.md`
- **Claude**: `.claude/commands/implement_plan.md`

The slash-command files contain the **full** phase rules (RED/GREEN/REFACTOR, TestUp vs RSpec, verification, stuck protocol). This skill is the **dependency list + pointer** so agents load the right context.

## Duplicate / overlap check (no separate agent)

Before large edits, from repo root:

```bash
gh pr list --state open --limit 50 --json number,title,files
```

If `gh pr list` does not include file lists in your `gh` version, run per-PR:

```bash
gh pr view <n> --json files -q '.files[].path'
```

Cross-check paths from the plan’s “Changes required” / mentioned files. If an open PR heavily overlaps, **surface it** and use **AskQuestion** before implementing.

## GitHub vs Linear (mental model)

| Linear concept | GitHub equivalent |
|----------------|-------------------|
| `get_issue` | `gh issue view <n> --json ...` |
| `list_comments` | `comments` on view JSON or `gh api repos/.../issues/<n>/comments` |
| `list_issues` parent filter | Parse decomposition comment for `#<n>` children; optional label/search conventions |
| Issue relations | Heuristic: “Blocked by #n” / “Blocks #n” in bodies; verify with `gh issue view` |

When in doubt, **fetch the full thread** and cite comment timestamps in the user-facing summary.
