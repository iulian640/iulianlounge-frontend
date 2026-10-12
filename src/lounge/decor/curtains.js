import * as THREE from 'three'

import { ROOM } from '../salon'

const velvet = new THREE.MeshStandardMaterial({
  color: '#8e2028',
  roughness: 0.92,
  side: THREE.DoubleSide,
})

const STAGE_X = 3.2
const STAGE_TOP = 0.43
const FOLD_DEPTH = 0.07

function curtainGeometry(width, height, folds, waist) {
  const geometry = new THREE.PlaneGeometry(width, height, 96, 16)
  const position = geometry.attributes.position
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i)
    const y = position.getY(i)
    const t = y / height + 0.5

    let sx = 1
    if (waist) {
      const d = t - waist.t
      sx = 1 - (1 - waist.pinch) * Math.exp(-(d * d) / (2 * waist.sigma * waist.sigma))
    }

    position.setX(i, x * sx)
    const ripple = Math.sin((x / width) * Math.PI * 2 * folds)
    position.setZ(i, ripple * FOLD_DEPTH * (0.35 + 0.65 * sx))
  }
  geometry.computeVertexNormals()
  return geometry
}

function curtain(width, height, folds, waist) {
  const mesh = new THREE.Mesh(curtainGeometry(width, height, folds, waist), velvet)
  mesh.receiveShadow = true
  return mesh
}

const goldMaterial = new THREE.MeshStandardMaterial({
  color: '#e8cd8f',
  metalness: 0.8,
  roughness: 0.35,
})

function tieback(x, y, z, girth) {
  const tie = new THREE.Group()

  const cord = new THREE.Mesh(new THREE.TorusGeometry(girth, 0.014, 8, 20), goldMaterial)
  cord.rotation.x = Math.PI / 2
  cord.scale.z = 0.45
  tie.add(cord)

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.028, 10, 8), goldMaterial)
  head.position.set(0, -0.09, girth * 0.7)
  tie.add(head)

  const skirt = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.12, 10), goldMaterial)
  skirt.position.set(0, -0.18, girth * 0.7)
  skirt.rotation.x = Math.PI
  tie.add(skirt)

  tie.position.set(x, y, z)
  return tie
}

export function addCurtains(scene) {
  const curtains = new THREE.Group()
  curtains.name = 'cortinas-escenario'

  const backdropHeight = ROOM.height - STAGE_TOP
  const backdrop = curtain(3.9, backdropHeight, 14)
  backdrop.position.set(STAGE_X, STAGE_TOP + backdropHeight / 2, -5.2)
  curtains.add(backdrop)

  const legHeight = ROOM.height
  const waist = { t: 0.42, pinch: 0.42, sigma: 0.14 }
  for (const side of [-1, 1]) {
    const x = STAGE_X + side * 2.45
    const leg = curtain(1.0, legHeight, 6, waist)
    leg.position.set(x, legHeight / 2, -5.18)
    curtains.add(leg)

    const tieY = legHeight * waist.t
    curtains.add(tieback(x, tieY, -5.13, 0.24))
  }

  const valance = curtain(6.2, 0.6, 20)
  valance.position.set(STAGE_X, ROOM.height - 0.3, -5.05)
  curtains.add(valance)

  scene.add(curtains)
}
