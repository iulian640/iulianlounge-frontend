import * as THREE from 'three'

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

function coupe() {
  return lathe(
    [
      [0.04, 0],
      [0.042, 0.015],
      [0.028, 0.045],
      [0.006, 0.055],
      [0.006, 0.115],
      [0.03, 0.125],
      [0.03, 0.128],
    ],
    cristal,
  )
}

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

export function addRepisaAlta(scene) {
  const grupo = new THREE.Group()
  grupo.name = 'repisa-alta'
  grupo.userData.hideFromEnv = true

  const X = -8 + 0.35
  const Y = 2.075

  const coloca = (pieza, z, rotY = 0, dx = 0) => {
    pieza.position.set(X + dx, Y, z)
    pieza.rotation.y = rotY
    grupo.add(pieza)
  }

  coloca(licorera(), -2.52, 0.4)
  coloca(licorera(), 2.06, -0.7)

  const BLOQUES = [
    { pieza: coupe, unidades: 6, paso: 0.115 },
    { pieza: copaMartini, unidades: 5, paso: 0.13 },
    { pieza: lowball, unidades: 6, paso: 0.085 },
  ]
  let z = -2.28
  let bloque = 0
  let n = 0
  while (true) {
    const { pieza, unidades, paso } = BLOQUES[bloque % BLOQUES.length]
    if (z + unidades * paso > 1.9) break
    for (let i = 0; i < unidades; i++) {
      coloca(pieza(), z + i * paso, 0, (((n * 13) % 5) - 2) * 0.007)
      n++
    }
    z += unidades * paso + 0.12
    bloque++
  }

  scene.add(grupo)
  return grupo
}
