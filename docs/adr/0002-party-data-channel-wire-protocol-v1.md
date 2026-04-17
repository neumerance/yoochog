# ADR 0002: Party WebRTC data channel — JSON wire protocol v1

**Status:** Accepted  
**Date:** 2026-04-17  
**Context:** [Epic #4 — Real-time sync](https://github.com/neumerance/yoochog/issues/4) · Task [#26](https://github.com/neumerance/yoochog/issues/26)

## Context

After signaling establishes the WebRTC session, peers exchange **application data** on a dedicated **party data channel** (label `yoochog-party`, see [`app/src/lib/party/broadcastPartyDataChannels.ts`](../../app/src/lib/party/broadcastPartyDataChannels.ts)). That channel carries JSON text messages for queue sync, enqueue requests, host responses, and optional liveness pings. Without a **versioned** envelope and explicit rules for unknown or malformed payloads, clients can diverge or crash when the protocol evolves.

## Decision

### Transport and encoding

- Messages are **UTF-8 JSON** objects sent as **text** on the party data channel (not binary or compressed payloads in v1).
- Every message shares an **envelope**: integer **`v`** (schema version) and string **`type`** (message kind). Additional fields depend on `type`.

### Size limit

- The implementation rejects any incoming **raw string** whose **length** exceeds **`PARTY_MESSAGE_MAX_RAW_BYTES`** (256_000), measured **before** `JSON.parse`. In practice, for typical ASCII JSON, string length matches byte size; non-ASCII UTF-8 can use more bytes than `String.length` — the guard is the same pre-parse check as in code ([`partyMessages.ts`](../../app/src/lib/party/partyMessages.ts)).

### Schema version

- **`v: 1`** denotes **protocol v1**, aligned with **`PARTY_MESSAGE_SCHEMA_VERSION`** in code. **Breaking** wire changes require a new **`v`** and a new ADR.

### Message kinds (v1)

| `type` | Role | Payload (v1) |
|--------|------|----------------|
| `queue_snapshot` | Host → guest(s) | **`ids`**: ordered list of video id strings (max 500 entries, each id max 64 chars). **`currentIndex`**: non-negative integer index into `ids`, or **`null`** only when **`ids`** is empty (empty queue, nothing playing). |
| `enqueue_request` | Guest → host | **`videoId`**: string, trimmed; must match a plausible YouTube id (11 chars `[A-Za-z0-9_-]`). |
| `enqueue_rejected` | Host → guest | **`reason`**: human-readable string, max 500 chars. |
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

### Relation to signaling

This ADR defines **only** the party data channel JSON protocol. It does **not** replace WebRTC signaling (see [ADR 0001](./0001-webrtc-signaling.md)).

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
- [`app/src/lib/party/broadcastPartyDataChannels.ts`](../../app/src/lib/party/broadcastPartyDataChannels.ts) — `PARTY_CHANNEL_LABEL` (`yoochog-party`)  
- [ADR 0001](./0001-webrtc-signaling.md) — signaling transport and room id  
- [ADR 0003](./0003-party-queue-metadata-v1.md) — additive per-row metadata on `queue_snapshot` / `enqueue_request` (still `v: 1`)  
