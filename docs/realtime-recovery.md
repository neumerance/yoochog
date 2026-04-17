# Real-time link recovery (WebRTC party)

This document describes **best-effort** recovery when the browser-to-browser WebRTC link drops or after the tab has been **in the background** (e.g. mobile app switch or screen lock). It is aimed at **QA, support, and contributors** so behavior is not tribal knowledge.

Related: [ADR 0001 — WebRTC signaling](adr/0001-webrtc-signaling.md), [ADR 0002 — Party data channel protocol](adr/0002-party-data-channel-wire-protocol-v1.md), GitHub issue [#28](https://github.com/neumerance/yoochog/issues/28).

## What users see (typical)

| Situation | Expected UX |
|-----------|-------------|
| Brief network glitch | The join UI may show **Reconnecting…** (amber pulse), then **Connected** if recovery succeeds. |
| Long offline / unstable network | After repeated failures, a message asks the user to **refresh or rejoin**. Recovery is **not guaranteed** on every device or browser. |
| Tab in background **~1 minute** (mobile or desktop) | When returning to the tab, the app may run the same recovery path: **Reconnecting…** while the guest tears down WebRTC and performs a **full re-handshake** (new signaling client id, new offer/answer). If the session is still valid, the user should not need a full page reload. |
| Still stuck | **Refresh the page** or **open the join link again**. There is no server-side membership authority in this MVP. |

## Guest vs host

- **Guest (join URL):** Implements **bounded exponential backoff**, **connection/data-channel loss detection**, and **page visibility**–driven recovery (minimum hidden duration before forcing recovery on visible).
- **Host:** Removes a guest peer when the link to that guest is considered failed (with a **short grace** for transient `disconnected`). When the guest reconnects, signaling delivers a new **peer-joined** and the host attaches again. If the host tab alone is misbehaving, **refresh the host tab** is still a valid fallback (not automatically retried in the same way as the guest).

## Operator-facing limits (defaults)

These values are implemented in `app/src/lib/webrtc/reconnectPolicy.ts` and can be tuned in code (future env overrides are possible but not required for MVP).

| Parameter | Default | Notes |
|-----------|---------|--------|
| Base delay | 1s | Used in exponential schedule before capping. |
| Max delay (cap) | 30s | Upper bound on the exponential component before jitter. |
| Full jitter | Yes | Sleep is `random * min(cap, base × 2^attempt)` so retries spread out. |
| Max reconnect attempts | 10 | After this many connection-loss events without a successful **connected** state, retries stop and the user sees an error. |
| `disconnected` grace | 8s | ICE/RTCPeerConnection `disconnected` may be transient; wait before treating as loss. |
| Visibility recovery | Hidden ≥ **60s** | Returning to `visible` after at least this long triggers the same recovery path as a drop (avoids thrashing on quick tab switches). |

## Manual verification (spot-check)

1. **DevTools:** Throttle network or toggle offline briefly; guest should leave **silent “connected”** and either reconnect or surface failure after bounded retries.
2. **Background ~1 min:** On a phone or desktop, switch away or lock the screen for about a minute, then return; expect **Reconnecting…** or a clear failure—not an indefinite dead UI.
