# ADR 0002: Party channel — JSON wire protocol v1

**Status:** Accepted  
**Date:** 2026-04-17  
**Context:** [Epic #4 — Real-time sync](https://github.com/neumerance/yoochog/issues/4) · Task [#26](https://github.com/neumerance/yoochog/issues/26)

## Context

Participants exchange **application data** as **UTF-8 JSON text** for queue sync, enqueue requests, host responses, and optional liveness pings. The **transport** is a **Socket.io** relay ([ADR 0006](./0006-socketio-realtime.md)); historically this document referred to a WebRTC **`yoochog-party` data channel**. The **envelope and `type` semantics** below are unchanged. Without a **versioned** envelope and explicit rules for unknown or malformed payloads, clients can diverge or crash when the protocol evolves.

## Decision

### Transport and encoding

- Messages are **UTF-8 JSON** objects sent as **text** on the party channel (not binary or compressed payloads in v1).
- Every message shares an **envelope**: integer **`v`** (schema version) and string **`type`** (message kind). Additional fields depend on `type`.

### Size limit

- The implementation rejects any incoming **raw string** whose **length** exceeds **`PARTY_MESSAGE_MAX_RAW_BYTES`** (256_000), measured **before** `JSON.parse`. In practice, for typical ASCII JSON, string length matches byte size; non-ASCII UTF-8 can use more bytes than `String.length` — the guard is the same pre-parse check as in code ([`partyMessages.ts`](../../app/src/lib/party/partyMessages.ts)).

### Schema version

- **`v: 1`** denotes **protocol v1**, aligned with **`PARTY_MESSAGE_SCHEMA_VERSION`** in code. **Breaking** wire changes require a new **`v`** and a new ADR.

### Message kinds (v1)

| `type` | Role | Payload (v1) |
|--------|------|----------------|
| `queue_snapshot` | Host → guest(s) | **`ids`**: ordered list of video id strings (max 500 entries, each id max 64 chars). **`currentIndex`**: non-negative integer index into `ids`, or **`null`** only when **`ids`** is empty (empty queue, nothing playing). **Additive** **`maxGuestQueueRowsPerGuest`**: optional integer (see [`guestQueueLimits.ts`](../../app/src/lib/host-queue/guestQueueLimits.ts)); when **absent** or **unparseable**, guests treat the cap as **2** (issue [#81](https://github.com/neumerance/yoochog/issues/81)). **Additive** **`audienceChatEnabled`**: optional boolean; when **absent** or not a boolean, guests treat audience chat as **on** (legacy hosts). When **`false`**, the host does not accept **`audience_chat_request`** and clears the on-screen overlay; guests hide the chat affordance. **Additive** **`audioSessionUnlocked`**: boolean; when **absent**, guests default to **`true`** (assume room is in “unlocked for singing” for join UI). When **`false`**, the host is in the “Click here to start singing” re-locked state (issue [#89](https://github.com/neumerance/yoochog/issues/89)). **Session admin** and parallel metadata are otherwise unchanged (see [ADR 0003](./0003-party-queue-metadata-v1.md), [ADR 0004](./0004-party-queue-guest-ownership-v1.md), [ADR 0005](./0005-session-admin-party-v1.md)). |
| `queue_settings_update_request` | Guest → host | **`maxGuestQueueRowsPerGuest`**: integer **1–10** (max rows per guest, including now playing). **Optional** **`audienceChatEnabled`**: boolean; when present, updates the host toggle; when **omitted** (older guests), the host leaves the current value. **`requesterGuestId`**: required logical guest id. Only the **session admin** is accepted; others get **`queue_settings_rejected`**. On success the host updates authoritative state and broadcasts **`queue_snapshot`** ([#81](https://github.com/neumerance/yoochog/issues/81)). |
| `queue_settings_rejected` | Host → guest | **`reason`**: max 500 chars; guest-only queue-settings errors (e.g. not session admin) ([#81](https://github.com/neumerance/yoochog/issues/81)). |
| `enqueue_request` | Guest → host | **`videoId`**: string, trimmed; must match a plausible YouTube id (11 chars `[A-Za-z0-9_-]`). Optional metadata fields per [ADR 0003](./0003-party-queue-metadata-v1.md) / [ADR 0004](./0004-party-queue-guest-ownership-v1.md). |
| `end_current_playback_request` | Guest → host | **`requesterGuestId`**: optional string or `null` (same length rules as enqueue); logical guest id for ownership. Host validates that this guest owns the **now playing** row (see [ADR 0004](./0004-party-queue-guest-ownership-v1.md)); on failure replies with `enqueue_rejected` + **`reason`**. On success the host advances the queue like a natural `ENDED` and broadcasts `queue_snapshot` ([#70](https://github.com/neumerance/yoochog/issues/70)). |
| `pause_current_playback_request` | Guest → host | Same **`requesterGuestId`** rules as `end_current_playback_request`. Host uses the same **session admin or now-playing owner** gate as end-current. On success the host **re-locks room audio** to the “Click here to start singing” state (not simple transport pause; issue [#89](https://github.com/neumerance/yoochog/issues/89)). On failure, **`enqueue_rejected`**. |
| `resume_current_playback_request` | Guest → host | Same shape and permission gate as **`pause_current_playback_request`**. **Optional / legacy:** reserved for a previous transport-resume design; the join UI may not send. Rejection uses **`enqueue_rejected`**. |
| `enqueue_rejected` | Host → guest | **`reason`**: human-readable string, max 500 chars (e.g. invalid id, or video already in the queue — see guest enqueue policy / [#37](https://github.com/neumerance/yoochog/issues/37)). Also used when an **`end_current_playback_request`**, **`pause_current_playback_request`**, or **`resume_current_playback_request`** is rejected. |
| `audience_chat_request` | Guest → host | **`text`**: normalized audience chat string (trim, collapsed whitespace; max **5 words** and **30 characters** after normalization — see `validateAudienceChatText` / [#79](https://github.com/neumerance/yoochog/issues/79)). **`requesterGuestId`**: required logical guest id (same rules as `guest_identify`). **`requestedBy`**: optional display name for the host overlay (same length rules as enqueue `requestedBy`; may be `null`). Malformed or invalid text is **dropped** at parse (`parsePartyMessage` returns `null`). If the host has **`audienceChatEnabled: false`** on the authoritative snapshot, the host replies with **`chat_rejected`** instead of showing the message. |
| `chat_rejected` | Host → guest | **`reason`**: human-readable string, max 500 chars (e.g. rate limit / duplicate — [#79](https://github.com/neumerance/yoochog/issues/79)), or chat disabled for the session. |
| `heartbeat` | Either direction | **No additional required fields** beyond `v` and `type`. Semantics in v1: **liveness only**; receivers **must not** change queue state or enqueue error state when applying guest UI updates (see `applyGuestPartyMessage`). |

### Forward compatibility and safe handling

Implementations **must**:

1. **Drop** (return no message / ignore) when:
   - raw text is **oversized**;
   - text is **not valid JSON**;
   - the root value is **not** a plain object;
   - **`v`** is not **`1`** (until a newer version is implemented);
   - **`type`** is **unknown**;
   - **`type`** is known but **required fields are missing or invalid** for that kind.

2. **Never throw** from parse on untrusted input and **never** corrupt local queue state based on a dropped message.

3. Treat **extra** JSON properties on a message as **ignored** for v1 fields not listed above (future extensions may add optional keys without bumping `v` where compatible).

Peers on older builds **drop** unknown `type` values (e.g. they never see `heartbeat` until upgraded). After upgrade, `heartbeat` is recognized and handled as a no-op for queue semantics.

### Relation to transport

This ADR defines **only** the party JSON protocol. Transport is **Socket.io** ([ADR 0006](./0006-socketio-realtime.md)); it does **not** specify server deployment or auth.

## Alternatives considered

| Approach | Why not chosen (v1) |
|----------|---------------------|
| **Binary / MessagePack** | Simpler debugging and browser ergonomics with JSON text; binary deferred by product scope. |
| **Per-type version fields** | One top-level `v` keeps the envelope minimal; breaking changes bump `v` for the whole protocol. |

## Consequences

- Client code **must** use [`parsePartyMessage`](../../app/src/lib/party/partyMessages.ts) (or stay bitwise-compatible with it) for inbound party-channel text.
- New kinds or breaking changes **must** update **`partyMessages.ts`**, tests, and this ADR (or a successor numbered ADR).

## References

- [`app/src/lib/party/partyMessages.ts`](../../app/src/lib/party/partyMessages.ts) — `PARTY_MESSAGE_SCHEMA_VERSION`, `PARTY_MESSAGE_MAX_RAW_BYTES`, parse/serialize  
- [ADR 0006](./0006-socketio-realtime.md) — Socket.io transport and room id  
- [ADR 0001](./0001-webrtc-signaling.md) — **superseded** WebRTC signaling history  
- [ADR 0003](./0003-party-queue-metadata-v1.md) — additive per-row metadata on `queue_snapshot` / `enqueue_request` (still `v: 1`)  
