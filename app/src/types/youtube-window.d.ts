export {}

declare global {
  interface Window {
    /** Set by the YouTube IFrame API loader; invoked when `YT` is ready. */
    onYouTubeIframeAPIReady?: () => void
    /** Present after the iframe API script loads (mirrors the global `YT` namespace). */
    YT?: typeof YT
  }
}
