import { onMounted, onUnmounted } from 'vue'

export function useEscapeKey(handler) {
  function onKeydown(event) {
    if (event.key === 'Escape') handler(event)
  }

  onMounted(() => window.addEventListener('keydown', onKeydown))
  onUnmounted(() => window.removeEventListener('keydown', onKeydown))
}
