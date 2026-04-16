import { createRouter, createMemoryHistory } from 'vue-router'
import { describe, expect, it } from 'vitest'

describe('router legacy /client', () => {
  it('redirects /client to home with migrated=client', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: { template: '<div />' } },
        { path: '/join/:sessionId', name: 'join', component: { template: '<div />' } },
        {
          path: '/client',
          redirect: () => ({
            path: '/',
            query: { migrated: 'client' },
            replace: true,
          }),
        },
      ],
    })
    await router.push('/client')
    await router.isReady()
    expect(router.currentRoute.value.path).toBe('/')
    expect(router.currentRoute.value.query.migrated).toBe('client')
  })
})
