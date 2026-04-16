/** Public STUN for development; TURN is out of scope for issue #24 (see Epic 4). */
export const DEFAULT_DEV_ICE_SERVERS: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }]
