<script setup>
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <p class="prompt" role="status">
    <kbd class="key">{{ t('bar.prompt.key') }}</kbd>
    <span class="action">{{ t('bar.prompt.action') }}</span>
  </p>
</template>

<style scoped>
.prompt {
  position: fixed;
  left: 50%;
  bottom: clamp(48px, 10vh, 96px);
  z-index: 5;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 14px;
  margin: 0;
  padding: 10px 22px 10px 10px;
  background: rgba(11, 21, 20, 0.8);
  border: 1px solid rgba(232, 205, 143, 0.6);
  border-radius: 2px;
  pointer-events: none;
  animation: appear var(--duracion-media) ease-out;
}

.key {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  background: var(--oro);
  color: var(--medianoche);
  border-radius: 2px;
  font-family: var(--f-ui);
  font-size: 15px;
  font-weight: 500;
}

.action {
  font-family: var(--f-ui);
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--marfil);
}

@keyframes appear {
  from {
    opacity: 0;
    transform: translate(-50%, 6px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .prompt {
    animation: none;
  }
}
</style>
