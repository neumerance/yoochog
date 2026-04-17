export const PRIVACY_NOTICE_DISMISSED_KEY = 'yoochog.privacyNoticeDismissed'

/**
 * Whether the user has dismissed the informational privacy notice in this browser profile.
 */
export function readPrivacyNoticeDismissed(): boolean {
  if (typeof localStorage === 'undefined') {
    return false
  }
  try {
    const raw = localStorage.getItem(PRIVACY_NOTICE_DISMISSED_KEY)
    return raw === 'true' || raw === '1'
  } catch {
    return false
  }
}

/**
 * Persists dismissal of the privacy notice. Returns false if storage is unavailable or full.
 */
export function savePrivacyNoticeDismissed(): boolean {
  if (typeof localStorage === 'undefined') {
    return false
  }
  try {
    localStorage.setItem(PRIVACY_NOTICE_DISMISSED_KEY, 'true')
    return true
  } catch {
    return false
  }
}
