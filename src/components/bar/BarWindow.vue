<script setup>
import { computed, onBeforeUnmount, onMounted, useTemplateRef } from 'vue'
import { I18nT, useI18n } from 'vue-i18n'

import BarmanChat from './BarmanChat.vue'
import BarmanPortrait from './BarmanPortrait.vue'
import DrinkMenu from './DrinkMenu.vue'
import { useEscapeKey } from '@/composables/useEscapeKey'
import { useAuthStore } from '@/stores/auth'
import { useBarStore } from '@/stores/bar'
import { useWalletStore } from '@/stores/wallet'

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'

const emit = defineEmits(['close'])

const { t, te, locale } = useI18n()
const auth = useAuthStore()
const bar = useBarStore()
const wallet = useWalletStore()
const dialog = useTemplateRef('dialog')
const title = useTemplateRef('title')
const previouslyFocused = document.activeElement

const rankName = computed(() => {
  const code = String(auth.user?.rank ?? 'NADIE').toLowerCase()
  return t(te(`rank.${code}`) ? `rank.${code}` : 'rank.nadie')
})

function trapFocus(event) {
  if (event.key !== 'Tab') return
  const items = [...(dialog.value?.querySelectorAll(FOCUSABLE) ?? [])]
  if (items.length === 0) return
  const first = items[0]
  const last = items[items.length - 1]
  const current = document.activeElement
  const onControl = items.includes(current)
  if (event.shiftKey && (!onControl || current === first)) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && (!onControl || current === last)) {
    event.preventDefault()
    first.focus()
  }
}

useEscapeKey(() => emit('close'))

onMounted(() => {
  window.addEventListener('keydown', trapFocus)
  title.value?.focus()
  bar.load()
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', trapFocus)
  if (previouslyFocused instanceof HTMLElement && previouslyFocused.isConnected) previouslyFocused.focus()
})
</script>

<template>
  <div class="backdrop">
    <section
      ref="dialog"
      class="window"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bar-window-title"
    >
      <header class="head">
        <div class="avatar"><BarmanPortrait /></div>
        <div class="who">
          <h2 id="bar-window-title" ref="title" class="name" tabindex="-1">{{ t('bar.window.title') }}</h2>
          <I18nT keypath="bar.window.rank" tag="p" scope="global" class="rank">
            <template #rank>
              <strong class="rank-name">{{ rankName }}</strong>
            </template>
          </I18nT>
        </div>
        <p class="hint">{{ t('bar.window.hint') }}</p>
        <button type="button" class="close" :aria-label="t('bar.window.close')" @click="emit('close')">×</button>
      </header>

      <div class="body">
        <BarmanChat
          class="conversation"
          :lines="bar.conversation"
          :thinking="bar.talking"
          :locked="bar.talkLocked"
          @ask="bar.ask"
          @say="(text) => bar.say(text, locale)"
        />
        <DrinkMenu
          class="menu"
          :drinks="bar.drinks"
          :balance="wallet.balance"
          :ordering="bar.ordering"
          :credit-available="bar.creditAvailable"
          :error="bar.error"
          @order="bar.order"
          @accept-credit="bar.askCredit"
        />
      </div>
    </section>
  </div>
</template>

<style scoped>
.backdrop {
  position: fixed;
  inset: 0;
  z-index: 10;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: clamp(16px, 9vh, 112px) 16px 16px;
  overflow-y: auto;
  background: rgba(5, 9, 8, 0.6);
}

.window {
  display: flex;
  flex-direction: column;
  width: min(900px, 100%);
  background: rgba(17, 31, 29, 0.97);
  border: 1px solid rgba(201, 164, 92, 0.35);
  border-radius: 2px;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.6);
  animation: rise var(--duracion-media) ease-out;
}

.head {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 18px 24px;
  border-bottom: 1px solid var(--linea-suave);
}

.avatar {
  flex: none;
  width: 64px;
  height: 64px;
  overflow: hidden;
  border: 1.5px solid var(--laton);
  border-radius: 50%;
  background: var(--tapete);
}

.who {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.name {
  margin: 0;
  font-family: var(--f-titulo);
  font-size: 1.65rem;
  font-weight: 600;
  line-height: 1.1;
  color: var(--marfil);
}

.name:focus {
  outline: none;
}

.rank {
  margin: 0;
  font-family: var(--f-ui);
  font-size: 13px;
  color: var(--humo);
}

.rank-name {
  font-weight: 500;
  color: var(--oro);
}

.hint {
  margin: 0;
  font-family: var(--f-ui);
  font-size: 10px;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: rgba(147, 166, 158, 0.6);
}

.close {
  flex: none;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border: none;
  background: none;
  color: var(--humo);
  font-size: 1.6rem;
  line-height: 1;
  cursor: pointer;
}

.close:hover,
.close:focus-visible {
  color: var(--marfil);
}

.close:focus-visible {
  outline: 2px solid var(--oro);
  outline-offset: -4px;
}

.body {
  display: grid;
  grid-template-columns: 1fr 380px;
  height: min(500px, calc(100dvh - 240px));
  min-height: 360px;
}

.conversation {
  padding: 22px 24px;
  border-right: 1px solid var(--linea-suave);
}

.menu {
  padding: 14px 24px 20px;
  overflow-y: auto;
}

@keyframes rise {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
}

@media (max-width: 760px) {
  .body {
    grid-template-columns: 1fr;
    height: auto;
    overflow-y: auto;
  }

  .conversation {
    border-right: none;
    border-bottom: 1px solid var(--linea-suave);
  }

  .hint {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .window {
    animation: none;
  }
}
</style>
