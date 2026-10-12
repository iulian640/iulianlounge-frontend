import { describe, expect, it } from 'vitest'
import * as THREE from 'three'

import { ROOM, materials } from '../salon'
import { addArchitecture } from '../decor/architecture'
import { addDoor, DOOR_DIMENSIONS } from '../decor/door'
import { addCurtains } from '../decor/curtains'

const GROSOR_MURO = 0.2

const MARGEN_SALON = GROSOR_MURO / 2

function cajaEnvolvente(objeto3d) {
  return new THREE.Box3().setFromObject(objeto3d)
}

function usaMaterialPhysical(objeto3d) {
  let encontrado = false
  objeto3d.traverse((hijo) => {
    if (hijo.isMesh && hijo.material?.isMeshPhysicalMaterial) encontrado = true
  })
  return encontrado
}

function materialesPhysicalDistintos(objeto3d) {
  const materiales = new Set()
  objeto3d.traverse((hijo) => {
    if (hijo.isMesh && hijo.material?.isMeshPhysicalMaterial) materiales.add(hijo.material)
  })
  return materiales
}

function todasLasMallas(objeto3d) {
  const mallas = []
  objeto3d.traverse((hijo) => {
    if (hijo.isMesh) mallas.push(hijo)
  })
  return mallas
}

describe('decor/architecture — addArchitecture', () => {
  it('añade a la escena un grupo llamado "arquitectura"', () => {
    const scene = new THREE.Scene()

    const architecture = addArchitecture(scene)

    expect(architecture.name).toBe('arquitectura')
    expect(scene.children).toContain(architecture)
  })

  it('monta un número de piezas positivo y estable entre dos montajes distintos', () => {
    const escenaUno = new THREE.Scene()
    const escenaDos = new THREE.Scene()

    const primero = addArchitecture(escenaUno)
    const segundo = addArchitecture(escenaDos)

    expect(primero.children.length).toBeGreaterThan(0)
    expect(segundo.children.length).toBe(primero.children.length)
  })

  it('mantiene toda la arquitectura dentro de los límites del salón (ROOM)', () => {
    const scene = new THREE.Scene()

    const architecture = addArchitecture(scene)
    const caja = cajaEnvolvente(architecture)

    expect(caja.min.x).toBeGreaterThanOrEqual(-ROOM.width / 2 - MARGEN_SALON)
    expect(caja.max.x).toBeLessThanOrEqual(ROOM.width / 2 + MARGEN_SALON)
    expect(caja.min.z).toBeGreaterThanOrEqual(-ROOM.depth / 2 - MARGEN_SALON)
    expect(caja.max.z).toBeLessThanOrEqual(ROOM.depth / 2 + MARGEN_SALON)
    expect(caja.min.y).toBeGreaterThanOrEqual(-MARGEN_SALON)
    expect(caja.max.y).toBeLessThanOrEqual(ROOM.height + MARGEN_SALON)
  })

  it('reparte las pilastras junto a la pared este en varias posiciones a lo largo del muro', () => {
    const scene = new THREE.Scene()
    const innerX = ROOM.width / 2 - GROSOR_MURO / 2

    const architecture = addArchitecture(scene)
    const pilastras = architecture.children.filter(
      (hijo) => hijo.isMesh && Math.abs(hijo.position.x - innerX) < 0.2,
    )
    const posicionesZ = new Set(pilastras.map((m) => Math.round(m.position.z * 10) / 10))

    expect(pilastras.length).toBeGreaterThan(0)
    expect(posicionesZ.size).toBeGreaterThanOrEqual(4)
  })

  it('centra la moldura de la puerta en x=0, pegada a la pared sur', () => {
    const scene = new THREE.Scene()
    const innerZ = ROOM.depth / 2 - GROSOR_MURO / 2

    const architecture = addArchitecture(scene)
    const dintel = architecture.children.find(
      (hijo) => hijo.isMesh && hijo.position.x === 0 && hijo.geometry.parameters.width > 1,
    )

    expect(dintel).toBeDefined()
    expect(dintel.position.z).toBeGreaterThan(innerZ - 0.5)
  })

  it('da sombra y la recibe en cada malla, de forma coherente en toda la arquitectura', () => {
    const scene = new THREE.Scene()

    const architecture = addArchitecture(scene)
    const mallas = todasLasMallas(architecture)

    expect(mallas.length).toBeGreaterThan(0)
    for (const malla of mallas) {
      expect(malla.castShadow).toBe(true)
      expect(malla.receiveShadow).toBe(true)
    }
  })

  it('la carpintería Physical reutiliza la instancia compartida woodTrim del salón, sin crear programas nuevos', () => {
    const scene = new THREE.Scene()

    const architecture = addArchitecture(scene)
    const materialesPhysical = materialesPhysicalDistintos(architecture)

    expect(materialesPhysical.size).toBe(1)
    expect([...materialesPhysical][0]).toBe(materials.woodTrim)
  })
})

describe('decor/door — addDoor', () => {
  it('añade a la escena un grupo llamado "puerta-entrada"', () => {
    const scene = new THREE.Scene()

    const door = addDoor(scene)

    expect(door.name).toBe('puerta-entrada')
    expect(scene.children).toContain(door)
  })

  it('sitúa la puerta centrada en x=0 y girada hacia la pared sur', () => {
    const scene = new THREE.Scene()

    const door = addDoor(scene)

    expect(door.position.x).toBe(0)
    expect(door.position.z).toBeGreaterThan(ROOM.depth / 2 - 1)
    expect(door.rotation.y).toBeCloseTo(Math.PI, 5)
  })

  it('expone las dimensiones documentadas del hueco (1.4 x 2.2, ver comentario del fuente)', () => {
    expect(DOOR_DIMENSIONS).toEqual({ width: 1.4, height: 2.2 })
  })

  it('monta la puerta a partir de cuatro conjuntos: marco, hoja, mirilla y herrajes', () => {
    const scene = new THREE.Scene()

    const door = addDoor(scene)

    expect(door.children.length).toBe(4)
    for (const conjunto of door.children) expect(conjunto.type).toBe('Group')
  })

  it('coloca la mirilla a la altura de los ojos (1.65 m), no al ras del suelo ni del techo', () => {
    const scene = new THREE.Scene()

    const door = addDoor(scene)
    const mirilla = door.children.find((hijo) => hijo.position.y > 0 && hijo.position.y < 1)

    expect(mirilla).toBeDefined()
    expect(mirilla.position.y).toBeCloseTo(1.65 - DOOR_DIMENSIONS.height / 2, 5)
  })

  it('mantiene toda la puerta dentro de los límites del salón (ROOM)', () => {
    const scene = new THREE.Scene()

    const door = addDoor(scene)
    const caja = cajaEnvolvente(door)

    expect(caja.min.x).toBeGreaterThanOrEqual(-ROOM.width / 2 - MARGEN_SALON)
    expect(caja.max.x).toBeLessThanOrEqual(ROOM.width / 2 + MARGEN_SALON)
    expect(caja.min.z).toBeGreaterThanOrEqual(-ROOM.depth / 2 - MARGEN_SALON)
    expect(caja.max.z).toBeLessThanOrEqual(ROOM.depth / 2 + MARGEN_SALON)
    expect(caja.min.y).toBeGreaterThanOrEqual(-MARGEN_SALON)
    expect(caja.max.y).toBeLessThanOrEqual(ROOM.height + MARGEN_SALON)
  })

  it('da sombra siempre, pero solo las piezas grandes (marco y hoja) la reciben también', () => {
    const scene = new THREE.Scene()

    const door = addDoor(scene)
    const mallas = todasLasMallas(door)
    const piezasGrandes = mallas.filter((m) => m.geometry.type === 'BoxGeometry')
    const remaches = mallas.filter((m) => m.geometry.type === 'CylinderGeometry')

    expect(piezasGrandes.length).toBeGreaterThan(0)
    expect(remaches.length).toBeGreaterThan(0)
    for (const pieza of piezasGrandes) {
      expect(pieza.castShadow).toBe(true)
      expect(pieza.receiveShadow).toBe(true)
    }
    for (const remache of remaches) {
      expect(remache.castShadow).toBe(true)
      expect(remache.receiveShadow).toBe(false)
    }
  })

  it('la carpintería Physical (hoja y trampilla de la mirilla) reutiliza la instancia compartida woodTrim, sin crear programas nuevos', () => {
    const scene = new THREE.Scene()

    const door = addDoor(scene)
    const materialesPhysical = materialesPhysicalDistintos(door)

    expect(materialesPhysical.size).toBe(1)
    expect([...materialesPhysical][0]).toBe(materials.woodTrim)
  })
})

describe('decor/curtains — addCurtains', () => {
  it('añade a la escena un grupo llamado "cortinas-escenario"', () => {
    const scene = new THREE.Scene()

    addCurtains(scene)
    const cortinas = scene.getObjectByName('cortinas-escenario')

    expect(cortinas).toBeDefined()
    expect(scene.children).toContain(cortinas)
  })

  it('monta un número de piezas positivo y estable entre dos montajes distintos', () => {
    const escenaUno = new THREE.Scene()
    const escenaDos = new THREE.Scene()

    addCurtains(escenaUno)
    addCurtains(escenaDos)
    const primero = escenaUno.getObjectByName('cortinas-escenario')
    const segundo = escenaDos.getObjectByName('cortinas-escenario')

    expect(primero.children.length).toBeGreaterThan(0)
    expect(segundo.children.length).toBe(primero.children.length)
  })

  it('cuelga el telón de fondo contra la pared norte, del techo a la tarima', () => {
    const scene = new THREE.Scene()

    addCurtains(scene)
    const cortinas = scene.getObjectByName('cortinas-escenario')
    const [backdrop] = cortinas.children

    expect(backdrop.position.z).toBeLessThan(-ROOM.depth / 2 + 1)
    expect(backdrop.position.y + backdrop.geometry.parameters.height / 2).toBeCloseTo(
      ROOM.height,
      1,
    )
  })

  it('las patas laterales caen del suelo al techo (fuera de la tarima)', () => {
    const scene = new THREE.Scene()

    addCurtains(scene)
    const cortinas = scene.getObjectByName('cortinas-escenario')
    const patas = cortinas.children.filter(
      (hijo) => hijo.isMesh && hijo.geometry.parameters.height === ROOM.height,
    )

    expect(patas.length).toBe(2)
    for (const pata of patas) {
      expect(pata.position.y - pata.geometry.parameters.height / 2).toBeCloseTo(0, 1)
      expect(pata.position.y + pata.geometry.parameters.height / 2).toBeCloseTo(ROOM.height, 1)
    }
    const [x1, x2] = patas.map((p) => p.position.x).sort((a, b) => a - b)
    expect(x1).toBeLessThan(x2)
  })

  it('cada pata lleva su cordón y borla dorados (tieback), uno por lado', () => {
    const scene = new THREE.Scene()

    addCurtains(scene)
    const cortinas = scene.getObjectByName('cortinas-escenario')
    const tiebacks = cortinas.children.filter((hijo) => hijo.type === 'Group')

    expect(tiebacks.length).toBe(2)
    for (const tieback of tiebacks) {
      expect(tieback.children.length).toBe(3)
    }
  })

  it('mantiene todas las cortinas dentro de los límites del salón (ROOM)', () => {
    const scene = new THREE.Scene()

    addCurtains(scene)
    const cortinas = scene.getObjectByName('cortinas-escenario')
    const caja = cajaEnvolvente(cortinas)

    expect(caja.min.x).toBeGreaterThanOrEqual(-ROOM.width / 2 - MARGEN_SALON)
    expect(caja.max.x).toBeLessThanOrEqual(ROOM.width / 2 + MARGEN_SALON)
    expect(caja.min.z).toBeGreaterThanOrEqual(-ROOM.depth / 2 - MARGEN_SALON)
    expect(caja.max.z).toBeLessThanOrEqual(ROOM.depth / 2 + MARGEN_SALON)
    expect(caja.min.y).toBeGreaterThanOrEqual(-MARGEN_SALON)
    expect(caja.max.y).toBeLessThanOrEqual(ROOM.height + MARGEN_SALON)
  })

  it('el paño de terciopelo recibe sombra pero no proyecta ninguna nueva (la bañan focos y candilejas)', () => {
    const scene = new THREE.Scene()

    addCurtains(scene)
    const cortinas = scene.getObjectByName('cortinas-escenario')
    const paños = cortinas.children.filter((hijo) => hijo.isMesh)

    expect(paños.length).toBeGreaterThan(0)
    for (const paño of paños) {
      expect(paño.receiveShadow).toBe(true)
      expect(paño.castShadow).toBe(false)
    }
  })

  it('no usa MeshPhysicalMaterial (el terciopelo es mate: Physical solo donde hay laca o cristal que lo pague)', () => {
    const scene = new THREE.Scene()

    addCurtains(scene)
    const cortinas = scene.getObjectByName('cortinas-escenario')

    expect(usaMaterialPhysical(cortinas)).toBe(false)
  })
})
