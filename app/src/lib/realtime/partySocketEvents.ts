/**
 * Socket.io event names (client <-> yoochog-realtime-server). Keep in sync with `realtime-server/server.mjs`.
 */
export const YOOCHOG_REGISTER = 'register' as const
export const YOOCHOG_REGISTERED = 'registered' as const
export const YOOCHOG_REGISTER_ERROR = 'register_error' as const
export const YOOCHOG_SESSION_READY = 'session_ready' as const
export const YOOCHOG_GUEST_JOINED = 'guest_joined' as const
export const YOOCHOG_GUEST_LEFT = 'guest_left' as const
export const YOOCHOG_HOST_LEFT = 'host_left' as const
export const YOOCHOG_PARTY_SEND = 'party_send' as const
export const YOOCHOG_PARTY = 'party' as const
/** Guest → server: validate shared password and notify host to grant admin for `logicalGuestId`. */
export const YOOCHOG_ASSUME_ADMIN = 'assume_admin' as const
/** Server → guest: outcome of assume-admin attempt (never echoes password). */
export const YOOCHOG_ASSUME_ADMIN_RESULT = 'assume_admin_result' as const
/** Server → host: password ok; host adds `logicalGuestId` to session admin set. */
export const YOOCHOG_ASSUME_ADMIN_GRANTED = 'assume_admin_granted' as const
