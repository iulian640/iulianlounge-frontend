import { onSessionExpired } from '@/api/http'
import { useAuthStore } from '@/stores/auth'
import { useWalletStore } from '@/stores/wallet'

// Cuando la sesión se pierde a mitad (el refresh ya no vale), la app no se queda fingiendo que sigues dentro:
// fuera el perfil y las fichas, y a la puerta, recordando dónde estabas
export function installSessionExpiry(router, pinia) {
  onSessionExpired(() => {
    useAuthStore(pinia).expireSession()
    useWalletStore(pinia).$reset()

    const current = router.currentRoute.value
    if (current.name !== 'acceso') {
      router.replace({ name: 'acceso', query: { next: current.fullPath } })
    }
  })
}
