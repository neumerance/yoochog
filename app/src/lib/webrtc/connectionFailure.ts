/**
 * Pure helpers for classifying WebRTC peer / ICE states. Browser behavior varies;
 * "disconnected" is often transient — pair with a grace timer in the handshake layer.
 */

export function isImmediateConnectionLoss(connectionState: RTCPeerConnectionState): boolean {
  return connectionState === 'failed' || connectionState === 'closed'
}

export function isTransientConnectionDisconnected(connectionState: RTCPeerConnectionState): boolean {
  return connectionState === 'disconnected'
}

export function isImmediateIceFailure(iceConnectionState: RTCIceConnectionState): boolean {
  return iceConnectionState === 'failed' || iceConnectionState === 'closed'
}

export function isTransientIceDisconnected(iceConnectionState: RTCIceConnectionState): boolean {
  return iceConnectionState === 'disconnected'
}
