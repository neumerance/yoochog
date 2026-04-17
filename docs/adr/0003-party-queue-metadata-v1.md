# ADR 0003: Party channel — queue row metadata (additive v1)

**Status:** Accepted  
**Date:** 2026-04-17  
**Context:** [Epic #6](https://github.com/neumerance/yoochog/issues/6) · Task [#33](https://github.com/neumerance/yoochog/issues/33)

## Context

ADR 0002 defined **`queue_snapshot`** as **`ids` + `currentIndex`** and **`enqueue_request`** as **`videoId` only**. Product needs each queue row to carry a **resolved or unknown video title** and a **guest requester label** for host and guest UIs, without breaking older clients that only understand ids.

## Decision

Stay on **`v: 1`** (same **`PARTY_MESSAGE_SCHEMA_VERSION`**). Extend messages **additively**:

### `queue_snapshot` (host → guest)

- **Required (unchanged):** `ids`, `currentIndex` — same validation as ADR 0002.
- **Optional:** parallel arrays **`titles`** and **`requestedBys`**, each the **same length as `ids`** when either is present.
  - If **both** arrays are **absent**, parsers **normalize** to all-`null` metadata for each id (legacy snapshots).
  - If **only one** of the two is present, the message is **invalid** (reject parse).
  - Each element is either **`null`** (unknown / absent) or a **non-empty trimmed string** within bounded lengths enforced in [`partyMessages.ts`](../../app/src/lib/party/partyMessages.ts) (`PARTY_QUEUE_TITLE_MAX_LENGTH`, `PARTY_QUEUE_REQUESTED_BY_MAX_LENGTH`).

Serializing hosts **should** emit both arrays whenever they emit a snapshot so new UIs always have stable parallel data.

### `enqueue_request` (guest → host)

- **Required:** `videoId` (unchanged).
- **Optional:** `title` — JSON `null` or omitted means unknown; a string is a resolved title (bounded).
- **Optional:** `requestedBy` — JSON `null` or omitted means no label (legacy guests); a string is the guest display name (bounded).

Hosts **append** a full queue row `{ videoId, title, requestedBy }` from the parsed request.

### Compatibility

- Peers that only read **`ids`** continue to work; extra keys are ignored per ADR 0002 forward-compat rules.
- Peers that **parse** with [`parsePartyMessage`](../../app/src/lib/party/partyMessages.ts) receive **normalized** `titles` / `requestedBys` on every `queue_snapshot` and `title` / `requestedBy` on every `enqueue_request`.

## Consequences

- Title resolution (e.g. YouTube Data API v3) and guest naming are **orthogonal** to the wire shape; failures yield **`null`** titles, not blocked enqueues.
- **No** protocol **`v`** bump; documentation and tests are the source of truth for additive fields.

## References

- [ADR 0002](./0002-party-data-channel-wire-protocol-v1.md) — base v1 protocol  
- [`app/src/lib/party/partyMessages.ts`](../../app/src/lib/party/partyMessages.ts) — parse/serialize  
- [`app/src/lib/host-queue/hostVideoQueue.ts`](../../app/src/lib/host-queue/hostVideoQueue.ts) — in-memory queue rows  
