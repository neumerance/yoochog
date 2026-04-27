# Real-time link recovery (Socket.io party)

This document describes **best-effort** recovery when the Socket.io connection drops or after the tab has been **in the background** (e.g. mobile app switch or screen lock). It is aimed at **QA, support, and contributors** so behavior is not tribal knowledge.

Related: [ADR 0006 — Socket.io realtime](adr/0006-socketio-realtime.md), [ADR 0002 — Party wire protocol](adr/0002-party-data-channel-wire-protocol-v1.md), GitHub issues [#28](https://github.com/neumerance/yoochog/issues/28), [#83](https://github.com/neumerance/yoochog/issues/83).

## What users see (typical)

| Situation | Expected UX |
|-----------|-------------|
| Brief network glitch | The join UI may show **Reconnecting…** (amber pulse), then **Connected** if recovery succeeds. |
| Long offline / unstable network | After repeated failures, a message asks the user to **refresh or rejoin**. Recovery is **not guaranteed** on every device or browser. |
| Tab in background **~1 minute** (mobile or desktop) | When returning to the tab, the guest **probes** Socket.io connectivity first (`socket.connected`). If the link is still usable, the UI stays **Connected** without a full reconnect. If not, the guest uses the same recovery path as a real loss: **Reconnecting…** and a new session when the party id is still valid. Long background on mobile remains **best-effort**. |
| Still stuck | **Refresh the page** or **open the join link again**. |

## Guest vs host

- **Guest (join URL):** On connection loss after a successful session, starts a **new Socket.io connection** immediately (still capped by `RECONNECT_MAX_ATTEMPTS` in `reconnectPolicy.ts`), plus **page visibility**–driven recovery: after a **minimum hidden** duration, return-to-`visible` runs a **short health probe** (`VISIBILITY_RESUME_HEALTH_PROBE_MS`); a full reconnect runs only if the party link is unhealthy.
- **Host:** When a guest disconnects, the realtime server notifies the host (`guest_left`); the host rebroadcasts queue state. If the host tab misbehaves, **refresh the host tab** is still a valid fallback.

## Operator-facing limits (defaults)

These values are implemented in `app/src/lib/realtime/reconnectPolicy.ts` and can be tuned in code (future env overrides are possible but not required for MVP).

| Parameter | Default | Notes |
|-----------|---------|--------|
| Max reconnect attempts | 10 | After this many connection-loss events without a successful **connected** state, retries stop and the user sees an error. |
| Visibility recovery | Hidden ≥ **60s** | After at least this long in `hidden`, return to `visible` may recover the guest. The app first waits `VISIBILITY_RESUME_HEALTH_PROBE_MS` (default **200ms**), then checks `socket.connected`. **Quick tab switches** still avoid recovery because the minimum hidden time is a full minute. |
| Health probe (guest) | **200ms** + property reads | Buffers one frame after `visible` before reading socket state. Always-on log line: `[yoochog:connection:guest] visibility:resume:skipReconnect` when a full reconnect was skipped. |

## Manual verification (spot-check)

1. **DevTools:** Throttle network or toggle offline briefly; guest should leave **silent “connected”** and either reconnect or surface failure after bounded retries.
2. **Background ~1 min:** On a phone or desktop, switch away or lock the screen for about a minute, then return. If Socket.io is still connected, the guest may stay **Connected** without **Reconnecting…**. If the link is gone, expect **Reconnecting…** or a clear failure—not an indefinite dead UI.
