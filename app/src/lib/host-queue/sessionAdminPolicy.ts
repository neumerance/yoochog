import type { HostVideoQueueSnapshot } from './hostVideoQueue'

/** Nothing is currently playing or the queue snapshot has no current row. */
export const SESSION_ADMIN_REJECTED_NOTHING_PLAYING
  = 'Nothing is playing right now.'

/** Current row has no recorded guest owner (legacy). */
export const END_PLAYBACK_REJECTED_LEGACY_ROW
  = 'This track can’t be ended from a guest device.'

/** Effective guest id does not own the now-playing row. */
export const END_PLAYBACK_REJECTED_NOT_OWNER
  = 'Only the person who requested the song can end it.'

/** `rowIndex` is out of range for the current queue. */
export const REMOVE_ROW_REJECTED_BAD_INDEX
  = 'That queue row doesn’t exist.'

/** Row has no stored requester id (legacy); only session admin may remove. */
export const REMOVE_ROW_REJECTED_LEGACY_ROW
  = 'That row can’t be removed from a guest device.'

/** Neither session admin nor the row’s requester. */
export const REMOVE_ROW_REJECTED_NOT_OWNER
  = 'Only the session admin or the person who requested that song can remove it.'

export type SessionAdminResolution = { ok: true } | { ok: false; reason: string }

/**
 * Host-only: whether the guest may end the current playback early (“stop current”), matching natural
 * end-of-track semantics on success. Allowed when the requester is the **session admin** **or** the
 * **owner** of the now-playing row (`requesterGuestIds[current]` matches `parsedRequesterGuestId ??
 * peerGuestId`). Session admin may also end legacy rows with no stored owner.
 */
export function resolveSessionAdminEndPlaybackRequest(input: {
  snapshot: HostVideoQueueSnapshot
  /** Logical guest id of the session admin (first guest in the session), or `null` when unset. */
  sessionAdminGuestId: string | null
  /** WebRTC signaling `clientId` for this guest connection (owner fallback when body omits id). */
  peerGuestId: string
  /** Parsed from `end_current_playback_request`; enqueue-style logical id when set. */
  parsedRequesterGuestId: string | null
}): SessionAdminResolution {
  const { snapshot, sessionAdminGuestId, peerGuestId, parsedRequesterGuestId } = input
  if (snapshot.ids.length === 0 || snapshot.currentIndex === null) {
    return { ok: false, reason: SESSION_ADMIN_REJECTED_NOTHING_PLAYING }
  }

  const effectiveRequester = parsedRequesterGuestId ?? peerGuestId
  const isAdmin =
    sessionAdminGuestId !== null && effectiveRequester === sessionAdminGuestId
  if (isAdmin) {
    return { ok: true }
  }

  const ci = snapshot.currentIndex
  const rowOwner = snapshot.requesterGuestIds[ci]
  if (rowOwner === null) {
    return { ok: false, reason: END_PLAYBACK_REJECTED_LEGACY_ROW }
  }
  const effectiveOwnerId = parsedRequesterGuestId ?? peerGuestId
  if (rowOwner !== effectiveOwnerId) {
    return { ok: false, reason: END_PLAYBACK_REJECTED_NOT_OWNER }
  }
  return { ok: true }
}

/**
 * Host-only: guest pause of the now-playing clip — same allow-list as {@link resolveSessionAdminEndPlaybackRequest}
 * (session admin or owner of the current row).
 */
export function resolveSessionAdminPausePlaybackRequest(
  input: Parameters<typeof resolveSessionAdminEndPlaybackRequest>[0],
): SessionAdminResolution {
  return resolveSessionAdminEndPlaybackRequest(input)
}

/**
 * Host-only: guest resume of the now-playing clip — same gate as end / pause.
 */
export function resolveSessionAdminResumePlaybackRequest(
  input: Parameters<typeof resolveSessionAdminEndPlaybackRequest>[0],
): SessionAdminResolution {
  return resolveSessionAdminEndPlaybackRequest(input)
}

/**
 * Host-only: remove a queue row by index. **Session admin** (any row) **or** **owner** of that row
 * (`requesterGuestIds[rowIndex]` matches `parsedRequesterGuestId ?? peerGuestId`). Session admin may
 * remove legacy rows with no stored requester id.
 */
export function resolveSessionAdminRemoveRowRequest(input: {
  snapshot: HostVideoQueueSnapshot
  sessionAdminGuestId: string | null
  peerGuestId: string
  rowIndex: number
  parsedRequesterGuestId: string | null
}): SessionAdminResolution {
  const { snapshot, sessionAdminGuestId, peerGuestId, rowIndex, parsedRequesterGuestId } = input
  const n = snapshot.ids.length
  if (n === 0 || !Number.isInteger(rowIndex) || rowIndex < 0 || rowIndex >= n) {
    return { ok: false, reason: REMOVE_ROW_REJECTED_BAD_INDEX }
  }

  const effectiveRequester = parsedRequesterGuestId ?? peerGuestId
  const isAdmin =
    sessionAdminGuestId !== null && effectiveRequester === sessionAdminGuestId
  if (isAdmin) {
    return { ok: true }
  }

  const rowOwner = snapshot.requesterGuestIds[rowIndex]
  if (rowOwner === null) {
    return { ok: false, reason: REMOVE_ROW_REJECTED_LEGACY_ROW }
  }
  const effectiveOwnerId = parsedRequesterGuestId ?? peerGuestId
  if (rowOwner !== effectiveOwnerId) {
    return { ok: false, reason: REMOVE_ROW_REJECTED_NOT_OWNER }
  }
  return { ok: true }
}
