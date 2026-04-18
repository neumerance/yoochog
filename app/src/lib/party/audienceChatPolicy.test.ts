import { describe, expect, it } from 'vitest'

import {
  AUDIENCE_CHAT_COOLDOWN_MS,
  AUDIENCE_CHAT_DEDUP_WINDOW_MS,
  AUDIENCE_CHAT_DRIFT_MAX_MS,
  AUDIENCE_CHAT_DRIFT_MIN_MS,
  CHAT_REJECT_REASON_COOLDOWN,
  CHAT_REJECT_REASON_DUPLICATE,
  evaluateHostAudienceChatAcceptance,
  pickAudienceChatDriftMs,
} from './audienceChatPolicy'

describe('evaluateHostAudienceChatAcceptance', () => {
  it('accepts first message', () => {
    expect(evaluateHostAudienceChatAcceptance({ text: 'hi', now: 1000, prev: undefined })).toEqual({
      ok: true,
    })
  })

  it('rejects under cooldown', () => {
    const prev = {
      lastAnyAcceptedAt: 1000,
      lastText: 'a',
      lastTextAt: 1000,
    }
    const r = evaluateHostAudienceChatAcceptance({
      text: 'b',
      now: 1000 + AUDIENCE_CHAT_COOLDOWN_MS - 1,
      prev,
    })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.reason).toBe(CHAT_REJECT_REASON_COOLDOWN)
    }
  })

  it('accepts after cooldown', () => {
    const prev = {
      lastAnyAcceptedAt: 1000,
      lastText: 'a',
      lastTextAt: 1000,
    }
    expect(
      evaluateHostAudienceChatAcceptance({
        text: 'b',
        now: 1000 + AUDIENCE_CHAT_COOLDOWN_MS,
        prev,
      }),
    ).toEqual({ ok: true })
  })

  it('rejects duplicate text within dedup window (cooldown passed)', () => {
    const prev = {
      lastAnyAcceptedAt: 0,
      lastText: 'yo',
      lastTextAt: 0,
    }
    const now = AUDIENCE_CHAT_COOLDOWN_MS
    const r = evaluateHostAudienceChatAcceptance({ text: 'yo', now, prev })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.reason).toBe(CHAT_REJECT_REASON_DUPLICATE)
    }
  })

  it('allows same text after dedup window', () => {
    const base = 100_000
    const prev = {
      lastAnyAcceptedAt: base,
      lastText: 'yo',
      lastTextAt: base,
    }
    const now = base + AUDIENCE_CHAT_DEDUP_WINDOW_MS + 1
    expect(evaluateHostAudienceChatAcceptance({ text: 'yo', now, prev })).toEqual({ ok: true })
  })
})

describe('pickAudienceChatDriftMs', () => {
  it('returns value in range for fixed random', () => {
    const d = pickAudienceChatDriftMs({
      prefersReducedMotion: false,
      random: () => 0.5,
    })
    expect(d).toBe(
      Math.round(AUDIENCE_CHAT_DRIFT_MIN_MS + 0.5 * (AUDIENCE_CHAT_DRIFT_MAX_MS - AUDIENCE_CHAT_DRIFT_MIN_MS)),
    )
  })

  it('uses reduced duration when prefers reduced motion', () => {
    expect(pickAudienceChatDriftMs({ prefersReducedMotion: true })).toBe(4000)
  })
})
