import { describe, expect, it } from 'vitest'

import {
  analyticsEnvFromImportMeta,
  getValidGtmContainerId,
  isAnalyticsEnvironmentEnabled,
  type ViteAnalyticsEnv,
} from './env'

describe('getValidGtmContainerId', () => {
  it('returns null for empty or invalid', () => {
    expect(getValidGtmContainerId(undefined)).toBe(null)
    expect(getValidGtmContainerId('')).toBe(null)
    expect(getValidGtmContainerId('  ')).toBe(null)
    expect(getValidGtmContainerId('UA-123')).toBe(null)
    expect(getValidGtmContainerId('GT-M123')).toBe(null)
  })

  it('accepts canonical GTM ids case-insensitively', () => {
    expect(getValidGtmContainerId('GTM-ABC123')).toBe('GTM-ABC123')
    expect(getValidGtmContainerId('  gtm-xx99  ')).toBe('GTM-XX99')
  })
})

describe('isAnalyticsEnvironmentEnabled', () => {
  const idOk: ViteAnalyticsEnv = {
    PROD: true,
    DEV: false,
    VITE_GTM_CONTAINER_ID: 'GTM-XXXX',
  }

  it('enables in prod with valid id', () => {
    expect(isAnalyticsEnvironmentEnabled(idOk)).toBe(true)
  })

  it('disables in prod without id', () => {
    expect(
      isAnalyticsEnvironmentEnabled({ PROD: true, DEV: false, VITE_GTM_CONTAINER_ID: '' }),
    ).toBe(false)
  })

  it('disables in dev with id unless VITE_ANALYTICS_DEV', () => {
    expect(
      isAnalyticsEnvironmentEnabled({
        PROD: false,
        DEV: true,
        VITE_GTM_CONTAINER_ID: 'GTM-XXXX',
      }),
    ).toBe(false)
    expect(
      isAnalyticsEnvironmentEnabled({
        PROD: false,
        DEV: true,
        VITE_GTM_CONTAINER_ID: 'GTM-XXXX',
        VITE_ANALYTICS_DEV: 'true',
      }),
    ).toBe(true)
  })

  it('disables dev override when analytics dev is not exactly true', () => {
    expect(
      isAnalyticsEnvironmentEnabled({
        PROD: false,
        DEV: true,
        VITE_GTM_CONTAINER_ID: 'GTM-XXXX',
        VITE_ANALYTICS_DEV: '1',
      }),
    ).toBe(false)
  })
})

describe('analyticsEnvFromImportMeta', () => {
  it('maps import.meta-shaped object', () => {
    const meta = {
      PROD: true,
      DEV: false,
      VITE_GTM_CONTAINER_ID: 'GTM-ZZ',
    } as ImportMeta['env']
    const snap = analyticsEnvFromImportMeta(meta)
    expect(snap.PROD).toBe(true)
    expect(snap.VITE_GTM_CONTAINER_ID).toBe('GTM-ZZ')
    expect(isAnalyticsEnvironmentEnabled(snap)).toBe(true)
  })
})
