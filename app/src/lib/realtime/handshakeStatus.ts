export type HandshakeUiState =
  | 'idle'
  | 'missing_config'
  | 'connecting_signaling'
  | 'establishing_handshake'
  | 'reconnecting'
  | 'connected'
  | 'failed'

/**
 * User-facing connection copy:
 * - **Online** — party channel (Socket.io) is up.
 * - **Connecting** — socket connect or session setup in progress.
 * - **Offline** — not connected (idle), misconfiguration, or failed / retried out.
 */
export function handshakeStatusLabel(state: HandshakeUiState): string {
  switch (state) {
    case 'connected':
      return 'Online'
    case 'connecting_signaling':
    case 'establishing_handshake':
    case 'reconnecting':
      return 'Connecting'
    case 'idle':
    case 'missing_config':
    case 'failed':
      return 'Offline'
    default:
      return 'Offline'
  }
}
