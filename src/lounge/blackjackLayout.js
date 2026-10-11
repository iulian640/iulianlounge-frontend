export const BLACKJACK_TABLE = Object.freeze({
  at: Object.freeze([4.6, 0, 2.2]),
  radius: 0.95,
  feltY: 0.82,
})

export const CARD_SCALE = 1.5

export const CARD = Object.freeze({
  width: 0.063 * CARD_SCALE,
  height: 0.088 * CARD_SCALE,
})

export const SEAT_RADIUS = 1.4
export const CROUPIER_RADIUS = 1.3

const SIDE_SEAT_ANGLE = 0.85
const EYE = Object.freeze({ radius: 1.2, height: 1.32 })
const GAZE = Object.freeze({ z: -0.45, height: 0.9 })

const ROW_Z = Object.freeze({ dealer: -0.3, player: 0.3 })
const CARD_LIFT = 0.0015
const STACK_STEP = 0.0012
const MAX_ROW_WIDTH = 0.8
const MAX_SPACING = 0.075
const SPIN_STEPS = Object.freeze([0.03, -0.045, 0.02, -0.025, 0.05, -0.01, 0.04, -0.035])

export const SHOE = Object.freeze({
  x: 0.62,
  z: -0.5,
  yaw: 0.3,
  holderWidth: 0.13,
  holderHeight: 0.045,
  holderDepth: 0.17,
  deckWidth: 0.1,
  deckHeight: 0.05,
  deckDepth: 0.14,
})

export const SHOE_DECK_TOP_Y = BLACKJACK_TABLE.feltY + SHOE.holderHeight + SHOE.deckHeight
export const SHOE_PARK_Y = BLACKJACK_TABLE.feltY + SHOE.holderHeight + SHOE.deckHeight / 2

export function directionXZ(fromX, fromZ, toX, toZ) {
  const dx = toX - fromX
  const dz = toZ - fromZ
  const length = Math.hypot(dx, dz)
  if (length === 0) return [0, 1]
  return [dx / length, dz / length]
}

export function yawFacing(fromX, fromZ, toX, toZ, front = 'plusZ') {
  const dx = toX - fromX
  const dz = toZ - fromZ
  return front === 'minusZ' ? Math.atan2(-dx, -dz) : Math.atan2(dx, dz)
}

const [TABLE_X, , TABLE_Z] = BLACKJACK_TABLE.at
const TOWARD_ROOM = directionXZ(TABLE_X, TABLE_Z, 0, 0)

export const TABLE_YAW = Math.atan2(TOWARD_ROOM[0], TOWARD_ROOM[1])

export function localToWorld(localX, localZ, height = 0) {
  const sin = Math.sin(TABLE_YAW)
  const cos = Math.cos(TABLE_YAW)
  return [TABLE_X + localX * cos + localZ * sin, height, TABLE_Z - localX * sin + localZ * cos]
}

function seatAt(angle, isPlayer) {
  const at = localToWorld(Math.sin(angle) * SEAT_RADIUS, Math.cos(angle) * SEAT_RADIUS)
  const yaw = yawFacing(at[0], at[2], TABLE_X, TABLE_Z, 'minusZ')
  return Object.freeze({ at: Object.freeze(at), yaw, isPlayer })
}

export const SEATS = Object.freeze([
  seatAt(0, true),
  seatAt(SIDE_SEAT_ANGLE, false),
  seatAt(-SIDE_SEAT_ANGLE, false),
])

export const PLAYER_SEAT = SEATS[0]

const croupierAt = localToWorld(0, -CROUPIER_RADIUS)

export const CROUPIER = Object.freeze({
  at: Object.freeze(croupierAt),
  yaw: yawFacing(croupierAt[0], croupierAt[2], PLAYER_SEAT.at[0], PLAYER_SEAT.at[2]),
})

export const SEAT_POSE = Object.freeze({
  position: Object.freeze(localToWorld(0, EYE.radius, EYE.height)),
  lookAt: Object.freeze(localToWorld(0, GAZE.z, GAZE.height)),
})

export function rowSpacing(count) {
  if (count <= 1) return MAX_SPACING
  return Math.min(MAX_SPACING, (MAX_ROW_WIDTH - CARD.width) / (count - 1))
}

export function slotPosition(owner, index, count, out = [0, 0, 0]) {
  out[0] = (index - (count - 1) / 2) * rowSpacing(count)
  out[1] = BLACKJACK_TABLE.feltY + CARD_LIFT + index * STACK_STEP
  out[2] = ROW_Z[owner]
  return out
}

export function slotSpin(index) {
  return SPIN_STEPS[index % SPIN_STEPS.length]
}
