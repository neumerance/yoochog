import type { HostVideoQueueItem, HostVideoQueueSnapshot } from './hostVideoQueue'

const STORAGE_PREFIX = 'yoochog.hostQueue.v1.'

export function hostQueueStorageKey(sessionId: string): string {
  return `${STORAGE_PREFIX}${sessionId}`
}

export function snapshotToItems(snapshot: HostVideoQueueSnapshot): HostVideoQueueItem[] {
  return snapshot.ids.map((videoId, i) => ({
    videoId,
    title: snapshot.titles[i] ?? null,
    requestedBy: snapshot.requestedBys[i] ?? null,
    requesterGuestId: snapshot.requesterGuestIds[i] ?? null,
  }))
}

/**
 * Persists the host playback queue for reload recovery. Keyed by party session id.
 */
export function saveHostQueue(sessionId: string, snapshot: HostVideoQueueSnapshot): void {
  if (typeof localStorage === 'undefined') {
    return
  }
  try {
    localStorage.setItem(
      hostQueueStorageKey(sessionId),
      JSON.stringify({
        ids: [...snapshot.ids],
        titles: [...snapshot.titles],
        requestedBys: [...snapshot.requestedBys],
        requesterGuestIds: [...snapshot.requesterGuestIds],
        currentIndex: snapshot.currentIndex,
      }),
    )
  } catch {
    // Quota or private mode — ignore.
  }
}

function isValidSnapshot(o: unknown): o is {
  ids: string[]
  titles: unknown[]
  requestedBys: unknown[]
  requesterGuestIds?: unknown[]
  currentIndex: number | null
} {
  if (typeof o !== 'object' || o === null) {
    return false
  }
  const x = o as Record<string, unknown>
  if (!Array.isArray(x.ids)) {
    return false
  }
  if (!Array.isArray(x.titles) || !Array.isArray(x.requestedBys)) {
    return false
  }
  if (x.ids.length !== x.titles.length || x.ids.length !== x.requestedBys.length) {
    return false
  }
  if (
    x.requesterGuestIds !== undefined &&
    (!Array.isArray(x.requesterGuestIds) || x.requesterGuestIds.length !== x.ids.length)
  ) {
    return false
  }
  if (x.currentIndex !== null && typeof x.currentIndex !== 'number') {
    return false
  }
  if (x.currentIndex !== null && (!Number.isInteger(x.currentIndex) || x.currentIndex < 0)) {
    return false
  }
  if (x.ids.length === 0) {
    return x.currentIndex === null
  }
  if (x.currentIndex === null) {
    return false
  }
  return x.currentIndex < x.ids.length
}

/**
 * Loads a previously saved host queue snapshot, or `null` if missing/invalid.
 */
export function loadHostQueue(sessionId: string): HostVideoQueueSnapshot | null {
  if (typeof localStorage === 'undefined') {
    return null
  }
  try {
    const raw = localStorage.getItem(hostQueueStorageKey(sessionId))
    if (!raw) {
      return null
    }
    const parsed = JSON.parse(raw) as unknown
    if (!isValidSnapshot(parsed)) {
      return null
    }
    const titles: (string | null)[] = []
    const requestedBys: (string | null)[] = []
    const requesterGuestIds: (string | null)[] = []
    for (let i = 0; i < parsed.ids.length; i++) {
      const ti = parsed.titles[i]
      const ri = parsed.requestedBys[i]
      titles.push(ti === null ? null : typeof ti === 'string' ? ti : null)
      requestedBys.push(ri === null ? null : typeof ri === 'string' ? ri : null)
      const gi =
        parsed.requesterGuestIds !== undefined ? parsed.requesterGuestIds[i] : undefined
      requesterGuestIds.push(gi === null ? null : typeof gi === 'string' ? gi : null)
    }
    return {
      ids: Object.freeze([...parsed.ids]),
      titles: Object.freeze(titles),
      requestedBys: Object.freeze(requestedBys),
      requesterGuestIds: Object.freeze(requesterGuestIds),
      currentIndex: parsed.currentIndex,
    }
  } catch {
    return null
  }
}
