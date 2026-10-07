import { createRouter, createWebHistory } from 'vue-router'

import { LOST_ROUTE } from './safeNext'
import { useAuthStore } from '@/stores/auth'
import LoungeView from '../views/LoungeView.vue'

export const routes = [
  {
    path: '/',
    name: 'loungeview',
    component: LoungeView,
    meta: { requiresAuth: true },
  },
  {
    path: '/acceso',
    name: 'acceso',
    component: () => import('../views/AccessView.vue'),
  },
  {
    path: '/privacidad',
    name: 'privacy',
    component: () => import('../views/PrivacyView.vue'),
  },
  { path: '/:pathMatch(.*)*', name: LOST_ROUTE, redirect: '/' },
]

export async function guard(to) {
  const auth = useAuthStore()
  const hasSession = auth.isAuthenticated || (await auth.restoreSession())

  if (to.meta.requiresAuth && !hasSession) {
    return { name: 'acceso', query: { next: to.fullPath } }
  }
  if (to.name === 'acceso' && hasSession) {
    return { path: '/' }
  }
  return true
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

router.beforeEach(guard)

export default router
