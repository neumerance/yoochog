import { describe, expect, it } from 'vitest'

import {
  QUEUE_SETTINGS_REJECTED_NOT_ADMIN,
  resolveQueueSettingsUpdateRequest,
} from './queueSettingsPolicy'

describe('resolveQueueSettingsUpdateRequest', () => {
  it('allows when requester logical id is session admin', () => {
    const r = resolveQueueSettingsUpdateRequest({
      sessionAdminGuestIds: ['admin-g1'],
      requesterGuestId: 'admin-g1',
    })
    expect(r).toEqual({ ok: true })
  })

  it('rejects when no session admins', () => {
    const r = resolveQueueSettingsUpdateRequest({
      sessionAdminGuestIds: [],
      requesterGuestId: 'g1',
    })
    expect(r).toEqual({ ok: false, reason: QUEUE_SETTINGS_REJECTED_NOT_ADMIN })
  })

  it('rejects for non-admin guest', () => {
    const r = resolveQueueSettingsUpdateRequest({
      sessionAdminGuestIds: ['admin-g1'],
      requesterGuestId: 'g2',
    })
    expect(r).toEqual({ ok: false, reason: QUEUE_SETTINGS_REJECTED_NOT_ADMIN })
  })

  it('allows when requester is one of several admins', () => {
    const r = resolveQueueSettingsUpdateRequest({
      sessionAdminGuestIds: ['a', 'b'],
      requesterGuestId: 'b',
    })
    expect(r).toEqual({ ok: true })
  })
})
