import { createRouter, createWebHistory } from 'vue-router'
import LoungeView from '../views/LoungeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'loungeview',
      component: LoungeView,
    },
  ],
})

export default router
