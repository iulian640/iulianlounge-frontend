import * as THREE from 'three'

import { ROOM, materials } from '../salon'

// Arquitectura de la caja — IUL-27 P1. Cornisa perimetral, pilastras entre
// los cuadros de la pared este, zócalo de los muros que salon.js deja sin
// rematar (sur y oeste) y una moldura de arco alrededor del hueco de la
// puerta sur. Todo procedural (BufferGeometry / ExtrudeGeometry), sin
// modelos externos, sin luces nuevas, sin sombras nuevas — reutiliza los
// materiales de salon.js para no desentonar con la caja ya construida.

const WALL_THICKNESS = 0.2 // = t en buildShell() de salon.js
const DOOR_WIDTH = 1.4 // = doorWidth en buildShell()
const DOOR_HEIGHT = 2.2 // = doorHeight en buildShell()

// caras interiores de los muros (lado salón), a partir del grosor de muro
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

// --- Cornisa perimetral --------------------------------------------------
//
// Perfil escalonado en el plano XY (x = saliente desde el muro, hacia el
// salón; y = caída desde el techo, hacia abajo). Se extruye a lo largo de
// z (longitud del muro) y luego se rota/posiciona una vez por muro.

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

// group.rotation.y necesaria para que el eje local x (saliente) apunte
// hacia el interior del salón en cada muro, y group.position para que el
// origen local (x=0 saliente, y=0 techo, z=0 centro del muro) caiga en la
// esquina techo-muro correspondiente
const CORNICE_WALLS = [
  { length: ROOM.width, rotY: -Math.PI / 2, x: 0, z: -innerZ }, // norte
  { length: ROOM.width, rotY: Math.PI / 2, x: 0, z: innerZ }, // sur
  { length: ROOM.depth, rotY: Math.PI, x: innerX, z: 0 }, // este
  { length: ROOM.depth, rotY: 0, x: -innerX, z: 0 }, // oeste (muro de la barra)
]

function buildCornice(group) {
  for (const { length, rotY, x, z } of CORNICE_WALLS) {
    const strip = mesh(corniceGeometry(length), materials.woodTrim)
    strip.rotation.y = rotY
    strip.position.set(x, ROOM.height, z)
    group.add(strip)
  }
}

// --- Pilastras (pared este, entre los cuadros) ---------------------------
//
// salon.js cuelga los cuadros en la pared este en z = -2.6, 0, 2.6 (marco
// de 0.75 de ancho). Las pilastras van en los huecos entre marcos y en los
// dos extremos de la pared.

const PILASTER_Z = [-3.9, -1.3, 1.3, 3.9]
const PILASTER_BASE_H = 0.9 // a la altura del zócalo existente
const PILASTER_TOP_Y = ROOM.height - 0.25 // deja hueco bajo la cornisa
const PILASTER_WIDTH = 0.3
const PILASTER_DEPTH = 0.1

function buildPilaster(group, z) {
  const x = innerX - PILASTER_DEPTH / 2
  const shaftHeight = PILASTER_TOP_Y - PILASTER_BASE_H

  // basa
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

  // fuste
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

  // vivo de latón centrado en el fuste
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

  // capitel sencillo: bloque escalonado
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

// --- Zócalo perimetral ----------------------------------------------------
//
// salon.js ya remata los muros norte y este (buildShell). Aquí se completan
// sur (partido por el hueco de la puerta) y oeste (muro de la barra), con
// las mismas proporciones que el zócalo existente: 0.9 de alto + remate de
// latón de 0.03.

function buildBaseboardRun(group, width, x, z, rotY = 0) {
  // x/z ya son la cara interior del muro; el zócalo solo asoma medio
  // grosor propio hacia el salón (igual que el remate norte/este de
  // salon.js, pero medido desde la cara interior en vez del centro del muro)
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
  // los extremos se empotran 2 cm en el muro vecino: las esquinas quedan
  // selladas contra el zócalo norte/este de salon.js (misma regla allí)
  // oeste (muro de la barra): tira completa, igual que el este en salon.js
  buildBaseboardRun(group, ROOM.depth - 0.16, -innerX, 0, Math.PI / 2)

  // sur: partida a ambos lados del hueco de la puerta — del canto del
  // hueco hasta la esquina
  const sideWidth = (ROOM.width - DOOR_WIDTH) / 2
  const segWidth = sideWidth - 0.08
  const segX = DOOR_WIDTH / 2 + segWidth / 2
  buildBaseboardRun(group, segWidth, -segX, innerZ, Math.PI)
  buildBaseboardRun(group, segWidth, segX, innerZ, Math.PI)
}

// --- Moldura/arco de la puerta sur -----------------------------------------
//
// Cerco decorativo alrededor del hueco de la puerta, en el lado del salón
// (protuberante hacia el interior, no confundir con el marco de latón
// embutido que monta door.js — este vive delante, más grueso).

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

  // dintel
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

  // arco de medio punto sobre el dintel, en madera con hilo de latón
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

/**
 * Monta la arquitectura fija de la caja (cornisa, pilastras, zócalo
 * restante y moldura de la puerta) y la añade a la escena. Procedural,
 * sin modelos externos, sin luces ni sombras nuevas.
 * @param {THREE.Scene} scene
 * @returns {THREE.Group}
 */
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
