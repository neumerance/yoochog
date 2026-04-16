import {
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  shallowRef,
  toValue,
  watch,
  type MaybeRefOrGetter,
} from 'vue'

import { loadYouTubeIframeApi } from '@/lib/youtube/loadIframeApi'

export interface UseYoutubePlayerOptions {
  /**
   * Current YouTube video id, or `undefined` when nothing should load (queue empty).
   * When this becomes falsy, the player is destroyed.
   */
  videoId: MaybeRefOrGetter<string | undefined>
  /**
   * Bumps whenever the queue advances even if `videoId` repeats (duplicate ids in queue).
   * Omit to only react to `videoId` changes.
   */
  playbackSequence?: MaybeRefOrGetter<number>
  /**
   * When true, requests autoplay via IFrame API (`autoplay: 1`).
   * Also sets `mute: 1` by default so playback can start under typical browser autoplay policies;
   * override with `playerVars.mute` if you need a different behavior.
   */
  autoplay?: MaybeRefOrGetter<boolean>
  /**
   * After a one-time user gesture (e.g. tap “Sound on”), set this to true. The composable will
   * call `unMute()` and apply `sessionVolume` on ready and whenever playback enters PLAYING, so
   * queue changes (`loadVideoById`) stay audible without using the player chrome.
   * Browsers still require that first gesture before sound can play; there is no way around that.
   */
  audioSessionUnlocked?: MaybeRefOrGetter<boolean>
  /** 0–100, applied when `audioSessionUnlocked` is true. Default 100. */
  sessionVolume?: MaybeRefOrGetter<number>
  onReady?: (player: YT.Player) => void
  /** Fires once per natural completion (`YT.PlayerState.ENDED` / `0`). */
  onEnded?: () => void
  /** Fires when playback enters PLAYING (`1`) — useful to clear transient error UI. */
  onPlaying?: () => void
  /** IFrame API error code (`event.data`). */
  onError?: (errorCode: number) => void
  /**
   * When the iframe API script fails to load, `YT.Player` is missing after load, or player
   * construction throws. Distinct from {@link onError} (playback/embed restrictions after load).
   */
  onSetupError?: (error: unknown) => void
  /** Merged with defaults; `origin` is always `window.location.origin` when in browser. */
  playerVars?: YT.PlayerVars
}

export function useYoutubePlayer(
  containerRef: { value: HTMLElement | null },
  options: UseYoutubePlayerOptions,
) {
  const isReady = ref(false)
  const player = shallowRef<YT.Player | null>(null)

  let cancelled = false
  let resizeObserver: ResizeObserver | null = null
  let stopWatch: (() => void) | null = null

  let lastSyncKey = { id: undefined as string | undefined, seq: -1 }

  const applySessionAudio = (p: YT.Player) => {
    if (!toValue(options.audioSessionUnlocked)) {
      return
    }
    const raw = toValue(options.sessionVolume ?? 100)
    const vol = Math.min(100, Math.max(0, Number.isFinite(raw) ? raw : 100))
    try {
      p.unMute()
      p.setVolume(vol)
    } catch {
      // Player may be torn down mid-call.
    }
  }

  const destroyPlayer = () => {
    const current = player.value
    player.value = null
    isReady.value = false
    lastSyncKey = { id: undefined, seq: -1 }
    if (current) {
      try {
        current.destroy()
      } catch {
        // Player may already be torn down by the host.
      }
    }
  }

  const syncFromVideoId = async () => {
    await nextTick()
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve())
      })
    })
    if (cancelled) {
      return
    }

    const el = containerRef.value
    const id = toValue(options.videoId)
    const seq = toValue(options.playbackSequence ?? 0)

    if (!id) {
      destroyPlayer()
      return
    }

    if (!el) {
      return
    }

    if (player.value) {
      if (id === lastSyncKey.id && seq === lastSyncKey.seq) {
        return
      }
      lastSyncKey = { id, seq }
      try {
        player.value.loadVideoById({ videoId: id })
        if (toValue(options.audioSessionUnlocked)) {
          player.value.playVideo()
        }
      } catch {
        // Player may be torn down mid-call.
      }
      return
    }

    try {
      await loadYouTubeIframeApi()
    } catch (err) {
      if (!cancelled) {
        options.onSetupError?.(err)
      }
      return
    }
    if (cancelled || !containerRef.value) {
      return
    }

    const el2 = containerRef.value
    const origin = window.location.origin
    const autoplayEnabled = Boolean(toValue(options.autoplay))

    const rect = el2.getBoundingClientRect()
    const width = Math.max(1, Math.floor(rect.width))
    const height = Math.max(1, Math.floor(rect.height))

    let instance: YT.Player
    try {
      instance = new window.YT.Player(el2, {
        width,
        height,
        videoId: id,
        playerVars: {
          enablejsapi: 1,
          ...(autoplayEnabled
            ? {
                // Numeric literals — do not use `YT.AutoPlay` etc.; runtime `window.YT` has no
                // enums (those are TypeScript-only from @types/youtube).
                autoplay: 1,
                mute: 1,
                playsinline: 1,
              }
            : {}),
          ...options.playerVars,
          origin,
        },
        events: {
          onError: (event) => {
            if (import.meta.env.DEV) {
              console.warn('[useYoutubePlayer] YouTube player error', event.data)
            }
            options.onError?.(event.data)
          },
          onReady: (event) => {
            if (cancelled) {
              return
            }
            isReady.value = true
            applySessionAudio(event.target)
            options.onReady?.(event.target)
          },
          onStateChange: (event) => {
            if (cancelled) {
              return
            }
            if (event.data === 0 /* YT.PlayerState.ENDED */) {
              options.onEnded?.()
              return
            }
            if (event.data !== 1 /* YT.PlayerState.PLAYING */) {
              return
            }
            options.onPlaying?.()
            applySessionAudio(event.target)
          },
        },
      })
    } catch (err) {
      if (!cancelled) {
        options.onSetupError?.(err)
      }
      return
    }

    lastSyncKey = { id, seq }
    player.value = instance
  }

  watch(
    () => [toValue(options.audioSessionUnlocked), toValue(options.sessionVolume ?? 100)] as const,
    () => {
      const p = player.value
      if (!p || !isReady.value) {
        return
      }
      applySessionAudio(p)
    },
  )

  onMounted(() => {
    stopWatch = watch(
      () =>
        [toValue(options.videoId), toValue(options.playbackSequence ?? 0)] as [string | undefined, number],
      () => {
        void syncFromVideoId()
      },
      { immediate: true },
    )

    const el = containerRef.value
    if (typeof ResizeObserver === 'undefined' || !el) {
      return
    }
    resizeObserver = new ResizeObserver(() => {
      const p = player.value
      if (!p) {
        return
      }
      const r = el.getBoundingClientRect()
      const w = Math.max(1, Math.floor(r.width))
      const h = Math.max(1, Math.floor(r.height))
      try {
        p.setSize(w, h)
      } catch {
        // Ignore if player is already destroyed.
      }
    })
    resizeObserver.observe(el)
  })

  onBeforeUnmount(() => {
    cancelled = true
    stopWatch?.()
    stopWatch = null
    resizeObserver?.disconnect()
    resizeObserver = null
    destroyPlayer()
  })

  return { isReady, player }
}
