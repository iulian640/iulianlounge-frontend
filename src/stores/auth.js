import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { api, endSession, refreshAccessToken, setAccessToken, waitForRefresh } from '@/api/http'

// Quién ha entrado en el club. El access token no vive aquí sino en api/http.js (memoria);
// este store solo guarda el perfil que devuelve /me
export const useAuthStore = defineStore('auth', () => {
  const user = ref(null) // { userId, username, locale, rank }
  const isAuthenticated = computed(() => user.value !== null)
  // La recuperación de sesión al abrir la web, como PROMESA: dos navegaciones a la vez esperan la misma,
  // en vez de que la segunda vea "sin sesión" mientras la primera aún está preguntando
  let restoring = null

  async function login(username, password) {
    const { accessToken } = await api('/auth/login', { method: 'POST', body: { username, password } })
    setAccessToken(accessToken)
    await loadProfile()
    restoring = Promise.resolve(true)
  }

  // Registro y, si sale bien, dentro directamente. Si el alta va bien pero el login falla (red, 5xx),
  // el error sale marcado con registered: la cuenta ya existe y reintentar el alta daría "nombre en uso"
  async function register({ username, email, password, locale }) {
    await api('/auth/register', { method: 'POST', body: { username, email, password, locale } })
    try {
      await login(username, password)
    } catch (error) {
      throw Object.assign(error ?? {}, { registered: true })
    }
  }

  // Recargar la página borra la memoria (y el access), pero la cookie sigue: con ella se pide uno nuevo
  function restoreSession() {
    restoring ??= (async () => {
      if (isAuthenticated.value) return true
      if (!(await refreshAccessToken())) return false
      try {
        await loadProfile()
        return true
      } catch {
        // Refresh bueno pero /me falla: nada de un access suelto sin perfil
        setAccessToken(null)
        return false
      }
    })()
    return restoring
  }

  async function logout() {
    // Si hay un refresh en vuelo, se espera: así /auth/logout borra la cookie más reciente, no la anterior
    await waitForRefresh()
    try {
      await api('/auth/logout', { method: 'POST' })
    } finally {
      // Aunque el servidor no conteste, en este navegador la sesión se acaba
      forget()
    }
  }

  // La sesión se perdió a mitad (cookie caducada o revocada): mismo final que un logout, sin llamar al backend
  function expireSession() {
    forget()
  }

  function forget() {
    endSession()
    user.value = null
    restoring = Promise.resolve(false)
  }

  async function loadProfile() {
    user.value = await api('/me')
  }

  return { user, isAuthenticated, login, register, restoreSession, logout, expireSession }
})
