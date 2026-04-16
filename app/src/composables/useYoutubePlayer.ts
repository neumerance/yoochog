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
  videoId: MaybeRefOrGetter<string>
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

  const buildPlayer = async () => {
    await nextTick()
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve())
      })
    })
    const el = containerRef.value
    if (!el) {
      return
    }

    await loadYouTubeIframeApi()
    if (cancelled || !containerRef.value) {
      return
    }

    const id = toValue(options.videoId)
    const origin = window.location.origin
    const autoplayEnabled = Boolean(toValue(options.autoplay))

    const rect = el.getBoundingClientRect()
    const width = Math.max(1, Math.floor(rect.width))
    const height = Math.max(1, Math.floor(rect.height))

    const instance = new window.YT.Player(el, {
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
          if (cancelled || event.data !== 1 /* YT.PlayerState.PLAYING */) {
            return
          }
          applySessionAudio(event.target)
        },
      },
    })

    player.value = instance
  }

  const destroyPlayer = () => {
    const current = player.value
    player.value = null
    isReady.value = false
    if (current) {
      try {
        current.destroy()
      } catch {
        // Player may already be torn down by the host.
      }
    }
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
    void buildPlayer()
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
    resizeObserver?.disconnect()
    resizeObserver = null
    destroyPlayer()
  })

  return { isReady, player }
}
