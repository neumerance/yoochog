# ADR 0001: WebRTC signaling transport and session → room mapping

**Status:** Accepted  
**Date:** 2026-04-17  
**Context:** [Epic #4 — Real-time sync — WebRTC, signaling, STUN/TURN](https://github.com/neumerance/yoochog/issues/4) · Task [#23](https://github.com/neumerance/yoochog/issues/23)

## Context

The yoochog app is a Vue SPA deployed as **static assets** on GitHub Pages ([`docs/github-pages.md`](../github-pages.md)). There is no application server in this repository to relay WebRTC signaling; a **separate signaling plane** is required for Epic 4 (peer discovery, SDP/ICE exchange, and related control messages).

The product already defines a **party identifier** as the opaque **`sessionId`**: the host persists it in `sessionStorage` (`getOrCreateHostSessionId`, key `yoochog.hostSessionId` — see [`app/src/lib/host-session/hostSessionId.ts`](../../app/src/lib/host-session/hostSessionId.ts)), and guests use `/join/<sessionId>` with URLs built via [`app/src/lib/join-url/buildGuestJoinUrl.ts`](../../app/src/lib/join-url/buildGuestJoinUrl.ts). That id must map unambiguously to a **signaling room or channel** so every participant with the same party id joins the same logical session.

The README reserves **`VITE_SIGNALING_URL`** for a future signaling endpoint ([`README.md`](../../README.md) — Future configuration) and documents the **host session id threat model** (casual use, not enterprise isolation).

## Decision

### Signaling transport

Use a **WebSocket-oriented signaling path** for exchanging WebRTC signaling messages between clients. Concretely, implementers may deploy:

- a **small dedicated service** that accepts WebSocket connections and routes messages by room, or  
- **serverless / managed WebSocket** infrastructure with a broker, or  
- a **hosted signaling-only** product used solely for signaling (not media).

The static site **does not** host long-lived WebSockets; the signaling service runs **outside** the GitHub Pages deployment.

### `sessionId` → signaling room mapping

Define a single normative **signaling room id** string:

```text
yoochog:party:<sessionId>
```

where **`<sessionId>`** is the **opaque party id** exactly as used by the host in `sessionStorage` and as the **`sessionId` route parameter** on the join page (after any URL decoding applied by the router for path segments). Features that build join URLs must keep using `buildGuestJoinUrl` so the path segment stays aligned with this id.

**Collision semantics:** The same `<sessionId>` always denotes the same party; different hosts that accidentally reuse an id (extremely unlikely with UUID-style ids) would share a signaling namespace. **Guessing resistance** follows the README: the id is unguessable for casual abuse, not a cryptographic room ACL.

### Security stance

This design matches the README **host session ids (threat model)** section:

- There are **no accounts** and **no server-issued party tokens** in this phase.  
- **Casual / demo** use: anyone who obtains the join link can attempt to join; this is **not** a compliance boundary, multi-tenant isolation guarantee, or abuse-proof system.  
- Stronger membership or server-verified parties would be **follow-on work** (new ADRs or epics), not implied here.

### `VITE_SIGNALING_URL`

**`VITE_SIGNALING_URL`** is the **base URL** the client uses to reach the signaling service: scheme, host, and an optional path prefix (e.g. `wss://signaling.example.com` or `https://api.example.com/signaling`). The implementation must document how it derives the WebSocket URL from this base (direct `wss://` base vs. `https://` with a documented path for upgrade). **No secrets** belong in the repo; production values are supplied via CI or host environment only, consistent with [`README.md`](../../README.md).

### Relation to Epic 4

Epic 4 covers **signaling protocol details**, **star topology** (host-as-authoritative sync), **ICE**, and related runtime behavior. This ADR only records **transport choice**, **room naming**, **security expectations**, and **env var semantics** so those tasks are not blocked by undefined basics.

## Alternatives considered

| Approach | Why not chosen (for this project) |
|----------|-----------------------------------|
| **HTTP long-polling** for signaling | Higher latency and more request churn than WebSockets for bidirectional signaling; acceptable only as a fallback if WebSockets are blocked. |
| **Fully managed realtime APIs** (vendor SDKs) | Faster integration but stronger **vendor lock-in** and product-specific models; team may still choose one later, but the **room id rule** above remains the stable contract for `sessionId`. |
| **Embedding signaling in the static site** | GitHub Pages cannot run a signaling server; **not viable**. |

## Consequences

- A future signaling implementation **must** use the **`yoochog:party:<sessionId>`** room rule or **supersede this ADR** with a new ADR and migration notes.  
- Static hosting constraints remain documented in [`docs/github-pages.md`](../github-pages.md).  
- [`README.md`](../../README.md) remains the canonical place for placeholder env var **names** and the host-session threat model; this ADR adds **signaling-specific** decisions.

## References

- [Epic #4 — Real-time sync](https://github.com/neumerance/yoochog/issues/4)  
- [`README.md`](../../README.md) — Future configuration, host session ids  
- [`docs/github-pages.md`](../github-pages.md) — Static hosting and deployment
