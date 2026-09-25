<script setup>
import { nextTick, onMounted, ref, useTemplateRef } from 'vue'
import { useRouter } from 'vue-router'

import FichaSaldo from './FichaSaldo.vue'
import LibroCuentas from './LibroCuentas.vue'
import NombreSocio from './NombreSocio.vue'
import { useAuthStore } from '@/stores/auth'
import { useWalletStore } from '@/stores/wallet'

// El HUD sobre el lounge. No sabe nada del 3D: el mismo HUD sirve al salón móvil 2D (IUL-58)
const auth = useAuthStore()
const wallet = useWalletStore()
const router = useRouter()
const bookOpen = ref(false)
const leaving = ref(false)
const chip = useTemplateRef('chip')

onMounted(() => {
  // Si falla, la ficha se queda en "—" y el store guarda el error: el lounge sigue siendo visitable
  wallet.loadBalance()
})

async function toggleBook() {
  if (bookOpen.value) {
    closeBook()
    return
  }
  bookOpen.value = true
  await wallet.loadTransactions()
}

// Al cerrar, el foco vuelve a la ficha: un usuario de teclado no se queda perdido en el <body>
async function closeBook() {
  bookOpen.value = false
  await nextTick()
  chip.value?.focus()
}

async function logout() {
  if (leaving.value) return // doble clic
  leaving.value = true
  try {
    await auth.logout()
  } catch {
    // El servidor no contestó: en este navegador la sesión ya está cerrada (lo hace el store igualmente)
  } finally {
    wallet.$reset()
    leaving.value = false
    await router.replace({ name: 'acceso' })
  }
}
</script>

<template>
  <div class="hud">
    <div class="barra">
      <FichaSaldo ref="chip" :balance="wallet.balance" :expanded="bookOpen" @open="toggleBook" />
      <NombreSocio :username="auth.user?.username" @logout="logout" />
    </div>
    <Transition name="libro">
      <LibroCuentas
        v-if="bookOpen"
        :transactions="wallet.transactions"
        :error="wallet.error"
        @close="closeBook"
      />
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
