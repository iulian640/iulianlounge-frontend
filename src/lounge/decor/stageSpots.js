import * as THREE from 'three'

import { materials } from '../salon'

const canMaterial = new THREE.MeshStandardMaterial({
  color: '#6f5528',
  metalness: 1,
  roughness: 0.5,
})
const lensMaterial = new THREE.MeshStandardMaterial({
  color: '#3a2f1c',
  emissive: '#ffdba0',
  emissiveIntensity: 1.6,
  roughness: 0.4,
})
const beamMaterial = new THREE.MeshStandardMaterial({
  color: '#fff3d8',
  transparent: true,
  opacity: 0.035,
  depthWrite: false,
  side: THREE.DoubleSide,
  roughness: 1,
})

const BAR_Y = 3.05
const BAR_Z = -3.0
const BAR_FROM = 1.5
const BAR_TO = 4.9
const FIXTURES = 9
const LIT = new Set([1, 3, 5, 7])
const REAL_LIGHTS = new Set([3, 5])

function barPoint(t) {
  return new THREE.Vector3(THREE.MathUtils.lerp(BAR_FROM, BAR_TO, t), BAR_Y, BAR_Z)
}

function buildBar(scene) {
  const length = BAR_TO - BAR_FROM + 0.16
  const bar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.035, length, 10),
    materials.woodDark,
  )
  bar.rotation.z = Math.PI / 2
  bar.position.set((BAR_FROM + BAR_TO) / 2, BAR_Y, BAR_Z)
  bar.castShadow = true
  scene.add(bar)

  for (const side of [0, 1]) {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), canMaterial)
    cap.position.copy(barPoint(side))
    scene.add(cap)
  }

  for (const t of [0.12, 0.5, 0.88]) {
    const anchor = barPoint(t)
    const drop = 3.6 - BAR_Y
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, drop, 6), materials.brass)
    rod.position.set(anchor.x, BAR_Y + drop / 2, anchor.z)
    scene.add(rod)
  }
}

function buildFixture(t) {
  const fixture = new THREE.Group()

  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.14, 14), canMaterial)
  body.rotation.x = Math.PI / 2
  body.castShadow = true
  fixture.add(body)

  const back = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 8), canMaterial)
  back.position.z = -0.07
  back.scale.z = 0.5
  fixture.add(back)

  const lens = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 10), lensMaterial)
  lens.position.z = 0.075
  lens.castShadow = false
  lens.userData.hideFromEnv = true
  fixture.add(lens)

  fixture.position.copy(barPoint(t))
  fixture.position.y -= 0.1
  return fixture
}

export function addStageSpots(scene) {
  buildBar(scene)

  const beams = []
  const lights = []

  for (let i = 0; i < FIXTURES; i++) {
    const t = i / (FIXTURES - 1)
    const fixture = buildFixture(t)
    fixture.userData.hideFromEnv = true
    scene.add(fixture)

    const aim = new THREE.Vector3(3.2 + (fixture.position.x - 3.2) * 0.5, 0.45, -4.25)
    fixture.updateWorldMatrix(true, false)
    fixture.lookAt(aim)

    if (!LIT.has(i)) continue

    const distance = fixture.position.distanceTo(aim)
    const beamGeometry = new THREE.ConeGeometry(0.5, distance, 18, 1, true)
    beamGeometry.rotateX(-Math.PI / 2)
    beamGeometry.translate(0, 0, distance / 2 + 0.07)
    const beam = new THREE.Mesh(beamGeometry, beamMaterial)
    beam.renderOrder = 9
    beam.userData.hideFromEnv = true
    beam.userData.haz = true
    fixture.add(beam)
    beams.push(beam)

    if (!REAL_LIGHTS.has(i)) continue

    const light = new THREE.SpotLight('#ffd9a0', 6, 10, 0.32, 0.5, 2)
    light.position.copy(fixture.position)
    light.target.position.copy(aim)
    light.userData.kind = 'foco'
    light.userData.baseIntensity = 6
    scene.add(light)
    scene.add(light.target)
    lights.push(light)
  }

  return {
    beamMaterial,
    lensMaterial,
    setWidth(v) {
      for (const beam of beams) beam.scale.set(v, v, 1)
      for (const light of lights) light.angle = 0.32 * v
    },
  }
}
