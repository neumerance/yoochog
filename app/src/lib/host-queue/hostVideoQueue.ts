/**
 * In-memory host video queue: ordered YouTube video IDs and a current “now playing” index.
 *
 * ## Semantics (edge cases)
 *
 * - **Empty queue:** `currentIndex` is `null`; `currentVideoId()` is `undefined`; `advance()` and
 *   `stepBack()` return `false`.
 * - **append:** Appends copies to the end in order. Duplicate IDs are allowed. If the queue was
 *   empty before append, current moves to index `0`. If the queue was non-empty, the current index
 *   is unchanged.
 * - **replace:** Replaces the entire list with a copy. Current becomes `0` when the new list is
 *   non-empty; otherwise empty state (no current).
 * - **clear:** Removes all IDs; no current item.
 * - **advance:** If there is no current item, or the current item is already the last, returns
 *   `false` and leaves the index unchanged. Otherwise increments the index and returns `true`.
 * - **stepBack:** If there is no current item, or the current item is already the first, returns
 *   `false` and leaves the index unchanged. Otherwise decrements the index and returns `true`.
 * - **hasNext:** `true` only when there is a current item and a later item exists in the list.
 */

/** Read-only view of queue order and current position for UI (e.g. ordered list + highlight). */
export interface HostVideoQueueSnapshot {
  /** All video IDs in playback order (index `0` … `length - 1`). */
  ids: readonly string[]
  /** Index of the current item, or `null` when the queue is empty or has no current position. */
  currentIndex: number | null
}

export interface HostVideoQueue {
  /** Appends copies of `ids` to the end in order. No-op if `ids` is empty. */
  append: (ids: readonly string[]) => void
  /** Replaces the entire queue with a copy of `ids` and updates current per semantics above. */
  replace: (ids: readonly string[]) => void
  /** Removes all IDs and clears the current position. */
  clear: () => void
  /** The video ID at the current index, or `undefined` when there is no current item. */
  currentVideoId: () => string | undefined
  /**
   * Moves to the next item when possible.
   * @returns `true` if the index moved; `false` if there is no current item or already at the last.
   */
  advance: () => boolean
  /** `true` when there is no current item and no IDs (same as `length === 0` with no current). */
  isEmpty: () => boolean
  /** Number of IDs in the queue. */
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
   * Duplicate IDs appear as separate rows; use row index (not id alone) as the key.
   */
  getSnapshot: () => HostVideoQueueSnapshot
}

/**
 * Creates an independent in-memory queue (no shared global state).
 */
export function createHostVideoQueue(): HostVideoQueue {
  let ids: string[] = []
  let currentIndex: number | null = null

  return {
    append(idsToAppend: readonly string[]) {
      if (idsToAppend.length === 0) {
        return
      }
      const wasEmpty = ids.length === 0
      ids = ids.concat([...idsToAppend])
      if (wasEmpty) {
        currentIndex = 0
      }
    },

    replace(newIds: readonly string[]) {
      ids = [...newIds]
      currentIndex = ids.length > 0 ? 0 : null
    },

    clear() {
      ids = []
      currentIndex = null
    },

    currentVideoId() {
      if (currentIndex === null || ids.length === 0) {
        return undefined
      }
      return ids[currentIndex]
    },

    advance() {
      if (currentIndex === null || ids.length === 0) {
        return false
      }
      if (currentIndex >= ids.length - 1) {
        return false
      }
      currentIndex++
      return true
    },

    isEmpty() {
      return ids.length === 0 && currentIndex === null
    },

    get length() {
      return ids.length
    },

    hasNext() {
      if (currentIndex === null || ids.length === 0) {
        return false
      }
      return currentIndex < ids.length - 1
    },

    stepBack() {
      if (currentIndex === null || ids.length === 0) {
        return false
      }
      if (currentIndex <= 0) {
        return false
      }
      currentIndex--
      return true
    },

    getSnapshot() {
      return {
        ids: Object.freeze(ids.slice()),
        currentIndex,
      }
    },
  }
}
