# Real-time link recovery (WebRTC party)

This document describes **best-effort** recovery when the browser-to-browser WebRTC link drops or after the tab has been **in the background** (e.g. mobile app switch or screen lock). It is aimed at **QA, support, and contributors** so behavior is not tribal knowledge.

Related: [ADR 0001 — WebRTC signaling](adr/0001-webrtc-signaling.md), [ADR 0002 — Party data channel protocol](adr/0002-party-data-channel-wire-protocol-v1.md), GitHub issues [#28](https://github.com/neumerance/yoochog/issues/28), [#83](https://github.com/neumerance/yoochog/issues/83).

## What users see (typical)

| Situation | Expected UX |
|-----------|-------------|
| Brief network glitch | The join UI may show **Reconnecting…** (amber pulse), then **Connected** if recovery succeeds. |
| Long offline / unstable network | After repeated failures, a message asks the user to **refresh or rejoin**. Recovery is **not guaranteed** on every device or browser. |
| Tab in background **~1 minute** (mobile or desktop) | When returning to the tab, the guest **probes** WebRTC + party data channel health first. If the link is still usable (including many cases of transient `disconnected` while the party channel remains `open`), the UI stays **Connected** without a full re-handshake. If the link is failed or the party channel is not open, the guest uses the same recovery path as a real loss: **Reconnecting…** and a new handshake when the session is still valid. Long background on mobile remains **best-effort** (platforms may still drop P2P). |
| Still stuck | **Refresh the page** or **open the join link again**. There is no server-side membership authority in this MVP. |

## Guest vs host

- **Guest (join URL):** Implements **bounded exponential backoff**, **connection/data-channel loss detection**, and **page visibility**–driven recovery: after a **minimum hidden** duration, return-to-`visible` runs a **short health probe** (see `VISIBILITY_RESUME_HEALTH_PROBE_MS` in `reconnectPolicy.ts`); a full re-handshake runs only if the party link is unhealthy.
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
| Visibility recovery | Hidden ≥ **60s** | After at least this long in `hidden`, return to `visible` may recover the guest. The app first waits `VISIBILITY_RESUME_HEALTH_PROBE_MS` (default **200ms**), then checks PC + party data channel. **Quick tab switches** still avoid recovery because the minimum hidden time is a full minute. |
| Health probe (guest) | **200ms** + property reads | Buffers one frame after `visible` before reading `RTCPeerConnection` and party `RTCDataChannel` state. Always-on log line: `[yoochog:connection:guest] visibility:resume:skipReconnect` when a full re-handshake was skipped. |

## Manual verification (spot-check)

1. **DevTools:** Throttle network or toggle offline briefly; guest should leave **silent “connected”** and either reconnect or surface failure after bounded retries.
2. **Background ~1 min:** On a phone or desktop, switch away or lock the screen for about a minute, then return. If WebRTC and the party channel are still up, the guest may stay **Connected** without **Reconnecting…**. If the link is gone, expect **Reconnecting…** or a clear failure—not an indefinite dead UI.
