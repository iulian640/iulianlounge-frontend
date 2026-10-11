import { createProximity } from './proximity'

export const BARMAN_AT = Object.freeze([-7.15, 0, 0.4])

const ENTER_RADIUS = 2.6
const EXIT_RADIUS = 3.0

export function createBarmanProximity(onChange) {
  return createProximity(
    { at: BARMAN_AT, enterRadius: ENTER_RADIUS, exitRadius: EXIT_RADIUS },
    onChange,
  )
}
