import { onSessionExpired } from '@/api/http'
import { useAuthStore } from '@/stores/auth'
import { useBarStore } from '@/stores/bar'
import { useWalletStore } from '@/stores/wallet'

export function installSessionExpiry(router, pinia) {
  onSessionExpired(() => {
    useAuthStore(pinia).expireSession()
    useWalletStore(pinia).$reset()
    useBarStore(pinia).$reset()

    const current = router.currentRoute.value
    if (current.name !== 'acceso') {
      router.replace({ name: 'acceso', query: { next: current.fullPath } })
    }
  })
}
