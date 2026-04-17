const STORAGE_KEY_PREFIX = 'yoochog.partyGuestRequesterId.'

/**
 * Returns a stable logical guest id for enqueue policy for this browser tab’s join session.
 * Persisted in `sessionStorage` per party `sessionId` so it survives reload but not a new tab.
 */
export function getOrCreatePartyGuestRequesterId(sessionId: string): string {
  const key = STORAGE_KEY_PREFIX + sessionId
  if (typeof sessionStorage === 'undefined') {
    return crypto.randomUUID()
  }
  try {
    const existing = sessionStorage.getItem(key)
    if (existing) {
      const t = existing.trim()
      if (t.length > 0) {
        return t
      }
    }
    const id = crypto.randomUUID()
    sessionStorage.setItem(key, id)
    return id
  } catch {
    return crypto.randomUUID()
  }
}
