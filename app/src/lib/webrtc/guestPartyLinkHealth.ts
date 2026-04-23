import { isImmediateConnectionLoss, isImmediateIceFailure } from '@/lib/webrtc/connectionFailure'

/**
 * When the guest tab was hidden long enough for visibility-based recovery, we probe before
 * tearing down. Healthy means the party data channel is still usable and the peer is not
 * in a terminal state. Transient `disconnected` on PC/ICE is OK while the party DC is `open`
 * (browsers may report ICE/PC that way while SCTP is still working).
 */
export function isGuestPartyLinkOkForVisibilityResume(
  pc: Pick<RTCPeerConnection, 'connectionState' | 'iceConnectionState'> | null,
  partyDc: Pick<RTCDataChannel, 'readyState'> | null,
): boolean {
  if (pc == null || partyDc == null) {
    return false
  }
  if (partyDc.readyState !== 'open') {
    return false
  }
  if (isImmediateConnectionLoss(pc.connectionState)) {
    return false
  }
  if (isImmediateIceFailure(pc.iceConnectionState)) {
    return false
  }
  return true
}
