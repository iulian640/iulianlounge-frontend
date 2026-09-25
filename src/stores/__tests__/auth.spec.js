import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { useAuthStore } from '../auth'
import { api, refreshAccessToken, setAccessToken } from '@/api/http'

// El store se prueba contra un http falso: aquí interesa qué pide y en qué orden, no la red
vi.mock('@/api/http', () => ({
  api: vi.fn(),
  refreshAccessToken: vi.fn(),
  setAccessToken: vi.fn(),
}))

const PERFIL = { userId: 'u-1', username: 'cursaito', locale: 'es', rank: 'NADIE' }

describe('useAuthStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('login guarda el access y carga el perfil', async () => {
    api.mockResolvedValueOnce({ accessToken: 'access-1', expiresIn: 900 }).mockResolvedValueOnce(PERFIL)
    const auth = useAuthStore()

    await auth.login('cursaito', '12345678')

    expect(api).toHaveBeenNthCalledWith(1, '/auth/login', {
      method: 'POST',
      body: { username: 'cursaito', password: '12345678' },
    })
    expect(setAccessToken).toHaveBeenCalledWith('access-1')
    expect(api).toHaveBeenNthCalledWith(2, '/me')
    expect(auth.isAuthenticated).toBe(true)
    expect(auth.user.username).toBe('cursaito')
  })

  it('un login fallido no deja a nadie dentro', async () => {
    api.mockRejectedValueOnce({ code: 'auth.invalid_credentials' })
    const auth = useAuthStore()

    await expect(auth.login('cursaito', 'mala')).rejects.toMatchObject({ code: 'auth.invalid_credentials' })
    expect(auth.isAuthenticated).toBe(false)
  })

  it('register da de alta y entra directamente', async () => {
    api
      .mockResolvedValueOnce({ userId: 'u-1' })
      .mockResolvedValueOnce({ accessToken: 'access-1' })
      .mockResolvedValueOnce(PERFIL)
    const auth = useAuthStore()

    await auth.register({ username: 'cursaito', email: 'c@lounge.com', password: '12345678', locale: 'es' })

    expect(api.mock.calls[0][0]).toBe('/auth/register')
    expect(api.mock.calls[1][0]).toBe('/auth/login')
    expect(auth.isAuthenticated).toBe(true)
  })

  it('restoreSession recupera la sesión con la cookie tras recargar', async () => {
    refreshAccessToken.mockResolvedValueOnce(true)
    api.mockResolvedValueOnce(PERFIL)
    const auth = useAuthStore()

    await expect(auth.restoreSession()).resolves.toBe(true)
    expect(auth.user.username).toBe('cursaito')
  })

  it('restoreSession sin cookie deja fuera y no insiste la segunda vez', async () => {
    refreshAccessToken.mockResolvedValueOnce(false)
    const auth = useAuthStore()

    await expect(auth.restoreSession()).resolves.toBe(false)
    await expect(auth.restoreSession()).resolves.toBe(false)
    expect(refreshAccessToken).toHaveBeenCalledTimes(1)
  })

  it('logout borra la sesión aunque el servidor falle', async () => {
    api.mockResolvedValueOnce({ accessToken: 'access-1' }).mockResolvedValueOnce(PERFIL)
    const auth = useAuthStore()
    await auth.login('cursaito', '12345678')
    api.mockRejectedValueOnce(new Error('red caída'))

    await expect(auth.logout()).rejects.toThrow('red caída')

    expect(auth.isAuthenticated).toBe(false)
    expect(setAccessToken).toHaveBeenLastCalledWith(null)
  })
})
