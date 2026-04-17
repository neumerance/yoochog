import { PARTY_QUEUE_REQUESTED_BY_MAX_LENGTH } from '@/lib/party/partyMessages'

export const GUEST_DISPLAY_NAME_STORAGE_KEY = 'yoochog.guestDisplayName'

/**
 * Reads a persisted guest display name for this browser profile, or `null` if unset/invalid.
 */
export function readGuestDisplayName(): string | null {
  if (typeof localStorage === 'undefined') {
    return null
  }
  try {
    const raw = localStorage.getItem(GUEST_DISPLAY_NAME_STORAGE_KEY)
    return validateGuestDisplayName(raw ?? '')
  } catch {
    return null
  }
}

/**
 * Persists a display name after validation. No-op if `name` is invalid.
 */
export function saveGuestDisplayName(name: string): boolean {
  const v = validateGuestDisplayName(name)
  if (!v) {
    return false
  }
  try {
    localStorage.setItem(GUEST_DISPLAY_NAME_STORAGE_KEY, v)
    return true
  } catch {
    return false
  }
}

/**
 * Trims and enforces max length. Returns `null` when empty or too long after trim.
 */
export function validateGuestDisplayName(raw: string): string | null {
  const t = raw.trim()
  if (t.length === 0) {
    return null
  }
  if (t.length > PARTY_QUEUE_REQUESTED_BY_MAX_LENGTH) {
    return null
  }
  return t
}
