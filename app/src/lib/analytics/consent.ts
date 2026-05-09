export const ANALYTICS_CONSENT_KEY = 'yoochog.analyticsConsent'

export type AnalyticsConsentDecision = 'accepted' | 'declined'

/**
 * Reads stored analytics consent for this browser profile.
 */
export function readAnalyticsConsent(): AnalyticsConsentDecision | 'undecided' {
  if (typeof localStorage === 'undefined') {
    return 'undecided'
  }
  try {
    const raw = localStorage.getItem(ANALYTICS_CONSENT_KEY)
    if (raw === 'accepted' || raw === 'declined') {
      return raw
    }
    return 'undecided'
  } catch {
    return 'undecided'
  }
}

/**
 * Persists analytics consent. Returns false if storage is unavailable or full.
 */
export function saveAnalyticsConsent(value: AnalyticsConsentDecision): boolean {
  if (typeof localStorage === 'undefined') {
    return false
  }
  try {
    localStorage.setItem(ANALYTICS_CONSENT_KEY, value)
    return true
  } catch {
    return false
  }
}
