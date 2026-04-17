---
name: complexity-scoring
description: "5-axis complexity scoring for tasks and requirements. Use during refine_spec MVP analysis for green/yellow/red labels."
user-invocable: false
---

# Complexity scoring rubric

Use this when `/refine_spec` asks you to score each requirement (🟢 🟡 🔴).

## Clarifying questions impact

Count clarifying questions asked during refinement:

- **0–1**: no adjustment  
- **2–3**: −2 Confidence (max 8 after adjustment)  
- **4–5**: −4 Confidence, cap Confidence at 4  
- **6+**: −6 Confidence, cap Confidence at 3 → strong “not suitable” signal  

## Five axes (1–10, higher = easier / safer)

### 1. Confidence

Path clarity and requirement sharpness (see programa-style definitions in your head: crystal clear → unknown).

### 2. Simplicity

LOC, files touched, new patterns, modals, JS, migrations.

### 3. Safety

Blast radius: auth, money, scheduling, shared data, wide UI.

### 4. Test coverage

Existing tests and whether new patterns need heavy setup.

### 5. Isolation

Single feature vs many systems/domains.

## Automatic adjustments (apply all that match)

- New migration: cap Simplicity ≤ 3, Safety ≤ 4  
- New modal + form: −2 Simplicity, −1 Safety  
- Analytics: −2 Simplicity  
- \>5 files: cap Isolation ≤ 4  
- Background/async processing: cap Simplicity ≤ 2, Safety ≤ 3  
- External services / scraping: −3 Confidence, cap Safety ≤ 3  
- \>200 LOC estimate: −2 from final average  
- \>300 LOC estimate: additional −1 from average  

## Overrides (“not suitable” for casual scope)

If any: set final average ≤ 4 and call out the trigger.

- Background job infrastructure new to the task  
- Web scraping or fragile external integrations  
- LOC estimate \>300 with many unknowns  
- 6+ clarifying questions still unresolved  
- Auth, payments, or permission model changes  

## Decision thresholds (for requirement rows)

| Average | Label   | Emoji |
|---------|---------|--------|
| ≥ 8.5   | Suitable | 🟢 |
| 6.0–8.4 | Moderate | 🟡 |
| \< 6.0  | Complex  | 🔴 |

**Average** = mean of the five axis scores after adjustments, minus LOC penalties.

## Repository without `docs/domains/`

This repo may not ship Programa’s `docs/domains/INDEX.md`. **If that path is missing:**

- Skip “domain matrix” and Rails-specific auto-adjustments.  
- Rely on the five axes, general adjustments, and plain-language risk (who is affected if this is wrong?).  
- In the written spec, note “scores are directional without domain matrix.”  

When working **inside** the Programa app repo, prefer reading `docs/domains/INDEX.md` and domain guides and apply domain-aware adjustments from the canonical Programa copy of this skill.
