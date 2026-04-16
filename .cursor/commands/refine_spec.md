# refine_spec — Turn ideas into implementable specs (Cursor)

You are helping a **non-technical** person refine a concept into a clear specification. Focus on **what** they want, not **how** to build it. Avoid jargon (no controllers, models, migrations, endpoints—use plain language).

When the starting point is a **GitHub issue**, treat the issue **description plus the full comment thread** as the **authoritative draft spec** to refine—not a side note.

## Before anything else — skills and commands (Cursor + Claude)

**Skill roots** (under the repo): `.cursor/skills/<name>/SKILL.md` and `.claude/skills/<name>/SKILL.md`.

**Command / convention roots**: `.cursor/commands/*.md` and `.claude/commands/*.md` (check **both** when looking for workflow or conventions; some files exist only under one tree, e.g. `github-issues.md` under `.claude/commands/`).

**Resolution for a named skill** `<name>`: read with the Read tool in order until a file exists: `.cursor/skills/<name>/SKILL.md` → `.claude/skills/<name>/SKILL.md`.

**Everything in either skill tree is allowed** when it helps the task—not only the list below. Load any other `SKILL.md` under those directories when relevant (for example `create-plan`, `commit-changes`, `create-pull-request`).

### Required skills (read all; do not skip)

1. `github-cli/SKILL.md`
2. `environment-checks/SKILL.md`
3. `complexity-scoring/SKILL.md`
4. `deep-research/SKILL.md` — external docs, feasibility, and ticket-driven research **patterns** (you will use a **subset** during refinement; see below).
5. `research-codebase/SKILL.md` — repo structure, callers, and evidence-backed alignment.

If a **required** skill is missing from **both** roots, **stop** and tell the user:

`Required skill [name] could not be loaded. Verify .cursor/skills/[name]/SKILL.md or .claude/skills/[name]/SKILL.md exists in the repository.`

## Parameters

The user’s message after `/refine_spec` is **`$ARGUMENT`**:

- If `$ARGUMENT` is **only** a GitHub issue number: `^\d+$` or `^#\d+$` → **refine that issue** in the current repo (strip `#`). **Load the spec from GitHub** (body + all comments per `github-cli`).
- If it **contains** a GitHub issue URL for this repo (`.../issues/<n>`) → extract `<n>` and **refine that issue** the same way.
- If it **starts with** digits/`#` but includes other words (e.g. `42 needs more detail`) → extract the number and **AskQuestion**: refine issue **42** vs treat whole string as a **concept title**.
- Otherwise → **free-text concept** for a **new** issue flow (no issue body yet; you still **may** use codebase/deep-research patterns if the text names integrations, files, or products). For a **create-only** new-issue flow, `/create_spec` is the dedicated command.

If ambiguous, use **AskQuestion**: “What should we do?”

- Refine existing GitHub issue — update that issue’s spec in GitHub  
- Create new issue — open a new GitHub issue (optionally reference the old number in the body)

## Step 0 — Environment (from `environment-checks` skill)

Run the checks in `environment-checks/SKILL.md` from the **repo root** (skill resolution above).

**Target state for `refine_spec`:** on the repo’s **default integration branch** (usually `main` or `master`), **clean** working tree, **not behind** `origin/<that branch>` when the remote exists.

If checks fail, **halt** until the user fixes or explicitly chooses an override path defined in the skill.

## Step 1 — Load the spec (GitHub is the source when refining an issue)

### GitHub Issues (`gh`)

Follow **Preconditions** and **GitHub Issues — patterns** in `github-cli`. Verify `gh auth status` works before fetching or writing issues.

**Existing issue (spec from GitHub):**

- Run `gh issue view <n> --json number,title,body,url,state,labels,author,comments` and, if needed, `gh api repos/<owner>/<repo>/issues/<n>/comments` so you have the **full thread**.
- **Compose the working spec** = issue body + meaningful comments (ignore pure +1/emoji-only noise).
- Open with: `I've read your GitHub issue [TITLE] (#<n>), including the discussion. I'll align the spec with what's already written and ask focused questions where it's unclear.`

**Free-text concept (no issue yet):**

- Open with: `I'll help you refine this concept: '[CONCEPT]'. Let me ask some questions to create a clear specification.`

If `gh` is missing or unauthenticated, **stop** after the GitHub handoff steps would run; finish the spec in chat and offer to save to a file path the user chooses.

### Step 1b — Research enrichment (issue-driven refinement)

**When** Step 1 loaded an **existing issue**, run this pass **before** Step 2 (conversation). Goal: sharper questions and a spec grounded in **this repo** and **facts**, without dumping jargon on a non-technical user.

1. **Extract** from the issue + comments:
   - Stated requirements (bullets).
   - **Research questions**: integrations, APIs, versions, security, performance, “how does this relate to X in the app?”

2. **`research-codebase` skill**  
   - Decompose into **independent** tracks (where feature X lives, callers, config, tests). Use **TodoWrite** for tracks; use **Task** (`subagent_type: explore` or `generalPurpose`) in parallel per the skill.  
   - Prefer **line-level paths** in your own notes for Step 3.  
   - If discovery is **non-trivial** (many files, ambiguous ownership, or the team will reuse it), write `docs/research/YYYY-MM-DD-issue-<n>-<slug>.md` per that skill’s Step 6 **template**; otherwise a short structured summary in-chat is enough.

3. **`deep-research` skill (patterns only)**  
   - For each **external** or feasibility question (libraries, vendor APIs, platform limits), follow that skill’s **Step 2** order: documentation tools if available → **WebFetch** / **WebSearch** → cross-check against **this repo** (versions in lockfiles, existing usage).  
   - **Do not** auto-post a full “Deep Research Report” comment unless the user later opts in (see Step 5). **Do** fold verified facts into clarifying questions and into the final spec’s **Additional context** / **References** in plain language.

4. **If** the issue is **purely** product/UX with no technical anchors, keep this pass **light**: still skim for related feature names in the codebase when the title/body name a screen or flow (quick **Task** `explore` or **Grep**), then proceed.

**Free-text concept:** apply Step 1b **only when** the user names integrations, files, repos, or “how we already do Y”—same tools, smaller scope.

### Optional Programa OpenAPI (for you only)

If the feature involves **data the product already has** (lists, filters, accounts, projects, etc.), read when present:

`../programa/docs/openapi.json`

(path is **sibling** `programa` checkout next to this repo). Use it **silently** to ask realistic questions; **do not** quote JSON or field names to the user unless they are technical and ask.

If the file is missing, continue without it; only ask where Programa lives if you truly cannot scope a data question otherwise.

## Step 2 — Conversation

Create a **TodoWrite** list (adapt checkboxes to the flow):

- [ ] Spec loaded (GitHub body + comments **or** user concept)  
- [ ] Codebase alignment (`research-codebase` where applicable)  
- [ ] External / feasibility notes (`deep-research` patterns where applicable)  
- [ ] Understand scope and intent  
- [ ] Clarify user experience  
- [ ] Define data requirements  
- [ ] Identify constraints  
- [ ] Draft refined spec  
- [ ] Review with user  
- [ ] Create/update GitHub issue  

Update todos as you go.

### Question rules

- Work **category by category**: **A Scope → B UX → C Data → D Constraints**. Do not jump ahead until the current category is clear enough.  
- **Do not** dump every question at once.  
- Where there are **two or more plausible answers**, use **AskQuestion** (Cursor). The original Claude command text may say `AskUserQuestion`—in Cursor that means **AskQuestion**.  
- Batch up to **4** related AskQuestion prompts in one call when it stays readable.  
- Truly open-ended “tell me a story” prompts may stay plain chat.  
- After every **3–4** substantive answers, **summarize** back: “So if I understand correctly…”  
- If scope explodes, pause and **AskQuestion** to pick **one** focus first (dynamic options).  
- If complexity is high (money, permissions, real-time, huge data), **AskQuestion**: simplify / tag engineer / hand off.  
- Use **Step 1b findings** to ask **specific** questions (e.g. “The app already does X here—should this new piece extend that or stay separate?”) without exposing low-level symbol names unless the user is technical.

### Category prompts (non-exhaustive)

**A — Scope & intent:** problem, who feels it, success, explicit out-of-scope.  
**B — User experience:** where on screen, what triggers it, what they see, what if it fails.  
**C — Data & content:** what information, existing vs new, links to other areas, empty states, logged out, no permission.  
**D — Constraints:** similar patterns, performance worries, immediacy vs “can wait”, who may access.

## Step 3 — Draft + MVP analysis

When requirements are clear:

1. Classify each as **Core / Important / Nice-to-have** using the strict tests from the original refine_spec guidance.  
2. Score each with **complexity-scoring** → 🟢 (≥8.5), 🟡 (6.0–8.4), 🔴 (<6.0).  
3. List **complexity drivers** (real-time, new rich editor, risky areas, many rules, etc.).  
4. Where Step 1b produced **stable** facts (repo locations, doc links, version constraints), add a concise **Additional context** or **References** subsection—still in plain language for non-technical readers, with GitHub permalinks only when useful.

Present the categorization, then **AskQuestion**: “Does this categorization make sense?”

- Looks good — proceed to write the spec  
- Move items between categories  
- Reduce scope  
- Add missing requirements  

After confirmation, write the spec using the **markdown template** (Problem, Proposed solution, Detailed requirements, MVP analysis with emojis, Out of scope, Success criteria, Additional context, References — with **GitHub issue** links instead of Linear).

## Step 4 — Review

Show the draft, then **AskQuestion**: “Does this spec accurately capture what you want?”

- Looks good — proceed to GitHub  
- Needs changes  
- Missing edge cases  
- Needs more detail  

Iterate until “Looks good.”

## Step 5 — GitHub handoff

**Existing issue:** **AskQuestion**: “How should I update the GitHub issue?”

- Replace the description — `gh issue edit <n> --body-file ...` (overwrites body)  
- Add a comment — `gh issue comment <n> --body-file ...` (keeps original description)  

Run shell commands per `github-cli` after the user chooses. Use a temp file for the markdown body.

**Optional (separate AskQuestion):** after the spec is saved, whether to **add a second comment** with a short **Research / codebase alignment** appendix (or a link to `docs/research/...` if you created one). That is the lightweight equivalent of posting a full `deep-research` report—reserve full report + `Researched` label flow for explicit `/deep-research` or clear user consent.

**New concept:** suggest a title; wait for confirmation; run `gh issue create --title "..." --body-file ...` per `.claude/commands/github-issues.md`.

Paste the **issue URL** (`gh issue view <n> --json url -q .url` or from `gh issue create` output).

## Step 6 — Closing message

End with:

`✅ Done! I've [updated/created] the GitHub issue with the refined spec.`

**GitHub Issue:** `[Title](URL)`

Short **next steps** line, then offer further help once.

Print the **context management tip** from `environment-checks` (Section 5) even when exiting early.

## Cursor-specific notes

- **Todos:** `TodoWrite`  
- **Structured choices:** `AskQuestion` (not `AskUserQuestion`)  
- **GitHub:** shell `gh` after reading `github-cli` skill  
- **Conventions:** under `.claude/commands/` and/or `.cursor/commands/` (see roots above)  

## References

- Issue conventions: `.claude/commands/github-issues.md` (and any related doc under `.cursor/commands/` if present)  
- Skills: any `SKILL.md` under `.cursor/skills/*/` or `.claude/skills/*/`  
- Commands: `.cursor/commands/*.md` and `.claude/commands/*.md`  
