# ADR 0005: Session admin on the party channel (v1)

## Status

Accepted

## Context

Shared listening sessions need a single **session admin** per party who can skip the current track and remove queue rows, with **host-authoritative** checks. Guests must see **who** is admin and the queue must stay in sync via existing `queue_snapshot` broadcasts.

## Decision

1. **`queue_snapshot` (additive)**  
   Optional field `sessionAdminPeerId: string | null` — the signaling peer id (`clientId`) of the guest who is admin, or `null` when no guest is connected on the host roster.

2. **Join order**  
   The host maintains guest peer ids in **party data channel open order**. The **first** id is admin. On disconnect, that id is removed and the next id becomes admin.

3. **`remove_queue_row_request` (guest → host)**  
   `{ "v": 1, "type": "remove_queue_row_request", "rowIndex": <non-negative integer>, "requesterGuestId": <string|null> }`  
   Optional logical id (same as enqueue). The host allows **session admin** (any row) or **row owner** (`requesterGuestIds[rowIndex]` vs `parsedRequesterGuestId ?? peerGuestId`); validates `rowIndex` against queue length.

4. **`end_current_playback_request`**  
   Allowed if the peer is the **session admin** **or** the **owner** of the now-playing row (same effective id rules as pre–session-admin: `requesterGuestIds[current]` vs `parsedRequesterGuestId ?? peerGuestId`). Session admin may also end rows with no stored owner (legacy). The wire field `requesterGuestId` carries the logical guest id when the client sends it.

5. **Forward compatibility**  
   Receivers ignore unknown fields on `queue_snapshot` per [ADR 0002](./0002-party-data-channel-wire-protocol-v1.md). Older hosts omit `sessionAdminPeerId`; guests treat missing value as `null`.

## Consequences

- Guests compare `sessionAdminPeerId` to their local signaling `clientId` (`localPartyPeerId`) to show admin-only UI.
- Reconnecting guests get a **new** peer id and re-enter join order at the end (documented MVP behavior).
