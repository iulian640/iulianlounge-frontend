<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

// El saldo del socio como una ficha de latón. Oro porque es dinero (tokens.css: el oro se gana).
// Pulsarla abre el libro de cuentas
const props = defineProps({
  balance: { type: Number, default: null }, // null = cargando
})
defineEmits(['open'])

const { t, locale } = useI18n()

// 1.250 en ES, 1,250 en EN: las fichas son enteros (ADR-09), sin decimales
const formatted = computed(() =>
  props.balance === null ? '—' : new Intl.NumberFormat(locale.value).format(props.balance),
)
</script>

<template>
  <button type="button" class="ficha" :aria-label="t('hud.balance', { amount: formatted })" @click="$emit('open')">
    <span class="canto" aria-hidden="true"></span>
    <span class="cifra">{{ formatted }}</span>
    <span class="moneda">{{ t('currency.name') }}</span>
  </button>
</template>

<style scoped>
.ficha {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 14px 6px 6px;
  background: rgba(11, 21, 20, 0.82);
  border: 1px solid var(--linea);
  border-radius: 999px;
  color: var(--marfil);
  cursor: pointer;
  backdrop-filter: blur(4px);
  transition: border-color var(--duracion-corta);
}

.ficha:hover {
  border-color: var(--laton);
}

.ficha:focus-visible {
  outline: 2px solid var(--oro);
  outline-offset: 3px;
}

/* La ficha de casino: aro de latón con muescas y el centro oscuro */
.canto {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background:
    radial-gradient(circle, var(--fieltro) 0 7px, transparent 7.5px),
    repeating-conic-gradient(var(--oro) 0 20deg, var(--laton) 20deg 40deg);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
}

.cifra {
  font-family: var(--f-mono);
  font-size: 1.05rem;
  color: var(--oro);
}

.moneda {
  font-size: 0.8rem;
  color: var(--humo);
}
</style>
