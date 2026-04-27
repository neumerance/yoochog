/// <reference types="vite/client" />
/// <reference types="youtube" />

interface ImportMetaEnv {
  /**
   * Socket.io server base URL (scheme + host + optional port), e.g. `http://localhost:3000`.
   * Inlined at build time (Vite). GitHub Pages builds must set this to a reachable production server.
   */
  readonly VITE_SOCKET_URL?: string
  /**
   * YouTube Data API v3 key (browser-restricted). Used only to resolve video titles for the queue.
   * Optional: when unset, titles show as unknown.
   */
  readonly VITE_YOUTUBE_API_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
