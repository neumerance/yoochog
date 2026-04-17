import { describe, expect, it } from 'vitest'

import { GUEST_DISPLAY_NAME_STORAGE_KEY, validateGuestDisplayName } from './guestDisplayName'

describe('validateGuestDisplayName', () => {
  it('accepts trimmed non-empty strings within max length', () => {
    expect(validateGuestDisplayName('  Alex  ')).toBe('Alex')
    expect(validateGuestDisplayName('a'.repeat(64))).toBe('a'.repeat(64))
  })

  it('rejects empty and whitespace-only', () => {
    expect(validateGuestDisplayName('')).toBeNull()
    expect(validateGuestDisplayName('   ')).toBeNull()
  })

  it('rejects over max length', () => {
    expect(validateGuestDisplayName('a'.repeat(65))).toBeNull()
  })
})

describe('GUEST_DISPLAY_NAME_STORAGE_KEY', () => {
  it('is stable', () => {
    expect(GUEST_DISPLAY_NAME_STORAGE_KEY).toBe('yoochog.guestDisplayName')
  })
})
