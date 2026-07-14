import * as THREE from 'three'
import { describe, it, expect } from 'vitest'

import { ROOM, TABLE_SPOTS, SCONCES, NICHE, LAMPS, materials, buildSalon } from '../salon'

// Recorre la escena y devuelve solo las mallas (Mesh), ignorando grupos.
// Lo usan varios tests de buildSalon para hacer el "censo" de objetos.
function collectMeshes(root) {
  const meshes = []
  root.traverse((obj) => {
    if (obj.isMesh) meshes.push(obj)
  })
  return meshes
}

describe('ROOM', () => {
  it('define un salón más ancho y profundo que alto', () => {
    // Arrange
    // (ROOM es una constante ya definida, no hay nada que montar)

    // Act
    const { width, depth, height } = ROOM

    // Assert
    expect(width).toBeGreaterThan(height)
    expect(depth).toBeGreaterThan(height)
  })
})

describe('TABLE_SPOTS', () => {
  it('define tres mesas de cóctel con coordenadas x/z numéricas', () => {
    // Arrange & Act
    // (TABLE_SPOTS ya viene definido, solo lo leemos)

    // Assert
    expect(TABLE_SPOTS).toHaveLength(3)
    for (const spot of TABLE_SPOTS) {
      expect(spot).toHaveLength(2)
      expect(typeof spot[0]).toBe('number')
      expect(typeof spot[1]).toBe('number')
    }
  })
})

describe('SCONCES', () => {
  it('define cuatro apliques de pared con posición y orientación', () => {
    // Arrange & Act
    // (SCONCES ya viene definido, solo lo leemos)

    // Assert
    expect(SCONCES).toHaveLength(4)
    for (const sconce of SCONCES) {
      expect(typeof sconce.x).toBe('number')
      expect(typeof sconce.z).toBe('number')
      expect(typeof sconce.rotY).toBe('number')
    }
  })
})

describe('NICHE', () => {
  it('cabe dentro de la pared norte sin salirse por los lados', () => {
    // Arrange
    const mitadAncho = ROOM.width / 2

    // Act
    const izquierda = NICHE.x - NICHE.width / 2
    const derecha = NICHE.x + NICHE.width / 2

    // Assert
    expect(izquierda).toBeGreaterThan(-mitadAncho)
    expect(derecha).toBeLessThan(mitadAncho)
  })

  it('no sobresale del techo', () => {
    // Arrange
    // (NICHE ya viene definido)

    // Act
    const arriba = NICHE.bottom + NICHE.height

    // Assert
    expect(arriba).toBeLessThan(ROOM.height)
  })
})

describe('LAMPS', () => {
  it('solo dos lámparas proyectan sombra: la de la barra y la del blackjack', () => {
    // Arrange
    // (LAMPS ya viene definido)

    // Act
    const conSombra = LAMPS.filter((lamp) => lamp.shadow === true)

    // Assert
    expect(conSombra).toHaveLength(2)
  })

  it('pone una lámpara sobre cada mesa de cóctel de TABLE_SPOTS', () => {
    // Arrange & Act
    // (recorremos TABLE_SPOTS y buscamos su lámpara correspondiente)

    // Assert
    for (const [x, z] of TABLE_SPOTS) {
      const lampara = LAMPS.find((lamp) => lamp.x === x && lamp.z === z)
      expect(lampara).toBeDefined()
    }
  })

  it('añade una lámpara extra para la mesa de blackjack', () => {
    // Arrange
    // barra (2 lámparas) + una por mesa de cóctel + una del blackjack
    const esperadas = 2 + TABLE_SPOTS.length + 1

    // Act
    const total = LAMPS.length

    // Assert
    expect(total).toBe(esperadas)
  })
})

describe('materials', () => {
  it('usa MeshStandardMaterial en las tablas del escenario, no Physical (coste de compilación)', () => {
    // Arrange & Act
    // (los materiales ya están construidos al importar el módulo)

    // Assert
    expect(materials.stageWood).toBeInstanceOf(THREE.MeshStandardMaterial)
    expect(materials.stageWood).not.toBeInstanceOf(THREE.MeshPhysicalMaterial)
  })

  it('usa MeshPhysicalMaterial con clearcoat (barniz) en el suelo y la barra', () => {
    // Arrange & Act
    // (los materiales ya están construidos al importar el módulo)

    // Assert
    expect(materials.woodFloor).toBeInstanceOf(THREE.MeshPhysicalMaterial)
    expect(materials.barWood).toBeInstanceOf(THREE.MeshPhysicalMaterial)
    expect(materials.woodFloor.clearcoat).toBeGreaterThan(0)
    expect(materials.barWood.clearcoat).toBeGreaterThan(0)
  })

  it('woodPanel es un clon de woodTrim: comparte texturas pero no el color', () => {
    // Arrange & Act
    // (woodPanel se clona de woodTrim al cargar el módulo)

    // Assert
    expect(materials.woodPanel).not.toBe(materials.woodTrim)
    expect(materials.woodPanel.map).toBe(materials.woodTrim.map)
    expect(materials.woodPanel.normalMap).toBe(materials.woodTrim.normalMap)
    expect(materials.woodPanel.color.getHexString()).not.toBe(
      materials.woodTrim.color.getHexString(),
    )
  })

  it('tiraBarra es emissive y no lleva mapas (comparte programa con bulb/marquee)', () => {
    // Arrange & Act
    // (materials.tiraBarra ya está construido)

    // Assert
    expect(materials.tiraBarra.emissiveIntensity).toBeGreaterThan(0)
    expect(materials.tiraBarra.map).toBeNull()
  })
})

describe('buildSalon', () => {
  it('cuelga de la escena un grupo llamado "el-salon"', () => {
    // Arrange
    const scene = new THREE.Scene()

    // Act
    const salon = buildSalon(scene)

    // Assert
    expect(salon.name).toBe('el-salon')
    expect(scene.children).toContain(salon)
  })

  it('el suelo vive solo en la capa 1 y no proyecta sombra propia', () => {
    // Arrange
    const scene = new THREE.Scene()

    // Act
    const salon = buildSalon(scene)
    const suelo = collectMeshes(salon).find((mesh) => mesh.material === materials.woodFloor)

    // Assert
    expect(suelo).toBeDefined()
    expect(suelo.castShadow).toBe(false)
    expect(suelo.layers.isEnabled(1)).toBe(true)
    expect(suelo.layers.isEnabled(0)).toBe(false)
  })

  it('deja la repisa baja libre: las botellas de marca las pone decor/botellas', () => {
    // Arrange
    const scene = new THREE.Scene()

    // Act: el salón ya no fabrica botellas genéricas (cilindros de 0.05×0.3)
    const salon = buildSalon(scene)
    const genericas = collectMeshes(salon).filter(
      (mesh) =>
        mesh.geometry.type === 'CylinderGeometry' &&
        mesh.geometry.parameters.radiusTop === 0.05 &&
        mesh.geometry.parameters.height === 0.3,
    )

    // Assert
    expect(genericas).toHaveLength(0)
  })

  it('levanta siete pilastras en el frente de la barra, cada una con basa y capitel', () => {
    // Arrange
    const scene = new THREE.Scene()

    // Act
    const salon = buildSalon(scene)
    const meshes = collectMeshes(salon)
    // fuste, basa y capitel son cajas de woodTrim con una altura propia y
    // exclusiva dentro del fichero (0.8, 0.12 y 0.08 respectivamente)
    const fustes = meshes.filter(
      (m) => m.material === materials.woodTrim && m.geometry.parameters.height === 0.8,
    )
    const basas = meshes.filter(
      (m) => m.material === materials.woodTrim && m.geometry.parameters.height === 0.12,
    )
    const capiteles = meshes.filter(
      (m) => m.material === materials.woodTrim && m.geometry.parameters.height === 0.08,
    )

    // Assert
    expect(fustes).toHaveLength(7)
    expect(basas).toHaveLength(7)
    expect(capiteles).toHaveLength(7)
  })

  it('monta una cinta de luz emissive continua bajo el vuelo de la tapa, sin sombra propia', () => {
    // Arrange
    const scene = new THREE.Scene()

    // Act
    const salon = buildSalon(scene)
    const meshes = collectMeshes(salon)
    const cintas = meshes.filter((m) => m.material === materials.tiraBarra)

    // Assert: UNA cinta corrida de punta a punta, escondida bajo el vuelo
    // (dirección de arte: la luz nace en la barra y cae por los paneles)
    expect(cintas).toHaveLength(1)
    const [cinta] = cintas
    expect(cinta.castShadow).toBe(false)
    expect(cinta.geometry.parameters.depth).toBe(7) // de punta a punta de la barra
    expect(cinta.position.y).toBeGreaterThan(1) // bajo la tapa, no al pie
  })

  it('remata el zócalo en los dos extremos del mostrador, además del tramo corrido', () => {
    // Arrange
    const scene = new THREE.Scene()

    // Act
    const salon = buildSalon(scene)
    // el zócalo (altura 0.14, woodDark) va una vez corrido a lo largo de
    // toda la barra y una vez más en cada uno de los dos extremos: 1 + 2
    const zocalos = collectMeshes(salon).filter(
      (m) => m.material === materials.woodDark && m.geometry.parameters.height === 0.14,
    )

    // Assert
    expect(zocalos).toHaveLength(3)
  })

  it('las cajas y cilindros genéricos proyectan y reciben sombra por defecto', () => {
    // Arrange
    const scene = new THREE.Scene()

    // Act
    const salon = buildSalon(scene)
    const escenario = salon.getObjectByName('escenario')
    const tarima = escenario.children.find((child) => child.material === materials.stageWood)

    // Assert
    expect(tarima.castShadow).toBe(true)
    expect(tarima.receiveShadow).toBe(true)
  })

  it('sitúa la mesa de blackjack en la misma posición que su lámpara', () => {
    // Arrange
    const scene = new THREE.Scene()

    // Act
    const salon = buildSalon(scene)
    const mesa = salon.getObjectByName('mesa-blackjack')
    // la lámpara del blackjack es la última del array LAMPS (la que se
    // añade tras las de la barra y las de las mesas de cóctel)
    const lamparaBlackjack = LAMPS[LAMPS.length - 1]

    // Assert
    expect(lamparaBlackjack.shadow).toBe(true)
    expect(mesa.position.x).toBe(lamparaBlackjack.x)
    expect(mesa.position.z).toBe(lamparaBlackjack.z)
  })

  it('las velas de las mesas de cóctel no proyectan sombra', () => {
    // Arrange
    const scene = new THREE.Scene()

    // Act
    const salon = buildSalon(scene)
    // el material bulb también lo usan las bombillas (esferas); filtramos
    // por geometría de cilindro para quedarnos solo con las velas
    const velas = collectMeshes(salon).filter(
      (m) => m.material === materials.bulb && m.geometry.type === 'CylinderGeometry',
    )

    // Assert
    expect(velas).toHaveLength(TABLE_SPOTS.length)
    expect(velas.every((vela) => vela.castShadow === false)).toBe(true)
  })

  it('coloca los apliques de pared en las posiciones y orientaciones de SCONCES', () => {
    // Arrange
    const scene = new THREE.Scene()

    // Act
    const salon = buildSalon(scene)
    // los apliques son los únicos grupos colgados a la altura 2.2
    const apliques = salon.children.filter((child) => child.isGroup && child.position.y === 2.2)

    // Assert
    expect(apliques).toHaveLength(SCONCES.length)
    for (const sconce of SCONCES) {
      const aplique = apliques.find((a) => a.position.x === sconce.x && a.position.z === sconce.z)
      expect(aplique).toBeDefined()
      expect(aplique.rotation.y).toBe(sconce.rotY)
    }
  })

  it('marca cada lámpara colgante para que no la capture el entorno reflejado', () => {
    // Arrange
    const scene = new THREE.Scene()

    // Act
    const salon = buildSalon(scene)
    const fixtures = salon.children.filter((child) => child.userData.hideFromEnv === true)

    // Assert
    expect(fixtures).toHaveLength(LAMPS.length)
  })

  it('la pantalla de cada lámpara colgante proyecta sombra y se ve por las dos caras', () => {
    // Arrange
    const scene = new THREE.Scene()

    // Act
    const salon = buildSalon(scene)
    const fixtures = salon.children.filter((child) => child.userData.hideFromEnv === true)
    const pantallas = fixtures.map((fixture) =>
      fixture.children.find((c) => c.material === materials.shade),
    )

    // Assert
    expect(pantallas.every((shade) => shade.castShadow === true)).toBe(true)
    expect(pantallas.every((shade) => shade.material.side === THREE.DoubleSide)).toBe(true)
  })

  it('el escenario lleva nombre y cinco candilejas', () => {
    // Arrange
    const scene = new THREE.Scene()

    // Act
    const salon = buildSalon(scene)
    const escenario = salon.getObjectByName('escenario')
    const candilejas = escenario.children.filter(
      (child) => child.material === materials.bulb && child.geometry.type === 'SphereGeometry',
    )

    // Assert
    expect(escenario).toBeDefined()
    expect(candilejas).toHaveLength(5)
  })
})
