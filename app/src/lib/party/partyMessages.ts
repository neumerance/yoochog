import type { HostVideoQueueSnapshot } from '@/lib/host-queue/hostVideoQueue'

/** Wire format version; bump when breaking JSON shape. */
export const PARTY_MESSAGE_SCHEMA_VERSION = 1 as const

/** Max accepted raw JSON string length before parse (see ADR 0002). */
export const PARTY_MESSAGE_MAX_RAW_BYTES = 256_000

/** Per-row title in queue snapshot / enqueue (bytes-ish guard; UTF-16 length in JS). */
export const PARTY_QUEUE_TITLE_MAX_LENGTH = 200

/** Display name / requester label on wire. */
export const PARTY_QUEUE_REQUESTED_BY_MAX_LENGTH = 64

export type PartyMessage =
  | {
      v: typeof PARTY_MESSAGE_SCHEMA_VERSION
      type: 'queue_snapshot'
      ids: string[]
      currentIndex: number | null
      titles: (string | null)[]
      requestedBys: (string | null)[]
    }
  | {
      v: typeof PARTY_MESSAGE_SCHEMA_VERSION
      type: 'enqueue_request'
      videoId: string
      title: string | null
      requestedBy: string | null
    }
  | {
      v: typeof PARTY_MESSAGE_SCHEMA_VERSION
      type: 'enqueue_rejected'
      reason: string
    }
  | {
      v: typeof PARTY_MESSAGE_SCHEMA_VERSION
      type: 'heartbeat'
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

function parseNullableTitle(value: unknown): string | null | 'invalid' {
  if (value === undefined || value === null) {
    return null
  }
  if (typeof value !== 'string') {
    return 'invalid'
  }
  const t = value.trim()
  if (t.length === 0) {
    return null
  }
  if (t.length > PARTY_QUEUE_TITLE_MAX_LENGTH) {
    return 'invalid'
  }
  return t
}

function parseNullableRequestedBy(value: unknown): string | null | 'invalid' {
  if (value === undefined || value === null) {
    return null
  }
  if (typeof value !== 'string') {
    return 'invalid'
  }
  const t = value.trim()
  if (t.length === 0) {
    return null
  }
  if (t.length > PARTY_QUEUE_REQUESTED_BY_MAX_LENGTH) {
    return 'invalid'
  }
  return t
}

function parseParallelMetadata(
  idsLen: number,
  titlesRaw: unknown,
  requestedBysRaw: unknown,
): { titles: (string | null)[]; requestedBys: (string | null)[] } | null {
  const hasTitles = titlesRaw !== undefined
  const hasReq = requestedBysRaw !== undefined

  if (!hasTitles && !hasReq) {
    const titles = Array.from({ length: idsLen }, () => null as string | null)
    const requestedBys = Array.from({ length: idsLen }, () => null as string | null)
    return { titles, requestedBys }
  }

  if (hasTitles !== hasReq) {
    return null
  }
  if (!Array.isArray(titlesRaw) || !Array.isArray(requestedBysRaw)) {
    return null
  }
  if (titlesRaw.length !== idsLen || requestedBysRaw.length !== idsLen) {
    return null
  }

  const titles: (string | null)[] = []
  const requestedBys: (string | null)[] = []

  for (let i = 0; i < idsLen; i++) {
    const ti = parseNullableTitle(titlesRaw[i])
    if (ti === 'invalid') {
      return null
    }
    titles.push(ti)

    const ri = parseNullableRequestedBy(requestedBysRaw[i])
    if (ri === 'invalid') {
      return null
    }
    requestedBys.push(ri)
  }

  return { titles, requestedBys }
}

function parseSnapshotPayload(
  v: unknown,
): Pick<
  PartyMessage & { type: 'queue_snapshot' },
  'ids' | 'currentIndex' | 'titles' | 'requestedBys'
> | null {
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
    return o.currentIndex === null ? { ids, currentIndex: null, titles: [], requestedBys: [] } : null
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

  const meta = parseParallelMetadata(ids.length, o.titles, o.requestedBys)
  if (!meta) {
    return null
  }

  return {
    ids,
    currentIndex: o.currentIndex,
    titles: meta.titles,
    requestedBys: meta.requestedBys,
  }
}

/**
 * Parses a UTF-8 JSON party message. Returns null for malformed, oversized, or unknown types.
 * Does not throw.
 */
export function parsePartyMessage(raw: string): PartyMessage | null {
  if (raw.length > PARTY_MESSAGE_MAX_RAW_BYTES) {
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
      titles: snap.titles,
      requestedBys: snap.requestedBys,
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
    const title = parseNullableTitle(o.title)
    if (title === 'invalid') {
      return null
    }
    const requestedBy = parseNullableRequestedBy(o.requestedBy)
    if (requestedBy === 'invalid') {
      return null
    }
    return {
      v: PARTY_MESSAGE_SCHEMA_VERSION,
      type: 'enqueue_request',
      videoId,
      title,
      requestedBy,
    }
  }
  if (o.type === 'enqueue_rejected') {
    if (typeof o.reason !== 'string' || o.reason.length > 500) {
      return null
    }
    return { v: PARTY_MESSAGE_SCHEMA_VERSION, type: 'enqueue_rejected', reason: o.reason }
  }
  if (o.type === 'heartbeat') {
    return { v: PARTY_MESSAGE_SCHEMA_VERSION, type: 'heartbeat' }
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
    titles: [...snapshot.titles],
    requestedBys: [...snapshot.requestedBys],
  }
}
