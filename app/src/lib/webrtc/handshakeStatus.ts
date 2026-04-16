export type HandshakeUiState =
  | 'idle'
  | 'missing_config'
  | 'connecting_signaling'
  | 'establishing_handshake'
  | 'connected'
  | 'failed'

export function handshakeStatusLabel(state: HandshakeUiState): string {
  switch (state) {
    case 'idle':
      return ''
    case 'missing_config':
      return 'Signaling is not configured. Add VITE_SIGNALING_URL (see app README).'
    case 'connecting_signaling':
      return 'Connecting to signaling…'
    case 'establishing_handshake':
      return 'Establishing handshake'
    case 'connected':
      return 'Connected'
    case 'failed':
      return ''
    default:
      return ''
  }
}
