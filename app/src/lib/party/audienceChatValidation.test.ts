import { describe, expect, it } from 'vitest'

import {
  AUDIENCE_CHAT_INVALID_MESSAGE,
  normalizeAudienceChatInput,
  validateAudienceChatText,
} from './audienceChatValidation'

describe('normalizeAudienceChatInput', () => {
  it('trims and collapses whitespace', () => {
    expect(normalizeAudienceChatInput('  hello   world  ')).toBe('hello world')
  })
  it('returns empty string for whitespace-only', () => {
    expect(normalizeAudienceChatInput('   \t  ')).toBe('')
  })
})

describe('validateAudienceChatText', () => {
  it('accepts valid short message', () => {
    expect(validateAudienceChatText('Go team')).toEqual({ ok: true })
  })
  it('rejects empty', () => {
    const r = validateAudienceChatText('')
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.error).toBe(AUDIENCE_CHAT_INVALID_MESSAGE)
    }
  })
  it('rejects over 30 characters', () => {
    const r = validateAudienceChatText('1234567890123456789012345678901')
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.error).toBe(AUDIENCE_CHAT_INVALID_MESSAGE)
    }
  })
  it('rejects over 5 words', () => {
    const r = validateAudienceChatText('one two three four five six')
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.error).toBe(AUDIENCE_CHAT_INVALID_MESSAGE)
    }
  })
  it('accepts exactly 5 words and within char limit', () => {
    expect(validateAudienceChatText('a b c d e')).toEqual({ ok: true })
  })
})
