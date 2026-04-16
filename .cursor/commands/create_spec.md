# create_spec — Open a new GitHub issue from a concept (Cursor)

You are helping someone turn an idea into a **new GitHub issue** (a spec ticket). Focus on **what** they want, not **how** to build it. Avoid jargon unless the user is technical.

**This command is for creating a new issue only.** If the goal is to refine or update an **existing** issue, point them to `/refine_spec` instead.

## Before anything else — skills and commands (Cursor + Claude)

**Skill roots** (under the repo): `.cursor/skills/<name>/SKILL.md` and `.claude/skills/<name>/SKILL.md`.

**Command / convention roots**: `.cursor/commands/*.md` and `.claude/commands/*.md` (check **both** when looking for workflow or conventions).

**Resolution for a named skill** `<name>`: read with the Read tool in order until a file exists: `.cursor/skills/<name>/SKILL.md` → `.claude/skills/<name>/SKILL.md`.

**Everything in either skill tree is allowed** when it helps the task—not only the list below.

### Required skills (read all; do not skip)

1. `github-cli/SKILL.md`
2. `environment-checks/SKILL.md`
3. `complexity-scoring/SKILL.md`

If a **required** skill is missing from **both** roots, **stop** and tell the user:

`Required skill [name] could not be loaded. Verify .cursor/skills/[name]/SKILL.md or .claude/skills/[name]/SKILL.md exists in the repository.`

## Parameters

The user’s message after `/create_spec` is **`$ARGUMENT`**:

- If `$ARGUMENT` is **only** a GitHub issue number (`^\d+$` or `^#\d+$`) or a **same-repo** issue URL → **AskQuestion**: this command creates a **new** ticket. Options: continue with a **follow-up** issue that references that number in the body, or **cancel** and use `/refine_spec <n>` to work on the existing issue.
- Otherwise → treat as **initial concept text** (may be empty—then ask what to spec).

## Step 0 — Environment (from `environment-checks` skill)

Run the checks in `environment-checks/SKILL.md` from the **repo root** (skill resolution above).

**Target state for `create_spec`:** same as `refine_spec`: on the repo’s **default integration branch**, **clean** working tree, **not behind** `origin/<that branch>` when the remote exists. Use **AskQuestion** where the skill says so; substitute **`create_spec`** for command name in stash messages and success banners.

If checks fail, **halt** until the user fixes or explicitly chooses an override path defined in the skill.

## Step 1 — GitHub (`gh`) and opening

Follow **Preconditions** and **GitHub Issues — patterns** in `github-cli`. Verify `gh auth status` before creating an issue.

- With concept text: open with: `I'll help you turn this into a GitHub issue: '[SUMMARY]'. I'll ask a few questions, then we'll create the ticket.`
- With empty argument: ask in plain language what feature or change the issue should describe.

If `gh` is missing or unauthenticated, **stop** after you would have created the issue; finish the spec in chat and offer to save markdown to a path the user chooses.

### Optional Programa OpenAPI (for you only)

If the feature involves **data the product already has**, read when present:

`../programa/docs/openapi.json`

Use it **silently** to ask realistic questions; **do not** quote JSON or field names to the user unless they ask.

## Step 2 — Conversation

Create a **TodoWrite** list:

- [ ] Understand scope and intent  
- [ ] Clarify user experience  
- [ ] Define data requirements  
- [ ] Identify constraints  
- [ ] Draft spec for the issue body  
- [ ] Review with user  
- [ ] Create GitHub issue  

Update todos as you go.

### Question rules

Reuse the same rules as `/refine_spec`:

- Work **category by category**: **A Scope → B UX → C Data → D Constraints**.  
- **Do not** dump every question at once.  
- Use **AskQuestion** (Cursor) for discrete choices; batch up to **4** when readable.  
- After every **3–4** substantive answers, **summarize** back.  
- If scope explodes, **AskQuestion** to pick **one** focus first.

(Category prompts: same as in `refine_spec` — scope, UX, data, constraints.)

## Step 3 — Draft + MVP analysis

When requirements are clear:

1. Classify each requirement as **Core / Important / Nice-to-have**.  
2. Score with **complexity-scoring** → 🟢 (≥8.5), 🟡 (6.0–8.4), 🔴 (<6.0).  
3. List **complexity drivers**.

**AskQuestion**: “Does this categorization make sense?” (same options as `refine_spec`: proceed, move items, reduce scope, add requirements.)

After confirmation, write the issue body using the **markdown template** from `refine_spec` (Problem, Proposed solution, Detailed requirements, MVP analysis with emojis, Out of scope, Success criteria, Additional context, References — use full GitHub issue URLs when linking).

## Step 4 — Review

Show the draft, then **AskQuestion**: “Does this spec accurately capture what you want in the new issue?”

- Looks good — proceed to create the GitHub issue  
- Needs changes  
- Missing edge cases  
- Needs more detail  

Iterate until “Looks good.”

## Step 5 — Create the GitHub issue

Per `.claude/commands/github-issues.md`:

1. Propose a **title** (clear, action-oriented). Confirm or adjust with the user.  
2. Write the final markdown to a **temp file**; run:

   `gh issue create --title "..." --body-file <path>`

   Add `--label` only if the user names labels (validate with `gh label list`).

3. Paste the **issue URL** from `gh` output or `gh issue view <n> --json url -q .url`.

## Step 6 — Closing message

End with:

`✅ Done! I've created the GitHub issue with the spec.`

**GitHub Issue:** `[Title](URL)`

Short **next steps** line, then offer further help once.

## Cursor-specific notes

- **Todos:** `TodoWrite`  
- **Structured choices:** `AskQuestion`  
- **GitHub:** shell `gh` after reading `github-cli` skill  
- **Conventions:** under `.claude/commands/` and/or `.cursor/commands/` (see roots above)  

## References

- Issue conventions: `.claude/commands/github-issues.md` (and any related doc under `.cursor/commands/` if present)  
- Updating an existing issue instead: `/refine_spec`  
- Skills: any `SKILL.md` under `.cursor/skills/*/` or `.claude/skills/*/`  
- Commands: `.cursor/commands/*.md` and `.claude/commands/*.md`  
