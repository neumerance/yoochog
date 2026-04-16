import { readonly, ref } from 'vue'

import { getOrCreateHostSessionId } from '@/lib/host-session/hostSessionId'

/**
 * Stable, unguessable id for this host tab (sessionStorage). Used for future join URLs / QR (Epic 3).
 */
export function useHostSessionId() {
  const hostSessionId = ref(
    typeof sessionStorage !== 'undefined'
      ? getOrCreateHostSessionId(sessionStorage, () => crypto.randomUUID())
      : '',
  )

  return {
    hostSessionId: readonly(hostSessionId),
  }
}
