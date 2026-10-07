import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { useAuthStore } from '@/stores/auth'

vi.mock('../../views/LoungeView.vue', () => ({ default: {} }))

const { guard, routes } = await import('../index')

const LOUNGE = { name: 'loungeview', fullPath: '/', meta: { requiresAuth: true } }
const PRIVACY = { name: 'privacy', fullPath: '/privacidad', meta: {} }
const ACCESO = { name: 'acceso', fullPath: '/acceso', meta: {} }

describe('guard del router', () => {
  let auth

  beforeEach(() => {
    setActivePinia(createPinia())
    auth = useAuthStore()
  })

  it('sin sesión, el lounge manda a la puerta y recuerda a dónde iba', async () => {
    vi.spyOn(auth, 'restoreSession').mockResolvedValue(false)

    await expect(guard(LOUNGE)).resolves.toEqual({ name: 'acceso', query: { next: '/' } })
  })

  it('tras recargar, recupera la sesión con la cookie y deja pasar', async () => {
    vi.spyOn(auth, 'restoreSession').mockResolvedValue(true)

    await expect(guard(LOUNGE)).resolves.toBe(true)
  })

  it('con sesión, la puerta manda dentro', async () => {
    vi.spyOn(auth, 'restoreSession').mockResolvedValue(true)

    await expect(guard(ACCESO)).resolves.toEqual({ path: '/' })
  })

  it('sin sesión, la puerta se queda abierta', async () => {
    vi.spyOn(auth, 'restoreSession').mockResolvedValue(false)

    await expect(guard(ACCESO)).resolves.toBe(true)
  })

  it('lets the privacy page through without a session', async () => {
    vi.spyOn(auth, 'restoreSession').mockResolvedValue(false)

    await expect(guard(PRIVACY)).resolves.toBe(true)
  })

  it('lets the privacy page through with a session too', async () => {
    vi.spyOn(auth, 'restoreSession').mockResolvedValue(true)

    await expect(guard(PRIVACY)).resolves.toBe(true)
  })

  it('declares the privacy route as public and lazy loaded', async () => {
    const route = routes.find((candidate) => candidate.path === '/privacidad')

    expect(route.name).toBe('privacy')
    expect(route.meta?.requiresAuth).toBeFalsy()
    expect((await route.component()).default.__name).toBe('PrivacyView')
  })
})
