import * as THREE from 'three'

// LA REPISA ALTA DE LA TRASBARRA (decisión de Iulian, 2026-07-14): fuera el
// alcohol — cristalería de punta a punta, boca abajo como escurre en un bar
// de verdad. Las cajas de puros bajaron a la encimera de trabajo
// (decor/cocktailStation.js). Todo procedural y determinista.
//
// Leyes de rendimiento: cero luces, cero programas nuevos — el vidrio
// comparte variante con el cristal de los ceniceros. Piezas menudas:
// hideFromEnv.

// vidrio de cristalería: misma familia (y programa) que el de los ceniceros
// (exportado: el panel de afinado le da mandos — carpeta 'Vasos')
// mezcla de Iulian (2026-07-14, panel 'Vasos'): vidrio esmerilado y
// presente — opacidad alta y pulido al tope del mando, reflejo suave
export const cristal = new THREE.MeshPhysicalMaterial({
  color: '#e9f0ea',
  roughness: 0.4,
  metalness: 0,
  transparent: true,
  opacity: 0.8,
  depthWrite: false,
  clearcoat: 1,
  clearcoatRoughness: 0.18,
})

function lathe(puntos, material, segmentos = 14) {
  const mesh = new THREE.Mesh(
    new THREE.LatheGeometry(
      puntos.map(([x, y]) => new THREE.Vector2(x, y)),
      segmentos,
    ),
    material,
  )
  mesh.castShadow = false
  return mesh
}

// coupe de champán boca abajo (como escurren en las baldas de los bares)
function coupe() {
  return lathe(
    [
      [0.04, 0], // boca apoyada en la balda
      [0.042, 0.015],
      [0.028, 0.045],
      [0.006, 0.055],
      [0.006, 0.115],
      [0.03, 0.125], // el pie, arriba del todo
      [0.03, 0.128],
    ],
    cristal,
  )
}

// copa de cóctel (el cono martini), también boca abajo
function copaMartini() {
  return lathe(
    [
      [0.048, 0],
      [0.05, 0.008],
      [0.006, 0.07],
      [0.006, 0.125],
      [0.028, 0.135],
      [0.028, 0.138],
    ],
    cristal,
  )
}

// vaso lowball boca abajo
function lowball() {
  return lathe(
    [
      [0.032, 0],
      [0.034, 0.002],
      [0.03, 0.085],
      [0.028, 0.088],
    ],
    cristal,
  )
}

// licorera panzuda con tapón facetado, la pieza de presumir (de pie)
function licorera() {
  const grupo = new THREE.Group()
  const cuerpo = lathe(
    [
      [0.001, 0],
      [0.045, 0.004],
      [0.058, 0.05],
      [0.04, 0.11],
      [0.014, 0.14],
      [0.014, 0.19],
      [0.02, 0.195],
    ],
    cristal,
  )
  cuerpo.castShadow = true
  grupo.add(cuerpo)
  const tapon = new THREE.Mesh(new THREE.SphereGeometry(0.024, 8, 6), cristal)
  tapon.position.y = 0.215
  grupo.add(tapon)
  return grupo
}

/**
 * Monta la repisa alta de la trasbarra: cristalería de punta a punta, en
 * bloques por tipo que se van alternando (coupes, martinis, lowballs) con
 * una licorera de pie en cada extremo como remate. Geometría compartida con
 * salon.js: balda a y=2.05 (tapa de 0.05 → bases en 2.075), x del mueble
 * backX, puntas despejadas como en la balda de botellas.
 */
export function addRepisaAlta(scene) {
  const grupo = new THREE.Group()
  grupo.name = 'repisa-alta'
  grupo.userData.hideFromEnv = true // piezas menudas: fuera de la captura

  const X = -8 + 0.35 // centro del mueble de la trasbarra (= backX de salon.js)
  const Y = 2.075

  const coloca = (pieza, z, rotY = 0, dx = 0) => {
    pieza.position.set(X + dx, Y, z)
    pieza.rotation.y = rotY
    grupo.add(pieza)
  }

  // las licoreras rematan los extremos, de pie entre tanta copa boca abajo
  coloca(licorera(), -2.52, 0.4)
  coloca(licorera(), 2.06, -0.7)

  // el resto: bloques de copas alternándose hasta llenar la balda, cada
  // tipo con su paso propio y descuadres deterministas (sin escuadra)
  const BLOQUES = [
    { pieza: coupe, unidades: 6, paso: 0.115 },
    { pieza: copaMartini, unidades: 5, paso: 0.13 },
    { pieza: lowball, unidades: 6, paso: 0.085 },
  ]
  let z = -2.28 // tras la licorera norte
  let bloque = 0
  let n = 0
  while (true) {
    const { pieza, unidades, paso } = BLOQUES[bloque % BLOQUES.length]
    if (z + unidades * paso > 1.9) break // la licorera sur cierra la balda
    for (let i = 0; i < unidades; i++) {
      coloca(pieza(), z + i * paso, 0, (((n * 13) % 5) - 2) * 0.007)
      n++
    }
    z += unidades * paso + 0.12 // un respiro entre bloque y bloque
    bloque++
  }

  scene.add(grupo)
  return grupo
}
