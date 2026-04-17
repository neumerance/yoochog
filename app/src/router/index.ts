import { createRouter, createWebHistory } from 'vue-router'
import JoinView from '../views/JoinView.vue'
import PlayerView from '../views/PlayerView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'player',
      component: PlayerView,
    },
    {
      path: '/player',
      redirect: '/',
    },
    {
      path: '/join/:sessionId',
      name: 'join',
      component: JoinView,
    },
    {
      path: '/client',
      name: 'client',
      redirect: () => ({
        path: '/',
        query: { migrated: 'client' },
        replace: true,
      }),
    },
  ],
})

export default router
