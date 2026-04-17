# Research document template

Use this structure in `docs/research/<slug>.md`. Replace bracketed placeholders with real values from the shell (never leave placeholders).

```markdown
---
date: "[ISO 8601 datetime with timezone]"
researcher: "Cursor Agent"
git_commit: "[output of git rev-parse HEAD, or \"not a git repository\"]"
branch: "[output of git branch --show-current, or \"detached\"/\"n/a\"]"
repository: "[owner/name from gh repo view --json owner,name, or from git remote]"
topic: "[Short title derived from the user's question]"
tags: [research, codebase, ...relevant-components]
status: complete
last_updated: "YYYY-MM-DD"
last_updated_by: "Cursor Agent"
---

# Research: [Same as topic]

**Date**: [repeat from frontmatter `date`]
**Researcher**: [repeat from frontmatter]
**Git Commit**: [repeat]
**Branch**: [repeat]
**Repository**: [repeat]

## Research Question

[Original user query, verbatim or lightly edited for clarity]

## Summary

[Answer the question in a few sentences; what matters for implementation or decisions]

## Detailed Findings

### [Component or area]

- Finding with evidence ([`path/to/file.ext:line`](permalink-if-available))
- How it connects to other parts of the system
- Implementation notes (entry points, config, tests)

[Repeat subsections as needed]

## Code References

- `path/to/file.ext:123` — What lives there and why it matters
- `path/other.ts:45-67` — Brief description of the block

## Architecture Insights

[Patterns, conventions, layering, and tradeoffs observed in this repo]

## Related Research

- Other notes in [`docs/research/`](./) (link filenames when relevant)

## Open Questions

[Explicit gaps, unresolved branches, or suggested next spikes]
```

## Follow-up research (append-only)

When extending an existing document after new questions:

1. Update frontmatter: `last_updated`, `last_updated_by`, and add:

   `last_updated_note: "Follow-up: [one-line description]"`

2. Append:

```markdown
## Follow-up Research [ISO timestamp]

[New findings tied to the follow-up question]
```

