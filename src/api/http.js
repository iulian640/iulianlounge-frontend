const BASE = '/api/v1'

let accessToken = null
let refreshInFlight = null
let generation = 0
let sessionExpiredHandler = null

export class ApiError extends Error {
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

export function endSession() {
  accessToken = null
  generation += 1
}

export function waitForRefresh() {
  return refreshInFlight ?? Promise.resolve(false)
}

export function onSessionExpired(handler) {
  sessionExpiredHandler = handler
}

export function refreshAccessToken() {
  if (!refreshInFlight) {
    const startedAt = generation
    refreshInFlight = fetch(`${BASE}/auth/refresh`, { method: 'POST', credentials: 'same-origin' })
      .then(async (response) => {
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

  if (response.status === 401 && !path.startsWith('/auth/')) {
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
    throw new ApiError(response.status, data?.code ?? 'request.rejected', data?.errors ?? {})
  }
  return data
}
