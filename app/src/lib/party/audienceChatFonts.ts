/**
 * Distinct system / web-safe stacks (no extra font loading). One is chosen at random per line on the host.
 */
export const AUDIENCE_CHAT_FONT_STACKS = [
  'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  'Georgia, "Times New Roman", "Liberation Serif", serif',
  '"Trebuchet MS", "Lucida Grande", sans-serif',
  '"Courier New", Courier, "Liberation Mono", monospace',
  'Verdana, Geneva, "DejaVu Sans", sans-serif',
  'Impact, "Arial Black", "Haettenschweiler", sans-serif',
  '"Palatino Linotype", Palatino, "Book Antiqua", serif',
  '"Comic Sans MS", "Comic Sans", "Chalkboard SE", cursive',
  '"Arial Black", "Arial Bold", Gadget, sans-serif',
  '"Lucida Sans Unicode", "Lucida Grande", sans-serif',
  'Candara, "Trebuchet MS", sans-serif',
] as const

export function pickRandomAudienceChatFontFamily(): string {
  const i = Math.floor(Math.random() * AUDIENCE_CHAT_FONT_STACKS.length)
  return AUDIENCE_CHAT_FONT_STACKS[i]!
}
