<script setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import BarmanChat from '@/components/bar/BarmanChat.vue'
import BarmanFigure from '@/components/bar/BarmanFigure.vue'
import DrinkMenu from '@/components/bar/DrinkMenu.vue'
import { useBarLines } from '@/composables/useBarLines'
import { useBarStore } from '@/stores/bar'
import { useWalletStore } from '@/stores/wallet'

const BOTTLE_VARIANTS = 4
const LONG_LINE_LENGTH = 90
const CLOSED_CORNERS = ['cartas', 'escenario']
const SHELVES = [
  { id: 'upper', count: 9, offset: 0 },
  { id: 'lower', count: 8, offset: 2 },
]

const { t, locale } = useI18n()
const { lineText } = useBarLines()
const bar = useBarStore()
const wallet = useWalletStore()
const open = ref(false)

const lastBarmanLine = computed(() => bar.conversation.findLast((line) => line.from === 'barman'))
const speech = computed(() => (lastBarmanLine.value ? lineText(lastBarmanLine.value) : ''))
const isLong = computed(() => speech.value.length > LONG_LINE_LENGTH)

function bottles(shelf) {
  return Array.from({ length: shelf.count }, (_, index) => ({
    id: `${shelf.id}-${index}`,
    variant: (index + shelf.offset) % BOTTLE_VARIANTS,
  }))
}

onMounted(() => {
  bar.load()
})
</script>

<template>
  <main class="salon">
    <slot name="hud" />
    <p class="letrero" aria-hidden="true">IULIAN'S</p>
    <h1 class="sala">{{ t('salon.name') }}</h1>

    <div class="scene">
      <div class="decor" aria-hidden="true">
        <span class="glow"></span>
        <span class="lamp"></span>
        <div v-for="shelf in SHELVES" :key="shelf.id" class="shelf" :class="shelf.id">
          <span
            v-for="bottle in bottles(shelf)"
            :key="bottle.id"
            class="bottle"
            :class="`bottle-${bottle.variant}`"
          ></span>
        </div>
      </div>
      <BarmanFigure class="barman" />
      <div v-if="speech" class="speech" :aria-hidden="open ? 'true' : null">
        <p class="speech-text" :class="{ long: isLong }">{{ speech }}</p>
      </div>
      <span
        v-if="bar.lastOrder"
        :key="bar.lastOrder.id"
        class="glass"
        role="img"
        :aria-label="t('bar.scene.glass')"
      ></span>
      <div class="counter" aria-hidden="true"></div>
    </div>

    <div class="content">
      <button
        type="button"
        class="corner toggle"
        :class="{ expanded: open }"
        :aria-expanded="open"
        aria-controls="bar-panel"
        @click="open = !open"
      >
        <span class="corner-text">
          <span class="corner-label">{{ t('salon.corners.barra') }}</span>
          <span class="corner-title">{{ t('bar.corner.title') }}</span>
        </span>
        <span class="corner-arrow" aria-hidden="true">{{ open ? '▴' : '▾' }}</span>
      </button>

      <div v-show="open" id="bar-panel" class="bar-panel">
        <BarmanChat
          compact
          :lines="bar.conversation"
          :thinking="bar.talking"
          :locked="bar.talkLocked"
          @ask="bar.ask"
          @say="(text) => bar.say(text, locale)"
        />
        <DrinkMenu
          :drinks="bar.drinks"
          :balance="wallet.balance"
          :ordering="bar.ordering"
          :credit-available="bar.creditAvailable"
          :error="bar.error"
          @order="bar.order"
          @accept-credit="bar.askCredit"
        />
      </div>

      <ul class="corners">
        <li v-for="corner in CLOSED_CORNERS" :key="corner" class="corner closed">
          <span class="corner-title">{{ t(`salon.corners.${corner}`) }}</span>
          <span class="corner-state">{{ t('salon.closed') }}</span>
        </li>
      </ul>
    </div>
  </main>
</template>

<style scoped>
.salon {
  height: 100dvh;
  overflow-y: auto;
  box-sizing: border-box;
  padding: 16px 16px 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  background:
    radial-gradient(ellipse 70% 30% at 50% 22%, rgba(232, 205, 143, 0.1), transparent 70%),
    var(--medianoche);
}

.letrero {
  margin: 22px 0 0;
  font-family: var(--f-letrero);
  font-size: 2.4rem;
  color: var(--oro);
  letter-spacing: 0.06em;
  text-shadow:
    0 0 6px rgba(232, 205, 143, 0.6),
    0 0 22px rgba(232, 205, 143, 0.35);
}

.sala {
  margin: 4px 0 20px;
  font-family: var(--f-titulo);
  font-weight: 600;
  font-style: italic;
  font-size: 1.35rem;
  color: var(--marfil);
}

.scene {
  position: relative;
  flex: none;
  width: min(100%, 420px);
  height: 330px;
  box-sizing: border-box;
  overflow: hidden;
  border: 1px solid var(--linea);
  border-radius: 2px;
  background: linear-gradient(180deg, #1c1510 0%, #140f0b 100%);
}

.glow {
  position: absolute;
  left: 15%;
  top: -50px;
  width: 70%;
  height: 160px;
  border-radius: 50%;
  background: rgba(232, 205, 143, 0.16);
  filter: blur(34px);
}

.lamp {
  position: absolute;
  top: 0;
  left: 50%;
  width: 56px;
  height: 12px;
  transform: translateX(-50%);
  background: var(--laton);
  border-radius: 0 0 28px 28px;
}

.shelf {
  position: absolute;
  left: 20px;
  right: 20px;
  display: flex;
  align-items: flex-end;
  justify-content: space-around;
  height: 48px;
  border-bottom: 4px solid #3b2a1c;
}

.shelf.upper {
  top: 58px;
}

.shelf.lower {
  top: 124px;
}

.bottle {
  width: 14px;
  border-radius: 5px 5px 2px 2px;
  box-shadow: inset 3px 0 0 rgba(255, 255, 255, 0.12);
}

.bottle-0 {
  height: 42px;
  background: linear-gradient(180deg, #2f4a2c, #1b2c1a);
}

.bottle-1 {
  width: 17px;
  height: 34px;
  background: linear-gradient(180deg, #6b4a1e, #3f2b10);
}

.bottle-2 {
  width: 11px;
  height: 48px;
  background: linear-gradient(180deg, #4a1f1c, #2b1110);
}

.bottle-3 {
  height: 30px;
  background: linear-gradient(180deg, #8a6a2f, #54401c);
}

.barman {
  position: absolute;
  left: 34px;
  bottom: 44px;
  width: 120px;
  height: 150px;
}

.speech {
  position: absolute;
  left: 132px;
  right: 14px;
  bottom: 182px;
  background: var(--marfil);
  color: var(--medianoche);
  border-radius: 18px 18px 18px 4px;
  box-shadow: 0 10px 26px rgba(0, 0, 0, 0.45);
}

.speech::after {
  content: '';
  position: absolute;
  left: 0;
  bottom: -16px;
  border-top: 18px solid var(--marfil);
  border-right: 18px solid transparent;
}

.speech-text {
  max-height: 128px;
  margin: 0;
  padding: 12px 16px;
  overflow-y: auto;
  overscroll-behavior: contain;
  overflow-wrap: anywhere;
  font-family: var(--f-titulo);
  font-size: 17px;
  font-weight: 600;
  line-height: 1.3;
}

.speech-text.long {
  font-size: 15px;
  line-height: 1.25;
}

.glass {
  position: absolute;
  left: 50%;
  bottom: 66px;
  width: 26px;
  height: 28px;
  animation: serve var(--duracion-media) ease-out;
}

.glass::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  border-left: 13px solid transparent;
  border-right: 13px solid transparent;
  border-top: 16px solid rgba(239, 229, 204, 0.9);
}

.glass::after {
  content: '';
  position: absolute;
  left: 12px;
  top: 15px;
  width: 2px;
  height: 11px;
  background: rgba(239, 229, 204, 0.9);
  box-shadow:
    -5px 11px 0 0 rgba(239, 229, 204, 0.9),
    5px 11px 0 0 rgba(239, 229, 204, 0.9);
}

.counter {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 74px;
  background: linear-gradient(180deg, #3a2618 0%, #24170e 100%);
  box-shadow: 0 -8px 16px rgba(0, 0, 0, 0.5);
}

.counter::before {
  content: '';
  position: absolute;
  top: 10px;
  left: 0;
  right: 0;
  height: 4px;
  background: var(--laton);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.6);
}

.content {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: min(100%, 420px);
  margin-top: 18px;
}

.corner {
  font: inherit;
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 56px;
  box-sizing: border-box;
  padding: 14px 18px;
  background: var(--fieltro);
  border: 1px solid var(--linea-suave);
  border-radius: 2px;
  text-align: left;
}

.toggle {
  color: var(--marfil);
  cursor: pointer;
  transition: border-color var(--duracion-corta);
}

.toggle:hover,
.toggle.expanded {
  border-color: rgba(232, 205, 143, 0.7);
}

.toggle:focus-visible {
  outline: 2px solid var(--oro);
  outline-offset: 2px;
}

.corner-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.corner-label {
  font-family: var(--f-ui);
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.26em;
  text-transform: uppercase;
  color: var(--laton);
}

.corner-title {
  font-family: var(--f-titulo);
  font-size: 1.3rem;
  font-weight: 600;
  line-height: 1.15;
  color: var(--marfil);
}

.corner-arrow {
  font-family: var(--f-ui);
  font-size: 14px;
  color: var(--oro);
}

.bar-panel {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.corners {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.corner.closed {
  justify-content: space-between;
  opacity: 0.55;
}

.corner-state {
  font-family: var(--f-ui);
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.26em;
  text-transform: uppercase;
  color: var(--humo);
}

@keyframes serve {
  from {
    opacity: 0;
    transform: translateY(-14px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .glass {
    animation: none;
  }

  .toggle {
    transition: none;
  }
}
</style>
