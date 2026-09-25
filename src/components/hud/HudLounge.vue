<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import FichaSaldo from './FichaSaldo.vue'
import LibroCuentas from './LibroCuentas.vue'
import NombreSocio from './NombreSocio.vue'
import { useAuthStore } from '@/stores/auth'
import { useWalletStore } from '@/stores/wallet'

// El HUD sobre el lounge. No sabe nada del 3D: el mismo HUD servirá al salón móvil 2D (IUL-58)
const auth = useAuthStore()
const wallet = useWalletStore()
const router = useRouter()
const bookOpen = ref(false)

onMounted(() => {
  // Si falla, la ficha se queda en "—": el lounge sigue siendo visitable sin saldo
  wallet.loadBalance().catch(() => {})
})

async function toggleBook() {
  bookOpen.value = !bookOpen.value
  if (bookOpen.value) {
    await wallet.loadTransactions().catch(() => {})
  }
}

async function logout() {
  try {
    await auth.logout()
  } finally {
    wallet.$reset()
    await router.replace({ name: 'acceso' })
  }
}
</script>

<template>
  <div class="hud">
    <div class="barra">
      <FichaSaldo :balance="wallet.balance" @open="toggleBook" />
      <NombreSocio :username="auth.user?.username" @logout="logout" />
    </div>
    <Transition name="libro">
      <LibroCuentas v-if="bookOpen" :transactions="wallet.transactions" @close="bookOpen = false" />
    </Transition>
  </div>
</template>

<style scoped>
/* Arriba a la derecha y fuera del paso: solo sus piezas reciben clics, el resto va al lounge */
.hud {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 5;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
  pointer-events: none;
}

.hud > * {
  pointer-events: auto;
}

.barra {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.libro-enter-active,
.libro-leave-active {
  transition:
    opacity var(--duracion-media),
    transform var(--duracion-media);
}

.libro-enter-from,
.libro-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

@media (prefers-reduced-motion: reduce) {
  .libro-enter-active,
  .libro-leave-active {
    transition: none;
  }
}
</style>
