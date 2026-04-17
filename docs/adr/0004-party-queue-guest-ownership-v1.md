# ADR 0004: Party channel — per-row guest ownership (additive v1)

**Status:** Accepted  
**Date:** 2026-04-17  
**Context:** [Epic #7](https://github.com/neumerance/yoochog/issues/7) · Task [#39](https://github.com/neumerance/yoochog/issues/39)

## Context

ADR 0003 added **titles** and **requestedBys** for display. Product needs the host to enforce **at most one queued row per logical guest**, including the **now playing** row, and that policy must survive **host refresh** and stay consistent on **guest sync**. Human-readable `requestedBy` is not a stable identity across reconnects.

## Decision

Stay on **`v: 1`**. Add:

### `queue_snapshot` (host → guest)

- **Optional** parallel array **`requesterGuestIds`**, same length as **`ids`** when present.
- If **absent**, parsers normalize to **all `null`** (unknown / legacy), same as missing metadata in ADR 0003.
- If **present**, length **must** match **`ids`**; each element is **`null`** or a **non-empty trimmed string** within **`PARTY_QUEUE_REQUESTER_GUEST_ID_MAX_LENGTH`** (see [`partyMessages.ts`](../../app/src/lib/party/partyMessages.ts)).

Hosts **should** emit **`requesterGuestIds`** whenever they emit a snapshot so enforcement and UI hints stay aligned.

### `enqueue_request` (guest → host)

- **Optional** **`requesterGuestId`**: JSON **`null`** or omitted means absent; a string is a stable logical id for this tab’s join session (typically a UUID persisted in **`sessionStorage`** per party session).
- Hosts compute an **effective owner id** as **`requesterGuestId` from the message if present, else the WebRTC peer id** for backward compatibility with older guests. The effective id is stored on the new row and in persistence.

### Persistence

Host **`localStorage`** and guest **cache** store **`requesterGuestIds`** alongside existing arrays. Loads **without** this field normalize to **`null`** per row; the queue still loads.

### Compatibility

- **Older saved playlists:** missing **`requesterGuestIds`** → all **`null`** owners; policy matches only **non-null** ids, so new guests are not blocked by legacy rows.
- **Older guests** that omit **`requesterGuestId`:** host falls back to **peer id** for that connection; **reconnect** with a new peer id requires a **new client** that sends **`requesterGuestId`** for stable enforcement.
- **Protocol:** remain on **`PARTY_MESSAGE_SCHEMA_VERSION` `1`**; additive fields only (see [ADR 0003](./0003-party-queue-metadata-v1.md)).

## Consequences

- One-song-per-guest is enforced in [`guestEnqueuePolicy`](../../app/src/lib/host-queue/guestEnqueuePolicy.ts) after the existing duplicate-video check.
- Guests generate ids via [`getOrCreatePartyGuestRequesterId`](../../app/src/lib/party/partyGuestRequesterId.ts).

## References

- [ADR 0002](./0002-party-data-channel-wire-protocol-v1.md) — base protocol  
- [ADR 0003](./0003-party-queue-metadata-v1.md) — row metadata  
- GitHub issue: https://github.com/neumerance/yoochog/issues/39
