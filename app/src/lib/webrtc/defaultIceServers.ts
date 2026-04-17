/** Default public STUN when `VITE_STUN_URLS` is unset (see `iceServersFromEnv.ts`, issue #27). */
export const DEFAULT_DEV_ICE_SERVERS: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }]
