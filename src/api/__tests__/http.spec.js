import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { api, ApiError, hasAccessToken, refreshAccessToken, setAccessToken } from '../http'

function jsonResponse(status, body) {
  return { status, ok: status >= 200 && status < 300, json: () => Promise.resolve(body) }
}

describe('api', () => {
  let fetchMock

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    setAccessToken(null)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('manda el access token en la cabecera Authorization', async () => {
    setAccessToken('access-1')
    fetchMock.mockResolvedValue(jsonResponse(200, { balance: 100 }))

    const data = await api('/wallet')

    expect(data).toEqual({ balance: 100 })
    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/v1/wallet')
    expect(options.headers.Authorization).toBe('Bearer access-1')
    expect(options.credentials).toBe('same-origin')
  })

  it('ante un 401 refresca con la cookie y reintenta una vez', async () => {
    setAccessToken('caducado')
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, { code: 'auth.required' }))
      .mockResolvedValueOnce(jsonResponse(200, { accessToken: 'access-2', expiresIn: 900 }))
      .mockResolvedValueOnce(jsonResponse(200, { balance: 100 }))

    const data = await api('/wallet')

    expect(data).toEqual({ balance: 100 })
    expect(fetchMock.mock.calls[1][0]).toBe('/api/v1/auth/refresh')
    expect(fetchMock.mock.calls[2][1].headers.Authorization).toBe('Bearer access-2')
  })

  it('si el refresh falla, devuelve el 401 original y olvida el token', async () => {
    setAccessToken('caducado')
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, { code: 'auth.required' }))
      .mockResolvedValueOnce(jsonResponse(401, { code: 'auth.invalid_token' }))

    await expect(api('/wallet')).rejects.toMatchObject({ status: 401, code: 'auth.required' })
    expect(hasAccessToken()).toBe(false)
  })

  it('no intenta refrescar cuando falla una ruta de /auth (un login con clave mala)', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(401, { code: 'auth.invalid_credentials' }))

    await expect(api('/auth/login', { method: 'POST', body: {} })).rejects.toBeInstanceOf(ApiError)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('convierte el ProblemDetail en ApiError con code y errors por campo', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(400, { code: 'validation.failed', errors: { email: 'validation.email' } }),
    )

    await expect(api('/auth/register', { method: 'POST', body: {} })).rejects.toMatchObject({
      code: 'validation.failed',
      errors: { email: 'validation.email' },
    })
  })

  it('una respuesta sin code (HTML de un proxy caído) es request.rejected, nunca texto crudo', async () => {
    fetchMock.mockResolvedValueOnce({ status: 502, ok: false, json: () => Promise.reject(new Error('html')) })

    await expect(api('/wallet')).rejects.toMatchObject({ status: 502, code: 'request.rejected' })
  })

  it('varios refresh a la vez comparten una sola petición', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { accessToken: 'access-3' }))

    const results = await Promise.all([refreshAccessToken(), refreshAccessToken()])

    expect(results).toEqual([true, true])
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
