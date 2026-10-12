<script setup>
import { nextTick, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import BarmanChat from '@/components/bar/BarmanChat.vue'
import DrinkMenu from '@/components/bar/DrinkMenu.vue'
import { useBarStore } from '@/stores/bar'
import { useWalletStore } from '@/stores/wallet'

const TABS = ['menu', 'chat']

const expanded = defineModel('expanded', { type: Boolean, default: false })
const tab = defineModel('tab', { type: String, default: 'menu' })

const { t, locale } = useI18n()
const bar = useBarStore()
const wallet = useWalletStore()

function choose(id) {
  tab.value = id
  expanded.value = true
}

async function step(event) {
  const delta = { ArrowRight: 1, ArrowLeft: -1 }[event.key]
  if (!delta) return
  event.preventDefault()
  const next = TABS[(TABS.indexOf(tab.value) + delta + TABS.length) % TABS.length]
  choose(next)
  await nextTick()
  document.getElementById(`bar-sheet-tab-${next}`)?.focus()
}

function isKeyboardFocus(element) {
  try {
    return element.matches(':focus-visible')
  } catch {
    return false
  }
}

function onFocusIn(event) {
  if (!expanded.value && isKeyboardFocus(event.target)) expanded.value = true
}

watch(
  () => bar.lastOrder?.id,
  (id) => {
    if (id && tab.value === 'menu') expanded.value = false
  },
)

watch(
  () => bar.error,
  (error) => {
    if (error) expanded.value = true
  },
)
</script>

<template>
  <section class="sheet" :class="{ expanded }" :aria-label="t('bar.sheet.label')">
    <button
      type="button"
      class="grab"
      :aria-expanded="expanded"
      aria-controls="bar-sheet-body"
      :aria-label="expanded ? t('bar.sheet.collapse') : t('bar.sheet.expand')"
      @click="expanded = !expanded"
    >
      <span class="handle" aria-hidden="true"></span>
    </button>

    <div class="tabs" role="tablist" @keydown="step">
      <button
        v-for="id in TABS"
        :id="`bar-sheet-tab-${id}`"
        :key="id"
        type="button"
        role="tab"
        class="tab"
        :aria-selected="tab === id"
        :aria-controls="`bar-sheet-${id}`"
        :tabindex="tab === id ? 0 : -1"
        @click="choose(id)"
      >
        {{ t(`bar.sheet.${id}`) }}
      </button>
    </div>

    <div id="bar-sheet-body" class="body" @focusin="onFocusIn">
      <div v-show="tab === 'menu'" id="bar-sheet-menu" role="tabpanel" aria-labelledby="bar-sheet-tab-menu">
        <DrinkMenu
          title-hidden
          :drinks="bar.drinks"
          :balance="wallet.balance"
          :ordering="bar.ordering"
          :credit-available="bar.creditAvailable"
          :error="bar.error"
          @order="bar.order"
          @accept-credit="bar.askCredit"
        />
      </div>
      <div v-show="tab === 'chat'" id="bar-sheet-chat" role="tabpanel" aria-labelledby="bar-sheet-tab-chat">
        <BarmanChat
          :lines="bar.conversation"
          :thinking="bar.talking"
          :locked="bar.talkLocked"
          @ask="bar.ask"
          @say="(text) => bar.say(text, locale)"
        />
      </div>
    </div>
  </section>
</template>

<style scoped>
.sheet {
  --peek: 250px;
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 2;
  display: flex;
  flex-direction: column;
  height: min(calc(100% - 20px), 600px);
  box-sizing: border-box;
  background: var(--fieltro);
  border-top: 1px solid var(--laton);
  border-radius: 14px 14px 0 0;
  box-shadow: 0 -12px 30px rgba(0, 0, 0, 0.55);
  transform: translateY(calc(100% - var(--peek)));
  transition: transform 300ms cubic-bezier(0.22, 1, 0.36, 1);
}

.sheet.expanded {
  transform: translateY(0);
}

.grab {
  flex: none;
  display: grid;
  place-items: center;
  height: 28px;
  background: none;
  border: 0;
  cursor: pointer;
}

.handle {
  width: 40px;
  height: 4px;
  border-radius: 2px;
  background: var(--humo);
  transition: background-color var(--duracion-corta) ease-out;
}

.grab:hover .handle,
.grab:focus-visible .handle {
  background: var(--marfil);
}

.grab:focus-visible {
  outline: 2px solid var(--oro);
  outline-offset: -4px;
}

.tabs {
  flex: none;
  display: flex;
  gap: 4px;
  padding: 0 16px;
  border-bottom: 1px solid var(--linea-suave);
}

.tab {
  position: relative;
  min-height: 44px;
  padding: 0 14px;
  background: none;
  border: 0;
  color: var(--humo);
  font-family: var(--f-titulo);
  font-size: 1.25rem;
  font-weight: 600;
  cursor: pointer;
  transition: color var(--duracion-corta) ease-out;
}

.tab::after {
  content: '';
  position: absolute;
  left: 14px;
  right: 14px;
  bottom: -1px;
  height: 2px;
  background: var(--oro);
  transform: scaleX(0);
  transition: transform var(--duracion-corta) ease-out;
}

.tab[aria-selected='true'] {
  color: var(--marfil);
}

.tab[aria-selected='true']::after {
  transform: scaleX(1);
}

.tab:hover {
  color: var(--marfil);
}

.tab:focus-visible {
  outline: 2px solid var(--oro);
  outline-offset: -2px;
}

.body {
  flex: 1;
  min-height: 0;
  padding: 4px 16px 20px;
  overflow: hidden;
  overscroll-behavior: contain;
}

.sheet.expanded .body {
  overflow-y: auto;
}

@media (orientation: landscape) and (max-height: 520px) {
  .sheet {
    position: static;
    height: 100%;
    min-height: 0;
    border-top: 0;
    border-left: 1px solid var(--laton);
    border-radius: 0;
    box-shadow: none;
    transform: none;
  }

  .grab {
    display: none;
  }

  .body {
    overflow-y: auto;
  }
}

@media (prefers-reduced-motion: reduce) {
  .sheet,
  .handle,
  .tab,
  .tab::after {
    transition: none;
  }
}
</style>
