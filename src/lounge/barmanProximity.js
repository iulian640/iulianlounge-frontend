export const BARMAN_AT = Object.freeze([-7.15, 0, 0.4])

const ENTER_RADIUS = 2.6
const EXIT_RADIUS = 3.0
const ENTER_RADIUS_SQUARED = ENTER_RADIUS * ENTER_RADIUS
const EXIT_RADIUS_SQUARED = EXIT_RADIUS * EXIT_RADIUS

export function createBarmanProximity(onChange) {
  let near = false

  function update(position) {
    const dx = position.x - BARMAN_AT[0]
    const dz = position.z - BARMAN_AT[2]
    const limit = near ? EXIT_RADIUS_SQUARED : ENTER_RADIUS_SQUARED
    const isNear = dx * dx + dz * dz <= limit
    if (isNear === near) return
    near = isNear
    onChange(near)
  }

  return { update, isNear: () => near }
}
