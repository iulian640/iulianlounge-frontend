<script setup>
import { onMounted, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'

import { useErrorMessage } from '@/composables/useErrorMessage'
import { useEscapeKey } from '@/composables/useEscapeKey'

defineProps({
  transactions: { type: Array, required: true },
  error: { type: String, default: null },
})
const emit = defineEmits(['close'])

const { t, te, locale } = useI18n()
const { message } = useErrorMessage()
const title = useTemplateRef('title')

function typeLabel(type) {
  return te(`wallet.types.${type}`) ? t(`wallet.types.${type}`) : t('wallet.types.unknown')
}

function number(amount) {
  return new Intl.NumberFormat(locale.value).format(amount)
}

function signed(amount) {
  if (amount > 0) return `+${number(amount)}`
  if (amount < 0) return `−${number(-amount)}`
  return number(0)
}

function tone(amount) {
  if (amount > 0) return 'entra'
  if (amount < 0) return 'sale'
  return ''
}

function when(isoDate) {
  const date = new Date(isoDate)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

useEscapeKey(() => emit('close'))

onMounted(() => title.value?.focus())
</script>

<template>
  <aside id="libro-cuentas" class="libro" aria-labelledby="libro-titulo">
    <header>
      <h2 id="libro-titulo" ref="title" tabindex="-1">{{ t('wallet.title') }}</h2>
      <button type="button" class="cerrar" :aria-label="t('wallet.close')" @click="emit('close')">
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </header>

    <p v-if="error" class="fallo" role="alert">{{ message(error) }}</p>

    <p v-else-if="transactions.length === 0" class="vacio">{{ t('wallet.empty') }}</p>

    <ol v-else>
      <li v-for="movement in transactions" :key="movement.id" class="movimiento">
        <div>
          <span class="tipo">{{ typeLabel(movement.type) }}</span>
          <time :datetime="movement.createdAt">{{ when(movement.createdAt) }}</time>
        </div>
        <div class="cifras">
          <span class="importe" :class="tone(movement.amount)">{{ signed(movement.amount) }}</span>
          <span class="saldo">{{ t('wallet.balanceAfter', { amount: number(movement.balanceAfter) }) }}</span>
        </div>
      </li>
    </ol>
  </aside>
</template>

<style scoped>
.libro {
  width: min(92vw, 340px);
  max-height: min(70dvh, 520px);
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 6px 20px 14px;
  box-sizing: border-box;
  background: rgba(17, 31, 29, 0.96);
  border: 1px solid var(--linea);
  border-radius: 2px;
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.55);
}

header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 0 -10px 4px 0;
  border-bottom: 1px solid var(--linea);
}

h2 {
  margin: 0;
  font-family: var(--f-titulo);
  font-weight: 600;
  font-size: 1.3rem;
  color: var(--marfil);
}

.cerrar {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  padding: 0;
  background: none;
  border: none;
  color: var(--humo);
  cursor: pointer;
  transition: color var(--duracion-corta) ease-out;
}

.cerrar svg {
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
}

.cerrar:hover {
  color: var(--marfil);
}

.cerrar:focus-visible {
  color: var(--marfil);
  outline: 2px solid var(--oro);
  outline-offset: -2px;
}

ol {
  margin: 0;
  padding: 0;
  list-style: none;
}

.movimiento {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid var(--linea-suave);
}

.tipo {
  display: block;
  color: var(--marfil);
}

time,
.saldo {
  font-size: 0.78rem;
  color: var(--humo);
}

.cifras {
  text-align: right;
}

.importe {
  display: block;
  font-family: var(--f-mono);
  font-variant-numeric: tabular-nums;
}

.entra {
  color: var(--oro);
}

.sale {
  color: var(--burdeos-claro);
}

h2:focus {
  outline: none;
}

.fallo {
  color: var(--burdeos-claro);
}

.vacio {
  color: var(--humo);
  font-style: italic;
}
</style>
