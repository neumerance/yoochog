/**
 * ADR 0001 normative signaling room id for a party.
 * @see docs/adr/0001-webrtc-signaling.md
 */
export function signalingRoomId(sessionId: string): string {
  return `yoochog:party:${sessionId}`
}
