import * as THREE from 'three'

import {
  BLACKJACK_TABLE,
  SEAT_POSE,
  SHOE,
  SHOE_DECK_TOP_Y,
  SHOE_PARK_Y,
  TABLE_YAW,
  slotPosition,
  slotSpin,
} from './blackjackLayout'
import { createCardAtlasTexture } from './cardAtlas'
import { cardUvRect } from './cardAtlasLayout'
import {
  createCardGeometry,
  createCardMaterial,
  createDeckGeometry,
  flagAsCard,
  setFrontFace,
} from './cardMesh'
import {
  DEAL_ARC,
  FLIP_LIFT,
  TIMING,
  arcOffset,
  easeInOutCubic,
  easeOutCubic,
  lerp,
  progressAt,
} from './cardTween'
import { EMPTY_HAND_STATE, HOLE_INDEX, diffHand } from './handDiff'
import { toReducedMotionCheck } from './reducedMotion'

export const POOL_SIZE = 24

const FACE_UP_X = -Math.PI / 2
const FACE_DOWN_X = Math.PI / 2
const MOVE_EPSILON = 0.0001
const OWNERS = ['player', 'dealer']
const COUNT_KEYS = { player: 'playerCount', dealer: 'dealerCount' }

function createMove() {
  return {
    active: false,
    release: false,
    elapsed: 0,
    delay: 0,
    duration: 0,
    arc: 0,
    fromX: 0,
    fromY: 0,
    fromZ: 0,
    fromSpin: 0,
    toX: 0,
    toY: 0,
    toZ: 0,
    toSpin: 0,
  }
}

function createEntry(material, backRect) {
  const geometry = createCardGeometry(backRect, backRect)
  const mesh = flagAsCard(new THREE.Mesh(geometry, material))
  mesh.name = 'blackjack-card'
  return {
    mesh,
    geometry,
    inUse: false,
    releasing: false,
    pending: false,
    fresh: false,
    dealDelay: 0,
    faceDown: true,
    rotX: FACE_UP_X,
    curX: 0,
    curY: 0,
    curZ: 0,
    curSpin: 0,
    arcY: 0,
    liftY: 0,
    move: createMove(),
    flipActive: false,
    flipElapsed: 0,
    flipDelay: 0,
  }
}

function applyEntry(entry) {
  entry.mesh.position.set(entry.curX, entry.curY + entry.arcY + entry.liftY, entry.curZ)
  entry.mesh.rotation.set(entry.rotX, 0, entry.curSpin)
}

function buildShoe(materials, cardMaterial, backRect) {
  const shoe = new THREE.Group()
  shoe.name = 'blackjack-shoe'
  shoe.position.set(SHOE.x, 0, SHOE.z)
  shoe.rotation.y = SHOE.yaw

  const holderGeometry = new THREE.BoxGeometry(
    SHOE.holderWidth,
    SHOE.holderHeight,
    SHOE.holderDepth,
  )
  const holder = new THREE.Mesh(holderGeometry, materials.brass)
  holder.position.y = BLACKJACK_TABLE.feltY + SHOE.holderHeight / 2
  shoe.add(holder)

  const deckGeometry = createDeckGeometry(backRect)
  const deck = flagAsCard(new THREE.Mesh(deckGeometry, cardMaterial))
  deck.position.y = BLACKJACK_TABLE.feltY + SHOE.holderHeight + SHOE.deckHeight / 2
  shoe.add(deck)

  return { shoe, geometries: [holderGeometry, deckGeometry] }
}

export function createBlackjackTable({
  scene,
  materials,
  updatables = [],
  reducedMotion = false,
  createTexture = createCardAtlasTexture,
}) {
  const isReduced = toReducedMotionCheck(reducedMotion)
  const texture = createTexture()
  const cardMaterial = createCardMaterial(texture)
  const backRect = cardUvRect('back')

  const frame = new THREE.Group()
  frame.name = 'blackjack-table-cards'
  frame.position.set(BLACKJACK_TABLE.at[0], 0, BLACKJACK_TABLE.at[2])
  frame.rotation.y = TABLE_YAW

  const { shoe, geometries } = buildShoe(materials, cardMaterial, backRect)
  frame.add(shoe)

  const entries = []
  for (let i = 0; i < POOL_SIZE; i++) {
    const entry = createEntry(cardMaterial, backRect)
    entry.curX = SHOE.x
    entry.curY = SHOE_PARK_Y
    entry.curZ = SHOE.z
    entry.curSpin = SHOE.yaw
    applyEntry(entry)
    frame.add(entry.mesh)
    entries.push(entry)
  }
  scene.add(frame)

  const rows = { player: [], dealer: [] }
  const scratch = [0, 0, 0]
  let handState = EMPTY_HAND_STATE

  function releaseEntry(entry) {
    entry.inUse = false
    entry.releasing = false
    entry.pending = false
    entry.fresh = false
    entry.move.active = false
    entry.flipActive = false
    entry.arcY = 0
    entry.liftY = 0
    entry.mesh.visible = false
  }

  function acquire() {
    for (let i = 0; i < entries.length; i++) {
      if (!entries[i].inUse) return entries[i]
    }
    for (let i = 0; i < entries.length; i++) {
      if (entries[i].releasing) {
        releaseEntry(entries[i])
        return entries[i]
      }
    }
    return null
  }

  function startMove(entry, target, spin, { delay, duration, arc, release = false }) {
    const move = entry.move
    if (isReduced()) {
      entry.curX = target[0]
      entry.curY = target[1]
      entry.curZ = target[2]
      entry.curSpin = spin
      entry.arcY = 0
      move.active = false
      entry.pending = false
      entry.mesh.visible = true
      applyEntry(entry)
      if (release) releaseEntry(entry)
      return
    }
    move.fromX = entry.curX
    move.fromY = entry.curY
    move.fromZ = entry.curZ
    move.fromSpin = entry.curSpin
    move.toX = target[0]
    move.toY = target[1]
    move.toZ = target[2]
    move.toSpin = spin
    move.elapsed = 0
    move.delay = delay
    move.duration = duration
    move.arc = arc
    move.release = release
    move.active = true
    entry.pending = delay > 0 && entry.pending
    entry.mesh.visible = !entry.pending
  }

  function dealEntry(action) {
    const entry = acquire()
    if (!entry) return
    const isFaceDown = action.card === null
    entry.inUse = true
    entry.releasing = false
    entry.fresh = true
    entry.dealDelay = action.delay
    entry.faceDown = isFaceDown
    entry.rotX = isFaceDown ? FACE_DOWN_X : FACE_UP_X
    entry.flipActive = false
    entry.liftY = 0
    entry.arcY = 0
    entry.curX = SHOE.x
    entry.curY = SHOE_DECK_TOP_Y + 0.002
    entry.curZ = SHOE.z
    entry.curSpin = SHOE.yaw
    setFrontFace(entry.geometry, isFaceDown ? backRect : cardUvRect(action.card))
    rows[action.owner][action.index] = entry
    applyEntry(entry)
    entry.mesh.visible = false
  }

  function revealHole(action) {
    const entry = rows.dealer[HOLE_INDEX]
    if (!entry) return
    setFrontFace(entry.geometry, cardUvRect(action.card))
    if (isReduced()) {
      entry.faceDown = false
      entry.rotX = FACE_UP_X
      applyEntry(entry)
      return
    }
    entry.flipActive = true
    entry.flipElapsed = 0
    entry.flipDelay = action.delay
  }

  function clearTable() {
    scratch[0] = SHOE.x
    scratch[1] = SHOE_DECK_TOP_Y
    scratch[2] = SHOE.z
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i]
      if (!entry.inUse || entry.releasing) continue
      if (entry.pending || isReduced()) {
        releaseEntry(entry)
        continue
      }
      entry.releasing = true
      entry.flipActive = false
      startMove(entry, scratch, SHOE.yaw, {
        delay: 0,
        duration: TIMING.clearDuration,
        arc: 0,
        release: true,
      })
    }
    rows.player.length = 0
    rows.dealer.length = 0
  }

  function isOffTarget(entry, target) {
    const move = entry.move
    const x = move.active ? move.toX : entry.curX
    const y = move.active ? move.toY : entry.curY
    const z = move.active ? move.toZ : entry.curZ
    return (
      Math.abs(x - target[0]) > MOVE_EPSILON ||
      Math.abs(y - target[1]) > MOVE_EPSILON ||
      Math.abs(z - target[2]) > MOVE_EPSILON
    )
  }

  function retarget(entry, target, spin) {
    const move = entry.move
    if (entry.pending && move.active) {
      move.toX = target[0]
      move.toY = target[1]
      move.toZ = target[2]
      move.toSpin = spin
      return
    }
    startMove(entry, target, spin, {
      delay: 0,
      duration: TIMING.relayoutDuration,
      arc: 0,
    })
  }

  function layoutRow(owner) {
    const count = handState[COUNT_KEYS[owner]]
    const row = rows[owner]
    for (let index = 0; index < row.length; index++) {
      const entry = row[index]
      if (!entry) continue
      slotPosition(owner, index, count, scratch)
      const spin = slotSpin(index)
      if (entry.fresh) {
        entry.fresh = false
        entry.pending = !isReduced()
        startMove(entry, scratch, spin, {
          delay: entry.dealDelay,
          duration: TIMING.dealDuration,
          arc: DEAL_ARC,
        })
      } else if (isOffTarget(entry, scratch)) {
        retarget(entry, scratch, spin)
      }
    }
  }

  function setHand(hand) {
    const result = diffHand(handState, hand)
    handState = result.state
    for (const action of result.actions) {
      if (action.type === 'clear') clearTable()
      else if (action.type === 'deal') dealEntry(action)
      else if (action.type === 'reveal') revealHole(action)
    }
    for (const owner of OWNERS) layoutRow(owner)
  }

  function stepMove(entry, delta) {
    const move = entry.move
    move.elapsed += delta
    if (entry.pending) {
      if (move.elapsed < move.delay) return
      entry.pending = false
      entry.mesh.visible = true
    }
    const t = progressAt(move.elapsed, move.delay, move.duration)
    const eased = easeOutCubic(t)
    entry.curX = lerp(move.fromX, move.toX, eased)
    entry.curY = lerp(move.fromY, move.toY, eased)
    entry.curZ = lerp(move.fromZ, move.toZ, eased)
    entry.curSpin = lerp(move.fromSpin, move.toSpin, eased)
    entry.arcY = arcOffset(t, move.arc)
    applyEntry(entry)
    if (t < 1) return
    move.active = false
    entry.arcY = 0
    if (move.release) releaseEntry(entry)
  }

  function stepFlip(entry, delta) {
    entry.flipElapsed += delta
    const t = progressAt(entry.flipElapsed, entry.flipDelay, TIMING.flipDuration)
    const eased = easeInOutCubic(t)
    entry.rotX = lerp(FACE_DOWN_X, FACE_UP_X, eased)
    entry.liftY = arcOffset(t, FLIP_LIFT)
    applyEntry(entry)
    if (t < 1) return
    entry.flipActive = false
    entry.faceDown = false
    entry.rotX = FACE_UP_X
    entry.liftY = 0
    applyEntry(entry)
  }

  function update(delta) {
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i]
      if (!entry.inUse) continue
      if (entry.move.active) stepMove(entry, delta)
      if (entry.flipActive) stepFlip(entry, delta)
    }
  }

  function endWarmup() {
    for (let i = 0; i < entries.length; i++) {
      if (!entries[i].inUse) entries[i].mesh.visible = false
    }
  }

  function dispose() {
    frame.removeFromParent()
    for (const entry of entries) entry.geometry.dispose()
    for (const geometry of geometries) geometry.dispose()
    cardMaterial.dispose()
    texture.dispose()
  }

  updatables.push(update)

  return {
    frame,
    cardMaterial,
    cardMeshes: entries.map((entry) => entry.mesh),
    seatPose: {
      position: new THREE.Vector3(...SEAT_POSE.position),
      lookAt: new THREE.Vector3(...SEAT_POSE.lookAt),
    },
    tablePosition: BLACKJACK_TABLE.at,
    setHand,
    update,
    endWarmup,
    dispose,
  }
}
