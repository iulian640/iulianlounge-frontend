<script setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import BarmanFigure from '@/components/bar/BarmanFigure.vue'
import BarSheet from './BarSheet.vue'
import { useBarLines } from '@/composables/useBarLines'
import { useBarStore } from '@/stores/bar'

const BOTTLE_VARIANTS = 4
const LONG_LINE_LENGTH = 90
const SHELVES = [
  { id: 'upper', count: 9, offset: 0 },
  { id: 'lower', count: 8, offset: 2 },
]

defineEmits(['next'])

const { t } = useI18n()
const { lineText } = useBarLines()
const bar = useBarStore()
const sheetOpen = ref(false)
const sheetTab = ref('menu')

const lastBarmanLine = computed(() => bar.conversation.findLast((line) => line.from === 'barman'))
const speech = computed(() => (lastBarmanLine.value ? lineText(lastBarmanLine.value) : ''))
const isLong = computed(() => speech.value.length > LONG_LINE_LENGTH)

function bottles(shelf) {
  return Array.from({ length: shelf.count }, (_, index) => ({
    id: `${shelf.id}-${index}`,
    variant: (index + shelf.offset) % BOTTLE_VARIANTS,
  }))
}

function talk() {
  sheetTab.value = 'chat'
  sheetOpen.value = true
}
</script>

<template>
  <div class="bar-room">
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
      <button v-if="speech" type="button" class="speech" @click="talk">
        <span class="speech-text" :class="{ long: isLong }">{{ speech }}</span>
        <span class="sr-only">{{ t('bar.speech.open') }}</span>
      </button>
      <span
        v-if="bar.lastOrder"
        :key="bar.lastOrder.id"
        class="glass"
        role="img"
        :aria-label="t('bar.scene.glass')"
      ></span>
      <div class="counter" aria-hidden="true"></div>
      <button type="button" class="next" :aria-label="t('salon.goTo', { room: t('salon.rooms.cards') })" @click="$emit('next')">
        <span>{{ t('salon.rooms.cards') }}</span>
        <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true" focusable="false">
          <path d="M4.5 3l3 3-3 3" />
        </svg>
      </button>
    </div>
    <BarSheet v-model:expanded="sheetOpen" v-model:tab="sheetTab" />
  </div>
</template>

<style scoped>
.bar-room {
  --barman-w: clamp(124px, 44vw, 210px);
  --barman-h: calc(var(--barman-w) * 1.25);
  --counter-h: 70px;
  position: relative;
  height: 100%;
  overflow: hidden;
}

.scene {
  position: absolute;
  inset: 0 0 236px;
  overflow: hidden;
  background:
    repeating-linear-gradient(90deg, rgba(0, 0, 0, 0.18) 0 2px, transparent 2px 64px),
    linear-gradient(180deg, #221912 0%, #160f0a 100%);
}

.glow {
  position: absolute;
  left: 12%;
  top: -60px;
  width: 76%;
  height: 200px;
  border-radius: 50%;
  background: rgba(232, 205, 143, 0.17);
  filter: blur(38px);
}

.lamp {
  position: absolute;
  top: 0;
  left: 50%;
  width: 64px;
  height: 13px;
  transform: translateX(-50%);
  background: var(--laton);
  border-radius: 0 0 32px 32px;
  box-shadow: 0 6px 18px rgba(232, 205, 143, 0.35);
}

.shelf {
  position: absolute;
  left: 18px;
  right: 18px;
  display: flex;
  align-items: flex-end;
  justify-content: space-around;
  height: 50px;
  border-bottom: 5px solid #3b2a1c;
  box-shadow: 0 6px 10px -6px rgba(0, 0, 0, 0.8);
}

.shelf.upper {
  top: 16%;
}

.shelf.lower {
  top: calc(16% + 70px);
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
  left: 4%;
  bottom: calc(var(--counter-h) - 8px);
  width: var(--barman-w);
  height: var(--barman-h);
}

.speech {
  position: absolute;
  left: calc(4% + var(--barman-w) * 0.8);
  right: 58px;
  bottom: calc(var(--counter-h) + var(--barman-h) * 0.62);
  padding: 0;
  background: var(--marfil);
  color: var(--medianoche);
  border: 0;
  border-radius: 18px 18px 18px 4px;
  box-shadow: 0 10px 26px rgba(0, 0, 0, 0.45);
  text-align: left;
  cursor: pointer;
  transition: transform var(--duracion-corta) ease-out;
}

.speech::after {
  content: '';
  position: absolute;
  left: 0;
  bottom: -16px;
  border-top: 18px solid var(--marfil);
  border-right: 18px solid transparent;
}

.speech:active {
  transform: scale(0.98);
}

.speech:focus-visible {
  outline: 2px solid var(--oro);
  outline-offset: 3px;
}

.speech-text {
  display: block;
  max-height: 132px;
  padding: 12px 16px;
  overflow-y: auto;
  overflow-wrap: anywhere;
  font-family: var(--f-titulo);
  font-size: 18px;
  font-weight: 600;
  line-height: 1.25;
}

.speech-text.long {
  font-size: 15px;
}

.glass {
  position: absolute;
  left: 70%;
  bottom: calc(var(--counter-h) - 6px);
  width: 26px;
  height: 28px;
  animation: settle 520ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

.glass::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  border-left: 13px solid transparent;
  border-right: 13px solid transparent;
  border-top: 16px solid rgba(239, 229, 204, 0.92);
}

.glass::after {
  content: '';
  position: absolute;
  left: 12px;
  top: 15px;
  width: 2px;
  height: 11px;
  background: rgba(239, 229, 204, 0.92);
  box-shadow:
    -5px 11px 0 0 rgba(239, 229, 204, 0.92),
    5px 11px 0 0 rgba(239, 229, 204, 0.92);
}

@keyframes settle {
  from {
    opacity: 0;
    transform: translate(-36px, -22px) rotate(-8deg);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

.counter {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: var(--counter-h);
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

.next {
  position: absolute;
  right: 0;
  top: 28%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 44px;
  min-height: 124px;
  padding: 10px 0;
  background: rgba(17, 31, 29, 0.94);
  border: 1px solid var(--linea);
  border-right: 0;
  border-radius: 6px 0 0 6px;
  color: var(--laton);
  font: inherit;
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  cursor: pointer;
  transition:
    color var(--duracion-corta) ease-out,
    background-color var(--duracion-corta) ease-out;
}

.next span {
  writing-mode: vertical-rl;
}

.next svg {
  fill: none;
  stroke: currentColor;
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.next:hover {
  color: var(--oro);
  background: var(--tapete);
}

.next:focus-visible {
  outline: 2px solid var(--oro);
  outline-offset: -2px;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}

@media (orientation: landscape) and (max-height: 520px) {
  .bar-room {
    --barman-w: clamp(96px, 22vh, 120px);
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(280px, 46%);
    grid-template-rows: minmax(0, 1fr);
  }

  .scene {
    position: relative;
    inset: auto;
    height: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .glass {
    animation: none;
  }

  .speech,
  .next {
    transition: none;
  }
}
</style>
