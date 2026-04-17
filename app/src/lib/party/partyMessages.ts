import type { HostVideoQueueSnapshot } from '@/lib/host-queue/hostVideoQueue'

/** Wire format version; bump when breaking JSON shape. */
export const PARTY_MESSAGE_SCHEMA_VERSION = 1 as const

const MAX_RAW_BYTES = 256_000

export type PartyMessage =
  | {
      v: typeof PARTY_MESSAGE_SCHEMA_VERSION
      type: 'queue_snapshot'
      ids: string[]
      currentIndex: number | null
    }
  | {
      v: typeof PARTY_MESSAGE_SCHEMA_VERSION
      type: 'enqueue_request'
      videoId: string
    }
  | {
      v: typeof PARTY_MESSAGE_SCHEMA_VERSION
      type: 'enqueue_rejected'
      reason: string
    }

/** YouTube video id: 11 chars from [A-Za-z0-9_-]. */
export function isPlausibleYoutubeVideoId(id: string): boolean {
  if (id.length !== 11) {
    return false
  }
  return /^[A-Za-z0-9_-]{11}$/.test(id)
}

function isNonNegativeInteger(n: unknown): n is number {
  return typeof n === 'number' && Number.isInteger(n) && n >= 0
}

function parseSnapshotPayload(
  v: unknown,
): Pick<PartyMessage & { type: 'queue_snapshot' }, 'ids' | 'currentIndex'> | null {
  if (typeof v !== 'object' || v === null) {
    return null
  }
  const o = v as Record<string, unknown>
  if (!Array.isArray(o.ids)) {
    return null
  }
  const ids: string[] = []
  for (const x of o.ids) {
    if (typeof x !== 'string' || x.length > 64) {
      return null
    }
    ids.push(x)
  }
  if (ids.length > 500) {
    return null
  }
  if (ids.length === 0) {
    return o.currentIndex === null ? { ids, currentIndex: null } : null
  }
  if (o.currentIndex === null) {
    return null
  }
  if (!isNonNegativeInteger(o.currentIndex)) {
    return null
  }
  if (o.currentIndex >= ids.length) {
    return null
  }
  return { ids, currentIndex: o.currentIndex }
}

/**
 * Parses a UTF-8 JSON party message. Returns null for malformed, oversized, or unknown types.
 * Does not throw.
 */
export function parsePartyMessage(raw: string): PartyMessage | null {
  if (raw.length > MAX_RAW_BYTES) {
    return null
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(raw) as unknown
  } catch {
    return null
  }
  if (typeof parsed !== 'object' || parsed === null) {
    return null
  }
  const o = parsed as Record<string, unknown>
  if (o.v !== PARTY_MESSAGE_SCHEMA_VERSION) {
    return null
  }
  if (o.type === 'queue_snapshot') {
    const snap = parseSnapshotPayload(parsed)
    if (!snap) {
      return null
    }
    return {
      v: PARTY_MESSAGE_SCHEMA_VERSION,
      type: 'queue_snapshot',
      ids: snap.ids,
      currentIndex: snap.currentIndex,
    }
  }
  if (o.type === 'enqueue_request') {
    if (typeof o.videoId !== 'string') {
      return null
    }
    const videoId = o.videoId.trim()
    if (!isPlausibleYoutubeVideoId(videoId)) {
      return null
    }
    return { v: PARTY_MESSAGE_SCHEMA_VERSION, type: 'enqueue_request', videoId }
  }
  if (o.type === 'enqueue_rejected') {
    if (typeof o.reason !== 'string' || o.reason.length > 500) {
      return null
    }
    return { v: PARTY_MESSAGE_SCHEMA_VERSION, type: 'enqueue_rejected', reason: o.reason }
  }
  return null
}

export function serializePartyMessage(msg: PartyMessage): string {
  return JSON.stringify(msg)
}

export function queueSnapshotToMessage(snapshot: HostVideoQueueSnapshot): PartyMessage {
  return {
    v: PARTY_MESSAGE_SCHEMA_VERSION,
    type: 'queue_snapshot',
    ids: [...snapshot.ids],
    currentIndex: snapshot.currentIndex,
  }
}
