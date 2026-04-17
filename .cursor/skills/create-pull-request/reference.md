# PR body template (yoochog)

Use this structure when `.github/pull_request_template.md` is **missing**. If that file exists, read it and fill every section the template defines instead of this default.

## Title

- Prefer: concise summary; include GitHub issue reference in title or body when known (e.g. `Fixes #42`).
- `gh pr create --title` when not using file body only.

## Body sections

```markdown
## The Why

[Context: problem, motivation, link to GitHub issue if applicable]

## How it Works

[Technical summary: key files, behavior, architecture notes]

## Risks and Compromises

**Risk level:** Low | Medium | High

[Why this level: touched surface area — UI/docs vs auth/core]

## Testing Strategy

- [ ] Steps a reviewer can run locally
- [ ] Automated tests if applicable

## Checklist

- [ ] Tested locally (describe what)
- [ ] Docs updated if user-facing behavior changed
- [ ] No secrets or credentials in diff

<details>
<summary>Summary of conversation with Claude</summary>

**User:** [verbatim user messages — commands or plain language]
**Claude:** [brief: what was run, decided, or implemented]

</details>
```

## Change-type hints (auto-detect from diff)

Mention in **How it Works** or a short preamble when relevant:

- **Frontend**: `*.css`, `*.scss`, components, views, client JS/TS
- **Backend**: APIs, server routes, services
- **Database**: migrations, schema, queries
- **Docs**: `*.md`, comments-only in docs paths

## Extension / desktop (when repo contains such code)

If the tree includes SketchUp extension patterns, call out:

- **HtmlDialog** / embedded HTML-JS bridges
- **Model** read/write or observer usage
- **Timers** (`UI.start_timer` / similar) and lifecycle

Omit this block when the repository has no extension code.
