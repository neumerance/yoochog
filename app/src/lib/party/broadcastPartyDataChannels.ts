export const PARTY_CHANNEL_LABEL = 'yoochog-party'

export type MinimalDataChannel = {
  readyState: RTCDataChannel['readyState']
  send: (data: string) => void
}

/**
 * Sends the same raw string to every open data channel in the map (party channels only).
 */
export function broadcastToPartyDataChannels(
  partyChannels: Map<string, MinimalDataChannel>,
  raw: string,
): void {
  for (const ch of partyChannels.values()) {
    if (ch.readyState !== 'open') {
      continue
    }
    try {
      ch.send(raw)
    } catch {
      // Channel may be closing.
    }
  }
}
