<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import PlayingCard from './PlayingCard.vue'
import { BUST_LIMIT, totalLabel } from './betOptions'

const props = defineProps({
  label: { type: String, required: true },
  cards: { type: Array, default: () => [] },
  total: { type: Number, default: 0 },
  hasHiddenCard: { type: Boolean, default: false },
})

const { t } = useI18n()

const isBust = computed(() => props.total > BUST_LIMIT)
const totalText = computed(() => totalLabel(t, props.total, props.hasHiddenCard))
</script>

<template>
  <div class="hand-side">
    <div class="hand-head">
      <span class="hand-label">{{ label }}</span>
      <span class="hand-total" :class="{ bust: isBust }">{{ totalText }}</span>
    </div>
    <ul class="hand" :aria-label="label">
      <li v-for="(card, index) in cards" :key="index">
        <PlayingCard :card="card" />
      </li>
      <li v-if="hasHiddenCard">
        <PlayingCard :card="null" />
      </li>
    </ul>
  </div>
</template>

<style scoped>
.hand-side {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.hand-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
}

.hand-label {
  font-family: var(--f-ui);
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.26em;
  text-transform: uppercase;
  color: var(--laton);
}

.hand-total {
  font-family: var(--f-mono);
  font-size: 15px;
  font-weight: 500;
  color: var(--marfil);
}

.hand-total.bust {
  color: #d9776f;
}

.hand {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  min-height: 72px;
  margin: 0;
  padding: 0;
  list-style: none;
}
</style>
