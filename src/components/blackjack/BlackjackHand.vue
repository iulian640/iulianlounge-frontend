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
  align-items: center;
  gap: 8px;
}

.hand-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  white-space: nowrap;
}

.hand-label {
  font-family: var(--f-titulo);
  font-size: 1.1rem;
  font-style: italic;
  font-weight: 600;
  color: var(--marfil);
}

.hand-total {
  min-width: 2ch;
  padding: 1px 8px;
  border-radius: 999px;
  background: rgba(11, 21, 20, 0.55);
  font-family: var(--f-mono);
  font-size: 15px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  color: var(--oro);
}

.hand-total.bust {
  color: var(--burdeos-claro);
}

.hand {
  display: flex;
  justify-content: center;
  min-height: 82px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.hand li + li {
  margin-left: -18px;
}
</style>
