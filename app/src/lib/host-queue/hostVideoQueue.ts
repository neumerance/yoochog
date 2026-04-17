/**
 * In-memory host video queue: ordered queue rows (video id + optional display metadata) and a
 * current “now playing” position.
 *
 * ## Compact list semantics
 *
 * The queue stores **only** the current track and what is still **up next** — not a full history of
 * finished songs. After each successful `advance()`, rows before the new current item are dropped
 * and `currentIndex` is **`0`** whenever there is at least one row. Empty queue uses `currentIndex`
 * **`null`**.
 *
 * ## Semantics (edge cases)
 *
 * - **Empty queue:** `currentIndex` is `null`; `currentVideoId()` is `undefined`; `advance()` and
 *   `stepBack()` return `false`.
 * - **append:** Appends copies to the end in order. The structure still allows duplicate IDs (e.g.
 *   legacy persisted snapshots); **guest enqueue** enforces at most one row per id at the host
 *   boundary (see `guestEnqueuePolicy`). If the queue was empty before append, current moves to
 *   index `0`. If the queue was non-empty, the current index is unchanged.
 * - **replace:** Replaces the entire list with a copy. Current becomes `0` when the new list is
 *   non-empty; otherwise empty state (no current).
 * - **clear:** Removes all rows; no current item.
 * - **advance:** If there is no current item, or the current item is already the last, returns
 *   `false`. Otherwise drops all rows before the next track, sets the new current to index `0`, and
 *   returns `true`.
 * - **stepBack:** With a compact list the current row is always at index `0` when non-empty; there
 *   is no prior row in the stored list (history is not kept), so this returns `false` whenever the
 *   queue is empty or current is at the front.
 * - **hasNext:** `true` only when there is a current item and a later item exists in the list.
 */

export interface HostVideoQueueItem {
  videoId: string
  /** Resolved title, or `null` when unknown. */
  title: string | null
  /** Guest display label for “requested by”, or `null` when absent / legacy. */
  requestedBy: string | null
  /**
   * Stable logical guest id for enqueue policy (session-scoped UUID from the guest, or legacy
   * peer id when absent). `null` when unknown / legacy rows.
   */
  requesterGuestId: string | null
}

/** Read-only view of queue order and current position for UI (e.g. ordered list + highlight). */
export interface HostVideoQueueSnapshot {
  /** Video IDs in playback order: current first, then up next (`0` … `length - 1`). */
  ids: readonly string[]
  /** Parallel to `ids`: title or unknown (`null`). */
  titles: readonly (string | null)[]
  /** Parallel to `ids`: requester label or absent (`null`). */
  requestedBys: readonly (string | null)[]
  /** Parallel to `ids`: logical guest id for ownership / one-song-per-guest policy, or `null`. */
  requesterGuestIds: readonly (string | null)[]
  /**
   * Index of the current item (`0` when non-empty in compact form), or `null` when the queue is
   * empty or has no current position.
   */
  currentIndex: number | null
}

export interface HostVideoQueue {
  /** Appends copies of `items` to the end in order. No-op if `items` is empty. */
  append: (items: readonly HostVideoQueueItem[]) => void
  /** Replaces the entire queue with a copy of `items` and updates current per semantics above. */
  replace: (items: readonly HostVideoQueueItem[]) => void
  /**
   * Replaces the queue and restores **current index** from a snapshot (e.g. localStorage reload).
   * Invalid `currentIndex` for the row count falls back to `0` when non-empty. Legacy snapshots that
   * still list rows before the current playhead are **normalized** to a compact list (`current` at
   * index `0`).
   */
  applySnapshot: (snapshot: HostVideoQueueSnapshot) => void
  /** Removes all rows and clears the current position. */
  clear: () => void
  /** The video ID at the current index, or `undefined` when there is no current item. */
  currentVideoId: () => string | undefined
  /**
   * Moves to the next item when possible.
   * @returns `true` if the queue moved to the next track; `false` if there is no current item or
   * already at the last.
   */
  advance: () => boolean
  /** `true` when there is no current item and no rows (same as `length === 0` with no current). */
  isEmpty: () => boolean
  /** Number of rows in the queue. */
  readonly length: number
  /**
   * `true` when there is a current item and a later item exists (i.e. `advance()` would succeed).
   */
  hasNext: () => boolean
  /**
   * Moves to the previous item when possible (compact queue does not retain prior rows).
   * @returns `true` if the index moved; `false` if empty, no current, or already at the first.
   */
  stepBack: () => boolean
  /**
   * Returns a read-only snapshot: ordered IDs and current index for list rendering.
   * Duplicate IDs may appear as separate rows in legacy data; use row index (not id alone) as the key.
   */
  getSnapshot: () => HostVideoQueueSnapshot
}

/**
 * Normalizes a snapshot to compact semantics: only rows from the current playhead onward,
 * with `currentIndex` `0` when non-empty and `null` when empty. Use for legacy persisted data and
 * guest-side display so host and guest lists match ADR 0002 intent.
 */
export function normalizeHostVideoQueueSnapshot(
  snapshot: HostVideoQueueSnapshot,
): HostVideoQueueSnapshot {
  const n = snapshot.ids.length
  if (n === 0) {
    return {
      ids: Object.freeze([]),
      titles: Object.freeze([]),
      requestedBys: Object.freeze([]),
      requesterGuestIds: Object.freeze([]),
      currentIndex: null,
    }
  }
  let ci = snapshot.currentIndex
  if (ci === null || !Number.isInteger(ci) || ci < 0 || ci >= n) {
    ci = 0
  }
  return {
    ids: Object.freeze([...snapshot.ids.slice(ci)]),
    titles: Object.freeze([...snapshot.titles.slice(ci)]),
    requestedBys: Object.freeze([...snapshot.requestedBys.slice(ci)]),
    requesterGuestIds: Object.freeze([...snapshot.requesterGuestIds.slice(ci)]),
    currentIndex: 0,
  }
}

/**
 * Creates an independent in-memory queue (no shared global state).
 */
export function createHostVideoQueue(): HostVideoQueue {
  let items: HostVideoQueueItem[] = []
  let currentIndex: number | null = null

  function snapshotFromState(): HostVideoQueueSnapshot {
    const ids = items.map((i) => i.videoId)
    const titles = items.map((i) => i.title)
    const requestedBys = items.map((i) => i.requestedBy)
    const requesterGuestIds = items.map((i) => i.requesterGuestId)
    return {
      ids: Object.freeze(ids),
      titles: Object.freeze(titles),
      requestedBys: Object.freeze(requestedBys),
      requesterGuestIds: Object.freeze(requesterGuestIds),
      currentIndex,
    }
  }

  return {
    append(itemsToAppend: readonly HostVideoQueueItem[]) {
      if (itemsToAppend.length === 0) {
        return
      }
      const wasEmpty = items.length === 0
      items = items.concat(itemsToAppend.map((i) => ({ ...i })))
      if (wasEmpty) {
        currentIndex = 0
      }
    },

    replace(newItems: readonly HostVideoQueueItem[]) {
      items = newItems.map((i) => ({ ...i }))
      currentIndex = items.length > 0 ? 0 : null
    },

    applySnapshot(snapshot: HostVideoQueueSnapshot) {
      const normalized = normalizeHostVideoQueueSnapshot(snapshot)
      items = normalized.ids.map((videoId, i) => ({
        videoId,
        title: normalized.titles[i] ?? null,
        requestedBy: normalized.requestedBys[i] ?? null,
        requesterGuestId: normalized.requesterGuestIds[i] ?? null,
      }))
      currentIndex = normalized.ids.length > 0 ? 0 : null
    },

    clear() {
      items = []
      currentIndex = null
    },

    currentVideoId() {
      if (currentIndex === null || items.length === 0) {
        return undefined
      }
      return items[currentIndex]?.videoId
    },

    advance() {
      if (currentIndex === null || items.length === 0) {
        return false
      }
      if (currentIndex >= items.length - 1) {
        return false
      }
      const nextIndex = currentIndex + 1
      items = items.slice(nextIndex)
      currentIndex = items.length > 0 ? 0 : null
      return true
    },

    isEmpty() {
      return items.length === 0 && currentIndex === null
    },

    get length() {
      return items.length
    },

    hasNext() {
      if (currentIndex === null || items.length === 0) {
        return false
      }
      return currentIndex < items.length - 1
    },

    stepBack() {
      if (currentIndex === null || items.length === 0) {
        return false
      }
      if (currentIndex <= 0) {
        return false
      }
      currentIndex--
      return true
    },

    getSnapshot() {
      return snapshotFromState()
    },
  }
}
