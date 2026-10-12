export const FLAT_MAX_WIDTH = 768

export function prefersFlatLounge(win = window) {
  if (typeof win.matchMedia !== 'function') return false
  return (
    win.matchMedia('(pointer: coarse)').matches || win.matchMedia(`(max-width: ${FLAT_MAX_WIDTH - 1}px)`).matches
  )
}
