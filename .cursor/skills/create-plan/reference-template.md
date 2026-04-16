# [Feature/Task Name] Implementation Plan

## Overview

[Brief description of what we're implementing and why]

## Current State Analysis

[What exists now, what's missing, key constraints discovered]

## Desired End State

[Specification of the desired end state after this plan is complete, and how to verify it]

### Key Discoveries

- [Important finding with file:line reference]
- [Pattern to follow]
- [Constraint to work within]

## What We're NOT Doing

[Explicit out-of-scope items]

## Implementation Approach

[High-level strategy and reasoning]

## Phase 1: [Descriptive Name]

### Overview

[What this phase accomplishes]

### Required Tests

- **Unit / fast** (e.g. RSpec, pytest, vitest): [modules, scenarios, edge cases] — file: `...`
- **Integration / E2E** (if applicable): [scenarios] — file: `...`
- **In-host / special runtime** (e.g. SketchUp TestUp): [when real host APIs are required; else "N/A for this phase"]

### Changes Required

#### 1. [Module/File Group]

**File**: `path/to/file`

**Changes**: [Summary]

```ruby
# Or language-appropriate snippet — replace with project stack
```

### Success Criteria

#### Automated Verification

- [ ] Primary test command passes (e.g. `bundle exec rspec` / `npm test`)
- [ ] New or updated tests exist at specified paths
- [ ] Syntax / typecheck passes if applicable

#### Manual Verification

- [ ] User-visible behavior matches acceptance criteria
- [ ] No regressions in listed flows

---

## Phase 2: [Descriptive Name]

[Repeat structure]

---

## Testing Strategy

Each phase must define **Required Tests** above. Prefer TDD where the team already does: failing test first, then implementation.

- **Fast tests**: domain logic, parsing, auth/token handling, API client request/response handling (with stubs/mocks where appropriate).
- **Integration tests**: boundaries you can run in CI (DB, HTTP with test server, etc.).
- **Host-specific tests**: only for phases that require the real runtime (e.g. SketchUp APIs).

### Manual testing

1. Steps a human performs in the target app or host.
2. Smoke paths after reload / restart if relevant.

## Performance Considerations

[If applicable: UI thread, timers, observers, memory, batching operations]

## Compatibility & Upgrade Notes

[Versioning of persisted settings, migrations, backward compatibility]

## References

- Original GitHub issue: [#number or URL]
- Related docs: [links]
- Similar code: `path:line`
- Related issues: [IDs]
- External API docs: [links]
