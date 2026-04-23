import { ADBLOCK_PLUS_CHROME_WEB_STORE_URL } from '@/lib/adblockProbe'

export const PLAYER_HELP_TIPS_SESSION_KEY = 'yoochog.playerHelpTips.dismissed'

export type PlayerHelpTipContext = {
  /**
   * Host adblock heuristics (cosmetic bait + optional network probe). `'none'` means blocking
   * was not detected — either no blocker or it’s off/paused for this site (same from the page).
   */
  adblockStatus: 'pending' | 'none' | 'active'
  isSignalingConfigured: boolean
  activeVideoId: string | null
  audioSessionUnlocked: boolean
  idleVariant: 'empty' | 'ended' | null
  queueLength: number
  embedSetupError: string | null
}

export type PlayerHelpTipDefinition = {
  id: string
  /** Lower runs first when multiple tips match. */
  priority: number
  message: string
  /** Optional link (e.g. Chrome Web Store) opened in a new tab. */
  action?: { label: string; href: string }
  test: (ctx: PlayerHelpTipContext) => boolean
}

/**
 * Contextual hints for the host video frame. Only one tip is shown at a time (best priority).
 */
export const PLAYER_HELP_TIP_DEFINITIONS: PlayerHelpTipDefinition[] = [
  {
    id: 'suggest-adblock-chrome',
    priority: 5,
    message:
      "If ads aren't being filtered, turn your ad blocker on for this site — or install Adblock Plus for Chromium for smoother playback.",
    action: {
      label: 'Adblock Plus in Chrome Web Store',
      href: ADBLOCK_PLUS_CHROME_WEB_STORE_URL,
    },
    test: (ctx) => {
      if (ctx.adblockStatus !== 'none' || ctx.embedSetupError) {
        return false
      }
      // Whole video panel: idle splash, ended slate, or active playback (not only when a clip is loaded).
      return (
        ctx.idleVariant === 'empty' ||
        ctx.idleVariant === 'ended' ||
        !!ctx.activeVideoId
      )
    },
  },
  {
    id: 'signaling-missing',
    priority: 10,
    message:
      'Add signaling (VITE_SIGNALING_URL or PubNub keys) so guests can sync the queue from their phones.',
    test: (ctx) =>
      !ctx.isSignalingConfigured && !ctx.embedSetupError && !ctx.idleVariant && !!ctx.activeVideoId,
  },
  {
    id: 'guest-enqueue-while-playing',
    priority: 20,
    message: 'Guests can paste a YouTube link on the join page to enqueue — two songs per guest until one plays.',
    test: (ctx) =>
      ctx.isSignalingConfigured &&
      !!ctx.activeVideoId &&
      ctx.audioSessionUnlocked &&
      ctx.queueLength > 0 &&
      !ctx.idleVariant,
  },
]

export function readDismissedPlayerHelpTipIds(): Set<string> {
  if (typeof sessionStorage === 'undefined') {
    return new Set()
  }
  try {
    const raw = sessionStorage.getItem(PLAYER_HELP_TIPS_SESSION_KEY)
    if (!raw) {
      return new Set()
    }
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) {
      return new Set()
    }
    return new Set(parsed.filter((x): x is string => typeof x === 'string'))
  } catch {
    return new Set()
  }
}

export function dismissPlayerHelpTipForSession(id: string): void {
  if (typeof sessionStorage === 'undefined') {
    return
  }
  try {
    const next = readDismissedPlayerHelpTipIds()
    next.add(id)
    sessionStorage.setItem(PLAYER_HELP_TIPS_SESSION_KEY, JSON.stringify([...next]))
  } catch {
    // ignore quota / private mode
  }
}

export function pickActivePlayerHelpTip(
  ctx: PlayerHelpTipContext,
  dismissed: Set<string>,
): PlayerHelpTipDefinition | null {
  const candidates = PLAYER_HELP_TIP_DEFINITIONS.filter(
    (def) => def.test(ctx) && !dismissed.has(def.id),
  ).sort((a, b) => a.priority - b.priority)
  return candidates[0] ?? null
}
