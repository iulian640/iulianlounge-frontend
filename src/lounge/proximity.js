export function createProximity({ at, enterRadius, exitRadius }, onChange) {
  const enterSquared = enterRadius * enterRadius
  const exitSquared = exitRadius * exitRadius
  const centreX = at[0]
  const centreZ = at[2]
  let near = false

  function update(position) {
    const dx = position.x - centreX
    const dz = position.z - centreZ
    const isNear = dx * dx + dz * dz <= (near ? exitSquared : enterSquared)
    if (isNear === near) return
    near = isNear
    onChange(near)
  }

  return { update, isNear: () => near }
}
