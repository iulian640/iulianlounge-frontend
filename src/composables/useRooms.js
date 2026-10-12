import { onBeforeUnmount, ref, watch } from 'vue'

const STEP_KEYS = { ArrowRight: 1, ArrowLeft: -1 }
const ARRIVAL_TOLERANCE_PX = 2
const SLIDE_TIMEOUT_MS = 900

function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

export function useRooms(ids) {
  const active = ref(ids[0])
  const scroller = ref(null)
  let frame = 0
  let target = null
  let slideTimer = null

  function indexOf(id) {
    return Math.max(0, ids.indexOf(id))
  }

  function leftOf(id, element) {
    return indexOf(id) * element.clientWidth
  }

  function release() {
    target = null
    clearTimeout(slideTimer)
    slideTimer = null
  }

  function slideTo(id, element, behavior) {
    target = id
    clearTimeout(slideTimer)
    slideTimer = setTimeout(release, SLIDE_TIMEOUT_MS)
    element.scrollTo({ left: leftOf(id, element), behavior })
  }

  function goTo(id) {
    if (!ids.includes(id)) return
    active.value = id
    const element = scroller.value
    if (!element?.scrollTo) return
    slideTo(id, element, prefersReducedMotion() ? 'auto' : 'smooth')
  }

  function sync() {
    frame = 0
    const element = scroller.value
    if (!element || element.clientWidth === 0) return
    if (target) {
      if (Math.abs(element.scrollLeft - leftOf(target, element)) > ARRIVAL_TOLERANCE_PX) return
      release()
    }
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

  watch(scroller, (element, _previous, onCleanup) => {
    if (!element || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => {
      if (!element.scrollTo) return
      if (Math.abs(element.scrollLeft - leftOf(active.value, element)) <= ARRIVAL_TOLERANCE_PX) return
      slideTo(active.value, element, 'auto')
    })
    observer.observe(element)
    onCleanup(() => observer.disconnect())
  })

  onBeforeUnmount(() => {
    cancelAnimationFrame(frame)
    frame = 0
    release()
  })

  return { active, scroller, goTo, onScroll, onKeydown }
}
