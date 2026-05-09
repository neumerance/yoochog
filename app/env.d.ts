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
  /**
   * Google Tag Manager web container id (e.g. `GTM-XXXX`). When unset or invalid, GTM never loads.
   * GA4 should be configured inside this container (no direct `gtag.js` in app code).
   */
  readonly VITE_GTM_CONTAINER_ID?: string
  /**
   * When `true`, allows loading GTM during `npm run dev` (for Tag Assistant / Preview). Production
   * builds do not require this. Must be the string `'true'` to match Vite env conventions.
   */
  readonly VITE_ANALYTICS_DEV?: string
  /**
   * Operator reference only: GA4 measurement id for the GA4 Configuration tag inside GTM.
   * Not read by app runtime when using GA4-via-GTM only.
   */
  readonly VITE_GA4_MEASUREMENT_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
