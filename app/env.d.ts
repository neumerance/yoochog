/// <reference types="vite/client" />
/// <reference types="youtube" />

interface ImportMetaEnv {
  /** Base URL for WebSocket signaling (ADR 0001). Optional until contributors enable local dev. */
  readonly VITE_SIGNALING_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
