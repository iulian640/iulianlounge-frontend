import { onBeforeUnmount, ref } from 'vue'

const STEP_KEYS = { ArrowRight: 1, ArrowLeft: -1 }

function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

export function useRooms(ids) {
  const active = ref(ids[0])
  const scroller = ref(null)
  let frame = 0

  function indexOf(id) {
    return Math.max(0, ids.indexOf(id))
  }

  function goTo(id) {
    if (!ids.includes(id)) return
    active.value = id
    const element = scroller.value
    element?.scrollTo?.({
      left: indexOf(id) * element.clientWidth,
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    })
  }

  function sync() {
    frame = 0
    const element = scroller.value
    if (!element || element.clientWidth === 0) return
    const index = Math.min(ids.length - 1, Math.max(0, Math.round(element.scrollLeft / element.clientWidth)))
    active.value = ids[index]
  }

  function onScroll() {
    if (frame) return
    frame = requestAnimationFrame(sync)
  }

  function onKeydown(event) {
    const step = STEP_KEYS[event.key]
    if (!step) return
    const next = ids[indexOf(active.value) + step]
    if (!next) return
    event.preventDefault()
    goTo(next)
  }

  onBeforeUnmount(() => cancelAnimationFrame(frame))

  return { active, scroller, goTo, onScroll, onKeydown }
}
