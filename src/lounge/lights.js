import * as THREE from 'three'

import { LAMPS, ROOM, SCONCES, TABLE_SPOTS, WALL_WASHES } from './salon'

const WARM = '#ffa666'
const GOLD = '#e8cd8f'

function tag(light, kind) {
  light.userData.kind = kind
  light.userData.baseIntensity = light.intensity
  if (kind !== 'candle' && kind !== 'shelf' && kind !== 'tira') light.layers.enable(1)
  return light
}

export function addSalonLights(scene) {
  scene.add(tag(new THREE.HemisphereLight('#4a3527', '#241610', 0.7), 'fill'))

  for (const { x, y, z, intensity, shadow } of LAMPS) {
    if (shadow) {
      const light = tag(new THREE.SpotLight(WARM, intensity, 12, 1.15, 0.55, 2), 'lamp')
      light.position.set(x, y - 0.02, z)
      light.target.position.set(x, 0, z)
      light.castShadow = true
      light.shadow.mapSize.set(1024, 1024)
      light.shadow.bias = -0.005
      scene.add(light, light.target)
    } else {
      const light = tag(new THREE.PointLight(WARM, intensity, 12, 2), 'lamp')
      light.position.set(x, y - 0.02, z)
      scene.add(light)
    }
  }

  const SHELF_GLOWS = [-2.15, -0.35, 1.45]
  for (const z of SHELF_GLOWS) {
    const glow = tag(new THREE.PointLight(WARM, 1.35, 2.6, 2), 'shelf')
    glow.position.set(-ROOM.width / 2 + 0.32, 1.62, z)
    scene.add(glow)
  }

  for (let z = -3; z <= 3.01; z += 0.5) {
    const wash = tag(new THREE.PointLight('#ff9d5c', 0.34, 1.8, 2), 'tira')
    wash.position.set(-ROOM.width / 2 + 2.14, 0.82, z)
    scene.add(wash)
  }

  for (const [x, z] of TABLE_SPOTS) {
    const candle = tag(new THREE.PointLight('#ff8438', 0.66, 1.35, 2), 'candle')
    candle.position.set(x - 0.09, 0.98, z + 0.06)
    scene.add(candle)
  }

  for (const { x, z, rotY } of SCONCES) {
    const glow = tag(new THREE.PointLight(WARM, 3, 3.5, 2), 'accent')
    glow.position.set(x + Math.sin(rotY) * 0.3, 2.4, z + Math.cos(rotY) * 0.3)
    scene.add(glow)
  }

  for (const { x, y, z } of WALL_WASHES) {
    const wash = tag(new THREE.PointLight(WARM, 1.2, 2.6, 2), 'pared')
    wash.position.set(x, y, z)
    scene.add(wash)
  }

  const footlights = tag(new THREE.PointLight(GOLD, 1.2, 2.5, 2), 'escenario')
  footlights.position.set(3.2, 1.35, -4.55)
  scene.add(footlights)

  const signGlow = tag(new THREE.PointLight(GOLD, 3.15, 6, 2), 'letrero')
  signGlow.position.set(-ROOM.width / 2 + 0.7, 2.85, 0)
  scene.add(signGlow)

  const spot = tag(new THREE.SpotLight(GOLD, 18, 14, 0.5, 0.5, 2), 'escenario')
  spot.position.set(3.2, ROOM.height - 0.2, -1.4)
  spot.target.position.set(3.2, 0.4, -ROOM.depth / 2 + 1.35)
  spot.castShadow = true
  spot.shadow.mapSize.set(1024, 1024)
  spot.shadow.bias = -0.0001
  scene.add(spot)
  scene.add(spot.target)
}
