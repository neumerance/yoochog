/**
 * Party room id (ADR 0001 / realtime): one Socket.io room per `sessionId`.
 * @see docs/adr/0006-socketio-realtime.md
 */
export function partySessionRoomId(sessionId: string): string {
  return `yoochog:party:${sessionId}`
}
