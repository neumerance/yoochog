export type HandshakeUiState =
  | 'idle'
  | 'missing_config'
  | 'connecting_signaling'
  | 'establishing_handshake'
  | 'reconnecting'
  | 'connected'
  | 'failed'

/**
 * User-facing connection copy (signaling + WebRTC):
 * - **Online** — data channel / peer connection is up.
 * - **Connecting** — signaling or WebRTC handshake in progress.
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
