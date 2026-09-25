// Cliente de la API. ADR-08: el access token vive SOLO en memoria (una variable de este módulo);
// el refresh va en una cookie HttpOnly que el navegador adjunta solo a /api/v1/auth y que aquí nunca se ve
const BASE = '/api/v1'

let accessToken = null
// Varias peticiones pueden recibir 401 a la vez: comparten un único refresh en vuelo
let refreshInFlight = null
// Sube con cada fin de sesión: un refresh que termine después de un logout ya no puede resucitarla
let generation = 0
// Lo registra la app (session.js): qué hacer cuando la sesión se pierde a mitad (mandar a la puerta)
let sessionExpiredHandler = null

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

// Fin de sesión en este navegador: olvida el access e invalida cualquier refresh que siga en vuelo
export function endSession() {
  accessToken = null
  generation += 1
}

// El logout espera a que acabe un refresh en marcha, para revocar la cookie más reciente y no la anterior
export function waitForRefresh() {
  return refreshInFlight ?? Promise.resolve(false)
}

export function onSessionExpired(handler) {
  sessionExpiredHandler = handler
}

// Pide un access nuevo con la cookie. true si lo consiguió; false si no hay sesión (cookie ausente o caducada)
export function refreshAccessToken() {
  if (!refreshInFlight) {
    const startedAt = generation
    refreshInFlight = fetch(`${BASE}/auth/refresh`, { method: 'POST', credentials: 'same-origin' })
      .then(async (response) => {
        // La sesión terminó mientras volaba (logout): este token ya no vale para nadie
        if (generation !== startedAt) return false
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
  const tokenUsed = accessToken
  let response = await send(path, method, body)

  // Access caducado: un refresh silencioso y un reintento. Las rutas de /auth no, o un login
  // fallido dispararía un refresh sin sentido
  if (response.status === 401 && !path.startsWith('/auth/')) {
    // Si otra petición ya renovó el token mientras esta volaba, basta con reintentar
    const renewed = (accessToken !== null && accessToken !== tokenUsed) || (await refreshAccessToken())
    if (renewed) {
      response = await send(path, method, body)
    } else {
      sessionExpiredHandler?.()
    }
  }
  return parse(response)
}

function send(path, method, body) {
  const options = {
    method,
    headers: {},
    // same-origin: el navegador adjunta la cookie del refresh (solo viaja a /api/v1/auth)
    credentials: 'same-origin',
  }
  if (accessToken) options.headers.Authorization = `Bearer ${accessToken}`
  if (body !== undefined) {
    options.headers['Content-Type'] = 'application/json'
    options.body = JSON.stringify(body)
  }
  return fetch(`${BASE}${path}`, options)
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
