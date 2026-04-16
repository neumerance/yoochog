/** sessionStorage key for the host tab’s stable party id (join URL / QR in Epic 3). */
export const HOST_SESSION_STORAGE_KEY = 'yoochog.hostSessionId'

/**
 * Returns the persisted host session id, creating one with `randomUuid` if missing.
 * Empty or whitespace-only stored values are treated as missing.
 */
export function getOrCreateHostSessionId(
  storage: Pick<Storage, 'getItem' | 'setItem'>,
  randomUuid: () => string,
): string {
  const raw = storage.getItem(HOST_SESSION_STORAGE_KEY)
  if (raw !== null && raw.trim() !== '') {
    return raw
  }
  const id = randomUuid()
  storage.setItem(HOST_SESSION_STORAGE_KEY, id)
  return id
}
