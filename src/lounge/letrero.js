import * as THREE from 'three'
import { FontLoader } from 'three/addons/loaders/FontLoader.js'
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js'

import { ROOM } from './salon'

// El letrero "IULIAN'S" — letras 3D emissive sobre la barra, candidato a
// bloom (CONCEPT.md: marquesina cálida, nada de neón atómico).

const FONT_LIMELIGHT = '/fonts/limelight.typeface.json'
const FONT_FALLBACK = '/fonts/helvetiker_bold.typeface.json'

// Carga Limelight (la tipografía de marquesina de la biblia visual); si la
// Intendencia todavía no ha dejado el fichero en public/fonts/, cae a la
// helvetiker de siempre en vez de romper el arranque.
async function loadSignFont() {
  const loader = new FontLoader()
  try {
    return await loader.loadAsync(FONT_LIMELIGHT)
  } catch (err) {
    console.warn(`[letrero] no se pudo cargar ${FONT_LIMELIGHT}, uso fallback helvetiker`, err)
    return loader.loadAsync(FONT_FALLBACK)
  }
}

// Bombillas de marquesina en fila perimetral alrededor del marco de latón.
// Puramente emissive (sin PointLight real: el letrero ya tiene su propia
// luz en lights.js) para no comerse presupuesto de sombras. La intensidad
// supera el umbral del bloom MRT a propósito.
function buildMarqueeBulbs(frameWidth, frameHeight, frameLength) {
  const BULB_RADIUS = 0.02
  const BULB_SPACING = 0.12
  const FACE_OFFSET = frameWidth / 2 + BULB_RADIUS + 0.01 // delante de la cara del marco

  // puntos en el plano (y, z) recorriendo el perímetro del marco
  const halfH = frameHeight / 2 - 0.05
  const halfL = frameLength / 2 - 0.05
  const points = []
  const stepsZ = Math.max(2, Math.round((halfL * 2) / BULB_SPACING))
  const stepsY = Math.max(2, Math.round((halfH * 2) / BULB_SPACING))

  for (let i = 0; i <= stepsZ; i += 1) {
    const z = -halfL + (i / stepsZ) * (halfL * 2)
    points.push([halfH, z])
    points.push([-halfH, z])
  }
  for (let i = 1; i < stepsY; i += 1) {
    const y = -halfH + (i / stepsY) * (halfH * 2)
    points.push([y, halfL])
    points.push([y, -halfL])
  }

  const geometry = new THREE.SphereGeometry(BULB_RADIUS, 8, 6)
  const material = new THREE.MeshStandardMaterial({
    color: '#E8CD8F',
    emissive: '#E8CD8F',
    emissiveIntensity: 2.2, // por encima del umbral 0.3 del bloom MRT
    roughness: 0.4,
  })

  const bulbs = new THREE.InstancedMesh(geometry, material, points.length)
  bulbs.name = 'letrero-bombillas'
  bulbs.castShadow = false
  bulbs.receiveShadow = false

  const dummy = new THREE.Object3D()
  points.forEach(([y, z], index) => {
    dummy.position.set(FACE_OFFSET, y, z)
    dummy.updateMatrix()
    bulbs.setMatrixAt(index, dummy.matrix)
  })
  bulbs.instanceMatrix.needsUpdate = true

  return bulbs
}

export async function addLetrero(scene) {
  const font = await loadSignFont()

  const geometry = new TextGeometry("IULIAN'S", {
    font,
    size: 0.38,
    depth: 0.06,
    curveSegments: 5,
  })
  geometry.computeBoundingBox()
  const width = geometry.boundingBox.max.x - geometry.boundingBox.min.x
  geometry.center() // el origen de TextGeometry no está centrado

  const text = new THREE.Mesh(
    geometry,
    // color base NEGRO: las letras no reciben luz de las lámparas — solo
    // emiten. Si recibieran, cada letra cruzaría el umbral del bloom en un
    // momento distinto y se "encenderían" una a una al subir el mando
    new THREE.MeshStandardMaterial({
      color: '#000000',
      emissive: '#ffc887',
      emissiveIntensity: 0.85, // mezcla Iulian 2026-07-13 (letrero 0.5 con Limelight)
    }),
  )
  text.name = 'letrero-texto' // el panel de afinado regula su brillo
  // pared oeste, sobre la trasbarra, mirando a la sala, centrado en su marco
  text.rotation.y = Math.PI / 2
  text.position.set(-ROOM.width / 2 + 0.18, 2.81, 0)

  const backboard = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.8, width + 0.6),
    new THREE.MeshStandardMaterial({ color: '#0a1311', roughness: 0.9 }),
  )
  backboard.position.set(-ROOM.width / 2 + 0.13, 2.81, 0)

  const FRAME_WIDTH = 0.04
  const FRAME_HEIGHT = 0.86
  const FRAME_LENGTH = width + 0.66

  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(FRAME_WIDTH, FRAME_HEIGHT, FRAME_LENGTH),
    new THREE.MeshStandardMaterial({ color: '#c9a45c', metalness: 1, roughness: 0.4 }),
  )
  frame.position.set(-ROOM.width / 2 + 0.11, 2.81, 0)

  const bulbs = buildMarqueeBulbs(FRAME_WIDTH, FRAME_HEIGHT, FRAME_LENGTH)
  bulbs.position.copy(frame.position)

  scene.add(frame, backboard, text, bulbs)
}
