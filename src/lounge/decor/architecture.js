import * as THREE from 'three'

import { ROOM, materials } from '../salon'

const WALL_THICKNESS = 0.2
const DOOR_WIDTH = 1.4
const DOOR_HEIGHT = 2.2

const innerX = ROOM.width / 2 - WALL_THICKNESS / 2
const innerZ = ROOM.depth / 2 - WALL_THICKNESS / 2

function mesh(geometry, material) {
  const m = new THREE.Mesh(geometry, material)
  m.castShadow = true
  m.receiveShadow = true
  return m
}

function box(width, height, depth, material, x, y, z) {
  const m = mesh(new THREE.BoxGeometry(width, height, depth), material)
  m.position.set(x, y, z)
  return m
}

function corniceProfile() {
  const shape = new THREE.Shape()
  shape.moveTo(0, 0)
  shape.lineTo(0.2, 0)
  shape.lineTo(0.2, -0.035)
  shape.lineTo(0.13, -0.035)
  shape.lineTo(0.13, -0.07)
  shape.lineTo(0.07, -0.07)
  shape.lineTo(0.07, -0.11)
  shape.lineTo(0, -0.11)
  shape.closePath()
  return shape
}

function corniceGeometry(length) {
  const geometry = new THREE.ExtrudeGeometry(corniceProfile(), {
    depth: length,
    bevelEnabled: false,
    curveSegments: 1,
  })
  geometry.translate(0, 0, -length / 2)
  return geometry
}

const CORNICE_WALLS = [
  { length: ROOM.width, rotY: -Math.PI / 2, x: 0, z: -innerZ },
  { length: ROOM.width, rotY: Math.PI / 2, x: 0, z: innerZ },
  { length: ROOM.depth, rotY: Math.PI, x: innerX, z: 0 },
  { length: ROOM.depth, rotY: 0, x: -innerX, z: 0 },
]

function buildCornice(group) {
  for (const { length, rotY, x, z } of CORNICE_WALLS) {
    const strip = mesh(corniceGeometry(length), materials.woodTrim)
    strip.rotation.y = rotY
    strip.position.set(x, ROOM.height, z)
    group.add(strip)
  }
}

const PILASTER_Z = [-3.9, -1.3, 1.3, 3.9]
const PILASTER_BASE_H = 0.9
const PILASTER_TOP_Y = ROOM.height - 0.25
const PILASTER_WIDTH = 0.3
const PILASTER_DEPTH = 0.1

function buildPilaster(group, z) {
  const x = innerX - PILASTER_DEPTH / 2
  const shaftHeight = PILASTER_TOP_Y - PILASTER_BASE_H

  group.add(
    box(
      PILASTER_WIDTH + 0.05,
      PILASTER_BASE_H,
      PILASTER_DEPTH + 0.02,
      materials.woodTrim,
      x,
      PILASTER_BASE_H / 2,
      z,
    ),
  )

  group.add(
    box(
      PILASTER_WIDTH,
      shaftHeight,
      PILASTER_DEPTH,
      materials.woodTrim,
      x,
      PILASTER_BASE_H + shaftHeight / 2,
      z,
    ),
  )

  group.add(
    box(
      0.02,
      shaftHeight - 0.1,
      0.01,
      materials.brass,
      x - PILASTER_DEPTH / 2 - 0.005,
      PILASTER_BASE_H + shaftHeight / 2,
      z,
    ),
  )

  const capitalY = PILASTER_TOP_Y
  group.add(
    box(
      PILASTER_WIDTH + 0.08,
      0.1,
      PILASTER_DEPTH + 0.05,
      materials.woodTrim,
      x,
      capitalY + 0.05,
      z,
    ),
  )
  group.add(
    box(
      PILASTER_WIDTH + 0.14,
      0.03,
      PILASTER_DEPTH + 0.09,
      materials.brass,
      x,
      capitalY + 0.115,
      z,
    ),
  )
}

function buildPilasters(group) {
  for (const z of PILASTER_Z) buildPilaster(group, z)
}

function buildBaseboardRun(group, width, x, z, rotY = 0) {
  const wood = box(width, 0.9, 0.06, materials.woodTrim, 0, 0.45, 0.03)
  const brassTrim = box(width, 0.03, 0.07, materials.brass, 0, 0.92, 0.03)
  const run = new THREE.Group()
  run.add(wood)
  run.add(brassTrim)
  run.rotation.y = rotY
  run.position.set(x, 0, z)
  group.add(run)
}

function buildBaseboards(group) {
  buildBaseboardRun(group, ROOM.depth - 0.16, -innerX, 0, Math.PI / 2)

  const sideWidth = (ROOM.width - DOOR_WIDTH) / 2
  const segWidth = sideWidth - 0.08
  const segX = DOOR_WIDTH / 2 + segWidth / 2
  buildBaseboardRun(group, segWidth, -segX, innerZ, Math.PI)
  buildBaseboardRun(group, segWidth, segX, innerZ, Math.PI)
}

function buildDoorSurround(group) {
  const jambWidth = 0.14
  const depth = 0.06
  const surroundZ = innerZ - depth / 2
  const jambHeight = DOOR_HEIGHT + jambWidth

  for (const side of [-1, 1]) {
    const x = side * (DOOR_WIDTH / 2 + jambWidth / 2)
    group.add(box(jambWidth, jambHeight, depth, materials.woodTrim, x, jambHeight / 2, surroundZ))
    group.add(
      box(
        0.02,
        jambHeight - 0.06,
        0.01,
        materials.brass,
        x - side * (jambWidth / 2 + 0.005),
        jambHeight / 2,
        surroundZ,
      ),
    )
  }

  group.add(
    box(DOOR_WIDTH + jambWidth * 2, jambWidth, depth, materials.woodTrim, 0, jambHeight, surroundZ),
  )
  group.add(
    box(
      DOOR_WIDTH + jambWidth * 2,
      0.02,
      0.01,
      materials.brass,
      0,
      jambHeight + jambWidth / 2 + 0.01,
      surroundZ,
    ),
  )

  const archRadius = DOOR_WIDTH / 2 + jambWidth
  const woodArch = mesh(
    new THREE.TorusGeometry(archRadius, 0.05, 8, 24, Math.PI),
    materials.woodTrim,
  )
  woodArch.position.set(0, jambHeight, surroundZ)
  group.add(woodArch)

  const brassArch = mesh(
    new THREE.TorusGeometry(archRadius, 0.012, 6, 24, Math.PI),
    materials.brass,
  )
  brassArch.position.set(0, jambHeight, surroundZ - depth / 2 - 0.005)
  group.add(brassArch)
}

export function addArchitecture(scene) {
  const architecture = new THREE.Group()
  architecture.name = 'arquitectura'

  buildCornice(architecture)
  buildPilasters(architecture)
  buildBaseboards(architecture)
  buildDoorSurround(architecture)

  scene.add(architecture)
  return architecture
}
