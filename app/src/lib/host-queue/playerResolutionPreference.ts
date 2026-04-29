/**
 * Host YouTube playback quality hint ({@link YT.Player.setPlaybackQuality}).
 *
 * **`auto`** (default): adaptive streaming with a ceiling at **720p** — matches legacy behavior when unset.
 */
export type PlayerResolutionPreference = 'auto' | '480' | '720' | '1080'

export const DEFAULT_PLAYER_RESOLUTION_PREFERENCE: PlayerResolutionPreference = 'auto'

const WIRE_SET = new Set<string>(['auto', '480', '720', '1080'])

export function isPlayerResolutionPreferenceWire(s: unknown): s is PlayerResolutionPreference {
  return typeof s === 'string' && WIRE_SET.has(s)
}

/** Invalid or missing snapshot values resolve to **`auto`** (720p cap). */
export function normalizePlayerResolutionPreference(raw: unknown): PlayerResolutionPreference {
  return isPlayerResolutionPreferenceWire(raw) ? raw : DEFAULT_PLAYER_RESOLUTION_PREFERENCE
}

/**
 * Maps a preference to a YouTube `setPlaybackQuality` label. **`auto`** uses **`hd720`** as the cap.
 */
export function youtubePlaybackQualityForPreference(pref: PlayerResolutionPreference): string {
  switch (pref) {
    case '1080':
      return 'hd1080'
    case '720':
      return 'hd720'
    case '480':
      return 'large'
    case 'auto':
    default:
      return 'hd720'
  }
}
