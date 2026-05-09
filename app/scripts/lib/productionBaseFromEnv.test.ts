import { describe, expect, it } from 'vitest'

import { productionBaseFromEnv } from './productionBaseFromEnv.mjs'

describe('productionBaseFromEnv', () => {
  it('defaults to /yoochog/ when unset', () => {
    expect(productionBaseFromEnv({})).toBe('/yoochog/')
    expect(productionBaseFromEnv({ VITE_BASE_PATH: '' })).toBe('/yoochog/')
  })

  it('normalizes / and custom prefixes', () => {
    expect(productionBaseFromEnv({ VITE_BASE_PATH: '/' })).toBe('/')
    expect(productionBaseFromEnv({ VITE_BASE_PATH: '/watch' })).toBe('/watch/')
    expect(productionBaseFromEnv({ VITE_BASE_PATH: '/watch/' })).toBe('/watch/')
  })
})
