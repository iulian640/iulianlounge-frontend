import { describe, expect, it } from 'vitest'

import {
  BLACKJACK_TABLE,
  CARD,
  CROUPIER,
  PLAYER_SEAT,
  SEATS,
  SEAT_POSE,
  SEAT_RADIUS,
  SHOE,
  TABLE_YAW,
  directionXZ,
  localToWorld,
  rowSpacing,
  slotPosition,
  slotSpin,
  yawFacing,
} from '../blackjackLayout'
import { ROOM, TABLE_SPOTS } from '../salon'

const STAGE = { x: 3.2, z: -ROOM.depth / 2 + 1.35, halfWidth: 1.8, halfDepth: 1.2 }
const CAMERA_MARGIN = 0.5

function distanceToTable(x, z) {
  return Math.hypot(x - BLACKJACK_TABLE.at[0], z - BLACKJACK_TABLE.at[2])
}

describe('directionXZ and yawFacing', () => {
  it('normalises the direction on the floor plane', () => {
    const [dx, dz] = directionXZ(0, 0, 3, 4)

    expect(dx).toBeCloseTo(0.6, 10)
    expect(dz).toBeCloseTo(0.8, 10)
  })

  it('returns a safe direction for two equal points', () => {
    expect(directionXZ(1, 1, 1, 1)).toEqual([0, 1])
  })

  it('turns a +Z facing model towards the target', () => {
    const yaw = yawFacing(0, 0, 2, 3)

    expect([Math.sin(yaw), Math.cos(yaw)]).toEqual([
      expect.closeTo(2 / Math.hypot(2, 3), 10),
      expect.closeTo(3 / Math.hypot(2, 3), 10),
    ])
  })

  it('turns a -Z facing model towards the target', () => {
    const yaw = yawFacing(0, 0, 2, 3, 'minusZ')

    expect([-Math.sin(yaw), -Math.cos(yaw)]).toEqual([
      expect.closeTo(2 / Math.hypot(2, 3), 10),
      expect.closeTo(3 / Math.hypot(2, 3), 10),
    ])
  })
})

describe('table frame', () => {
  it('keeps the table where the salon builds it', () => {
    expect(BLACKJACK_TABLE.at).toEqual([4.6, 0, 2.2])
    expect(BLACKJACK_TABLE.radius).toBe(0.95)
  })

  it('maps the local origin to the table centre', () => {
    expect(localToWorld(0, 0)).toEqual([4.6, 0, 2.2])
  })

  it('points the local +Z axis towards the middle of the room', () => {
    const [x, , z] = localToWorld(0, 1)

    const towardRoom = directionXZ(4.6, 2.2, 0, 0)
    expect(x - 4.6).toBeCloseTo(towardRoom[0], 10)
    expect(z - 2.2).toBeCloseTo(towardRoom[1], 10)
  })

  it('keeps the height it is given', () => {
    expect(localToWorld(0.3, -0.2, 1.5)[1]).toBe(1.5)
  })

  it('preserves distances from the table centre', () => {
    const [x, , z] = localToWorld(0.6, -0.8)

    expect(distanceToTable(x, z)).toBeCloseTo(1, 10)
  })

  it('yaw matches the direction of the local +Z axis', () => {
    expect(Math.sin(TABLE_YAW)).toBeCloseTo(directionXZ(4.6, 2.2, 0, 0)[0], 10)
  })
})

describe('seats and croupier', () => {
  it('has three seats and only the first one is the player seat', () => {
    expect(SEATS).toHaveLength(3)
    expect(SEATS.filter((seat) => seat.isPlayer)).toEqual([PLAYER_SEAT])
    expect(PLAYER_SEAT).toBe(SEATS[0])
  })

  it('puts every seat on the same circle around the table', () => {
    for (const seat of SEATS) {
      expect(distanceToTable(seat.at[0], seat.at[2])).toBeCloseTo(SEAT_RADIUS, 10)
    }
  })

  it('puts the player seat on the side facing the middle of the room', () => {
    const toRoom = directionXZ(4.6, 2.2, 0, 0)
    const toSeat = directionXZ(4.6, 2.2, PLAYER_SEAT.at[0], PLAYER_SEAT.at[2])

    expect(toSeat[0]).toBeCloseTo(toRoom[0], 10)
    expect(toSeat[1]).toBeCloseTo(toRoom[1], 10)
  })

  it('turns every stool front towards the table, front being -Z', () => {
    for (const seat of SEATS) {
      const front = [-Math.sin(seat.yaw), -Math.cos(seat.yaw)]
      const toTable = directionXZ(seat.at[0], seat.at[2], 4.6, 2.2)

      expect(front[0]).toBeCloseTo(toTable[0], 10)
      expect(front[1]).toBeCloseTo(toTable[1], 10)
    }
  })

  it('puts the croupier on the opposite side, facing the player seat, front being +Z', () => {
    const toCroupier = directionXZ(4.6, 2.2, CROUPIER.at[0], CROUPIER.at[2])
    const toPlayer = directionXZ(4.6, 2.2, PLAYER_SEAT.at[0], PLAYER_SEAT.at[2])
    const front = [Math.sin(CROUPIER.yaw), Math.cos(CROUPIER.yaw)]
    const toSeat = directionXZ(CROUPIER.at[0], CROUPIER.at[2], PLAYER_SEAT.at[0], PLAYER_SEAT.at[2])

    expect(toCroupier[0]).toBeCloseTo(-toPlayer[0], 10)
    expect(toCroupier[1]).toBeCloseTo(-toPlayer[1], 10)
    expect(front[0]).toBeCloseTo(toSeat[0], 10)
    expect(front[1]).toBeCloseTo(toSeat[1], 10)
  })

  it('keeps seats and croupier outside the table top', () => {
    for (const [x, z] of [
      ...SEATS.map((seat) => [seat.at[0], seat.at[2]]),
      [CROUPIER.at[0], CROUPIER.at[2]],
    ]) {
      expect(distanceToTable(x, z)).toBeGreaterThan(BLACKJACK_TABLE.radius + 0.25)
    }
  })

  it('keeps seats and croupier away from the walls', () => {
    for (const [x, z] of [
      ...SEATS.map((seat) => [seat.at[0], seat.at[2]]),
      [CROUPIER.at[0], CROUPIER.at[2]],
    ]) {
      expect(Math.abs(x)).toBeLessThanOrEqual(ROOM.width / 2 - CAMERA_MARGIN)
      expect(Math.abs(z)).toBeLessThanOrEqual(ROOM.depth / 2 - CAMERA_MARGIN)
    }
  })

  it('keeps seats and croupier off the stage', () => {
    for (const [x, z] of [
      ...SEATS.map((seat) => [seat.at[0], seat.at[2]]),
      [CROUPIER.at[0], CROUPIER.at[2]],
    ]) {
      const insideStage =
        Math.abs(x - STAGE.x) < STAGE.halfWidth + 0.4 &&
        Math.abs(z - STAGE.z) < STAGE.halfDepth + 0.4
      expect(insideStage).toBe(false)
    }
  })

  it('keeps seats and croupier away from the cocktail tables and their armchairs', () => {
    for (const [x, z] of [
      ...SEATS.map((seat) => [seat.at[0], seat.at[2]]),
      [CROUPIER.at[0], CROUPIER.at[2]],
    ]) {
      for (const [tableX, tableZ] of TABLE_SPOTS) {
        expect(Math.hypot(x - tableX, z - tableZ)).toBeGreaterThan(1.9)
      }
    }
  })

  it('separates the seats from each other', () => {
    for (let i = 0; i < SEATS.length; i++) {
      for (let j = i + 1; j < SEATS.length; j++) {
        const distance = Math.hypot(
          SEATS[i].at[0] - SEATS[j].at[0],
          SEATS[i].at[2] - SEATS[j].at[2],
        )
        expect(distance).toBeGreaterThan(0.8)
      }
    }
  })
})

describe('seat pose', () => {
  it('puts the eyes over the player seat side, above the table and inside the camera cage', () => {
    const [x, y, z] = SEAT_POSE.position

    expect(y).toBeGreaterThan(BLACKJACK_TABLE.feltY + 0.3)
    expect(y).toBeLessThan(1.7)
    expect(Math.abs(x)).toBeLessThanOrEqual(ROOM.width / 2 - CAMERA_MARGIN)
    expect(Math.abs(z)).toBeLessThanOrEqual(ROOM.depth / 2 - CAMERA_MARGIN)
    expect(distanceToTable(x, z)).toBeLessThan(SEAT_RADIUS)
  })

  it('looks down at the felt, past the centre, towards the croupier', () => {
    const [, eyeY] = SEAT_POSE.position
    const [lookX, lookY, lookZ] = SEAT_POSE.lookAt

    expect(lookY).toBeLessThan(eyeY)
    expect(lookY).toBeGreaterThan(BLACKJACK_TABLE.feltY)
    expect(distanceToTable(lookX, lookZ)).toBeLessThan(BLACKJACK_TABLE.radius)
    const toCroupier = directionXZ(
      SEAT_POSE.position[0],
      SEAT_POSE.position[2],
      CROUPIER.at[0],
      CROUPIER.at[2],
    )
    const toLook = directionXZ(SEAT_POSE.position[0], SEAT_POSE.position[2], lookX, lookZ)
    expect(toLook[0]).toBeCloseTo(toCroupier[0], 6)
    expect(toLook[1]).toBeCloseTo(toCroupier[1], 6)
  })
})

describe('card slots', () => {
  it('scales the card up from the real 63 x 88 mm size', () => {
    expect(CARD.width).toBeCloseTo(0.0945, 4)
    expect(CARD.height).toBeCloseTo(0.132, 4)
  })

  it('centres a row on the table axis', () => {
    const left = slotPosition('player', 0, 3)
    const middle = slotPosition('player', 1, 3)
    const right = slotPosition('player', 2, 3)

    expect(middle[0]).toBeCloseTo(0, 10)
    expect(left[0]).toBeCloseTo(-right[0], 10)
  })

  it('puts the dealer row towards the croupier and the player row towards the seat', () => {
    expect(slotPosition('dealer', 0, 1)[2]).toBeLessThan(0)
    expect(slotPosition('player', 0, 1)[2]).toBeGreaterThan(0)
  })

  it('keeps rows from touching each other', () => {
    const gap = slotPosition('player', 0, 1)[2] - slotPosition('dealer', 0, 1)[2]

    expect(gap).toBeGreaterThan(CARD.height)
  })

  it('stacks later cards slightly higher so they never fight for depth', () => {
    const first = slotPosition('player', 0, 4)
    const second = slotPosition('player', 1, 4)

    expect(second[1]).toBeGreaterThan(first[1])
    expect(first[1]).toBeGreaterThan(BLACKJACK_TABLE.feltY)
  })

  it('overlaps neighbours a little but keeps each card readable', () => {
    const spacing = rowSpacing(4)

    expect(spacing).toBeLessThan(CARD.width)
    expect(spacing).toBeGreaterThan(CARD.width / 2)
  })

  it('squeezes long rows to stay inside the felt', () => {
    const first = slotPosition('dealer', 0, 11)
    const last = slotPosition('dealer', 10, 11)

    expect(rowSpacing(11)).toBeLessThan(rowSpacing(4))
    for (const [x, , z] of [first, last]) {
      expect(Math.hypot(Math.abs(x) + CARD.width / 2, Math.abs(z) + CARD.height / 2)).toBeLessThan(
        BLACKJACK_TABLE.radius,
      )
    }
  })

  it('writes into the array it is given', () => {
    const out = [0, 0, 0]

    const result = slotPosition('player', 0, 2, out)

    expect(result).toBe(out)
    expect(out[2]).toBeGreaterThan(0)
  })

  it('gives small repeatable spins', () => {
    for (let index = 0; index < 20; index++) {
      expect(Math.abs(slotSpin(index))).toBeLessThan(0.1)
    }
    expect(slotSpin(3)).toBe(slotSpin(3))
    expect(slotSpin(0)).not.toBe(slotSpin(1))
  })

  it('keeps the shoe on the felt, away from both card rows', () => {
    expect(Math.hypot(SHOE.x, SHOE.z) + SHOE.holderDepth / 2).toBeLessThan(BLACKJACK_TABLE.radius)
    expect(Math.abs(slotPosition('dealer', 0, 1)[2] - SHOE.z)).toBeGreaterThan(0.1)
  })
})
