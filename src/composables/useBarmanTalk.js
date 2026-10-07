import { onMounted, onUnmounted, ref } from 'vue'

import { useEscapeKey } from '@/composables/useEscapeKey'

const TALK_KEY = 'KeyE'

function hasModifier(event) {
  return event.ctrlKey || event.metaKey || event.altKey || event.shiftKey
}

function isEditable(target) {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}

export function useBarmanTalk({ onOpen = () => {} } = {}) {
  const near = ref(false)
  const open = ref(false)

  function setNear(value) {
    near.value = value === true
  }

  function openWindow() {
    if (!near.value || open.value) return false
    open.value = true
    onOpen()
    return true
  }

  function closeWindow() {
    open.value = false
  }

  function onKeydown(event) {
    if (event.code !== TALK_KEY || event.repeat || hasModifier(event) || isEditable(event.target)) return
    if (openWindow()) event.preventDefault()
  }

  useEscapeKey(() => {
    if (open.value) closeWindow()
  })
  onMounted(() => window.addEventListener('keydown', onKeydown))
  onUnmounted(() => window.removeEventListener('keydown', onKeydown))

  return { near, open, setNear, openWindow, closeWindow }
}
