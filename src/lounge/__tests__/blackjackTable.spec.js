import * as THREE from 'three'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { BLACKJACK_TABLE, SEAT_POSE, SHOE, slotPosition, slotSpin } from '../blackjackLayout'
import { POOL_SIZE, createBlackjackTable } from '../blackjackTable'
import { cardUvRect } from '../cardAtlasLayout'
import { TIMING } from '../cardTween'
import { stubCanvasContext } from './canvasStub'

const FIVE = { face: 'FIVE', suit: 'CLUBS' }
const NINE = { face: 'NINE', suit: 'DIAMONDS' }
const KING = { face: 'KING', suit: 'HEARTS' }
const SEVEN = { face: 'SEVEN', suit: 'SPADES' }
const ACE = { face: 'ACE', suit: 'SPADES' }

const FACE_UP_X = -Math.PI / 2
const FACE_DOWN_X = Math.PI / 2

let canvasStub

beforeEach(() => {
  canvasStub = stubCanvasContext()
})

afterEach(() => {
  canvasStub.spy.mockRestore()
})

function hand(overrides = {}) {
  return {
    id: 'h1',
    status: 'PLAYER_TURN',
    playerCards: [FIVE, NINE],
    dealerCards: [KING],
    ...overrides,
  }
}

function build(options = {}) {
  const scene = new THREE.Scene()
  const updatables = []
  const materials = { brass: new THREE.MeshStandardMaterial({ color: '#c9a45c' }) }
  const table = createBlackjackTable({ scene, materials, updatables, ...options })
  return { scene, updatables, materials, table }
}

function visibleCards(table) {
  return table.cardMeshes.filter((mesh) => mesh.visible)
}

function cardAt(table, owner, index, count) {
  const target = slotPosition(owner, index, count)
  return table.cardMeshes.find(
    (mesh) =>
      mesh.visible &&
      Math.abs(mesh.position.x - target[0]) < 1e-6 &&
      Math.abs(mesh.position.y - target[1]) < 1e-6 &&
      Math.abs(mesh.position.z - target[2]) < 1e-6,
  )
}

function frontUv(mesh) {
  return Array.from(mesh.geometry.attributes.uv.array.slice(0, 8))
}

function expectFace(mesh, card) {
  const rect = cardUvRect(card)
  const uv = frontUv(mesh)
  expect(uv[0]).toBeCloseTo(rect.u0, 6)
  expect(uv[1]).toBeCloseTo(rect.v0, 6)
  expect(uv[4]).toBeCloseTo(rect.u1, 6)
  expect(uv[5]).toBeCloseTo(rect.v1, 6)
}

function step(table, seconds, delta = 1 / 60) {
  for (let elapsed = 0; elapsed < seconds - 1e-9; elapsed += delta) table.update(delta)
}

describe('createBlackjackTable at startup', () => {
  it('adds the table frame to the scene on the felt, turned towards the room', () => {
    const { scene, table } = build()

    expect(scene.children).toContain(table.frame)
    expect(table.frame.position.x).toBe(BLACKJACK_TABLE.at[0])
    expect(table.frame.position.z).toBe(BLACKJACK_TABLE.at[2])
  })

  it('puts a visible shoe on the felt made of a brass holder and a deck', () => {
    const { table, materials } = build()

    const shoe = table.frame.getObjectByName('blackjack-shoe')
    const [holder, deck] = shoe.children
    expect(holder.material).toBe(materials.brass)
    expect(deck.material).toBe(table.cardMaterial)
    expect(deck.visible).toBe(true)
    expect(holder.position.y).toBeGreaterThan(BLACKJACK_TABLE.feltY)
    expect(deck.position.y).toBeGreaterThan(holder.position.y)
    expect(shoe.position.x).toBe(SHOE.x)
  })

  it('shares ONE card material between the deck and every pooled card', () => {
    const { table } = build()

    const materials = new Set()
    table.frame.traverse((object) => {
      if (object.userData.isCard) materials.add(object.material)
    })

    expect(materials.size).toBe(1)
    expect([...materials][0]).toBe(table.cardMaterial)
    expect(table.cardMaterial.map).toBeInstanceOf(THREE.CanvasTexture)
  })

  it('keeps every card and the deck out of shadows and out of the environment capture', () => {
    const { table } = build()
    let cards = 0

    table.frame.traverse((object) => {
      if (!object.userData.isCard) return
      cards += 1
      expect(object.castShadow).toBe(false)
      expect(object.receiveShadow).toBe(false)
      expect(object.userData.hideFromEnv).toBe(true)
    })

    expect(cards).toBe(POOL_SIZE + 1)
  })

  it('never uses DoubleSide on the card material', () => {
    const { table } = build()

    expect(table.cardMaterial.side).toBe(THREE.FrontSide)
  })

  it('parks the pool inside the deck, visible for the warm-up, and hides it afterwards', () => {
    const { table } = build()

    expect(visibleCards(table)).toHaveLength(POOL_SIZE)
    table.endWarmup()

    expect(visibleCards(table)).toHaveLength(0)
    expect(table.frame.getObjectByName('blackjack-shoe').children[1].visible).toBe(true)
  })

  it('registers its update in the updatables list', () => {
    const { table, updatables } = build()

    expect(updatables).toContain(table.update)
  })

  it('exposes the seat pose and the table position', () => {
    const { table } = build()

    expect(table.seatPose.position.toArray()).toEqual([...SEAT_POSE.position])
    expect(table.seatPose.lookAt.toArray()).toEqual([...SEAT_POSE.lookAt])
    expect(table.tablePosition).toEqual(BLACKJACK_TABLE.at)
  })

  it('builds the atlas texture through the given factory', () => {
    const texture = new THREE.Texture()

    const { table } = build({ createTexture: () => texture })

    expect(table.cardMaterial.map).toBe(texture)
  })
})

describe('setHand with reduced motion', () => {
  function started(options = {}) {
    const built = build({ reducedMotion: true, ...options })
    built.table.endWarmup()
    return built
  }

  it('places the opening four cards at once: two for the player and two for the dealer', () => {
    const { table } = started()

    table.setHand(hand())

    expect(visibleCards(table)).toHaveLength(4)
    expect(cardAt(table, 'player', 0, 2)).toBeDefined()
    expect(cardAt(table, 'player', 1, 2)).toBeDefined()
    expect(cardAt(table, 'dealer', 0, 2)).toBeDefined()
    expect(cardAt(table, 'dealer', 1, 2)).toBeDefined()
  })

  it('shows the player cards and the up card face up with their faces', () => {
    const { table } = started()

    table.setHand(hand())

    const first = cardAt(table, 'player', 0, 2)
    expect(first.rotation.x).toBeCloseTo(FACE_UP_X, 10)
    expect(first.rotation.z).toBeCloseTo(slotSpin(0), 10)
    expectFace(first, FIVE)
    expectFace(cardAt(table, 'player', 1, 2), NINE)
    expectFace(cardAt(table, 'dealer', 0, 2), KING)
  })

  it('shows the dealer hole card face down, with the back on both sides', () => {
    const { table } = started()

    table.setHand(hand())

    const hole = cardAt(table, 'dealer', 1, 2)
    expect(hole.rotation.x).toBeCloseTo(FACE_DOWN_X, 10)
    expectFace(hole, 'back')
  })

  it('flips the hole card to its face when the hand finishes', () => {
    const { table } = started()
    table.setHand(hand())

    table.setHand(hand({ status: 'FINISHED', dealerCards: [KING, SEVEN] }))

    const hole = cardAt(table, 'dealer', 1, 2)
    expect(hole.rotation.x).toBeCloseTo(FACE_UP_X, 10)
    expectFace(hole, SEVEN)
    expect(visibleCards(table)).toHaveLength(4)
  })

  it('deals a hit card and re-centres the player row', () => {
    const { table } = started()
    table.setHand(hand())

    table.setHand(hand({ playerCards: [FIVE, NINE, ACE] }))

    expect(visibleCards(table)).toHaveLength(5)
    for (let index = 0; index < 3; index++) {
      expect(cardAt(table, 'player', index, 3)).toBeDefined()
    }
    expectFace(cardAt(table, 'player', 2, 3), ACE)
  })

  it('deals the dealer draws after the flip', () => {
    const { table } = started()
    table.setHand(hand())

    table.setHand(hand({ status: 'FINISHED', dealerCards: [KING, FIVE, SEVEN] }))

    expect(visibleCards(table)).toHaveLength(5)
    expectFace(cardAt(table, 'dealer', 2, 3), SEVEN)
    expectFace(cardAt(table, 'dealer', 1, 3), FIVE)
  })

  it('shows a natural already finished, with the hole card revealed', () => {
    const { table } = started()

    table.setHand(hand({ status: 'FINISHED', playerCards: [ACE, KING], dealerCards: [FIVE, NINE] }))

    expect(visibleCards(table)).toHaveLength(4)
    expectFace(cardAt(table, 'dealer', 1, 2), NINE)
    expect(cardAt(table, 'dealer', 1, 2).rotation.x).toBeCloseTo(FACE_UP_X, 10)
  })

  it('is a no-op when the same hand is set again', () => {
    const { table } = started()
    table.setHand(hand())
    const before = visibleCards(table).map((mesh) => mesh.position.toArray())

    table.setHand(hand())

    expect(visibleCards(table).map((mesh) => mesh.position.toArray())).toEqual(before)
  })

  it('clears the table when there is no hand', () => {
    const { table } = started()
    table.setHand(hand())

    table.setHand(null)

    expect(visibleCards(table)).toHaveLength(0)
  })

  it('clears the old cards when a new hand starts and deals the new ones', () => {
    const { table } = started()
    table.setHand(hand())

    table.setHand(hand({ id: 'h2', playerCards: [ACE, KING], dealerCards: [SEVEN] }))

    expect(visibleCards(table)).toHaveLength(4)
    expectFace(cardAt(table, 'player', 0, 2), ACE)
    expectFace(cardAt(table, 'dealer', 0, 2), SEVEN)
  })

  it('reuses the pooled meshes instead of creating new ones', () => {
    const { table, scene } = started()
    const meshesBefore = table.cardMeshes.length
    let objectsBefore = 0
    scene.traverse(() => (objectsBefore += 1))

    for (let id = 0; id < 10; id++) {
      table.setHand(hand({ id: `h${id}`, playerCards: [FIVE, NINE, ACE] }))
    }

    let objectsAfter = 0
    scene.traverse(() => (objectsAfter += 1))
    expect(table.cardMeshes).toHaveLength(meshesBefore)
    expect(objectsAfter).toBe(objectsBefore)
  })

  it('stays safe when a hand needs more cards than the pool has', () => {
    const { table } = started()
    const crowd = Array.from({ length: POOL_SIZE + 5 }, () => FIVE)

    expect(() => table.setHand(hand({ playerCards: crowd, dealerCards: crowd }))).not.toThrow()
    expect(visibleCards(table).length).toBeLessThanOrEqual(POOL_SIZE)
  })

  it('does not move cards in update: they are already in place', () => {
    const { table } = started()
    table.setHand(hand())
    const before = visibleCards(table).map((mesh) => mesh.position.toArray())

    step(table, 2)

    expect(visibleCards(table).map((mesh) => mesh.position.toArray())).toEqual(before)
  })

  it('reads the reduced motion preference every time when given a function', () => {
    let reduced = true
    const { table } = build({ reducedMotion: () => reduced })
    table.endWarmup()

    table.setHand(hand())
    expect(visibleCards(table)).toHaveLength(4)
    reduced = false
    table.setHand(null)

    expect(visibleCards(table)).toHaveLength(4)
    step(table, TIMING.clearDuration + 0.1)
    expect(visibleCards(table)).toHaveLength(0)
  })
})

describe('setHand with animation', () => {
  function started() {
    const built = build({ reducedMotion: false })
    built.table.endWarmup()
    return built
  }

  it('shows only the first card at the start and the others as their turn comes', () => {
    const { table } = started()

    table.setHand(hand())

    expect(visibleCards(table)).toHaveLength(1)
    step(table, TIMING.dealStep + 0.02)
    expect(visibleCards(table)).toHaveLength(2)
    step(table, 3 * TIMING.dealStep)
    expect(visibleCards(table)).toHaveLength(4)
  })

  it('starts a dealt card on the shoe and lands it on its slot', () => {
    const { table } = started()
    table.setHand(hand())
    const card = visibleCards(table)[0]
    const start = card.position.clone()

    step(table, TIMING.dealDuration / 2)
    const middle = card.position.clone()
    step(table, TIMING.dealDuration)

    expect(start.x).toBeCloseTo(SHOE.x, 6)
    expect(start.z).toBeCloseTo(SHOE.z, 6)
    expect(middle.y).toBeGreaterThan(card.position.y)
    const slot = slotPosition('player', 0, 2)
    expect(card.position.x).toBeCloseTo(slot[0], 6)
    expect(card.position.y).toBeCloseTo(slot[1], 6)
    expect(card.position.z).toBeCloseTo(slot[2], 6)
    expect(card.rotation.z).toBeCloseTo(slotSpin(0), 6)
  })

  it('lands every card of the opening on its slot', () => {
    const { table } = started()

    table.setHand(hand())
    step(table, 4 * TIMING.dealStep + TIMING.dealDuration + 0.1)

    expect(cardAt(table, 'player', 0, 2)).toBeDefined()
    expect(cardAt(table, 'player', 1, 2)).toBeDefined()
    expect(cardAt(table, 'dealer', 0, 2)).toBeDefined()
    expect(cardAt(table, 'dealer', 1, 2)).toBeDefined()
  })

  it('flips the hole card over a lifted arc and leaves it face up', () => {
    const { table } = started()
    table.setHand(hand())
    step(table, 3)
    const hole = cardAt(table, 'dealer', 1, 2)
    const restY = hole.position.y

    table.setHand(hand({ status: 'FINISHED', dealerCards: [KING, SEVEN] }))
    step(table, TIMING.revealPause + TIMING.flipDuration / 2)
    const midFlip = { x: hole.rotation.x, y: hole.position.y }
    step(table, TIMING.flipDuration)

    expect(midFlip.x).toBeGreaterThan(FACE_UP_X)
    expect(midFlip.x).toBeLessThan(FACE_DOWN_X)
    expect(midFlip.y).toBeGreaterThan(restY)
    expect(hole.rotation.x).toBeCloseTo(FACE_UP_X, 10)
    expect(hole.position.y).toBeCloseTo(restY, 10)
    expectFace(hole, SEVEN)
  })

  it('keeps the hole card face down until the flip begins', () => {
    const { table } = started()
    table.setHand(hand())
    step(table, 3)
    const hole = cardAt(table, 'dealer', 1, 2)

    table.setHand(hand({ status: 'FINISHED', dealerCards: [KING, SEVEN] }))
    step(table, TIMING.revealPause / 2)

    expect(hole.rotation.x).toBeCloseTo(FACE_DOWN_X, 10)
  })

  it('slides the old cards back to the shoe, then hides them', () => {
    const { table } = started()
    table.setHand(hand())
    step(table, 3)
    expect(visibleCards(table)).toHaveLength(4)

    table.setHand(null)
    step(table, TIMING.clearDuration / 2)
    expect(visibleCards(table)).toHaveLength(4)
    step(table, TIMING.clearDuration)

    expect(visibleCards(table)).toHaveLength(0)
  })

  it('does not reuse a sweeping card for the new hand while free ones remain', () => {
    const { table } = started()
    table.setHand(hand())
    step(table, 3)

    table.setHand(hand({ id: 'h2' }))
    step(table, TIMING.clearDelay + 4 * TIMING.dealStep + TIMING.dealDuration + 0.1)

    expect(visibleCards(table)).toHaveLength(4)
    expect(cardAt(table, 'player', 0, 2)).toBeDefined()
  })

  it('drops the cards that never started when the table is cleared', () => {
    const { table } = started()
    table.setHand(hand())

    table.setHand(null)
    step(table, TIMING.clearDuration + 0.1)
    step(table, 3)

    expect(visibleCards(table)).toHaveLength(0)
  })

  it('moves the cards already on the table when the row gets longer', () => {
    const { table } = started()
    table.setHand(hand())
    step(table, 3)
    const first = cardAt(table, 'player', 0, 2)
    const oldX = first.position.x

    table.setHand(hand({ playerCards: [FIVE, NINE, ACE] }))
    step(table, 3)

    expect(first.position.x).not.toBeCloseTo(oldX, 3)
    expect(first.position.x).toBeCloseTo(slotPosition('player', 0, 3)[0], 6)
  })

  it('retargets a card that has not started yet instead of restarting it', () => {
    const { table } = started()
    table.setHand(hand())

    table.setHand(hand({ playerCards: [FIVE, NINE, ACE] }))
    step(table, 4)

    for (let index = 0; index < 3; index++) {
      expect(cardAt(table, 'player', index, 3)).toBeDefined()
    }
    expect(cardAt(table, 'dealer', 0, 2)).toBeDefined()
  })

  it('steals a sweeping card when the pool runs out', () => {
    const { table } = started()
    const crowd = Array.from({ length: POOL_SIZE / 2 }, () => FIVE)
    table.setHand(hand({ playerCards: crowd, dealerCards: crowd }))
    step(table, 8)

    table.setHand(hand({ id: 'h2' }))

    expect(() => step(table, 4)).not.toThrow()
    expect(visibleCards(table)).toHaveLength(4)
  })
})

describe('update loop', () => {
  it('does nothing when no card is moving', () => {
    const { table } = build()
    table.endWarmup()
    const snapshot = table.cardMeshes.map((mesh) => mesh.position.toArray())

    step(table, 1)

    expect(table.cardMeshes.map((mesh) => mesh.position.toArray())).toEqual(snapshot)
  })
})

describe('dispose', () => {
  it('takes the frame out of the scene and frees the GPU resources', () => {
    const { scene, table } = build()
    let disposedMaterial = 0
    let disposedTexture = 0
    table.cardMaterial.addEventListener('dispose', () => (disposedMaterial += 1))
    table.cardMaterial.map.addEventListener('dispose', () => (disposedTexture += 1))

    table.dispose()

    expect(scene.children).not.toContain(table.frame)
    expect(disposedMaterial).toBe(1)
    expect(disposedTexture).toBe(1)
  })
})
