import { onMounted, onUnmounted, ref } from 'vue'

import { useEscapeKey } from '@/composables/useEscapeKey'

const SIT_KEY = 'KeyE'

function hasModifier(event) {
  return event.ctrlKey || event.metaKey || event.altKey || event.shiftKey
}

function isEditable(target) {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}

export function useTableSeat({ onSit = () => {}, onStand = () => {}, canSit = () => true } = {}) {
  const near = ref(false)
  const seated = ref(false)
  let rising = false

  function setNear(value) {
    near.value = value === true
  }

  function sit() {
    if (!near.value || seated.value || rising || !canSit()) return false
    seated.value = true
    onSit()
    return true
  }

  function standUp() {
    if (!seated.value) return false
    seated.value = false
    rising = true
    Promise.resolve(onStand())
      .catch(() => null)
      .finally(() => {
        rising = false
      })
    return true
  }

  function onKeydown(event) {
    if (event.code !== SIT_KEY || event.repeat || hasModifier(event) || isEditable(event.target)) return
    if (sit()) event.preventDefault()
  }

  useEscapeKey(standUp)
  onMounted(() => window.addEventListener('keydown', onKeydown))
  onUnmounted(() => window.removeEventListener('keydown', onKeydown))

  return { near, seated, setNear, sit, standUp }
}
