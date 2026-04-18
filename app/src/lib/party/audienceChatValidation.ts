/** Product limits for audience chat (issue #79). */
export const PARTY_AUDIENCE_CHAT_MAX_CHARS = 30
export const PARTY_AUDIENCE_CHAT_MAX_WORDS = 5

/** Single validation error string for both word and character limits. */
export const AUDIENCE_CHAT_INVALID_MESSAGE = 'Max 5 words and 30 characters.'

/**
 * Trim and collapse internal whitespace to a single space between words.
 */
export function normalizeAudienceChatInput(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ')
}

export function validateAudienceChatText(
  normalized: string,
): { ok: true } | { ok: false; error: string } {
  if (normalized.length === 0) {
    return { ok: false, error: AUDIENCE_CHAT_INVALID_MESSAGE }
  }
  if (normalized.length > PARTY_AUDIENCE_CHAT_MAX_CHARS) {
    return { ok: false, error: AUDIENCE_CHAT_INVALID_MESSAGE }
  }
  const words = normalized.split(' ').filter(Boolean)
  if (words.length > PARTY_AUDIENCE_CHAT_MAX_WORDS) {
    return { ok: false, error: AUDIENCE_CHAT_INVALID_MESSAGE }
  }
  return { ok: true }
}
