/// <reference types="vite/client" />
/// <reference types="youtube" />

interface ImportMetaEnv {
  /** Base URL for WebSocket signaling (ADR 0001). Optional until contributors enable local dev. */
  readonly VITE_SIGNALING_URL?: string
  /** PubNub publish key (browser). If set with subscribe key, PubNub is used instead of `VITE_SIGNALING_URL`. */
  readonly VITE_PUBNUB_PUBLISH_KEY?: string
  /** PubNub subscribe key (browser). */
  readonly VITE_PUBNUB_SUBSCRIBE_KEY?: string
  /** Comma-separated `stun:` / `stuns:` URLs. When unset or empty, a public STUN default is used. */
  readonly VITE_STUN_URLS?: string
  /** Comma-separated `turn:` / `turns:` relay URLs. Requires `VITE_TURN_USERNAME` and `VITE_TURN_CREDENTIAL`. */
  readonly VITE_TURN_URLS?: string
  /** TURN username (static dev or short-lived REST username from your deployment pipeline). */
  readonly VITE_TURN_USERNAME?: string
  /** TURN password / REST credential (never commit real values; use `.env.local`). */
  readonly VITE_TURN_CREDENTIAL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
