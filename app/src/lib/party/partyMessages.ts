import {
  GUEST_QUEUE_ROWS_CAP_DEFAULT,
  GUEST_QUEUE_ROWS_CAP_MAX,
  GUEST_QUEUE_ROWS_CAP_MIN,
  normalizeGuestQueueRowsCap,
} from '@/lib/host-queue/guestQueueLimits'
import type { HostVideoQueueSnapshot } from '@/lib/host-queue/hostVideoQueue'

import {
  normalizeAudienceChatInput,
  validateAudienceChatText,
} from '@/lib/party/audienceChatValidation'

/** Re-export for wire protocol / ADR (issue #79). */
export {
  PARTY_AUDIENCE_CHAT_MAX_CHARS,
  PARTY_AUDIENCE_CHAT_MAX_WORDS,
} from '@/lib/party/audienceChatValidation'

/** Wire format version; bump when breaking JSON shape. */
export const PARTY_MESSAGE_SCHEMA_VERSION = 1 as const

/** Max accepted raw JSON string length before parse (see ADR 0002). */
export const PARTY_MESSAGE_MAX_RAW_BYTES = 256_000

/** Per-row title in queue snapshot / enqueue (bytes-ish guard; UTF-16 length in JS). */
export const PARTY_QUEUE_TITLE_MAX_LENGTH = 200

/** Display name / requester label on wire. */
export const PARTY_QUEUE_REQUESTED_BY_MAX_LENGTH = 64

/** Logical guest id on wire (UUID from guest session storage or legacy peer id fallback). */
export const PARTY_QUEUE_REQUESTER_GUEST_ID_MAX_LENGTH = 64

export type PartyMessage =
  | {
      v: typeof PARTY_MESSAGE_SCHEMA_VERSION
      type: 'queue_snapshot'
      ids: string[]
      currentIndex: number | null
      titles: (string | null)[]
      requestedBys: (string | null)[]
      requesterGuestIds: (string | null)[]
      /**
       * Stable logical guest id (`requesterGuestId`) of the session admin — the first guest to
       * identify in the session. Same JSON field name as early builds; not a signaling peer id.
       */
      sessionAdminPeerId: string | null
      /**
       * Max queue rows (now playing + waiting) per guest. Older snapshots omit the key on the wire
       * → default 2. After parse this is always 1–10.
       */
      maxGuestQueueRowsPerGuest: number
    }
  | {
      v: typeof PARTY_MESSAGE_SCHEMA_VERSION
      type: 'enqueue_request'
      videoId: string
      title: string | null
      requestedBy: string | null
      requesterGuestId: string | null
    }
  | {
      v: typeof PARTY_MESSAGE_SCHEMA_VERSION
      type: 'end_current_playback_request'
      requesterGuestId: string | null
    }
  | {
      v: typeof PARTY_MESSAGE_SCHEMA_VERSION
      type: 'remove_queue_row_request'
      rowIndex: number
      /** Logical guest id (same as enqueue); host matches `requesterGuestIds[rowIndex]`. */
      requesterGuestId: string | null
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
  | {
      v: typeof PARTY_MESSAGE_SCHEMA_VERSION
      type: 'guest_identify'
      requesterGuestId: string
    }
  | {
      v: typeof PARTY_MESSAGE_SCHEMA_VERSION
      type: 'audience_chat_request'
      /** Normalized text (trim + collapsed whitespace). */
      text: string
      requesterGuestId: string
      /** Guest display name for host overlay; same rules as enqueue `requestedBy`. */
      requestedBy: string | null
    }
  | {
      v: typeof PARTY_MESSAGE_SCHEMA_VERSION
      type: 'chat_rejected'
      /** Human-readable reason for the guest UI (max 500 chars). */
      reason: string
    }
  | {
      v: typeof PARTY_MESSAGE_SCHEMA_VERSION
      type: 'queue_settings_update_request'
      maxGuestQueueRowsPerGuest: number
      requesterGuestId: string
    }
  | {
      v: typeof PARTY_MESSAGE_SCHEMA_VERSION
      type: 'queue_settings_rejected'
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

function parseNullableRequesterGuestId(value: unknown): string | null | 'invalid' {
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
  if (t.length > PARTY_QUEUE_REQUESTER_GUEST_ID_MAX_LENGTH) {
    return 'invalid'
  }
  return t
}

function parseOptionalRequesterGuestIds(
  idsLen: number,
  raw: unknown,
): (string | null)[] | null {
  if (raw === undefined) {
    return Array.from({ length: idsLen }, () => null as string | null)
  }
  if (!Array.isArray(raw) || raw.length !== idsLen) {
    return null
  }
  const out: (string | null)[] = []
  for (let i = 0; i < idsLen; i++) {
    const ri = parseNullableRequesterGuestId(raw[i])
    if (ri === 'invalid') {
      return null
    }
    out.push(ri)
  }
  return out
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

function parseNullableSessionAdminPeerId(value: unknown): string | null | 'invalid' {
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
  if (t.length > PARTY_QUEUE_REQUESTER_GUEST_ID_MAX_LENGTH) {
    return 'invalid'
  }
  return t
}

function parseSnapshotPayload(
  v: unknown,
): Pick<
  PartyMessage & { type: 'queue_snapshot' },
  | 'ids'
  | 'currentIndex'
  | 'titles'
  | 'requestedBys'
  | 'requesterGuestIds'
  | 'sessionAdminPeerId'
  | 'maxGuestQueueRowsPerGuest'
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
    if (o.currentIndex !== null) {
      return null
    }
    const sessionAdminPeerIdEmpty = parseNullableSessionAdminPeerId(o.sessionAdminPeerId)
    if (sessionAdminPeerIdEmpty === 'invalid') {
      return null
    }
    return {
      ids,
      currentIndex: null,
      titles: [],
      requestedBys: [],
      requesterGuestIds: [],
      sessionAdminPeerId: sessionAdminPeerIdEmpty,
      maxGuestQueueRowsPerGuest: normalizeGuestQueueRowsCap(o.maxGuestQueueRowsPerGuest),
    }
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

  const requesterGuestIds = parseOptionalRequesterGuestIds(ids.length, o.requesterGuestIds)
  if (!requesterGuestIds) {
    return null
  }

  const sessionAdminPeerId = parseNullableSessionAdminPeerId(o.sessionAdminPeerId)
  if (sessionAdminPeerId === 'invalid') {
    return null
  }

  return {
    ids,
    currentIndex: o.currentIndex,
    titles: meta.titles,
    requestedBys: meta.requestedBys,
    requesterGuestIds,
    sessionAdminPeerId,
    maxGuestQueueRowsPerGuest: normalizeGuestQueueRowsCap(o.maxGuestQueueRowsPerGuest),
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
      requesterGuestIds: snap.requesterGuestIds,
      sessionAdminPeerId: snap.sessionAdminPeerId,
      maxGuestQueueRowsPerGuest: snap.maxGuestQueueRowsPerGuest,
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
    const requesterGuestId = parseNullableRequesterGuestId(o.requesterGuestId)
    if (requesterGuestId === 'invalid') {
      return null
    }
    return {
      v: PARTY_MESSAGE_SCHEMA_VERSION,
      type: 'enqueue_request',
      videoId,
      title,
      requestedBy,
      requesterGuestId,
    }
  }
  if (o.type === 'end_current_playback_request') {
    const requesterGuestId = parseNullableRequesterGuestId(o.requesterGuestId)
    if (requesterGuestId === 'invalid') {
      return null
    }
    return {
      v: PARTY_MESSAGE_SCHEMA_VERSION,
      type: 'end_current_playback_request',
      requesterGuestId,
    }
  }
  if (o.type === 'remove_queue_row_request') {
    if (!isNonNegativeInteger(o.rowIndex)) {
      return null
    }
    const requesterGuestId = parseNullableRequesterGuestId(o.requesterGuestId)
    if (requesterGuestId === 'invalid') {
      return null
    }
    return {
      v: PARTY_MESSAGE_SCHEMA_VERSION,
      type: 'remove_queue_row_request',
      rowIndex: o.rowIndex,
      requesterGuestId,
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
  if (o.type === 'guest_identify') {
    const requesterGuestId = parseNullableRequesterGuestId(o.requesterGuestId)
    if (requesterGuestId === 'invalid' || requesterGuestId === null) {
      return null
    }
    return {
      v: PARTY_MESSAGE_SCHEMA_VERSION,
      type: 'guest_identify',
      requesterGuestId,
    }
  }
  if (o.type === 'audience_chat_request') {
    const requesterGuestId = parseNullableRequesterGuestId(o.requesterGuestId)
    if (requesterGuestId === 'invalid' || requesterGuestId === null) {
      return null
    }
    if (typeof o.text !== 'string') {
      return null
    }
    const text = normalizeAudienceChatInput(o.text)
    const validated = validateAudienceChatText(text)
    if (!validated.ok) {
      return null
    }
    const requestedBy = parseNullableRequestedBy(o.requestedBy)
    if (requestedBy === 'invalid') {
      return null
    }
    return {
      v: PARTY_MESSAGE_SCHEMA_VERSION,
      type: 'audience_chat_request',
      text,
      requesterGuestId,
      requestedBy,
    }
  }
  if (o.type === 'chat_rejected') {
    if (typeof o.reason !== 'string' || o.reason.length > 500) {
      return null
    }
    return { v: PARTY_MESSAGE_SCHEMA_VERSION, type: 'chat_rejected', reason: o.reason }
  }
  if (o.type === 'queue_settings_update_request') {
    if (typeof o.maxGuestQueueRowsPerGuest !== 'number' || !Number.isInteger(o.maxGuestQueueRowsPerGuest)) {
      return null
    }
    const n = o.maxGuestQueueRowsPerGuest
    if (n < GUEST_QUEUE_ROWS_CAP_MIN || n > GUEST_QUEUE_ROWS_CAP_MAX) {
      return null
    }
    const requesterGuestId = parseNullableRequesterGuestId(o.requesterGuestId)
    if (requesterGuestId === 'invalid' || requesterGuestId === null) {
      return null
    }
    return {
      v: PARTY_MESSAGE_SCHEMA_VERSION,
      type: 'queue_settings_update_request',
      maxGuestQueueRowsPerGuest: n,
      requesterGuestId,
    }
  }
  if (o.type === 'queue_settings_rejected') {
    if (typeof o.reason !== 'string' || o.reason.length > 500) {
      return null
    }
    return { v: PARTY_MESSAGE_SCHEMA_VERSION, type: 'queue_settings_rejected', reason: o.reason }
  }
  return null
}

export function serializePartyMessage(msg: PartyMessage): string {
  return JSON.stringify(msg)
}

export function queueSnapshotToMessage(
  snapshot: HostVideoQueueSnapshot,
  sessionAdminPeerId: string | null = null,
  maxGuestQueueRowsPerGuest: number = GUEST_QUEUE_ROWS_CAP_DEFAULT,
): PartyMessage {
  return {
    v: PARTY_MESSAGE_SCHEMA_VERSION,
    type: 'queue_snapshot',
    ids: [...snapshot.ids],
    currentIndex: snapshot.currentIndex,
    titles: [...snapshot.titles],
    requestedBys: [...snapshot.requestedBys],
    requesterGuestIds: [...snapshot.requesterGuestIds],
    sessionAdminPeerId,
    maxGuestQueueRowsPerGuest: normalizeGuestQueueRowsCap(maxGuestQueueRowsPerGuest),
  }
}
