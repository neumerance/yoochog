/**
 * In-memory host video queue: ordered queue rows (video id + optional display metadata) and a
 * current “now playing” index.
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
 *   `false` and leaves the index unchanged. Otherwise increments the index and returns `true`.
 * - **stepBack:** If there is no current item, or the current item is already the first, returns
 *   `false` and leaves the index unchanged. Otherwise decrements the index and returns `true`.
 * - **hasNext:** `true` only when there is a current item and a later item exists in the list.
 */

export interface HostVideoQueueItem {
  videoId: string
  /** Resolved title, or `null` when unknown. */
  title: string | null
  /** Guest display label for “requested by”, or `null` when absent / legacy. */
  requestedBy: string | null
}

/** Read-only view of queue order and current position for UI (e.g. ordered list + highlight). */
export interface HostVideoQueueSnapshot {
  /** All video IDs in playback order (index `0` … `length - 1`). */
  ids: readonly string[]
  /** Parallel to `ids`: title or unknown (`null`). */
  titles: readonly (string | null)[]
  /** Parallel to `ids`: requester label or absent (`null`). */
  requestedBys: readonly (string | null)[]
  /** Index of the current item, or `null` when the queue is empty or has no current position. */
  currentIndex: number | null
}

export interface HostVideoQueue {
  /** Appends copies of `items` to the end in order. No-op if `items` is empty. */
  append: (items: readonly HostVideoQueueItem[]) => void
  /** Replaces the entire queue with a copy of `items` and updates current per semantics above. */
  replace: (items: readonly HostVideoQueueItem[]) => void
  /**
   * Replaces the queue and restores **current index** from a snapshot (e.g. localStorage reload).
   * Invalid `currentIndex` for the row count falls back to `0` when non-empty.
   */
  applySnapshot: (snapshot: HostVideoQueueSnapshot) => void
  /** Removes all rows and clears the current position. */
  clear: () => void
  /** The video ID at the current index, or `undefined` when there is no current item. */
  currentVideoId: () => string | undefined
  /**
   * Moves to the next item when possible.
   * @returns `true` if the index moved; `false` if there is no current item or already at the last.
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
   * Moves to the previous item when possible.
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
 * Creates an independent in-memory queue (no shared global state).
 */
export function createHostVideoQueue(): HostVideoQueue {
  let items: HostVideoQueueItem[] = []
  let currentIndex: number | null = null

  function snapshotFromState(): HostVideoQueueSnapshot {
    const ids = items.map((i) => i.videoId)
    const titles = items.map((i) => i.title)
    const requestedBys = items.map((i) => i.requestedBy)
    return {
      ids: Object.freeze(ids),
      titles: Object.freeze(titles),
      requestedBys: Object.freeze(requestedBys),
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
      items = snapshot.ids.map((videoId, i) => ({
        videoId,
        title: snapshot.titles[i] ?? null,
        requestedBy: snapshot.requestedBys[i] ?? null,
      }))
      if (items.length === 0) {
        currentIndex = null
        return
      }
      const ci = snapshot.currentIndex
      if (
        ci === null ||
        !Number.isInteger(ci) ||
        ci < 0 ||
        ci >= items.length
      ) {
        currentIndex = 0
        return
      }
      currentIndex = ci
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
      currentIndex++
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
