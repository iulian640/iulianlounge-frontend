<script setup>
import { useI18n } from 'vue-i18n'

// Quién está dentro, y la salida
defineProps({
  username: { type: String, default: '' },
})
defineEmits(['logout'])

const { t } = useI18n()
</script>

<template>
  <div class="parroquiano">
    <span class="nombre">{{ username }}</span>
    <button type="button" class="salir" @click="$emit('logout')">{{ t('hud.logout') }}</button>
  </div>
</template>

<style scoped>
.parroquiano {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 7px 14px;
  background: rgba(11, 21, 20, 0.82);
  border: 1px solid var(--linea);
  border-radius: 999px;
  backdrop-filter: blur(4px);
}

.nombre {
  font-family: var(--f-titulo);
  font-style: italic;
  font-size: 1.05rem;
  color: var(--marfil);
}

.salir {
  padding: 0;
  background: none;
  border: none;
  font-family: var(--f-ui);
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--humo);
  cursor: pointer;
}

.salir:hover,
.salir:focus-visible {
  color: var(--laton);
}
</style>
