import { describe, expect, it, beforeEach, vi } from 'vitest'

import { DEFAULT_DEV_ICE_SERVERS } from './defaultIceServers'
import { getPartyIceServers, resetPartyIceServerWarnings } from './iceServersFromEnv'

describe('getPartyIceServers', () => {
  beforeEach(() => {
    resetPartyIceServerWarnings()
    vi.restoreAllMocks()
  })

  it('uses default public STUN when STUN env is unset', () => {
    expect(getPartyIceServers({ env: {} })).toEqual(DEFAULT_DEV_ICE_SERVERS)
  })

  it('uses default public STUN when VITE_STUN_URLS is empty or whitespace', () => {
    expect(getPartyIceServers({ env: { VITE_STUN_URLS: '' } })).toEqual(DEFAULT_DEV_ICE_SERVERS)
    expect(getPartyIceServers({ env: { VITE_STUN_URLS: '  ,  ' } })).toEqual(DEFAULT_DEV_ICE_SERVERS)
  })

  it('parses multiple comma-separated STUN URLs', () => {
    const servers = getPartyIceServers({
      env: { VITE_STUN_URLS: 'stun:a:1, stun:b:2 ' },
    })
    expect(servers).toEqual([{ urls: 'stun:a:1' }, { urls: 'stun:b:2' }])
  })

  it('accepts stuns: URLs', () => {
    const servers = getPartyIceServers({
      env: { VITE_STUN_URLS: 'stuns:secure.example:5349' },
    })
    expect(servers).toEqual([{ urls: 'stuns:secure.example:5349' }])
  })

  it('falls back to default STUN when every STUN segment is invalid', () => {
    expect(getPartyIceServers({ env: { VITE_STUN_URLS: 'http://bad,ftp://bad' } })).toEqual(
      DEFAULT_DEV_ICE_SERVERS,
    )
  })

  it('adds TURN with static username and credential when all are set', () => {
    const servers = getPartyIceServers({
      env: {
        VITE_STUN_URLS: 'stun:stun.example:3478',
        VITE_TURN_URLS: 'turn:turn.example:3478',
        VITE_TURN_USERNAME: 'user',
        VITE_TURN_CREDENTIAL: 'pass',
      },
    })
    expect(servers).toEqual([
      { urls: 'stun:stun.example:3478' },
      {
        urls: 'turn:turn.example:3478',
        username: 'user',
        credential: 'pass',
      },
    ])
  })

  it('supports multiple TURN URLs with one credential pair (after default STUN when STUN env is unset)', () => {
    const servers = getPartyIceServers({
      env: {
        VITE_TURN_URLS: 'turn:a:1, turns:b:2',
        VITE_TURN_USERNAME: 'u',
        VITE_TURN_CREDENTIAL: 'c',
      },
    })
    expect(servers).toEqual([
      ...DEFAULT_DEV_ICE_SERVERS,
      { urls: 'turn:a:1', username: 'u', credential: 'c' },
      { urls: 'turns:b:2', username: 'u', credential: 'c' },
    ])
  })

  it('omits TURN and warns once when TURN URLs are set but credential is missing', () => {
    const warn = vi.fn()
    getPartyIceServers({
      env: {
        VITE_TURN_URLS: 'turn:x:1',
        VITE_TURN_USERNAME: 'u',
      },
      warn,
    })
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn).toHaveBeenCalledWith(expect.stringMatching(/TURN/i))

    const servers = getPartyIceServers({
      env: {
        VITE_STUN_URLS: 'stun:s:1',
        VITE_TURN_URLS: 'turn:x:1',
        VITE_TURN_USERNAME: 'u',
      },
      warn,
    })
    expect(servers).toEqual([{ urls: 'stun:s:1' }])
  })

  it('omits TURN and warns once when TURN URLs are set but username is missing', () => {
    const warn = vi.fn()
    getPartyIceServers({
      env: {
        VITE_TURN_URLS: 'turn:x:1',
        VITE_TURN_CREDENTIAL: 'c',
      },
      warn,
    })
    expect(warn).toHaveBeenCalledTimes(1)
  })

  it('does not warn twice for repeated partial TURN config', () => {
    const warn = vi.fn()
    getPartyIceServers({ env: { VITE_TURN_URLS: 'turn:x:1' }, warn })
    getPartyIceServers({ env: { VITE_TURN_URLS: 'turn:x:1' }, warn })
    expect(warn).toHaveBeenCalledTimes(1)
  })

  it('does not add TURN when no TURN URLs are set even if username/password are set', () => {
    const servers = getPartyIceServers({
      env: {
        VITE_STUN_URLS: 'stun:a:1',
        VITE_TURN_USERNAME: 'u',
        VITE_TURN_CREDENTIAL: 'c',
      },
    })
    expect(servers).toEqual([{ urls: 'stun:a:1' }])
  })
})
