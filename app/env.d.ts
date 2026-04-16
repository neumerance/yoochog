/// <reference types="vite/client" />
/// <reference types="youtube" />

interface ImportMetaEnv {
  /** Base URL for WebSocket signaling (ADR 0001). Optional until contributors enable local dev. */
  readonly VITE_SIGNALING_URL?: string
  /** PubNub publish key (browser). If set with subscribe key, PubNub is used instead of `VITE_SIGNALING_URL`. */
  readonly VITE_PUBNUB_PUBLISH_KEY?: string
  /** PubNub subscribe key (browser). */
  readonly VITE_PUBNUB_SUBSCRIBE_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
