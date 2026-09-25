import { describe, expect, it, vi } from 'vitest'
import { createPinia } from 'pinia'

import { installSessionExpiry } from './session'
import { onSessionExpired } from '@/api/http'
import { useAuthStore } from '@/stores/auth'
import { useWalletStore } from '@/stores/wallet'

vi.mock('@/api/http', () => ({
  onSessionExpired: vi.fn(),
  api: vi.fn(),
  endSession: vi.fn(),
  refreshAccessToken: vi.fn(),
  setAccessToken: vi.fn(),
  waitForRefresh: vi.fn(),
}))

function routerEn(name, fullPath) {
  return { currentRoute: { value: { name, fullPath } }, replace: vi.fn() }
}

describe('installSessionExpiry', () => {
  it('con la sesión perdida, fuera el perfil y las fichas y a la puerta recordando dónde estaba', () => {
    const pinia = createPinia()
    const router = routerEn('loungeview', '/')
    const auth = useAuthStore(pinia)
    auth.user = { username: 'cursaito' }
    const wallet = useWalletStore(pinia)
    wallet.balance = 100

    installSessionExpiry(router, pinia)
    onSessionExpired.mock.calls.at(-1)[0]()

    expect(auth.isAuthenticated).toBe(false)
    expect(wallet.balance).toBeNull()
    expect(router.replace).toHaveBeenCalledWith({ name: 'acceso', query: { next: '/' } })
  })

  it('si ya estaba en la puerta, no redirige otra vez', () => {
    const pinia = createPinia()
    const router = routerEn('acceso', '/acceso')

    installSessionExpiry(router, pinia)
    onSessionExpired.mock.calls.at(-1)[0]()

    expect(router.replace).not.toHaveBeenCalled()
  })
})
