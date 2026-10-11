<script setup>
import { useI18n } from 'vue-i18n'

import BlackjackTable from '@/components/blackjack/BlackjackTable.vue'

defineProps({
  live: { type: Boolean, default: false },
})
defineEmits(['back'])

const { t } = useI18n()
</script>

<template>
  <div class="cards-room">
    <button
      type="button"
      class="back"
      :aria-label="t('salon.goTo', { room: t('salon.rooms.bar') })"
      @click="$emit('back')"
    >
      <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true" focusable="false">
        <path d="M7.5 3l-3 3 3 3" />
      </svg>
      <span>{{ t('salon.rooms.bar') }}</span>
    </button>
    <div class="felt">
      <BlackjackTable v-if="live" />
    </div>
  </div>
</template>

<style scoped>
.cards-room {
  position: relative;
  height: 100%;
  overflow-y: auto;
  overscroll-behavior: contain;
  background:
    radial-gradient(ellipse 90% 60% at 50% 30%, rgba(46, 94, 72, 0.55), transparent 70%),
    linear-gradient(180deg, #13261f 0%, #0b1514 100%);
}

.back {
  position: sticky;
  top: 12px;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  margin: 12px 0 0;
  padding: 0 14px 0 10px;
  background: rgba(17, 31, 29, 0.94);
  border: 1px solid var(--linea);
  border-left: 0;
  border-radius: 0 6px 6px 0;
  color: var(--laton);
  font: inherit;
  font-size: 0.85rem;
  cursor: pointer;
  transition:
    color var(--duracion-corta) ease-out,
    background-color var(--duracion-corta) ease-out;
}

.back svg {
  fill: none;
  stroke: currentColor;
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.back:hover {
  color: var(--oro);
  background: var(--tapete);
}

.back:focus-visible {
  outline: 2px solid var(--oro);
  outline-offset: -2px;
}

.felt {
  padding: 12px 16px 28px;
}

@media (prefers-reduced-motion: reduce) {
  .back {
    transition: none;
  }
}
</style>
