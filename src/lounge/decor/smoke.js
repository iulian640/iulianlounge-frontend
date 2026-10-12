import * as THREE from 'three'
import {
  Fn,
  instanceIndex,
  instancedBufferAttribute,
  uniform,
  vec3,
  color,
  hash,
  time,
  uv,
  smoothstep,
} from 'three/tsl'

const WISPS_PER_TIP = 110
const RISE = 1.6
const IVORY = '#e8dfc8'
const BASE_OPACITY = 0.005
const BASE_SCALE = 2.5

export function addSmoke(scene, tips) {
  const count = tips.length * WISPS_PER_TIP

  const opacity = uniform(BASE_OPACITY)
  const scaleMul = uniform(BASE_SCALE)

  const origins = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    const tip = tips[i % tips.length]
    origins[i * 3] = tip.x
    origins[i * 3 + 1] = tip.y
    origins[i * 3 + 2] = tip.z
  }
  const origin = instancedBufferAttribute(new THREE.InstancedBufferAttribute(origins, 3))

  const material = new THREE.SpriteNodeMaterial()
  material.transparent = true
  material.depthWrite = false
  material.colorNode = color(IVORY)

  const h1 = hash(instanceIndex)
  const h2 = hash(instanceIndex.add(1))
  const h3 = hash(instanceIndex.add(2))
  const h4 = hash(instanceIndex.add(3))

  const phase = time.mul(h3.mul(0.5).add(0.75)).mul(0.09).add(h1).fract()
  const rise = phase.mul(RISE)

  const amp = rise.mul(0.1).add(0.008)
  const fase = h2.mul(6.2831853)
  const swayX = time.mul(0.55).add(fase).add(rise.mul(2.4)).sin().mul(amp)
  const swayZ = time.mul(0.45).add(fase.mul(1.7)).add(rise.mul(2.1)).sin().mul(amp.mul(0.8))

  material.positionNode = origin.add(vec3(swayX.add(rise.mul(0.05)), rise, swayZ))

  material.scaleNode = rise.mul(0.11).add(0.035).mul(h4.mul(0.3).add(0.85)).mul(scaleMul)

  material.opacityNode = Fn(() => {
    const centered = uv().sub(0.5)
    const redondo = smoothstep(0.5, 0.05, centered.length()).pow(1.7)
    const nace = smoothstep(0.0, 0.05, phase)
    const muere = smoothstep(1.0, 0.45, phase)
    const variacion = h1.mul(0.5).add(0.5)
    return redondo.mul(nace).mul(muere).mul(variacion).mul(opacity)
  })()

  const mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), material, count)
  mesh.frustumCulled = false
  mesh.userData.hideFromEnv = true
  mesh.renderOrder = 10
  scene.add(mesh)

  return { update: () => {}, opacity, scaleMul, mesh }
}
