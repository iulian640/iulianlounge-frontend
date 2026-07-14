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

// HUMO DE LOS PUROS (decisión de Iulian 2026-07-13: nada de niebla dispersa
// por toda la sala — el humo NACE de los puros encendidos en los ceniceros
// de decor/ashtrays.js).
//
// Cada punta de puro emite una voluta: sprites billboard que suben ~1.6 m
// serpenteando, nacen como un hilo fino y se abren y disuelven arriba.
// TODO el movimiento es procedural por nodos a partir de `time` (posición =
// f(índice, tiempo), determinista): ni compute ni buffers de estado — la
// misma ruta corre en WebGPU y en el fallback WebGL2, y el coste por frame
// es cero en CPU.
//
// Blending normal a opacidad mínima (jamás aditivo: brillaría como neón).
// El SpriteNodeMaterial no escribe emissive, así que el humo nunca entra al
// bloom selectivo; hideFromEnv lo deja fuera de la captura de reflejos.

const WISPS_PER_TIP = 110 // sprites por puro: la voluta se ve continua
const RISE = 1.6 // metros que sube antes de disolverse
const IVORY = '#e8dfc8' // marfil apagado, un punto más gris que el de la biblia
// mezcla de Iulian 2026-07-13: soplos grandes y muy tenues, se funden en un
// velo continuo (los sliders del panel quedan relativos a esta base)
const BASE_OPACITY = 0.005
const BASE_SCALE = 2.5

/**
 * Añade las volutas de humo que nacen en las puntas de los puros.
 * @param {THREE.Scene} scene
 * @param {THREE.Vector3[]} tips - puntas de los puros en mundo (de addAshtrays).
 * @returns {{update: (delta: number) => void, opacity: object, mesh: THREE.InstancedMesh}}
 *   update para el bucle (aquí no hace nada: el nodo `time` anima solo) +
 *   mandos para el panel: opacity (uniform, en vivo) y mesh (mesh.count
 *   recorta volutas sin recrear nada).
 */
export function addSmoke(scene, tips) {
  const count = tips.length * WISPS_PER_TIP

  // opacidad y tamaño como uniforms: el panel de afinado los mueve en vivo
  // sin recompilar (a más tamaño, más se funden los soplos entre sí)
  const opacity = uniform(BASE_OPACITY)
  const scaleMul = uniform(BASE_SCALE)

  // origen por instancia = la punta de puro a la que pertenece la voluta
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
  material.depthWrite = false // humo translúcido: no debe tapar el z-buffer
  material.colorNode = color(IVORY)

  // semillas deterministas por instancia
  const h1 = hash(instanceIndex) // variación de opacidad + desfase de ciclo
  const h2 = hash(instanceIndex.add(1)) // fase del serpenteo
  const h3 = hash(instanceIndex.add(2)) // velocidad de ascenso 0.75–1.25
  const h4 = hash(instanceIndex.add(3)) // variación de tamaño

  // ciclo de vida 0..1: cada voluta sube, se disuelve y renace abajo,
  // repartidas por h1 para que la columna nunca respire a golpes
  const phase = time.mul(h3.mul(0.5).add(0.75)).mul(0.09).add(h1).fract()
  const rise = phase.mul(RISE)

  // serpenteo: el hilo sale casi recto y se deshace al subir (la amplitud
  // crece con la altura); dos senos desfasados, nada de ruido caro
  const amp = rise.mul(0.1).add(0.008)
  const fase = h2.mul(6.2831853) // 2π
  const swayX = time.mul(0.55).add(fase).add(rise.mul(2.4)).sin().mul(amp)
  const swayZ = time.mul(0.45).add(fase.mul(1.7)).add(rise.mul(2.1)).sin().mul(amp.mul(0.8))

  // deriva leve hacia +x: el mismo aire de la sala para todas las volutas
  material.positionNode = origin.add(vec3(swayX.add(rise.mul(0.05)), rise, swayZ))

  // tamaño: nace hilo (~3 cm) y se abre hasta ~20 cm arriba
  material.scaleNode = rise.mul(0.11).add(0.035).mul(h4.mul(0.3).add(0.85)).mul(scaleMul)

  // soplo redondo MUY difuso (el borde duro rompe la voluta en bolas de
  // algodón); aparece rápido al nacer y se disuelve despacio arriba
  material.opacityNode = Fn(() => {
    const centered = uv().sub(0.5)
    const redondo = smoothstep(0.5, 0.05, centered.length()).pow(1.7)
    const nace = smoothstep(0.0, 0.05, phase)
    const muere = smoothstep(1.0, 0.45, phase)
    const variacion = h1.mul(0.5).add(0.5)
    return redondo.mul(nace).mul(muere).mul(variacion).mul(opacity)
  })()

  const mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), material, count)
  mesh.frustumCulled = false // las posiciones viven en el shader: el bounding de CPU miente
  mesh.userData.hideFromEnv = true // fuera de la captura de entorno (no se hornea en el suelo)
  mesh.renderOrder = 10 // se dibuja después de lo opaco
  scene.add(mesh)

  // el nodo `time` anima solo: no hay trabajo por frame
  return { update: () => {}, opacity, scaleMul, mesh }
}
