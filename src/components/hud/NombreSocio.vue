<script setup>
import { useI18n } from 'vue-i18n'

// Quién está dentro (texto, no se pulsa) y la salida (botón redondo con icono de puerta).
// Separados a propósito: una sola cápsula hacía parecer que el nombre también era un botón
defineProps({
  username: { type: String, default: '' },
})
defineEmits(['logout'])

const { t } = useI18n()
</script>

<template>
  <div class="socio">
    <span class="nombre">{{ username }}</span>
    <!-- Icono solo: el nombre del botón lo da aria-label, y el tooltip lo dice a quien usa ratón -->
    <button type="button" class="salir" :aria-label="t('hud.logout')" :title="t('hud.logout')" @click="$emit('logout')">
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
        <!-- El marco de la puerta y la flecha que sale -->
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
  align-items: center;
  gap: 10px;
}

.nombre {
  font-family: var(--f-titulo);
  font-style: italic;
  font-size: 1.1rem;
  color: var(--marfil);
  /* Sin cápsula detrás: la sombra lo despega del 3D para que se lea sobre cualquier luz */
  text-shadow:
    0 1px 3px rgba(0, 0, 0, 0.9),
    0 0 12px rgba(0, 0, 0, 0.6);
}

/* Mismo alto que la ficha del saldo, para que la barra quede alineada */
.salir {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  padding: 0;
  background: rgba(11, 21, 20, 0.82);
  border: 1px solid var(--linea);
  border-radius: 50%;
  color: var(--humo);
  cursor: pointer;
  backdrop-filter: blur(4px);
  transition:
    color var(--duracion-corta),
    border-color var(--duracion-corta);
}

.salir svg {
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.salir:hover {
  color: var(--laton);
  border-color: var(--laton);
}

.salir:focus-visible {
  outline: 2px solid var(--oro);
  outline-offset: 3px;
}
</style>
