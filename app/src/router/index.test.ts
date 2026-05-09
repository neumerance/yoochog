import { createRouter, createMemoryHistory } from 'vue-router'
import { describe, expect, it } from 'vitest'

import { appRoutes } from './routes'

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(import.meta.env.BASE_URL),
    routes: appRoutes,
  })
}

describe('app router', () => {
  it('redirects /client to /host with migrated=client', async () => {
    const router = createTestRouter()
    await router.push('/client')
    await router.isReady()
    expect(router.currentRoute.value.path).toBe('/host')
    expect(router.currentRoute.value.query.migrated).toBe('client')
  })

  it('merges existing query into /client → /host redirect', async () => {
    const router = createTestRouter()
    await router.push({ path: '/client', query: { foo: '1', bar: '2' } })
    await router.isReady()
    expect(router.currentRoute.value.path).toBe('/host')
    expect(router.currentRoute.value.query).toEqual({
      foo: '1',
      bar: '2',
      migrated: 'client',
    })
  })

  it('redirects /player to /host without carrying query', async () => {
    const router = createTestRouter()
    await router.push({ path: '/player', query: { x: '1' } })
    await router.isReady()
    expect(router.currentRoute.value.path).toBe('/host')
    expect(router.currentRoute.value.query).toEqual({})
  })

  it('resolves / as home', async () => {
    const router = createTestRouter()
    await router.push('/')
    await router.isReady()
    expect(router.currentRoute.value.name).toBe('home')
  })

  it('resolves /join/:sessionId as join', async () => {
    const router = createTestRouter()
    await router.push('/join/abc')
    await router.isReady()
    expect(router.currentRoute.value.name).toBe('join')
    expect(router.currentRoute.value.params.sessionId).toBe('abc')
  })
})
