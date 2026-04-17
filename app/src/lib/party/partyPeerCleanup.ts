export type PeerConnectionLike = { close: () => void }
export type DataChannelLike = { close: () => void }

/**
 * Closes and removes one guest's peer connection and party data channel from the maps.
 * Idempotent if the guest id is missing.
 */
export function removeGuestPeer(
  guestId: string,
  pcs: Map<string, PeerConnectionLike>,
  partyChannels: Map<string, DataChannelLike>,
): void {
  const pc = pcs.get(guestId)
  if (pc) {
    try {
      pc.close()
    } catch {
      // ignore
    }
    pcs.delete(guestId)
  }
  const dc = partyChannels.get(guestId)
  if (dc) {
    try {
      dc.close()
    } catch {
      // ignore
    }
    partyChannels.delete(guestId)
  }
}
