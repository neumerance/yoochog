import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import ClientView from '../views/ClientView.vue'
import PlayerView from '../views/PlayerView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/player',
      name: 'player',
      component: PlayerView,
    },
    {
      path: '/client',
      name: 'client',
      component: ClientView,
    },
  ],
})

export default router
