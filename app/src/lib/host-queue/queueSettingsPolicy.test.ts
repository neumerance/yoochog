import { describe, expect, it } from 'vitest'

import {
  QUEUE_SETTINGS_REJECTED_NOT_ADMIN,
  resolveQueueSettingsUpdateRequest,
} from './queueSettingsPolicy'

describe('resolveQueueSettingsUpdateRequest', () => {
  it('allows when requester logical id is session admin', () => {
    const r = resolveQueueSettingsUpdateRequest({
      sessionAdminGuestId: 'admin-g1',
      requesterGuestId: 'admin-g1',
    })
    expect(r).toEqual({ ok: true })
  })

  it('rejects when session admin is unset', () => {
    const r = resolveQueueSettingsUpdateRequest({
      sessionAdminGuestId: null,
      requesterGuestId: 'g1',
    })
    expect(r).toEqual({ ok: false, reason: QUEUE_SETTINGS_REJECTED_NOT_ADMIN })
  })

  it('rejects for non-admin guest', () => {
    const r = resolveQueueSettingsUpdateRequest({
      sessionAdminGuestId: 'admin-g1',
      requesterGuestId: 'g2',
    })
    expect(r).toEqual({ ok: false, reason: QUEUE_SETTINGS_REJECTED_NOT_ADMIN })
  })
})
