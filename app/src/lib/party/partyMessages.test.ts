import { describe, expect, it } from 'vitest'

import {
  isPlausibleYoutubeVideoId,
  parsePartyMessage,
  PARTY_MESSAGE_MAX_RAW_BYTES,
  PARTY_QUEUE_REQUESTED_BY_MAX_LENGTH,
  PARTY_QUEUE_TITLE_MAX_LENGTH,
  PARTY_QUEUE_REQUESTER_GUEST_ID_MAX_LENGTH,
  PARTY_MESSAGE_SCHEMA_VERSION,
  queueSnapshotToMessage,
  serializePartyMessage,
} from './partyMessages'

describe('isPlausibleYoutubeVideoId', () => {
  it('accepts 11-char ids', () => {
    expect(isPlausibleYoutubeVideoId('dQw4w9WgXcQ')).toBe(true)
  })
  it('rejects wrong length', () => {
    expect(isPlausibleYoutubeVideoId('short')).toBe(false)
    expect(isPlausibleYoutubeVideoId('dQw4w9WgXcQextra')).toBe(false)
  })
})

describe('parsePartyMessage', () => {
  it('round-trips queue_snapshot with metadata', () => {
    const msg = queueSnapshotToMessage(
      {
        ids: ['a', 'b'],
        titles: [null, 'T'],
        requestedBys: ['x', null],
        requesterGuestIds: ['g1', null],
        currentIndex: 0,
      },
      null,
    )
    const raw = serializePartyMessage(msg)
    expect(parsePartyMessage(raw)).toEqual(msg)
  })

  it('round-trips queue_snapshot with sessionAdminPeerId', () => {
    const msg = queueSnapshotToMessage(
      {
        ids: ['a'],
        titles: [null],
        requestedBys: [null],
        requesterGuestIds: [null],
        currentIndex: 0,
      },
      '550e8400-e29b-41d4-a716-446655440000',
    )
    const raw = serializePartyMessage(msg)
    expect(parsePartyMessage(raw)).toEqual(msg)
  })

  it('accepts legacy queue_snapshot without titles/requestedBys (fills nulls)', () => {
    const raw = JSON.stringify({
      v: PARTY_MESSAGE_SCHEMA_VERSION,
      type: 'queue_snapshot',
      ids: ['dQw4w9WgXcQ'],
      currentIndex: 0,
    })
    expect(parsePartyMessage(raw)).toEqual({
      v: PARTY_MESSAGE_SCHEMA_VERSION,
      type: 'queue_snapshot',
      ids: ['dQw4w9WgXcQ'],
      currentIndex: 0,
      titles: [null],
      requestedBys: [null],
      requesterGuestIds: [null],
      sessionAdminPeerId: null,
    })
  })

  it('rejects queue_snapshot when only one parallel metadata array is present', () => {
    const raw = JSON.stringify({
      v: PARTY_MESSAGE_SCHEMA_VERSION,
      type: 'queue_snapshot',
      ids: ['a', 'b'],
      currentIndex: 0,
      titles: [null, null],
    })
    expect(parsePartyMessage(raw)).toBeNull()
  })

  it('rejects queue_snapshot when parallel arrays mismatch ids length', () => {
    const raw = JSON.stringify({
      v: PARTY_MESSAGE_SCHEMA_VERSION,
      type: 'queue_snapshot',
      ids: ['a', 'b'],
      currentIndex: 0,
      titles: [null],
      requestedBys: [null],
    })
    expect(parsePartyMessage(raw)).toBeNull()
  })

  it('accepts empty queue snapshot', () => {
    const raw = JSON.stringify({
      v: PARTY_MESSAGE_SCHEMA_VERSION,
      type: 'queue_snapshot',
      ids: [],
      currentIndex: null,
    })
    const p = parsePartyMessage(raw)
    expect(p?.type === 'queue_snapshot' && p.ids.length === 0 && p.currentIndex === null).toBe(true)
    if (p?.type === 'queue_snapshot') {
      expect(p.titles).toEqual([])
      expect(p.requestedBys).toEqual([])
      expect(p.requesterGuestIds).toEqual([])
      expect(p.sessionAdminPeerId).toBeNull()
    }
  })

  it('rejects empty queue with non-null current index', () => {
    const raw = JSON.stringify({
      v: PARTY_MESSAGE_SCHEMA_VERSION,
      type: 'queue_snapshot',
      ids: [],
      currentIndex: 0,
    })
    expect(parsePartyMessage(raw)).toBeNull()
  })

  it('rejects unknown type', () => {
    const raw = JSON.stringify({
      v: PARTY_MESSAGE_SCHEMA_VERSION,
      type: 'ping',
    })
    expect(parsePartyMessage(raw)).toBeNull()
  })

  it('rejects malformed JSON', () => {
    expect(parsePartyMessage('not json')).toBeNull()
  })

  it('rejects wrong schema version', () => {
    const raw = JSON.stringify({ v: 99, type: 'queue_snapshot', ids: [], currentIndex: null })
    expect(parsePartyMessage(raw)).toBeNull()
  })

  it('rejects enqueue_request with invalid video id', () => {
    const raw = JSON.stringify({
      v: PARTY_MESSAGE_SCHEMA_VERSION,
      type: 'enqueue_request',
      videoId: 'nope',
    })
    expect(parsePartyMessage(raw)).toBeNull()
  })

  it('accepts valid enqueue_request without optional fields (normalized to null)', () => {
    const raw = JSON.stringify({
      v: PARTY_MESSAGE_SCHEMA_VERSION,
      type: 'enqueue_request',
      videoId: 'dQw4w9WgXcQ',
    })
    expect(parsePartyMessage(raw)).toEqual({
      v: PARTY_MESSAGE_SCHEMA_VERSION,
      type: 'enqueue_request',
      videoId: 'dQw4w9WgXcQ',
      title: null,
      requestedBy: null,
      requesterGuestId: null,
    })
  })

  it('accepts enqueue_request with title and requestedBy', () => {
    const raw = JSON.stringify({
      v: PARTY_MESSAGE_SCHEMA_VERSION,
      type: 'enqueue_request',
      videoId: 'dQw4w9WgXcQ',
      title: 'Never Gonna Give You Up',
      requestedBy: 'Alex',
    })
    expect(parsePartyMessage(raw)).toEqual({
      v: PARTY_MESSAGE_SCHEMA_VERSION,
      type: 'enqueue_request',
      videoId: 'dQw4w9WgXcQ',
      title: 'Never Gonna Give You Up',
      requestedBy: 'Alex',
      requesterGuestId: null,
    })
  })

  it('accepts enqueue_request with requesterGuestId', () => {
    const raw = JSON.stringify({
      v: PARTY_MESSAGE_SCHEMA_VERSION,
      type: 'enqueue_request',
      videoId: 'dQw4w9WgXcQ',
      requesterGuestId: '550e8400-e29b-41d4-a716-446655440000',
    })
    expect(parsePartyMessage(raw)).toEqual({
      v: PARTY_MESSAGE_SCHEMA_VERSION,
      type: 'enqueue_request',
      videoId: 'dQw4w9WgXcQ',
      title: null,
      requestedBy: null,
      requesterGuestId: '550e8400-e29b-41d4-a716-446655440000',
    })
  })

  it('rejects enqueue_request with overlong requesterGuestId', () => {
    const raw = JSON.stringify({
      v: PARTY_MESSAGE_SCHEMA_VERSION,
      type: 'enqueue_request',
      videoId: 'dQw4w9WgXcQ',
      requesterGuestId: 'x'.repeat(PARTY_QUEUE_REQUESTER_GUEST_ID_MAX_LENGTH + 1),
    })
    expect(parsePartyMessage(raw)).toBeNull()
  })

  it('round-trips end_current_playback_request with requesterGuestId', () => {
    const msg = {
      v: PARTY_MESSAGE_SCHEMA_VERSION,
      type: 'end_current_playback_request' as const,
      requesterGuestId: '550e8400-e29b-41d4-a716-446655440000',
    }
    const raw = serializePartyMessage(msg)
    expect(parsePartyMessage(raw)).toEqual(msg)
  })

  it('accepts end_current_playback_request without requesterGuestId (normalized to null)', () => {
    const raw = JSON.stringify({
      v: PARTY_MESSAGE_SCHEMA_VERSION,
      type: 'end_current_playback_request',
    })
    expect(parsePartyMessage(raw)).toEqual({
      v: PARTY_MESSAGE_SCHEMA_VERSION,
      type: 'end_current_playback_request',
      requesterGuestId: null,
    })
  })

  it('rejects end_current_playback_request with overlong requesterGuestId', () => {
    const raw = JSON.stringify({
      v: PARTY_MESSAGE_SCHEMA_VERSION,
      type: 'end_current_playback_request',
      requesterGuestId: 'x'.repeat(PARTY_QUEUE_REQUESTER_GUEST_ID_MAX_LENGTH + 1),
    })
    expect(parsePartyMessage(raw)).toBeNull()
  })

  it('round-trips remove_queue_row_request', () => {
    const msg = {
      v: PARTY_MESSAGE_SCHEMA_VERSION,
      type: 'remove_queue_row_request' as const,
      rowIndex: 2,
      requesterGuestId: '550e8400-e29b-41d4-a716-446655440000',
    }
    const raw = serializePartyMessage(msg)
    expect(parsePartyMessage(raw)).toEqual(msg)
  })

  it('accepts remove_queue_row_request without requesterGuestId (normalized to null)', () => {
    const raw = JSON.stringify({
      v: PARTY_MESSAGE_SCHEMA_VERSION,
      type: 'remove_queue_row_request',
      rowIndex: 0,
    })
    expect(parsePartyMessage(raw)).toEqual({
      v: PARTY_MESSAGE_SCHEMA_VERSION,
      type: 'remove_queue_row_request',
      rowIndex: 0,
      requesterGuestId: null,
    })
  })

  it('rejects remove_queue_row_request with negative rowIndex', () => {
    const raw = JSON.stringify({
      v: PARTY_MESSAGE_SCHEMA_VERSION,
      type: 'remove_queue_row_request',
      rowIndex: -1,
    })
    expect(parsePartyMessage(raw)).toBeNull()
  })

  it('rejects queue_snapshot when requesterGuestIds length mismatches ids', () => {
    const raw = JSON.stringify({
      v: PARTY_MESSAGE_SCHEMA_VERSION,
      type: 'queue_snapshot',
      ids: ['a', 'b'],
      currentIndex: 0,
      titles: [null, null],
      requestedBys: [null, null],
      requesterGuestIds: ['g1'],
    })
    expect(parsePartyMessage(raw)).toBeNull()
  })

  it('rejects enqueue_request with overlong title', () => {
    const raw = JSON.stringify({
      v: PARTY_MESSAGE_SCHEMA_VERSION,
      type: 'enqueue_request',
      videoId: 'dQw4w9WgXcQ',
      title: 'x'.repeat(PARTY_QUEUE_TITLE_MAX_LENGTH + 1),
    })
    expect(parsePartyMessage(raw)).toBeNull()
  })

  it('rejects enqueue_request with overlong requestedBy', () => {
    const raw = JSON.stringify({
      v: PARTY_MESSAGE_SCHEMA_VERSION,
      type: 'enqueue_request',
      videoId: 'dQw4w9WgXcQ',
      requestedBy: 'x'.repeat(PARTY_QUEUE_REQUESTED_BY_MAX_LENGTH + 1),
    })
    expect(parsePartyMessage(raw)).toBeNull()
  })

  it('round-trips enqueue_rejected', () => {
    const msg = {
      v: PARTY_MESSAGE_SCHEMA_VERSION,
      type: 'enqueue_rejected' as const,
      reason: 'Queue full',
    }
    const raw = serializePartyMessage(msg)
    expect(parsePartyMessage(raw)).toEqual(msg)
  })

  it('rejects enqueue_rejected with overlong reason', () => {
    const raw = JSON.stringify({
      v: PARTY_MESSAGE_SCHEMA_VERSION,
      type: 'enqueue_rejected',
      reason: 'x'.repeat(501),
    })
    expect(parsePartyMessage(raw)).toBeNull()
  })

  it('rejects enqueue_rejected with non-string reason', () => {
    const raw = JSON.stringify({
      v: PARTY_MESSAGE_SCHEMA_VERSION,
      type: 'enqueue_rejected',
      reason: 42,
    })
    expect(parsePartyMessage(raw)).toBeNull()
  })

  it('round-trips heartbeat', () => {
    const msg = { v: PARTY_MESSAGE_SCHEMA_VERSION, type: 'heartbeat' as const }
    const raw = serializePartyMessage(msg)
    expect(parsePartyMessage(raw)).toEqual(msg)
  })

  it('parses heartbeat with extra JSON keys ignored', () => {
    const raw = JSON.stringify({
      v: PARTY_MESSAGE_SCHEMA_VERSION,
      type: 'heartbeat',
      future: 1,
    })
    expect(parsePartyMessage(raw)).toEqual({
      v: PARTY_MESSAGE_SCHEMA_VERSION,
      type: 'heartbeat',
    })
  })

  it('rejects raw string over max length', () => {
    const raw = 'x'.repeat(PARTY_MESSAGE_MAX_RAW_BYTES + 1)
    expect(parsePartyMessage(raw)).toBeNull()
  })
})
