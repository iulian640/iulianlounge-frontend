import * as THREE from 'three'

import { materials } from '../salon'

const shadeMaterial = new THREE.MeshStandardMaterial({
  color: '#96322c',
  roughness: 0.9,
  side: THREE.DoubleSide,
  emissive: '#ff6a35',
  emissiveIntensity: 0.32,
})

const bulbMaterial = new THREE.MeshStandardMaterial({
  color: '#e8cd8f',
  emissive: '#ffb46b',
  emissiveIntensity: 0.9,
})

const beadMaterials = [
  new THREE.MeshStandardMaterial({ color: '#b0524c', roughness: 0.35 }),
  materials.brass,
  new THREE.MeshStandardMaterial({ color: '#e8cd8f', roughness: 0.3 }),
]

const SPOTS = [
  [-7.2, -4.7],
  [-7.2, 4.7],
  [7.2, -4.7],
  [7.2, 4.7],
]

const SHADE_RADIUS = 0.24
const SHADE_BOTTOM = 1.34

function lathe(points, material, segments = 24) {
  const mesh = new THREE.Mesh(
    new THREE.LatheGeometry(
      points.map(([r, y]) => new THREE.Vector2(r, y)),
      segments,
    ),
    material,
  )
  mesh.castShadow = true
  return mesh
}

function buildLamp() {
  const lamp = new THREE.Group()

  lamp.add(
    lathe(
      [
        [0.002, 0],
        [0.15, 0],
        [0.13, 0.018],
        [0.06, 0.04],
        [0.03, 0.07],
        [0.016, 0.1],
      ],
      materials.brass,
    ),
  )

  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.013, 1.3, 10), materials.brass)
  stem.position.y = 0.72
  stem.castShadow = true
  lamp.add(stem)

  for (const y of [0.42, 0.78, 1.14]) {
    const knop = new THREE.Mesh(new THREE.SphereGeometry(0.024, 10, 8), materials.brass)
    knop.scale.y = 0.7
    knop.position.y = y
    lamp.add(knop)
  }

  const shade = lathe(
    [
      [0.235, 0],
      [0.24, 0.08],
      [0.21, 0.19],
      [0.14, 0.27],
      [0.03, 0.3],
    ],
    shadeMaterial,
    32,
  )
  shade.position.y = SHADE_BOTTOM
  shade.userData.hideFromEnv = true
  lamp.add(shade)

  const finial = new THREE.Mesh(new THREE.SphereGeometry(0.02, 10, 8), materials.brass)
  finial.position.y = SHADE_BOTTOM + 0.31
  lamp.add(finial)

  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), bulbMaterial)
  bulb.position.y = SHADE_BOTTOM + 0.1
  bulb.castShadow = false
  bulb.userData.hideFromEnv = true
  lamp.add(bulb)

  const beadGeometry = new THREE.CylinderGeometry(0.0035, 0.0045, 1, 6)
  const BEADS = 36
  for (let i = 0; i < BEADS; i++) {
    const angle = (i / BEADS) * Math.PI * 2
    const length = 0.035 + Math.abs(Math.sin(i * 2.3)) * 0.025
    const bead = new THREE.Mesh(beadGeometry, beadMaterials[i % 3])
    bead.scale.y = length
    bead.position.set(
      Math.cos(angle) * (SHADE_RADIUS - 0.005),
      SHADE_BOTTOM + 0.01 - length / 2,
      Math.sin(angle) * (SHADE_RADIUS - 0.005),
    )
    bead.castShadow = false
    bead.userData.hideFromEnv = true
    lamp.add(bead)
  }

  return lamp
}

export function addFloorLamps(scene) {
  for (const [x, z] of SPOTS) {
    const lamp = buildLamp()
    lamp.position.set(x, 0, z)
    lamp.name = 'lampara-pie'
    lamp.userData.hideFromEnv = true
    scene.add(lamp)

    const glow = new THREE.PointLight('#ff8552', 8, 4, 2)
    glow.position.set(x, SHADE_BOTTOM + 0.08, z)
    glow.userData.kind = 'pie'
    glow.userData.baseIntensity = 8
    scene.add(glow)
  }
}
