import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { useAuthStore } from '../auth'
import { api, endSession, refreshAccessToken, setAccessToken, waitForRefresh } from '@/api/http'

// El store se prueba contra un http falso: aquí interesa qué pide y en qué orden, no la red
vi.mock('@/api/http', () => ({
  api: vi.fn(),
  refreshAccessToken: vi.fn(),
  setAccessToken: vi.fn(),
  endSession: vi.fn(),
  waitForRefresh: vi.fn(() => Promise.resolve(false)),
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

  it('alta buena y login fallido: el error sale marcado como ya registrado', async () => {
    api.mockResolvedValueOnce({ userId: 'u-1' }).mockRejectedValueOnce({ code: 'internal.error' })
    const auth = useAuthStore()

    await expect(
      auth.register({ username: 'cursaito', email: 'c@lounge.com', password: '12345678', locale: 'es' }),
    ).rejects.toMatchObject({ code: 'internal.error', registered: true })
  })

  it('restoreSession recupera la sesión con la cookie tras recargar', async () => {
    refreshAccessToken.mockResolvedValueOnce(true)
    api.mockResolvedValueOnce(PERFIL)
    const auth = useAuthStore()

    await expect(auth.restoreSession()).resolves.toBe(true)
    expect(auth.user.username).toBe('cursaito')
  })

  it('dos navegaciones a la vez esperan el mismo refresh', async () => {
    let answer
    refreshAccessToken.mockReturnValueOnce(new Promise((resolve) => (answer = resolve)))
    api.mockResolvedValueOnce(PERFIL)
    const auth = useAuthStore()

    const first = auth.restoreSession()
    const second = auth.restoreSession()
    answer(true)

    await expect(Promise.all([first, second])).resolves.toEqual([true, true])
    expect(refreshAccessToken).toHaveBeenCalledTimes(1)
  })

  it('restoreSession sin cookie deja fuera y no insiste la segunda vez', async () => {
    refreshAccessToken.mockResolvedValueOnce(false)
    const auth = useAuthStore()

    await expect(auth.restoreSession()).resolves.toBe(false)
    await expect(auth.restoreSession()).resolves.toBe(false)
    expect(refreshAccessToken).toHaveBeenCalledTimes(1)
  })

  it('refresh bueno pero /me falla: no deja un access suelto', async () => {
    refreshAccessToken.mockResolvedValueOnce(true)
    api.mockRejectedValueOnce({ code: 'internal.error' })
    const auth = useAuthStore()

    await expect(auth.restoreSession()).resolves.toBe(false)
    expect(setAccessToken).toHaveBeenCalledWith(null)
  })

  it('logout espera al refresh en vuelo y cierra la sesión aunque el servidor falle', async () => {
    api.mockResolvedValueOnce({ accessToken: 'access-1' }).mockResolvedValueOnce(PERFIL)
    const auth = useAuthStore()
    await auth.login('cursaito', '12345678')
    api.mockRejectedValueOnce(new Error('red caída'))

    await expect(auth.logout()).rejects.toThrow('red caída')

    expect(waitForRefresh).toHaveBeenCalled()
    expect(endSession).toHaveBeenCalled()
    expect(auth.isAuthenticated).toBe(false)
    await expect(auth.restoreSession()).resolves.toBe(false)
    expect(refreshAccessToken).not.toHaveBeenCalled()
  })

  it('expireSession saca al socio sin llamar al backend', async () => {
    api.mockResolvedValueOnce({ accessToken: 'access-1' }).mockResolvedValueOnce(PERFIL)
    const auth = useAuthStore()
    await auth.login('cursaito', '12345678')

    auth.expireSession()

    expect(auth.isAuthenticated).toBe(false)
    expect(endSession).toHaveBeenCalled()
    expect(api).toHaveBeenCalledTimes(2)
  })
})
