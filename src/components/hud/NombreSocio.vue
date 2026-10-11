<script setup>
import { useI18n } from 'vue-i18n'

import { useRankName } from '@/composables/useRankName'

const props = defineProps({
  username: { type: String, default: '' },
  rank: { type: String, default: null },
})
defineEmits(['logout'])

const { t } = useI18n()
const rankName = useRankName(() => props.rank)
</script>

<template>
  <div class="socio">
    <p class="identidad">
      <span class="nombre" :title="username">{{ username }}</span>
      <span class="rango">{{ rankName }}</span>
    </p>
    <button type="button" class="salir" :aria-label="t('hud.logout')" :title="t('hud.logout')" @click="$emit('logout')">
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
        <path d="M14 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4" />
        <path d="M10 16l-4-4 4-4" />
        <path d="M6 12h10" />
      </svg>
    </button>
  </div>
</template>

<style scoped>
.socio {
  display: flex;
  align-items: stretch;
  min-width: 0;
  border-left: 1px solid var(--linea-suave);
}

.identidad {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 2px;
  min-width: 0;
  margin: 0;
  padding: 0 12px;
  line-height: 1.2;
}

.nombre {
  max-width: 14ch;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--marfil);
}

.rango {
  font-size: 0.72rem;
  letter-spacing: 0.02em;
  color: var(--laton);
}

.salir {
  display: grid;
  flex: none;
  place-items: center;
  width: 44px;
  min-height: 44px;
  padding: 0;
  background: transparent;
  border: 0;
  border-left: 1px solid var(--linea-suave);
  color: var(--humo);
  cursor: pointer;
  transition:
    color var(--duracion-corta) ease-out,
    background-color var(--duracion-corta) ease-out;
}

.salir svg {
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.salir:hover {
  color: var(--marfil);
  background: var(--tapete);
}

.salir:active {
  background: var(--fieltro);
}

.salir:focus-visible {
  outline: 2px solid var(--oro);
  outline-offset: -2px;
}

@media (prefers-reduced-motion: reduce) {
  .salir {
    transition: none;
  }
}
</style>
