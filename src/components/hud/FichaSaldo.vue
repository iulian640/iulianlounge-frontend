<script setup>
import { computed, onBeforeUnmount, ref, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const CHANGE_VISIBLE_MS = 1100

const props = defineProps({
  balance: { type: Number, default: null },
  expanded: { type: Boolean, default: false },
})
defineEmits(['open'])

const { t, locale } = useI18n()
const button = useTemplateRef('button')
const change = ref(null)
const announcement = ref('')
let changeTimer = null

function number(amount) {
  return new Intl.NumberFormat(locale.value).format(amount)
}

const formatted = computed(() => (props.balance === null ? '—' : number(props.balance)))

watch(
  () => props.balance,
  (next, previous) => {
    if (next === null || previous === null || previous === undefined || next === previous) return
    const amount = next - previous
    change.value = {
      id: (change.value?.id ?? 0) + 1,
      direction: amount > 0 ? 'in' : 'out',
      text: amount > 0 ? `+${number(amount)}` : `−${number(-amount)}`,
    }
    announcement.value = `${change.value.text} · ${t('hud.balance', { amount: number(next) })}`
    clearTimeout(changeTimer)
    changeTimer = setTimeout(() => {
      change.value = null
    }, CHANGE_VISIBLE_MS)
  },
)

onBeforeUnmount(() => clearTimeout(changeTimer))

defineExpose({ focus: () => button.value?.focus() })
</script>

<template>
  <button
    ref="button"
    type="button"
    class="ficha"
    :aria-label="t('hud.balance', { amount: formatted })"
    :aria-expanded="expanded"
    aria-controls="libro-cuentas"
    @click="$emit('open')"
  >
    <span class="canto" aria-hidden="true"></span>
    <span class="cifra">{{ formatted }}</span>
    <span class="moneda">{{ t('currency.name') }}</span>
    <svg class="chevron" viewBox="0 0 12 12" width="12" height="12" aria-hidden="true" focusable="false">
      <path d="M3 4.5l3 3 3-3" />
    </svg>
    <span v-if="change" :key="change.id" class="delta" :class="change.direction" aria-hidden="true">
      {{ change.text }}
    </span>
  </button>
  <p class="sr-only" role="status" aria-live="polite">{{ announcement }}</p>
</template>

<style scoped>
.ficha {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 0 12px 0 10px;
  background: transparent;
  border: 0;
  color: var(--marfil);
  font: inherit;
  cursor: pointer;
  transition: background-color var(--duracion-corta) ease-out;
}

.ficha:hover,
.ficha[aria-expanded='true'] {
  background: var(--tapete);
}

.ficha:active {
  background: var(--fieltro);
}

.ficha:focus-visible {
  outline: 2px solid var(--oro);
  outline-offset: -2px;
}

.canto {
  flex: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background:
    radial-gradient(circle, var(--fieltro) 0 5px, transparent 5.5px),
    repeating-conic-gradient(var(--oro) 0 20deg, var(--laton) 20deg 40deg);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);
}

.cifra {
  font-family: var(--f-mono);
  font-size: 1.05rem;
  font-variant-numeric: tabular-nums;
  color: var(--oro);
}

.moneda {
  font-size: 0.8rem;
  color: var(--humo);
}

.chevron {
  flex: none;
  fill: none;
  stroke: var(--humo);
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
  transition: transform var(--duracion-corta) ease-out;
}

.ficha[aria-expanded='true'] .chevron {
  transform: rotate(180deg);
}

.delta {
  position: absolute;
  top: 50%;
  right: calc(100% + 10px);
  margin-top: -0.65em;
  font-family: var(--f-mono);
  font-size: 0.9rem;
  font-weight: 600;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
  pointer-events: none;
  animation: delta-rise 1000ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

.delta.in {
  color: var(--oro);
}

.delta.out {
  color: var(--burdeos-claro);
}

@keyframes delta-rise {
  0% {
    opacity: 0;
    transform: translateY(-8px);
  }
  18% {
    opacity: 1;
    transform: translateY(0);
  }
  75% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: translateY(4px);
  }
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

@media (max-width: 379px) {
  .moneda {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .ficha,
  .chevron {
    transition: none;
  }

  .delta {
    animation: none;
  }
}
</style>
