import { describe, expect, it } from 'vitest'
import * as THREE from 'three'

import { ROOM, materials } from '../salon'
import { addArchitecture } from '../decor/architecture'
import { addDoor, DOOR_DIMENSIONS } from '../decor/door'
import { addCurtains } from '../decor/curtains'

// grosor de muro documentado en los comentarios de architecture.js y
// door.js (WALL_THICKNESS = 0.2, "= t en buildShell() de salon.js")
const GROSOR_MURO = 0.2

// margen de tolerancia para comparar contra los límites de ROOM: en
// salon.js los muros están centrados en +-ROOM/2, así que su cara exterior
// sobresale medio grosor de muro más allá de esa cota (p.ej. capiteles de
// pilastra pegados a la cara interior del muro este)
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

// distintas INSTANCIAS de MeshPhysicalMaterial presentes en el objeto (por
// identidad, no por valor): sirve para comprobar que un decorado no crea su
// propio material Physical, sino que reutiliza el compartido de salon.js
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
    // Arrange
    const scene = new THREE.Scene()

    // Act
    const architecture = addArchitecture(scene)

    // Assert
    expect(architecture.name).toBe('arquitectura')
    expect(scene.children).toContain(architecture)
  })

  it('monta un número de piezas positivo y estable entre dos montajes distintos', () => {
    // Arrange
    const escenaUno = new THREE.Scene()
    const escenaDos = new THREE.Scene()

    // Act
    const primero = addArchitecture(escenaUno)
    const segundo = addArchitecture(escenaDos)

    // Assert
    expect(primero.children.length).toBeGreaterThan(0)
    expect(segundo.children.length).toBe(primero.children.length)
  })

  it('mantiene toda la arquitectura dentro de los límites del salón (ROOM)', () => {
    // Arrange
    const scene = new THREE.Scene()

    // Act
    const architecture = addArchitecture(scene)
    const caja = cajaEnvolvente(architecture)

    // Assert
    expect(caja.min.x).toBeGreaterThanOrEqual(-ROOM.width / 2 - MARGEN_SALON)
    expect(caja.max.x).toBeLessThanOrEqual(ROOM.width / 2 + MARGEN_SALON)
    expect(caja.min.z).toBeGreaterThanOrEqual(-ROOM.depth / 2 - MARGEN_SALON)
    expect(caja.max.z).toBeLessThanOrEqual(ROOM.depth / 2 + MARGEN_SALON)
    expect(caja.min.y).toBeGreaterThanOrEqual(-MARGEN_SALON)
    expect(caja.max.y).toBeLessThanOrEqual(ROOM.height + MARGEN_SALON)
  })

  it('reparte las pilastras junto a la pared este en varias posiciones a lo largo del muro', () => {
    // Arrange
    const scene = new THREE.Scene()
    const innerX = ROOM.width / 2 - GROSOR_MURO / 2 // cara interior del muro este

    // Act
    const architecture = addArchitecture(scene)
    const pilastras = architecture.children.filter(
      (hijo) => hijo.isMesh && Math.abs(hijo.position.x - innerX) < 0.2,
    )
    const posicionesZ = new Set(pilastras.map((m) => Math.round(m.position.z * 10) / 10))

    // Assert
    expect(pilastras.length).toBeGreaterThan(0)
    expect(posicionesZ.size).toBeGreaterThanOrEqual(4)
  })

  it('centra la moldura de la puerta en x=0, pegada a la pared sur', () => {
    // Arrange
    const scene = new THREE.Scene()
    const innerZ = ROOM.depth / 2 - GROSOR_MURO / 2 // cara interior del muro sur

    // Act
    const architecture = addArchitecture(scene)
    // el dintel es la única pieza ancha (más de 1 m) centrada en x=0 con
    // material woodTrim, a la altura del hueco de la puerta
    const dintel = architecture.children.find(
      (hijo) => hijo.isMesh && hijo.position.x === 0 && hijo.geometry.parameters.width > 1,
    )

    // Assert
    expect(dintel).toBeDefined()
    expect(dintel.position.z).toBeGreaterThan(innerZ - 0.5)
  })

  it('da sombra y la recibe en cada malla, de forma coherente en toda la arquitectura', () => {
    // Arrange
    const scene = new THREE.Scene()

    // Act
    const architecture = addArchitecture(scene)
    const mallas = todasLasMallas(architecture)

    // Assert
    expect(mallas.length).toBeGreaterThan(0)
    for (const malla of mallas) {
      expect(malla.castShadow).toBe(true)
      expect(malla.receiveShadow).toBe(true)
    }
  })

  it('la carpintería Physical reutiliza la instancia compartida woodTrim del salón, sin crear programas nuevos', () => {
    // Arrange
    const scene = new THREE.Scene()

    // Act: cornisa, pilastras, zócalo y moldura de la puerta pintan en
    // woodTrim, que ascendió a MeshPhysicalMaterial con laca en la pasada de
    // brillos (2026-07-14) — la ley que YA NO aplica es "Physical reservado a
    // laca y cristal"; la que sigue viva es de rendimiento (ver
    // docs/leyes-de-rendimiento.md): cero programas Physical nuevos
    const architecture = addArchitecture(scene)
    const materialesPhysical = materialesPhysicalDistintos(architecture)

    // Assert: una única instancia Physical en toda la arquitectura, y es
    // justo la misma referencia que exporta salon.js — si architecture.js
    // instanciara su propio Physical (aunque fuera con los mismos números),
    // el arranque compilaría un programa de shader extra
    expect(materialesPhysical.size).toBe(1)
    expect([...materialesPhysical][0]).toBe(materials.woodTrim)
  })
})

describe('decor/door — addDoor', () => {
  it('añade a la escena un grupo llamado "puerta-entrada"', () => {
    // Arrange
    const scene = new THREE.Scene()

    // Act
    const door = addDoor(scene)

    // Assert
    expect(door.name).toBe('puerta-entrada')
    expect(scene.children).toContain(door)
  })

  it('sitúa la puerta centrada en x=0 y girada hacia la pared sur', () => {
    // Arrange
    const scene = new THREE.Scene()

    // Act
    const door = addDoor(scene)

    // Assert: el hueco de la puerta lo abre buildShell() en la pared sur
    // (z = ROOM.depth / 2); la hoja gira 180° para que sus detalles miren
    // hacia dentro del salón (ver comentario de addDoor en el fuente)
    expect(door.position.x).toBe(0)
    expect(door.position.z).toBeGreaterThan(ROOM.depth / 2 - 1)
    expect(door.rotation.y).toBeCloseTo(Math.PI, 5)
  })

  it('expone las dimensiones documentadas del hueco (1.4 x 2.2, ver comentario del fuente)', () => {
    // Assert
    expect(DOOR_DIMENSIONS).toEqual({ width: 1.4, height: 2.2 })
  })

  it('monta la puerta a partir de cuatro conjuntos: marco, hoja, mirilla y herrajes', () => {
    // Arrange
    const scene = new THREE.Scene()

    // Act
    const door = addDoor(scene)

    // Assert
    expect(door.children.length).toBe(4)
    for (const conjunto of door.children) expect(conjunto.type).toBe('Group')
  })

  it('coloca la mirilla a la altura de los ojos (1.65 m), no al ras del suelo ni del techo', () => {
    // Arrange
    const scene = new THREE.Scene()

    // Act
    const door = addDoor(scene)
    // la mirilla es el único conjunto con un hijo de nombre 'CylinderGeometry'
    // pequeño (el pomito) posicionado cerca del centro de la hoja: se
    // localiza por ser el conjunto cuya y local no es ni 0 ni negativa grande
    const mirilla = door.children.find((hijo) => hijo.position.y > 0 && hijo.position.y < 1)

    // Assert
    expect(mirilla).toBeDefined()
    expect(mirilla.position.y).toBeCloseTo(1.65 - DOOR_DIMENSIONS.height / 2, 5)
  })

  it('mantiene toda la puerta dentro de los límites del salón (ROOM)', () => {
    // Arrange
    const scene = new THREE.Scene()

    // Act
    const door = addDoor(scene)
    const caja = cajaEnvolvente(door)

    // Assert
    expect(caja.min.x).toBeGreaterThanOrEqual(-ROOM.width / 2 - MARGEN_SALON)
    expect(caja.max.x).toBeLessThanOrEqual(ROOM.width / 2 + MARGEN_SALON)
    expect(caja.min.z).toBeGreaterThanOrEqual(-ROOM.depth / 2 - MARGEN_SALON)
    expect(caja.max.z).toBeLessThanOrEqual(ROOM.depth / 2 + MARGEN_SALON)
    expect(caja.min.y).toBeGreaterThanOrEqual(-MARGEN_SALON)
    expect(caja.max.y).toBeLessThanOrEqual(ROOM.height + MARGEN_SALON)
  })

  it('da sombra siempre, pero solo las piezas grandes (marco y hoja) la reciben también', () => {
    // Arrange
    const scene = new THREE.Scene()

    // Act
    const door = addDoor(scene)
    const mallas = todasLasMallas(door)
    const piezasGrandes = mallas.filter((m) => m.geometry.type === 'BoxGeometry')
    const remaches = mallas.filter((m) => m.geometry.type === 'CylinderGeometry')

    // Assert: las piezas cilíndricas (remaches, tirador y pomito, montadas
    // con stud() en el fuente) solo proyectan sombra, no la reciben —
    // detalle demasiado pequeño para que importe
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
    // Arrange
    const scene = new THREE.Scene()

    // Act: la hoja y la trampilla de la mirilla pintan en woodTrim (Physical
    // desde la pasada de brillos 2026-07-14); marco, remaches y herrajes
    // siguen en brass (Standard) — door.js no instancia su propio Physical,
    // importa `materials` de salon.js y pinta con esa misma referencia
    const door = addDoor(scene)
    const materialesPhysical = materialesPhysicalDistintos(door)

    // Assert: una única instancia Physical, y es la misma que woodTrim en
    // salon.js — identidad, no solo mismos valores, para pillar el día que
    // alguien clone el material en vez de reutilizarlo
    expect(materialesPhysical.size).toBe(1)
    expect([...materialesPhysical][0]).toBe(materials.woodTrim)
  })
})

describe('decor/curtains — addCurtains', () => {
  it('añade a la escena un grupo llamado "cortinas-escenario"', () => {
    // Arrange
    const scene = new THREE.Scene()

    // Act: addCurtains no devuelve el grupo, a diferencia de addArchitecture
    // y addDoor — hay que ir a buscarlo a la escena
    addCurtains(scene)
    const cortinas = scene.getObjectByName('cortinas-escenario')

    // Assert
    expect(cortinas).toBeDefined()
    expect(scene.children).toContain(cortinas)
  })

  it('monta un número de piezas positivo y estable entre dos montajes distintos', () => {
    // Arrange
    const escenaUno = new THREE.Scene()
    const escenaDos = new THREE.Scene()

    // Act
    addCurtains(escenaUno)
    addCurtains(escenaDos)
    const primero = escenaUno.getObjectByName('cortinas-escenario')
    const segundo = escenaDos.getObjectByName('cortinas-escenario')

    // Assert
    expect(primero.children.length).toBeGreaterThan(0)
    expect(segundo.children.length).toBe(primero.children.length)
  })

  it('cuelga el telón de fondo contra la pared norte, del techo a la tarima', () => {
    // Arrange
    const scene = new THREE.Scene()

    // Act
    addCurtains(scene)
    const cortinas = scene.getObjectByName('cortinas-escenario')
    const [backdrop] = cortinas.children

    // Assert: pared norte = z negativa, cerca de -ROOM.depth / 2
    expect(backdrop.position.z).toBeLessThan(-ROOM.depth / 2 + 1)
    // el borde superior del telón llega hasta el techo
    expect(backdrop.position.y + backdrop.geometry.parameters.height / 2).toBeCloseTo(
      ROOM.height,
      1,
    )
  })

  it('las patas laterales caen del suelo al techo (fuera de la tarima)', () => {
    // Arrange
    const scene = new THREE.Scene()

    // Act
    addCurtains(scene)
    const cortinas = scene.getObjectByName('cortinas-escenario')
    const patas = cortinas.children.filter(
      (hijo) => hijo.isMesh && hijo.geometry.parameters.height === ROOM.height,
    )

    // Assert: dos patas, una a cada lado del escenario, tocando suelo y techo
    expect(patas.length).toBe(2)
    for (const pata of patas) {
      expect(pata.position.y - pata.geometry.parameters.height / 2).toBeCloseTo(0, 1)
      expect(pata.position.y + pata.geometry.parameters.height / 2).toBeCloseTo(ROOM.height, 1)
    }
    // simétricas respecto al centro del escenario
    const [x1, x2] = patas.map((p) => p.position.x).sort((a, b) => a - b)
    expect(x1).toBeLessThan(x2)
  })

  it('cada pata lleva su cordón y borla dorados (tieback), uno por lado', () => {
    // Arrange
    const scene = new THREE.Scene()

    // Act
    addCurtains(scene)
    const cortinas = scene.getObjectByName('cortinas-escenario')
    const tiebacks = cortinas.children.filter((hijo) => hijo.type === 'Group')

    // Assert
    expect(tiebacks.length).toBe(2)
    for (const tieback of tiebacks) {
      // cordón (torus) + borla en dos piezas (esfera + cono)
      expect(tieback.children.length).toBe(3)
    }
  })

  it('mantiene todas las cortinas dentro de los límites del salón (ROOM)', () => {
    // Arrange
    const scene = new THREE.Scene()

    // Act
    addCurtains(scene)
    const cortinas = scene.getObjectByName('cortinas-escenario')
    const caja = cajaEnvolvente(cortinas)

    // Assert
    expect(caja.min.x).toBeGreaterThanOrEqual(-ROOM.width / 2 - MARGEN_SALON)
    expect(caja.max.x).toBeLessThanOrEqual(ROOM.width / 2 + MARGEN_SALON)
    expect(caja.min.z).toBeGreaterThanOrEqual(-ROOM.depth / 2 - MARGEN_SALON)
    expect(caja.max.z).toBeLessThanOrEqual(ROOM.depth / 2 + MARGEN_SALON)
    expect(caja.min.y).toBeGreaterThanOrEqual(-MARGEN_SALON)
    expect(caja.max.y).toBeLessThanOrEqual(ROOM.height + MARGEN_SALON)
  })

  it('el paño de terciopelo recibe sombra pero no proyecta ninguna nueva (la bañan focos y candilejas)', () => {
    // Arrange
    const scene = new THREE.Scene()

    // Act
    addCurtains(scene)
    const cortinas = scene.getObjectByName('cortinas-escenario')
    const paños = cortinas.children.filter((hijo) => hijo.isMesh)

    // Assert
    expect(paños.length).toBeGreaterThan(0)
    for (const paño of paños) {
      expect(paño.receiveShadow).toBe(true)
      expect(paño.castShadow).toBe(false)
    }
  })

  it('no usa MeshPhysicalMaterial (el terciopelo es mate: Physical solo donde hay laca o cristal que lo pague)', () => {
    // Arrange
    const scene = new THREE.Scene()

    // Act
    addCurtains(scene)
    const cortinas = scene.getObjectByName('cortinas-escenario')

    // Assert
    expect(usaMaterialPhysical(cortinas)).toBe(false)
  })
})
