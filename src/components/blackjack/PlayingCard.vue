<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { isRedSuit, rankOf, symbolOf } from './cardFaces'

const props = defineProps({
  card: { type: Object, default: null },
})

const { t } = useI18n()

const rank = computed(() => rankOf(props.card?.face))
const symbol = computed(() => symbolOf(props.card?.suit))
const isRed = computed(() => isRedSuit(props.card?.suit))
const label = computed(() =>
  props.card
    ? t('blackjack.cards.name', {
        face: t(`blackjack.cards.face.${props.card.face}`),
        suit: t(`blackjack.cards.suit.${props.card.suit}`),
      })
    : t('blackjack.cards.hidden'),
)
</script>

<template>
  <span class="card" :class="{ hidden: !card, red: isRed }" role="img" :aria-label="label">
    <template v-if="card">
      <span class="corner-rank" aria-hidden="true">{{ rank }}{{ symbol }}</span>
      <span class="big-suit" aria-hidden="true">{{ symbol }}</span>
      <span aria-hidden="true"></span>
    </template>
  </span>
</template>

<style scoped>
.card {
  flex: none;
  width: 58px;
  height: 82px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 5px 6px;
  border-radius: 6px;
  background: #f3ead6;
  box-shadow:
    -2px 0 4px rgba(0, 0, 0, 0.25),
    0 6px 12px rgba(0, 0, 0, 0.45);
  font-family: var(--f-titulo);
  font-size: 19px;
  font-weight: 600;
  line-height: 1;
  color: #1c1a17;
  animation: deal-in 420ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

.card.red {
  color: #9a2f2a;
}

.big-suit {
  align-self: center;
  font-size: 26px;
}

.card.hidden {
  border: 2px solid var(--laton);
  background: repeating-linear-gradient(45deg, #172925 0 6px, #0f1d1a 6px 12px);
}

@keyframes deal-in {
  from {
    opacity: 0;
    transform: translate(18px, -60px) rotate(-12deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .card {
    animation: none;
  }
}
</style>
