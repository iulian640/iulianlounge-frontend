import * as THREE from 'three'

import { botella, CARTA } from './botellas'

const acero = new THREE.MeshStandardMaterial({
  color: '#9aa0a4',
  metalness: 1,
  roughness: 0.35,
})
const laton = new THREE.MeshStandardMaterial({
  color: '#c9a45c',
  metalness: 1,
  roughness: 0.45,
})
const vidrio = new THREE.MeshPhysicalMaterial({
  color: '#e6efec',
  roughness: 0.05,
  metalness: 0,
  transparent: true,
  opacity: 0.3,
  depthWrite: false,
  clearcoat: 1,
  clearcoatRoughness: 0.08,
})
const vidrioVerde = vidrio.clone()
vidrioVerde.color.set('#9fb98a')
vidrioVerde.opacity = 0.45
const maderaTabla = new THREE.MeshStandardMaterial({ color: '#c9b891', roughness: 0.9 })
const cedro = new THREE.MeshStandardMaterial({ color: '#c2a26b', roughness: 0.85 })
const tabaco = new THREE.MeshStandardMaterial({ color: '#7d4e28', roughness: 0.9 })
const vitolaAmarilla = new THREE.MeshStandardMaterial({ color: '#d9a520', roughness: 0.6 })
const vitolaNegra = new THREE.MeshStandardMaterial({ color: '#1a1a17', roughness: 0.6 })
const limonPiel = new THREE.MeshStandardMaterial({ color: '#d9c33c', roughness: 0.75 })
const limonPulpa = new THREE.MeshStandardMaterial({ color: '#efe8b8', roughness: 1 })
const pano = new THREE.MeshStandardMaterial({ color: '#ddd2b8', roughness: 1 })

function lathe(puntos, material, segmentos = 16) {
  const mesh = new THREE.Mesh(
    new THREE.LatheGeometry(
      puntos.map(([x, y]) => new THREE.Vector2(x, y)),
      segmentos,
    ),
    material,
  )
  mesh.castShadow = true
  return mesh
}

function cilindro(rTop, rBottom, altura, material, segmentos = 14) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(rTop, rBottom, altura, segmentos),
    material,
  )
  mesh.castShadow = false
  return mesh
}

function coctelera() {
  const grupo = new THREE.Group()
  const vaso = lathe(
    [
      [0.001, 0],
      [0.04, 0.002],
      [0.052, 0.15],
    ],
    acero,
  )
  grupo.add(vaso)
  const tapa = lathe(
    [
      [0.052, 0.15],
      [0.045, 0.185],
      [0.024, 0.2],
    ],
    acero,
  )
  grupo.add(tapa)
  const capuchon = cilindro(0.02, 0.023, 0.035, acero)
  capuchon.position.y = 0.215
  grupo.add(capuchon)
  return grupo
}

function vasoMezclador() {
  const grupo = new THREE.Group()
  const vaso = cilindro(0.05, 0.042, 0.13, vidrio)
  vaso.position.y = 0.065
  vaso.castShadow = true
  grupo.add(vaso)
  const cucharilla = cilindro(0.003, 0.003, 0.22, laton, 6)
  cucharilla.position.set(0.02, 0.115, 0)
  cucharilla.rotation.z = -0.35
  grupo.add(cucharilla)
  const cabeza = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 6), laton)
  cabeza.scale.y = 0.6
  cabeza.position.set(-0.018, 0.02, 0)
  grupo.add(cabeza)
  return grupo
}

function cubitera() {
  const grupo = new THREE.Group()
  const cubo = lathe(
    [
      [0.001, 0],
      [0.065, 0.004],
      [0.07, 0.025],
      [0.095, 0.16],
    ],
    acero,
  )
  grupo.add(cubo)
  const canto = new THREE.Mesh(new THREE.TorusGeometry(0.095, 0.005, 8, 26), laton)
  canto.rotation.x = Math.PI / 2
  canto.position.y = 0.16
  grupo.add(canto)
  const hielo = new THREE.Mesh(new THREE.SphereGeometry(0.085, 12, 8), pano)
  hielo.scale.y = 0.35
  hielo.position.y = 0.15
  grupo.add(hielo)
  for (const lado of [-1, 1]) {
    const brazo = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.005, 0.2), laton)
    brazo.position.set(lado * 0.01, 0.17, 0)
    brazo.rotation.y = lado * 0.12
    grupo.add(brazo)
  }
  return grupo
}

function sifon() {
  const grupo = new THREE.Group()
  const cuerpo = lathe(
    [
      [0.001, 0],
      [0.046, 0.004],
      [0.05, 0.14],
      [0.028, 0.19],
      [0.024, 0.21],
    ],
    vidrioVerde,
  )
  grupo.add(cuerpo)
  const cabezal = cilindro(0.026, 0.028, 0.04, acero)
  cabezal.position.y = 0.228
  cabezal.castShadow = true
  grupo.add(cabezal)
  const palanca = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.006, 0.05), acero)
  palanca.position.set(0, 0.252, -0.02)
  palanca.rotation.x = 0.25
  grupo.add(palanca)
  const pico = cilindro(0.006, 0.006, 0.05, acero, 8)
  pico.position.set(0, 0.24, 0.032)
  pico.rotation.x = Math.PI / 2.6
  grupo.add(pico)
  return grupo
}

function tablaConLimones() {
  const grupo = new THREE.Group()
  const tabla = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.015, 0.14), maderaTabla)
  tabla.position.y = 0.0075
  grupo.add(tabla)
  for (const [dx, dz, rot] of [
    [-0.05, -0.02, 0.4],
    [-0.01, 0.035, 1.7],
  ]) {
    const limon = new THREE.Mesh(new THREE.SphereGeometry(0.024, 10, 8), limonPiel)
    limon.scale.set(1, 0.82, 1.15)
    limon.position.set(dx, 0.035, dz)
    limon.rotation.y = rot
    grupo.add(limon)
  }
  const mitad = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.024, 0.02, 12), limonPiel)
  mitad.position.set(0.06, 0.025, -0.025)
  grupo.add(mitad)
  const pulpa = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.019, 0.002, 12), limonPulpa)
  pulpa.position.set(0.06, 0.036, -0.025)
  grupo.add(pulpa)
  return grupo
}

function cajaAbiertaDePuros() {
  const grupo = new THREE.Group()

  const fondo = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.008, 0.13), cedro)
  fondo.position.y = 0.004
  fondo.castShadow = true
  grupo.add(fondo)
  for (const [w, d, dx, dz] of [
    [0.2, 0.008, 0, -0.061],
    [0.2, 0.008, 0, 0.061],
    [0.008, 0.114, -0.096, 0],
    [0.008, 0.114, 0.096, 0],
  ]) {
    const pared = new THREE.Mesh(new THREE.BoxGeometry(w, 0.03, d), cedro)
    pared.position.set(dx, 0.023, dz)
    grupo.add(pared)
  }

  for (let i = 0; i < 12; i++) {
    const x = -0.077 + i * 0.014
    const puro = new THREE.Mesh(new THREE.CylinderGeometry(0.0065, 0.0065, 0.112, 8), tabaco)
    puro.rotation.x = Math.PI / 2
    puro.position.set(x, 0.032, 0)
    grupo.add(puro)
    const banda = new THREE.Mesh(new THREE.CylinderGeometry(0.0072, 0.0072, 0.012, 8), vitolaNegra)
    banda.rotation.x = Math.PI / 2
    banda.position.set(x, 0.032, 0.014)
    grupo.add(banda)
  }

  const tapa = new THREE.Group()
  const tablero = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.008, 0.13), cedro)
  tablero.position.z = 0.065
  tapa.add(tablero)
  const placaNegra = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.002, 0.062), vitolaNegra)
  placaNegra.position.set(0, -0.005, 0.062)
  tapa.add(placaNegra)
  const placaAmarilla = new THREE.Mesh(new THREE.BoxGeometry(0.096, 0.002, 0.028), vitolaAmarilla)
  placaAmarilla.position.set(0, -0.006, 0.075)
  tapa.add(placaAmarilla)
  tapa.position.set(0, 0.038, -0.061)
  tapa.rotation.x = -Math.PI * 0.62
  grupo.add(tapa)

  const cierre = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.008, 0.006), laton)
  cierre.position.set(0, 0.036, 0.062)
  grupo.add(cierre)

  const suelto = new THREE.Mesh(new THREE.CylinderGeometry(0.0068, 0.0068, 0.118, 8), tabaco)
  suelto.rotation.set(Math.PI / 2, 0, 0.5)
  suelto.position.set(0.085, 0.042, 0.05)
  grupo.add(suelto)
  const bandaSuelto = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0075, 0.0075, 0.012, 8),
    vitolaAmarilla,
  )
  bandaSuelto.rotation.set(Math.PI / 2, 0, 0.5)
  bandaSuelto.position.set(0.078, 0.042, 0.036)
  grupo.add(bandaSuelto)

  return grupo
}

function panoDoblado() {
  const grupo = new THREE.Group()
  const doblez = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.008, 0.1), pano)
  doblez.position.y = 0.004
  grupo.add(doblez)
  const caida = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.05, 0.008), pano)
  caida.position.set(0, -0.02, 0.052)
  grupo.add(caida)
  return grupo
}

export function addCocktailStation(scene) {
  const grupo = new THREE.Group()
  grupo.name = 'estacion-cocteleria'
  grupo.userData.hideFromEnv = true

  const X = -8 + 0.35
  const Y = 1.03

  const coloca = (pieza, x, z, rotY = 0) => {
    pieza.position.set(x, Y, z)
    pieza.rotation.y = rotY
    grupo.add(pieza)
  }

  coloca(cubitera(), X - 0.05, -1.36)
  coloca(coctelera(), X + 0.05, -1.12, 0.6)
  coloca(vasoMezclador(), X + 0.03, -0.97, 2.1)

  const trabajo = [
    [CARTA[6], X - 0.1, -1.04, 2.9],
    [CARTA[3], X - 0.11, -0.93, 0.7],
    [CARTA[1], X - 0.04, -0.85, -1.75],
  ]
  for (const [receta, x, z, rotY] of trabajo) {
    coloca(botella(receta), x, z, rotY)
  }
  coloca(sifon(), X - 0.09, -0.72, -0.4)

  coloca(tablaConLimones(), X + 0.03, -0.42, 0.35)
  coloca(panoDoblado(), X + 0.12, -0.19, 0.9)

  const VASOS = [
    [-0.03, 0.08],
    [0.04, 0.1],
    [-0.05, 0.155],
    [0.025, 0.175],
  ]
  for (const [dx, z] of VASOS) {
    const vaso = cilindro(0.03, 0.025, 0.09, vidrio)
    vaso.position.set(X + dx, Y + 0.045, z)
    grupo.add(vaso)
  }

  const cohiba = cajaAbiertaDePuros()
  cohiba.position.set(-6.58, 1.1, 2.35)
  cohiba.scale.setScalar(1.45)
  cohiba.rotation.y = Math.PI / 2 - 0.08
  grupo.add(cohiba)

  scene.add(grupo)
  return grupo
}
