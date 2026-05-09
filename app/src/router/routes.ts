import type { RouteRecordRaw } from 'vue-router'

import HomeView from '../views/HomeView.vue'
import JoinView from '../views/JoinView.vue'
import PlayerView from '../views/PlayerView.vue'

/** Single source of truth for Vue Router records — tests import this to avoid drift. */
export const appRoutes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: HomeView,
  },
  {
    path: '/host',
    name: 'player',
    component: PlayerView,
  },
  // Legacy bookmark: old host route — explicit empty query so `/player?…` does not leak params onto `/host`.
  {
    path: '/player',
    redirect: () => ({
      path: '/host',
      query: {},
      replace: true,
    }),
  },
  {
    path: '/join/:sessionId',
    name: 'join',
    component: JoinView,
  },
  // Legacy bookmark: former host path; preserves query and tags migration for one-click dismiss UX.
  {
    path: '/client',
    name: 'client',
    redirect: (to) => ({
      path: '/host',
      query: { ...to.query, migrated: 'client' },
      replace: true,
    }),
  },
]
