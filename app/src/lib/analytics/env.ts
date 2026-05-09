/**
 * Subset of Vite env used for analytics gating (unit-testable without import.meta).
 */
export type ViteAnalyticsEnv = {
  PROD: boolean
  DEV: boolean
  VITE_GTM_CONTAINER_ID?: string
  VITE_ANALYTICS_DEV?: string
}

const GTM_ID_RE = /^GTM-[A-Z0-9]+$/i

/**
 * Returns a normalized GTM container id, or null if missing/invalid.
 */
export function getValidGtmContainerId(raw: string | undefined): string | null {
  if (raw === undefined) {
    return null
  }
  const trimmed = raw.trim()
  if (!trimmed) {
    return null
  }
  if (!GTM_ID_RE.test(trimmed)) {
    return null
  }
  return trimmed.toUpperCase()
}

/**
 * Whether the build/runtime environment allows loading GTM at all (independent of consent).
 * Production builds with a valid id are enabled; dev only with explicit override.
 */
export function isAnalyticsEnvironmentEnabled(env: ViteAnalyticsEnv): boolean {
  const id = getValidGtmContainerId(env.VITE_GTM_CONTAINER_ID)
  if (!id) {
    return false
  }
  if (env.PROD) {
    return true
  }
  return env.DEV === true && env.VITE_ANALYTICS_DEV === 'true'
}

export function analyticsEnvFromImportMeta(metaEnv: ImportMeta['env']): ViteAnalyticsEnv {
  return {
    PROD: metaEnv.PROD,
    DEV: metaEnv.DEV,
    VITE_GTM_CONTAINER_ID: metaEnv.VITE_GTM_CONTAINER_ID,
    VITE_ANALYTICS_DEV: metaEnv.VITE_ANALYTICS_DEV,
  }
}
