import { getValidGtmContainerId } from './env'

declare global {
  interface Window {
    __yoochogGtmInjected?: boolean
    dataLayer?: unknown[]
  }
}

export function buildGtmLoaderUrl(containerId: string): string {
  const id = getValidGtmContainerId(containerId)
  if (!id) {
    return ''
  }
  const url = new URL('https://www.googletagmanager.com/gtm.js')
  url.searchParams.set('id', id)
  return url.toString()
}

/**
 * Injects the standard GTM loader script once per page load. Call only after explicit consent.
 * No-ops when `document` / `window` are unavailable (SSR or tests without DOM).
 */
export function injectGoogleTagManagerOnce(containerId: string): boolean {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return false
  }
  const id = getValidGtmContainerId(containerId)
  if (!id) {
    return false
  }
  if (window.__yoochogGtmInjected) {
    return true
  }

  window.dataLayer = window.dataLayer ?? []
  window.dataLayer.push({ event: 'gtm.js', 'gtm.start': Date.now() })

  const script = document.createElement('script')
  script.async = true
  script.src = buildGtmLoaderUrl(id)

  const firstScript = document.getElementsByTagName('script')[0]
  const parent = firstScript?.parentNode
  if (parent) {
    parent.insertBefore(script, firstScript)
  } else {
    document.head.appendChild(script)
  }
  window.__yoochogGtmInjected = true
  return true
}

/** Clears injection guard; for unit tests only. */
export function resetGtmInjectionForTests(): void {
  if (typeof window !== 'undefined') {
    delete window.__yoochogGtmInjected
  }
}
