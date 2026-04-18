/**
 * Best-effort host + guest audience chat policy (issue #79). Shared cooldown constant
 * keeps Join UI and host ignore path aligned.
 */
export const AUDIENCE_CHAT_COOLDOWN_MS = 15_000

/** Middle of the 30–60s duplicate window from the product table. */
export const AUDIENCE_CHAT_DEDUP_WINDOW_MS = 45_000

/** Max concurrently drifting lines on the host overlay (issue #79). */
export const AUDIENCE_CHAT_MAX_VISIBLE_LINES = 4

/** Full horizontal drift duration at normal motion (issue #79; tune in QA). */
export const AUDIENCE_CHAT_DRIFT_MIN_MS = 8_000
export const AUDIENCE_CHAT_DRIFT_MAX_MS = 16_000

export const CHAT_REJECT_REASON_COOLDOWN = 'Please wait before sending again.'
export const CHAT_REJECT_REASON_DUPLICATE = 'You already sent that recently.'

export type GuestAudienceChatHostState = {
  /** Last time any chat was accepted from this guest (rate limit). */
  lastAnyAcceptedAt: number
  /** Last accepted text (for duplicate window). */
  lastText: string
  /** When `lastText` was accepted (duplicate window anchor). */
  lastTextAt: number
}

/**
 * Host-side: reject chat if under cooldown or duplicate text within the dedup window.
 * Caller stores per logical guest id.
 */
export function evaluateHostAudienceChatAcceptance(args: {
  text: string
  now: number
  prev: GuestAudienceChatHostState | undefined
}): { ok: true } | { ok: false; reason: string } {
  const { text, now, prev } = args
  if (prev && now - prev.lastAnyAcceptedAt < AUDIENCE_CHAT_COOLDOWN_MS) {
    return { ok: false, reason: CHAT_REJECT_REASON_COOLDOWN }
  }
  if (
    prev &&
    text === prev.lastText &&
    now - prev.lastTextAt < AUDIENCE_CHAT_DEDUP_WINDOW_MS
  ) {
    return { ok: false, reason: CHAT_REJECT_REASON_DUPLICATE }
  }
  return { ok: true }
}

export function nextGuestAudienceChatHostState(args: {
  text: string
  now: number
  prev: GuestAudienceChatHostState | undefined
}): GuestAudienceChatHostState {
  const { text, now } = args
  return {
    lastAnyAcceptedAt: now,
    lastText: text,
    lastTextAt: now,
  }
}

/**
 * Picks drift duration once per overlay line. Uses `random` for tests.
 */
export function pickAudienceChatDriftMs(opts: {
  prefersReducedMotion: boolean
  random?: () => number
}): number {
  if (opts.prefersReducedMotion) {
    return 4_000
  }
  const r = opts.random ?? Math.random
  const u = r()
  return Math.round(
    AUDIENCE_CHAT_DRIFT_MIN_MS + u * (AUDIENCE_CHAT_DRIFT_MAX_MS - AUDIENCE_CHAT_DRIFT_MIN_MS),
  )
}
