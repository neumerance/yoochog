import { describe, expect, it } from 'vitest'

import { PARTY_OFFLINE_RETRY_INTERVAL_MS } from './reconnectPolicy'

describe('reconnectPolicy', () => {
  it('offline retry interval is 3 seconds', () => {
    expect(PARTY_OFFLINE_RETRY_INTERVAL_MS).toBe(3000)
  })
})
