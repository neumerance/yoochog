/**
 * Adblock Plus on the Chrome Web Store (stable id).
 * Opens in a new tab from the host help tip when no ad blocker is detected.
 * @see https://chromewebstore.google.com/detail/adblock-plus-free-ad-bloc/cfhdojbkjhnklbpkdaibdccddilifddb
 */
export const ADBLOCK_PLUS_CHROME_WEB_STORE_URL =
  'https://chromewebstore.google.com/detail/adblock-plus-free-ad-bloc/cfhdojbkjhnklbpkdaibdccddilifddb'

/**
 * Widely blocklisted script URL — used when cosmetic bait is not hidden (e.g. blocker off for site,
 * or network blocking still active).
 */
export const AD_BLOCK_PROBE_SCRIPT_URL =
  'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js'

/**
 * Exported for tests — whether the bait element appears hidden by common filter/cosmetic rules.
 */
export function isBaitElementLikelyBlocked(bait: HTMLElement): boolean {
  const cs = getComputedStyle(bait)
  if (cs.display === 'none' || cs.visibility === 'hidden') {
    return true
  }
  const opacity = Number.parseFloat(cs.opacity)
  if (!Number.isNaN(opacity) && opacity === 0) {
    return true
  }
  return bait.offsetHeight === 0 && bait.offsetWidth === 0
}

function runBaitProbe(): Promise<boolean> {
  if (typeof document === 'undefined') {
    return Promise.resolve(false)
  }
  return new Promise((resolve) => {
    const bait = document.createElement('div')
    bait.className =
      'adsbox pub_300x250 pub_300x250m pub_728x90 text-ad textAd text_ad adbanner ad-banner'
    bait.setAttribute('aria-hidden', 'true')
    bait.style.cssText =
      'position:absolute!important;left:-9999px!important;top:-9999px!important;width:11px!important;height:11px!important;pointer-events:none!important;'
    document.body.appendChild(bait)

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        try {
          resolve(isBaitElementLikelyBlocked(bait))
        } catch {
          resolve(false)
        } finally {
          bait.remove()
        }
      })
    })
  })
}

/**
 * `true` = request failed quickly (often `ERR_BLOCKED_BY_CLIENT`), `false` = completed without
 * throwing, `null` = timeout / abort (treat as inconclusive → assume not blocked).
 */
export async function probeNetworkAdRequestLikelyBlocked(
  url: string = AD_BLOCK_PROBE_SCRIPT_URL,
  timeoutMs: number = 4500,
): Promise<boolean | null> {
  if (typeof fetch === 'undefined') {
    return null
  }
  const ac = new AbortController()
  const t = globalThis.setTimeout(() => ac.abort(), timeoutMs)
  try {
    await fetch(url, {
      method: 'GET',
      mode: 'no-cors',
      cache: 'no-store',
      signal: ac.signal,
    })
    globalThis.clearTimeout(t)
    return false
  } catch (e) {
    globalThis.clearTimeout(t)
    if (e instanceof DOMException && e.name === 'AbortError') {
      return null
    }
    return true
  }
}

/**
 * `true` if cosmetic blocking or network blocking likely active (tip hidden).
 * `false` if neither is detected — includes “no extension” and “extension off / paused for this tab”
 * (both look the same to the page).
 */
export async function runAdblockProbe(): Promise<boolean> {
  if (typeof document === 'undefined') {
    return false
  }
  const baitBlocked = await runBaitProbe()
  if (baitBlocked) {
    return true
  }
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return false
  }
  const net = await probeNetworkAdRequestLikelyBlocked()
  if (net === true) {
    return true
  }
  return false
}
