export const TIMING = Object.freeze({
  dealStep: 0.22,
  dealDuration: 0.38,
  flipDuration: 0.45,
  revealPause: 0.25,
  clearDelay: 0.3,
  clearDuration: 0.35,
  relayoutDuration: 0.25,
  seatDuration: 0.9,
})

export const DEAL_ARC = 0.07
export const FLIP_LIFT = 0.06

export function clamp01(value) {
  if (value <= 0) return 0
  if (value >= 1) return 1
  return value
}

export function progressAt(elapsed, delay, duration) {
  if (duration <= 0) return elapsed >= delay ? 1 : 0
  return clamp01((elapsed - delay) / duration)
}

export function easeOutCubic(t) {
  const inverse = 1 - t
  return 1 - inverse * inverse * inverse
}

export function easeInOutCubic(t) {
  if (t < 0.5) return 4 * t * t * t
  const shifted = -2 * t + 2
  return 1 - (shifted * shifted * shifted) / 2
}

export function lerp(from, to, t) {
  return from + (to - from) * t
}

export function arcOffset(t, height) {
  return Math.sin(Math.PI * t) * height
}
