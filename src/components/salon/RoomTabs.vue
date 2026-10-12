<script setup>
import { nextTick, useTemplateRef, watch } from 'vue'

const props = defineProps({
  rooms: { type: Array, required: true },
  active: { type: String, required: true },
  label: { type: String, required: true },
})
defineEmits(['select', 'step'])

const list = useTemplateRef('list')

watch(
  () => props.active,
  async (id) => {
    if (!list.value?.contains(document.activeElement)) return
    await nextTick()
    list.value?.querySelector(`#room-tab-${id}`)?.focus()
  },
)
</script>

<template>
  <div ref="list" class="tabs" role="tablist" :aria-label="label" @keydown="$emit('step', $event)">
    <button
      v-for="room in rooms"
      :id="`room-tab-${room.id}`"
      :key="room.id"
      type="button"
      role="tab"
      class="tab"
      :aria-selected="room.id === active"
      :aria-controls="`room-${room.id}`"
      :tabindex="room.id === active ? 0 : -1"
      @click="$emit('select', room.id)"
    >
      <span class="dot" aria-hidden="true"></span>
      <span class="name">{{ room.label }}</span>
    </button>
  </div>
</template>

<style scoped>
.tabs {
  display: flex;
  gap: 2px;
}

.tab {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 0 10px;
  background: none;
  border: 0;
  color: var(--humo);
  font: inherit;
  font-size: 0.85rem;
  cursor: pointer;
  transition: color var(--duracion-corta) ease-out;
}

.dot {
  width: 8px;
  height: 8px;
  border: 1px solid var(--laton);
  border-radius: 50%;
  transition:
    background-color var(--duracion-corta) ease-out,
    transform var(--duracion-corta) ease-out;
}

.tab[aria-selected='true'] {
  color: var(--marfil);
}

.tab[aria-selected='true'] .dot {
  background: var(--oro);
  border-color: var(--oro);
  transform: scale(1.25);
}

.tab:hover {
  color: var(--marfil);
}

.tab:focus-visible {
  outline: 2px solid var(--oro);
  outline-offset: -2px;
}

@media (prefers-reduced-motion: reduce) {
  .tab,
  .dot {
    transition: none;
  }
}
</style>
