# GitHub Issues — conventions for yoochog agents

**Skills:** resolve `github-cli` (and any other named skill) from `.cursor/skills/<name>/SKILL.md` first, then `.claude/skills/<name>/SKILL.md`. All `SKILL.md` files under either tree are valid for agents.

**Commands:** workflow slash-commands and related docs may live under `.cursor/commands/` (Cursor) or `.claude/commands/` (Claude); use whichever path exists for the tool you are in.

Use with **`gh`** per the resolved `github-cli/SKILL.md` path above.

## Creating issues (e.g. after `/refine_spec` or `/create_spec`)

- **State**: New issues are **open** unless the user asks otherwise.
- **Title**: Clear, action-oriented; confirm with the user if the first suggestion might be wrong.
- **Body**: Paste the full refined spec markdown via `--body-file`.
- **Labels**: Only if the user names them or the repo documents defaults. Use `gh label list` to avoid typos.
- **Assignees**: Only when the user asks; `gh issue create --assignee @me` if they want self-assignment.

## Updating an existing issue with a refined spec

- **Replace description**: `gh issue edit <n> --body-file <path>` (overwrites body).
- **Preserve description**: `gh issue comment <n> --body-file <path>` with the spec (and a short header like `## Refined specification`).

Always confirm which mode the user chose before running `gh`.

## Linking in PRs

- Same-repo issue: `gh pr create --issue <n> ...` or put `Fixes #<n>` / `Refs #<n>` in the PR body.

## URLs

- Issue web URL: `gh issue view <n> --json url -q .url` or `https://github.com/<owner>/<repo>/issues/<n>` from `gh repo view --json url -q .url` + number.
