import { createRouter, createWebHistory } from 'vue-router'

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
    // Carga diferida: quien ya tiene sesión no descarga la pantalla de acceso
    component: () => import('../views/AccessView.vue'),
  },
]

// El lounge solo tras login. Al recargar la página la memoria se vacía, así que antes de mandar a nadie
// a la puerta se intenta recuperar la sesión con la cookie del refresh (una vez)
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
