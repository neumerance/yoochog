import { describe, expect, it } from 'vitest'

import {
  pickActivePlayerHelpTip,
  PLAYER_HELP_TIP_DEFINITIONS,
  resolvePlayerHelpTipMessage,
  type PlayerHelpTipContext,
} from '@/lib/playerHelpTips'

describe('pickActivePlayerHelpTip', () => {
  it('returns null when nothing matches', () => {
    const ctx: PlayerHelpTipContext = {
      adblockStatus: 'pending',
      isSignalingConfigured: true,
      activeVideoId: null,
      audioSessionUnlocked: false,
      idleVariant: null,
      queueLength: 0,
      embedSetupError: null,
      maxGuestQueueRowsPerGuest: 2,
    }
    expect(pickActivePlayerHelpTip(ctx, new Set())).toBeNull()
  })

  it('prefers lower priority value when multiple match', () => {
    const ctx: PlayerHelpTipContext = {
      adblockStatus: 'none',
      isSignalingConfigured: false,
      activeVideoId: 'abc',
      audioSessionUnlocked: true,
      idleVariant: null,
      queueLength: 2,
      embedSetupError: null,
      maxGuestQueueRowsPerGuest: 2,
    }
    const tip = pickActivePlayerHelpTip(ctx, new Set())
    expect(tip?.id).toBe('suggest-adblock-chrome')
    expect(tip?.priority).toBe(5)
  })

  it('shows adblock tip on empty-queue idle when blocking not detected', () => {
    const ctx: PlayerHelpTipContext = {
      adblockStatus: 'none',
      isSignalingConfigured: true,
      activeVideoId: null,
      audioSessionUnlocked: false,
      idleVariant: 'empty',
      queueLength: 0,
      embedSetupError: null,
      maxGuestQueueRowsPerGuest: 2,
    }
    expect(pickActivePlayerHelpTip(ctx, new Set())?.id).toBe('suggest-adblock-chrome')
  })

  it('skips dismissed ids', () => {
    const ctx: PlayerHelpTipContext = {
      adblockStatus: 'active',
      isSignalingConfigured: true,
      activeVideoId: 'abc',
      audioSessionUnlocked: true,
      idleVariant: null,
      queueLength: 2,
      embedSetupError: null,
      maxGuestQueueRowsPerGuest: 2,
    }
    expect(pickActivePlayerHelpTip(ctx, new Set(['guest-enqueue-while-playing']))).toBeNull()
  })
})

describe('PLAYER_HELP_TIP_DEFINITIONS', () => {
  it('has unique ids', () => {
    const ids = PLAYER_HELP_TIP_DEFINITIONS.map((d) => d.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('guest-enqueue-while-playing message reflects per-guest cap', () => {
    const def = PLAYER_HELP_TIP_DEFINITIONS.find((d) => d.id === 'guest-enqueue-while-playing')
    expect(def).toBeDefined()
    const base: PlayerHelpTipContext = {
      adblockStatus: 'none',
      isSignalingConfigured: true,
      activeVideoId: 'a'.repeat(11),
      audioSessionUnlocked: true,
      idleVariant: null,
      queueLength: 2,
      embedSetupError: null,
      maxGuestQueueRowsPerGuest: 5,
    }
    const msg5 = def ? resolvePlayerHelpTipMessage(def, base) : ''
    expect(msg5).toContain('5 songs')
    const msg1 = def
      ? resolvePlayerHelpTipMessage(def, { ...base, maxGuestQueueRowsPerGuest: 1 })
      : ''
    expect(msg1).toContain('one song')
  })
})
