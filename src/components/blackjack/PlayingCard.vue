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
  width: 50px;
  height: 72px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 5px 6px;
  border-radius: 6px;
  background: #f3ead6;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.45);
  font-family: var(--f-titulo);
  font-size: 17px;
  font-weight: 600;
  line-height: 1;
  color: #1c1a17;
  animation: deal-in var(--duracion-media) ease-out;
}

.card.red {
  color: #9a2f2a;
}

.big-suit {
  align-self: center;
  font-size: 22px;
}

.card.hidden {
  border: 2px solid var(--laton);
  background: repeating-linear-gradient(45deg, #172925 0 6px, #0f1d1a 6px 12px);
}

@keyframes deal-in {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .card {
    animation: none;
  }
}
</style>
