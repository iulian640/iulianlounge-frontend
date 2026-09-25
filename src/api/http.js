// Cliente de la API. ADR-08: el access token vive SOLO en memoria (una variable de este módulo);
// el refresh va en una cookie HttpOnly que el navegador adjunta solo a /api/v1/auth y que aquí nunca se ve
const BASE = '/api/v1'

let accessToken = null
// Varias peticiones pueden recibir 401 a la vez: comparten un único refresh en vuelo
let refreshInFlight = null

export class ApiError extends Error {
  // code: clave estable del backend (ADR-06) que la vista traduce con vue-i18n; errors: {campo: clave}
  constructor(status, code, errors = {}) {
    super(code)
    this.status = status
    this.code = code
    this.errors = errors
  }
}

export function setAccessToken(token) {
  accessToken = token
}

export function hasAccessToken() {
  return accessToken !== null
}

// Pide un access nuevo con la cookie. true si lo consiguió; false si no hay sesión (cookie ausente o caducada)
export function refreshAccessToken() {
  if (!refreshInFlight) {
    refreshInFlight = fetch(`${BASE}/auth/refresh`, { method: 'POST', credentials: 'same-origin' })
      .then(async (response) => {
        if (!response.ok) {
          accessToken = null
          return false
        }
        accessToken = (await response.json()).accessToken
        return true
      })
      .catch(() => false)
      .finally(() => {
        refreshInFlight = null
      })
  }
  return refreshInFlight
}

export async function api(path, { method = 'GET', body } = {}) {
  let response = await send(path, method, body)

  // Access caducado: un refresh silencioso y un reintento. Las rutas de /auth no, o un login
  // fallido dispararía un refresh sin sentido
  if (response.status === 401 && !path.startsWith('/auth/') && (await refreshAccessToken())) {
    response = await send(path, method, body)
  }
  return parse(response)
}

function send(path, method, body) {
  const headers = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`

  return fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    // same-origin: el navegador adjunta la cookie del refresh (solo viaja a /api/v1/auth)
    credentials: 'same-origin',
  })
}

async function parse(response) {
  if (response.status === 204) return null

  const data = await response.json().catch(() => null)
  if (!response.ok) {
    // Sin code (p. ej. un proxy caído que devuelve HTML): error genérico, nunca texto crudo al usuario
    throw new ApiError(response.status, data?.code ?? 'request.rejected', data?.errors ?? {})
  }
  return data
}
