<script setup>
import { onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'

// El libro de cuentas: los últimos movimientos de fichas. Entradas en oro, salidas en burdeos
// (tokens.css: ganar = oro, perder = burdeos). El tipo llega como clave y se traduce (ADR-06)
defineProps({
  transactions: { type: Array, required: true },
})
const emit = defineEmits(['close'])

const { t, te, locale } = useI18n()

function typeLabel(type) {
  return te(`wallet.types.${type}`) ? t(`wallet.types.${type}`) : type
}

function signed(amount) {
  const number = new Intl.NumberFormat(locale.value).format(Math.abs(amount))
  return amount > 0 ? `+${number}` : `−${number}`
}

function when(isoDate) {
  return new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(isoDate))
}

function onKey(event) {
  if (event.key === 'Escape') emit('close')
}

onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <aside class="libro" :aria-label="t('wallet.title')">
    <header>
      <h2>{{ t('wallet.title') }}</h2>
      <button type="button" class="cerrar" :aria-label="t('wallet.close')" @click="emit('close')">×</button>
    </header>

    <p v-if="transactions.length === 0" class="vacio">{{ t('wallet.empty') }}</p>

    <ol v-else>
      <li v-for="movement in transactions" :key="movement.id" class="movimiento">
        <div>
          <span class="tipo">{{ typeLabel(movement.type) }}</span>
          <time :datetime="movement.createdAt">{{ when(movement.createdAt) }}</time>
        </div>
        <div class="cifras">
          <span class="importe" :class="movement.amount > 0 ? 'entra' : 'sale'">{{ signed(movement.amount) }}</span>
          <span class="saldo">{{ t('wallet.balanceAfter', { amount: movement.balanceAfter }) }}</span>
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
  padding: 18px 20px;
  box-sizing: border-box;
  background: rgba(17, 31, 29, 0.95);
  border: 1px solid var(--linea);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.55);
}

header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 12px;
  border-bottom: 1px solid var(--linea);
}

h2 {
  margin: 0 0 10px;
  font-family: var(--f-titulo);
  font-weight: 600;
  font-size: 1.3rem;
  color: var(--marfil);
}

.cerrar {
  background: none;
  border: none;
  color: var(--humo);
  font-size: 1.4rem;
  line-height: 1;
  cursor: pointer;
}

.cerrar:hover,
.cerrar:focus-visible {
  color: var(--marfil);
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
}

.entra {
  color: var(--oro);
}

.sale {
  color: var(--burdeos);
}

.vacio {
  color: var(--humo);
  font-style: italic;
}
</style>
