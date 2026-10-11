const QUERY = '(prefers-reduced-motion: reduce)'

export function prefersReducedMotion(win = window) {
  if (typeof win.matchMedia !== 'function') return false
  return win.matchMedia(QUERY).matches
}

export function toReducedMotionCheck(reducedMotion) {
  if (typeof reducedMotion === 'function') return reducedMotion
  return () => reducedMotion === true
}
