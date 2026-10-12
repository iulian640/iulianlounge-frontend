<script setup>
import { nextTick, onMounted, ref, useTemplateRef } from 'vue'
import { useRouter } from 'vue-router'

import FichaSaldo from './FichaSaldo.vue'
import LibroCuentas from './LibroCuentas.vue'
import NombreSocio from './NombreSocio.vue'
import { useAuthStore } from '@/stores/auth'
import { useBarStore } from '@/stores/bar'
import { useBlackjackStore } from '@/stores/blackjack'
import { useWalletStore } from '@/stores/wallet'

defineProps({
  inline: { type: Boolean, default: false },
})

const auth = useAuthStore()
const wallet = useWalletStore()
const bar = useBarStore()
const blackjack = useBlackjackStore()
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
  blackjack.$reset()
  leaving.value = false
  await router.replace({ name: 'acceso' })
}
</script>

<template>
  <div class="hud" :class="{ inline }">
    <div class="barra">
      <FichaSaldo ref="chip" :balance="wallet.balance" :expanded="bookOpen" @open="toggleBook" />
      <NombreSocio :username="auth.user?.username" :rank="auth.user?.rank" @logout="logout" />
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
  position: relative;
  top: auto;
  right: auto;
  width: 100%;
}

.hud.inline :deep(.libro) {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 3;
}

.barra {
  display: flex;
  align-items: stretch;
  max-width: 100%;
  background: rgba(17, 31, 29, 0.94);
  border: 1px solid var(--linea);
  border-radius: 2px;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.5);
}

.hud.inline .barra {
  width: 100%;
  box-shadow: none;
}

.hud.inline :deep(.ficha) {
  flex: 1;
}

.hud.inline :deep(.socio) {
  flex-shrink: 0;
}

@media (max-width: 379px) {
  .hud.inline :deep(.socio) {
    flex-shrink: 1;
  }
}

.libro-enter-active,
.libro-leave-active {
  transition:
    opacity 200ms ease-out,
    transform 200ms cubic-bezier(0.22, 1, 0.36, 1);
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
