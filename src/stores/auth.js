import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { api, endSession, refreshAccessToken, setAccessToken, waitForRefresh } from '@/api/http'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const isAuthenticated = computed(() => user.value !== null)
  let restoring = null

  async function login(username, password) {
    const { accessToken } = await api('/auth/login', { method: 'POST', body: { username, password } })
    setAccessToken(accessToken)
    await loadProfile()
    restoring = Promise.resolve(true)
  }

  async function register({ username, email, password, locale }) {
    await api('/auth/register', { method: 'POST', body: { username, email, password, locale } })
    try {
      await login(username, password)
    } catch (error) {
      throw Object.assign(error ?? {}, { registered: true })
    }
  }

  function restoreSession() {
    restoring ??= (async () => {
      if (isAuthenticated.value) return true
      if (!(await refreshAccessToken())) return false
      try {
        await loadProfile()
        return true
      } catch {
        setAccessToken(null)
        return false
      }
    })()
    return restoring
  }

  async function logout() {
    await waitForRefresh()
    try {
      await api('/auth/logout', { method: 'POST' })
    } finally {
      forget()
    }
  }

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
