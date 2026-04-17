import type { HostVideoQueueSnapshot } from '@/lib/host-queue/hostVideoQueue'

const STORAGE_PREFIX = 'yoochog.guestQueue.v1.'

export function guestQueueStorageKey(sessionId: string): string {
  return `${STORAGE_PREFIX}${sessionId}`
}

/**
 * Caches the last known queue snapshot for a join session so guests see the list immediately
 * after reload until the party channel delivers a fresh snapshot.
 */
export function saveGuestQueueSnapshot(sessionId: string, snapshot: HostVideoQueueSnapshot): void {
  if (typeof localStorage === 'undefined') {
    return
  }
  try {
    localStorage.setItem(
      guestQueueStorageKey(sessionId),
      JSON.stringify({
        ids: [...snapshot.ids],
        titles: [...snapshot.titles],
        requestedBys: [...snapshot.requestedBys],
        requesterGuestIds: [...snapshot.requesterGuestIds],
        currentIndex: snapshot.currentIndex,
      }),
    )
  } catch {
    // ignore
  }
}

export function loadGuestQueueSnapshot(sessionId: string): HostVideoQueueSnapshot | null {
  if (typeof localStorage === 'undefined') {
    return null
  }
  try {
    const raw = localStorage.getItem(guestQueueStorageKey(sessionId))
    if (!raw) {
      return null
    }
    const o = JSON.parse(raw) as Record<string, unknown>
    if (!Array.isArray(o.ids) || !Array.isArray(o.titles) || !Array.isArray(o.requestedBys)) {
      return null
    }
    if (o.ids.length !== o.titles.length || o.ids.length !== o.requestedBys.length) {
      return null
    }
    if (
      o.requesterGuestIds !== undefined &&
      (!Array.isArray(o.requesterGuestIds) || o.requesterGuestIds.length !== o.ids.length)
    ) {
      return null
    }
    if (o.ids.length === 0) {
      return o.currentIndex === null
        ? {
            ids: Object.freeze([]),
            titles: Object.freeze([]),
            requestedBys: Object.freeze([]),
            requesterGuestIds: Object.freeze([]),
            currentIndex: null,
          }
        : null
    }
    if (typeof o.currentIndex !== 'number' || o.currentIndex < 0 || o.currentIndex >= o.ids.length) {
      return null
    }
    const requesterGuestIdsRaw =
      o.requesterGuestIds !== undefined ? (o.requesterGuestIds as unknown[]) : null
    const requesterGuestIds = (o.ids as string[]).map((_, i) => {
      const gi = requesterGuestIdsRaw?.[i]
      return gi === null ? null : typeof gi === 'string' ? gi : null
    })
    return {
      ids: Object.freeze([...(o.ids as string[])]),
      titles: Object.freeze([...(o.titles as (string | null)[])]),
      requestedBys: Object.freeze([...(o.requestedBys as (string | null)[])]),
      requesterGuestIds: Object.freeze(requesterGuestIds),
      currentIndex: o.currentIndex,
    }
  } catch {
    return null
  }
}
