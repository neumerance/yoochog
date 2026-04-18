import { describe, expect, it } from 'vitest'

import { AUDIENCE_CHAT_FONT_STACKS, pickRandomAudienceChatFontFamily } from './audienceChatFonts'

describe('pickRandomAudienceChatFontFamily', () => {
  it('returns a stack from the list', () => {
    const f = pickRandomAudienceChatFontFamily()
    expect(AUDIENCE_CHAT_FONT_STACKS).toContain(f)
  })
})
