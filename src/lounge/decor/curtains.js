import * as THREE from 'three'

import { ROOM } from '../salon'

// CORTINAS DEL ESCENARIO (referencia de Iulian 2026-07-13: telón rojo de
// teatro con pliegues verticales, cortinas laterales recogidas con borla
// dorada y el conjunto enmarcando la boca del escenario).
//
// Tres piezas procedurales, todas del mismo paño:
//  1. Telón de fondo: plano con pliegues (senos en z) del techo a la tarima.
//  2. Patas laterales: mismo paño pero ESTRANGULADO a media altura (una
//     gaussiana estrecha el ancho) y con su cordón y borla de latón.
//  3. Cenefa: tira corta de pliegues rematando la boca por arriba.
//
// Sustituye a la caja plana de terciopelo que ponía salon.js. Sin luces ni
// sombras nuevas: la bañan la barra de focos y las candilejas.

// carmesí de teatro — más vivo que el burdeos de las butacas, sigue sin
// hacer el chiste (la guasa nunca va en el estilo)
const velvet = new THREE.MeshStandardMaterial({
  color: '#8e2028',
  roughness: 0.92,
  side: THREE.DoubleSide,
})

const STAGE_X = 3.2 // centro del escenario
const STAGE_TOP = 0.43 // cota de la tarima
const FOLD_DEPTH = 0.07 // profundidad de los pliegues

/**
 * Paño con pliegues verticales. `waist` (opcional) lo estrangula a media
 * altura: {t: 0..1 altura de la pinza, pinch: ancho restante, sigma: cuánto
 * abarca}. Los pliegues se aflojan donde la tela va recogida.
 */
function curtainGeometry(width, height, folds, waist) {
  const geometry = new THREE.PlaneGeometry(width, height, 96, 16)
  const position = geometry.attributes.position
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i)
    const y = position.getY(i)
    const t = y / height + 0.5 // 0 abajo, 1 arriba

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

// cordón y borla dorados en la pinza de cada pata, como en la referencia
function tieback(x, y, z, girth) {
  const tie = new THREE.Group()

  const cord = new THREE.Mesh(new THREE.TorusGeometry(girth, 0.014, 8, 20), goldMaterial)
  cord.rotation.x = Math.PI / 2
  cord.scale.z = 0.45 // aro achatado abrazando la tela (sin clavarse en el muro)
  tie.add(cord)

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.028, 10, 8), goldMaterial)
  head.position.set(0, -0.09, girth * 0.7)
  tie.add(head)

  const skirt = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.12, 10), goldMaterial)
  skirt.position.set(0, -0.18, girth * 0.7)
  skirt.rotation.x = Math.PI // falda de la borla colgando
  tie.add(skirt)

  tie.position.set(x, y, z)
  return tie
}

/**
 * Viste el escenario con el telón de fondo, las patas laterales recogidas
 * y la cenefa. Todo paño procedural, sin luces nuevas.
 * @param {THREE.Scene} scene
 */
export function addCurtains(scene) {
  const curtains = new THREE.Group()
  curtains.name = 'cortinas-escenario'

  // telón de fondo: del techo a la tarima, pegado a la pared norte
  const backdropHeight = ROOM.height - STAGE_TOP
  const backdrop = curtain(3.9, backdropHeight, 14)
  backdrop.position.set(STAGE_X, STAGE_TOP + backdropHeight / 2, -5.2)
  curtains.add(backdrop)

  // patas laterales: CONTRA LA PARED, flanqueando el telón de fondo sin
  // solaparse (petición de Iulian: los detalles dorados pegados al muro) —
  // quedan fuera de la tarima, así que caen hasta el suelo del salón
  const legHeight = ROOM.height
  const waist = { t: 0.42, pinch: 0.42, sigma: 0.14 }
  for (const side of [-1, 1]) {
    const x = STAGE_X + side * 2.45 // el borde interior toca el canto del telón
    const leg = curtain(1.0, legHeight, 6, waist)
    leg.position.set(x, legHeight / 2, -5.18)
    curtains.add(leg)

    const tieY = legHeight * waist.t
    curtains.add(tieback(x, tieY, -5.13, 0.24))
  }

  // cenefa: tira de pliegues rematando el conjunto por arriba, cubre telón
  // y patas de canto a canto
  const valance = curtain(6.2, 0.6, 20)
  valance.position.set(STAGE_X, ROOM.height - 0.3, -5.05)
  curtains.add(valance)

  scene.add(curtains)
}
