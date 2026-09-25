import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { api, refreshAccessToken, setAccessToken } from '@/api/http'

// Quién ha entrado en el club. El access token no vive aquí sino en api/http.js (memoria);
// este store solo guarda el perfil que devuelve /me
export const useAuthStore = defineStore('auth', () => {
  const user = ref(null) // { userId, username, locale, rank }
  const isAuthenticated = computed(() => user.value !== null)
  // Al abrir la web se intenta recuperar la sesión con la cookie UNA vez; después, no hay que insistir
  let sessionChecked = false

  async function login(username, password) {
    const { accessToken } = await api('/auth/login', { method: 'POST', body: { username, password } })
    setAccessToken(accessToken)
    await loadProfile()
  }

  // Registro y, si sale bien, dentro directamente: nadie quiere escribir la contraseña dos veces
  async function register({ username, email, password, locale }) {
    await api('/auth/register', { method: 'POST', body: { username, email, password, locale } })
    await login(username, password)
  }

  // Recargar la página borra la memoria (y el access), pero la cookie sigue: con ella se pide uno nuevo
  async function restoreSession() {
    if (sessionChecked) return isAuthenticated.value
    sessionChecked = true

    if (!(await refreshAccessToken())) return false
    try {
      await loadProfile()
      return true
    } catch {
      return false
    }
  }

  async function logout() {
    try {
      await api('/auth/logout', { method: 'POST' })
    } finally {
      // Aunque el servidor no conteste, en este navegador la sesión se acaba
      setAccessToken(null)
      user.value = null
      sessionChecked = true
    }
  }

  async function loadProfile() {
    user.value = await api('/me')
  }

  return { user, isAuthenticated, login, register, restoreSession, logout }
})
