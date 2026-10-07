<script setup>
import { nextTick, onMounted, ref, useTemplateRef } from 'vue'
import { useRouter } from 'vue-router'

import FichaSaldo from './FichaSaldo.vue'
import LibroCuentas from './LibroCuentas.vue'
import NombreSocio from './NombreSocio.vue'
import { useAuthStore } from '@/stores/auth'
import { useBarStore } from '@/stores/bar'
import { useWalletStore } from '@/stores/wallet'

defineProps({
  inline: { type: Boolean, default: false },
})

const auth = useAuthStore()
const wallet = useWalletStore()
const bar = useBarStore()
const router = useRouter()
const bookOpen = ref(false)
const leaving = ref(false)
const chip = useTemplateRef('chip')

onMounted(() => {
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

async function closeBook() {
  bookOpen.value = false
  await nextTick()
  chip.value?.focus()
}

function dismissBook() {
  bookOpen.value = false
}

defineExpose({ dismissBook })

async function logout() {
  if (leaving.value) return
  leaving.value = true
  await auth.logout().catch(() => null)
  wallet.$reset()
  bar.$reset()
  leaving.value = false
  await router.replace({ name: 'acceso' })
}
</script>

<template>
  <div class="hud" :class="{ inline }">
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

.hud.inline {
  position: static;
  width: 100%;
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
