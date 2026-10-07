<script setup>
import { useI18n } from 'vue-i18n'

import { useErrorMessage } from '@/composables/useErrorMessage'

const props = defineProps({
  drinks: { type: Array, default: () => [] },
  balance: { type: Number, default: null },
  ordering: { type: Boolean, default: false },
  creditAvailable: { type: Boolean, default: false },
  error: { type: String, default: null },
})
defineEmits(['order', 'accept-credit'])

const { t, te, locale } = useI18n()
const { message } = useErrorMessage()

function drinkName(code) {
  const key = `bar.drinks.${code}`
  return te(key) ? t(key) : code
}

function price(amount) {
  return t('bar.menu.price', { amount: new Intl.NumberFormat(locale.value).format(amount) })
}

function cannotOrder(drink) {
  if (props.ordering) return true
  return props.balance !== null && drink.price > props.balance
}
</script>

<template>
  <section class="menu" aria-labelledby="bar-menu-title" :aria-busy="ordering">
    <h3 id="bar-menu-title" class="title">{{ t('bar.menu.title') }}</h3>

    <button
      v-if="creditAvailable"
      type="button"
      class="credit"
      :disabled="ordering"
      @click="$emit('accept-credit')"
    >
      {{ t('bar.credit.accept') }}
    </button>

    <ul class="drinks">
      <li v-for="drink in drinks" :key="drink.code" class="drink">
        <span class="name">{{ drinkName(drink.code) }}</span>
        <span class="price">{{ price(drink.price) }}</span>
        <button
          type="button"
          class="order"
          :disabled="cannotOrder(drink)"
          :aria-label="`${t('bar.menu.order')} ${drinkName(drink.code)}`"
          @click="$emit('order', drink.code)"
        >
          {{ t('bar.menu.order') }}
        </button>
      </li>
    </ul>

    <p v-if="ordering" class="status" role="status">{{ t('bar.menu.ordering') }}</p>
    <p v-if="error" class="failure" role="alert">{{ message(error) }}</p>
  </section>
</template>

<style scoped>
.menu {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.title {
  margin: 8px 0 6px;
  font-family: var(--f-ui);
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.26em;
  text-transform: uppercase;
  color: var(--laton);
}

.drinks {
  margin: 0;
  padding: 0;
  list-style: none;
}

.drink {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 9px 0;
  border-bottom: 1px solid var(--linea-suave);
}

.name {
  flex: 1;
  font-family: var(--f-titulo);
  font-size: 1.3rem;
  font-weight: 600;
  line-height: 1.1;
  color: var(--marfil);
}

.price {
  font-family: var(--f-mono);
  font-size: 14px;
  color: var(--oro);
  white-space: nowrap;
}

.order,
.credit {
  min-height: 44px;
  padding: 0 18px;
  border: 1px solid rgba(201, 164, 92, 0.6);
  border-radius: 2px;
  background: transparent;
  font-family: var(--f-ui);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--oro);
  cursor: pointer;
  transition:
    background var(--duracion-corta),
    border-color var(--duracion-corta);
}

.order {
  min-width: 82px;
}

.order:hover:not(:disabled) {
  background: var(--tapete);
  border-color: var(--oro);
}

.credit {
  min-height: 48px;
  border: 0;
  background: linear-gradient(180deg, #ecd497, #c9a45c);
  color: var(--medianoche);
  letter-spacing: 0.14em;
}

.credit:hover:not(:disabled) {
  filter: brightness(1.08);
}

.order:focus-visible,
.credit:focus-visible {
  outline: 2px solid var(--oro);
  outline-offset: 2px;
}

.order:disabled,
.credit:disabled {
  cursor: default;
  opacity: 0.4;
}

.status {
  margin: 4px 0 0;
  font-family: var(--f-ui);
  font-size: 13px;
  font-style: italic;
  color: var(--humo);
}

.failure {
  margin: 4px 0 0;
  font-family: var(--f-ui);
  font-size: 13px;
  color: var(--burdeos);
}
</style>
