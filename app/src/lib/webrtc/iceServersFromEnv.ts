import { rtcDebugLog, rtcFailureLog } from '@/lib/debug/rtcDebugLog'
import { DEFAULT_DEV_ICE_SERVERS } from '@/lib/webrtc/defaultIceServers'

/** Subset of `ImportMetaEnv` used for ICE; allows tests to inject a plain object. */
export type PartyIceEnv = {
  readonly VITE_STUN_URLS?: string
  readonly VITE_TURN_URLS?: string
  readonly VITE_TURN_USERNAME?: string
  readonly VITE_TURN_CREDENTIAL?: string
}

export type GetPartyIceServersOptions = {
  /** When omitted, uses `import.meta.env` (Vite `VITE_*` at build time). */
  env?: PartyIceEnv
  /** Override warning sink (e.g. tests). Defaults to `console.warn` with at-most-once partial-TURN messaging. */
  warn?: (message: string) => void
}

let partialTurnWarned = false

/** For unit tests that assert warning counts across multiple calls. */
export function resetPartyIceServerWarnings(): void {
  partialTurnWarned = false
}

function splitCommaList(raw: string | undefined): string[] {
  if (raw === undefined || raw === null) {
    return []
  }
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

function isStunUrl(url: string): boolean {
  const u = url.toLowerCase()
  return u.startsWith('stun:') || u.startsWith('stuns:')
}

function isTurnUrl(url: string): boolean {
  const u = url.toLowerCase()
  return u.startsWith('turn:') || u.startsWith('turns:')
}

function warnPartialTurn(message: string, warn?: (m: string) => void): void {
  if (partialTurnWarned) {
    return
  }
  partialTurnWarned = true
  if (warn) {
    warn(message)
  } else {
    console.warn(message)
  }
}

/**
 * Builds `RTCIceServer[]` from Vite env (or injected env for tests).
 * - Default STUN matches previous hardcoded dev behavior when `VITE_STUN_URLS` is unset or empty.
 * - TURN entries require both username and credential when any `turn:` / `turns:` URL is present.
 */
export function getPartyIceServers(options?: GetPartyIceServersOptions): RTCIceServer[] {
  const env = options?.env ?? (import.meta.env as PartyIceEnv)
  const warn = options?.warn

  const stunSegments = splitCommaList(env.VITE_STUN_URLS)
  const stunUrls = stunSegments.filter(isStunUrl)
  const stunServers: RTCIceServer[] =
    stunUrls.length > 0
      ? stunUrls.map((urls) => ({ urls }))
      : [...DEFAULT_DEV_ICE_SERVERS]

  const turnSegments = splitCommaList(env.VITE_TURN_URLS)
  const turnUrls = turnSegments.filter(isTurnUrl)
  const user = env.VITE_TURN_USERNAME?.trim() ?? ''
  const pass = env.VITE_TURN_CREDENTIAL?.trim() ?? ''

  if (turnUrls.length === 0) {
    rtcDebugLog('webrtc', 'ICE: using STUN only', { serverEntries: stunServers.length })
    return stunServers
  }

  const hasUser = user.length > 0
  const hasPass = pass.length > 0
  if (!hasUser || !hasPass) {
    warnPartialTurn(
      '[yoochog] ICE: VITE_TURN_URLS is set but VITE_TURN_USERNAME and VITE_TURN_CREDENTIAL must both be set for TURN; relay candidates will be skipped.',
      warn,
    )
    rtcFailureLog(
      'webrtc',
      'ICE: partial TURN config (missing username/credential) — using STUN only',
      { turnUrlCount: turnUrls.length },
    )
    rtcDebugLog('webrtc', 'ICE: partial TURN config — STUN only', { serverEntries: stunServers.length })
    return stunServers
  }

  const turnServers: RTCIceServer[] = turnUrls.map((urls) => ({
    urls,
    username: user,
    credential: pass,
  }))

  const merged = [...stunServers, ...turnServers]
  rtcDebugLog('webrtc', 'ICE: STUN + TURN', {
    serverEntries: merged.length,
    turnUrlCount: turnUrls.length,
  })
  return merged
}
