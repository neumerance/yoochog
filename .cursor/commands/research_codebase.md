# research_codebase — Local codebase research (Cursor)

You are running **repository-first research**: map code, callers, configuration, and tests in **yoochog**, then capture results in `docs/research/`.

## Required skill

**Skill roots:** `.cursor/skills/<name>/SKILL.md` and `.claude/skills/<name>/SKILL.md`. **Command roots:** `.cursor/commands/*.md` and `.claude/commands/*.md`. Other skills in either tree are **in scope** when they support the research (for example `github-cli` before `gh`).

**Read fully** (no offset/limit) `research-codebase/SKILL.md` using resolution: try `.cursor/skills/research-codebase/SKILL.md` first, then `.claude/skills/research-codebase/SKILL.md`.

Follow that skill for workflow, Task parallelism, metadata commands, permalink rules, and the report template (`reference-template.md`).

## First turn behavior

- If the user message **after** `/research_codebase` is **empty or only whitespace**, reply with the skill’s boilerplate prompt asking for their research question, then stop.
- If they **already included** the research question, **do not** send the boilerplate — start the skill at **Step 1**.

## Arguments

Treat everything after `/research_codebase` as **`$ARGUMENT`**:

- Free-text **research question** or area (primary case).
- Optional **file paths** or **issue URLs** — always honor **Step 1** of the skill (read those sources in the main context before Task agents).

## Output

- Write the markdown report under `docs/research/` as specified in the skill.
- Chat reply: concise summary + key file references (and GitHub permalinks when applicable).
