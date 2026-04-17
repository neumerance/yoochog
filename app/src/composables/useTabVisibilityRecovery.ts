import { onUnmounted } from 'vue'

export type UseTabVisibilityRecoveryOptions = {
  /** Minimum time the tab was hidden before `onVisibleAfterHidden` runs (ms). */
  minHiddenMs: number
  /** Called when the tab becomes visible again after being hidden at least `minHiddenMs`. */
  onVisibleAfterHidden: () => void
}

/**
 * Fires recovery when the user returns after a long background (e.g. mobile app switch).
 * Short tab switches do not trigger (see minHiddenMs).
 */
export function useTabVisibilityRecovery(options: UseTabVisibilityRecoveryOptions) {
  const { minHiddenMs, onVisibleAfterHidden } = options
  let hiddenAt: number | null = null

  function onVisibilityChange() {
    if (typeof document === 'undefined') {
      return
    }
    if (document.visibilityState === 'hidden') {
      hiddenAt = Date.now()
      return
    }
    if (document.visibilityState === 'visible' && hiddenAt !== null) {
      const elapsed = Date.now() - hiddenAt
      hiddenAt = null
      if (elapsed >= minHiddenMs) {
        onVisibleAfterHidden()
      }
    }
  }

  document.addEventListener('visibilitychange', onVisibilityChange)
  onUnmounted(() => {
    document.removeEventListener('visibilitychange', onVisibilityChange)
  })
}
