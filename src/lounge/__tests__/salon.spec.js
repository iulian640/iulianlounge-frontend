import * as THREE from 'three'
import { describe, it, expect } from 'vitest'

import { ROOM, TABLE_SPOTS, SCONCES, NICHE, LAMPS, materials, buildSalon } from '../salon'

function collectMeshes(root) {
  const meshes = []
  root.traverse((obj) => {
    if (obj.isMesh) meshes.push(obj)
  })
  return meshes
}

describe('ROOM', () => {
  it('define un salón más ancho y profundo que alto', () => {

    const { width, depth, height } = ROOM

    expect(width).toBeGreaterThan(height)
    expect(depth).toBeGreaterThan(height)
  })
})

describe('TABLE_SPOTS', () => {
  it('define tres mesas de cóctel con coordenadas x/z numéricas', () => {

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
    const mitadAncho = ROOM.width / 2

    const izquierda = NICHE.x - NICHE.width / 2
    const derecha = NICHE.x + NICHE.width / 2

    expect(izquierda).toBeGreaterThan(-mitadAncho)
    expect(derecha).toBeLessThan(mitadAncho)
  })

  it('no sobresale del techo', () => {

    const arriba = NICHE.bottom + NICHE.height

    expect(arriba).toBeLessThan(ROOM.height)
  })
})

describe('LAMPS', () => {
  it('solo dos lámparas proyectan sombra: la de la barra y la del blackjack', () => {

    const conSombra = LAMPS.filter((lamp) => lamp.shadow === true)

    expect(conSombra).toHaveLength(2)
  })

  it('pone una lámpara sobre cada mesa de cóctel de TABLE_SPOTS', () => {

    for (const [x, z] of TABLE_SPOTS) {
      const lampara = LAMPS.find((lamp) => lamp.x === x && lamp.z === z)
      expect(lampara).toBeDefined()
    }
  })

  it('añade una lámpara extra para la mesa de blackjack', () => {
    const esperadas = 2 + TABLE_SPOTS.length + 1

    const total = LAMPS.length

    expect(total).toBe(esperadas)
  })
})

describe('materials', () => {
  it('usa MeshStandardMaterial en las tablas del escenario, no Physical (coste de compilación)', () => {

    expect(materials.stageWood).toBeInstanceOf(THREE.MeshStandardMaterial)
    expect(materials.stageWood).not.toBeInstanceOf(THREE.MeshPhysicalMaterial)
  })

  it('usa MeshPhysicalMaterial con clearcoat (barniz) en el suelo y la barra', () => {

    expect(materials.woodFloor).toBeInstanceOf(THREE.MeshPhysicalMaterial)
    expect(materials.barWood).toBeInstanceOf(THREE.MeshPhysicalMaterial)
    expect(materials.woodFloor.clearcoat).toBeGreaterThan(0)
    expect(materials.barWood.clearcoat).toBeGreaterThan(0)
  })

  it('barFront es un clon satinado de barWood: comparte texturas pero cambia la laca y el color', () => {

    expect(materials.barFront).not.toBe(materials.barWood)
    expect(materials.barFront.map).toBe(materials.barWood.map)
    expect(materials.barFront.normalMap).toBe(materials.barWood.normalMap)
    expect(materials.barFront.clearcoat).toBe(0.3)
    expect(materials.barFront.clearcoatRoughness).toBe(0.8)
    expect(materials.barFront.clearcoat).not.toBe(materials.barWood.clearcoat)
    expect(materials.barFront.color.getHexString()).not.toBe(materials.barWood.color.getHexString())
  })

  it('barCabinet es un clon de barFront: comparte texturas y la laca satinada, pero no el color', () => {

    expect(materials.barCabinet).not.toBe(materials.barFront)
    expect(materials.barCabinet.map).toBe(materials.barWood.map)
    expect(materials.barCabinet.normalMap).toBe(materials.barWood.normalMap)
    expect(materials.barCabinet.clearcoat).toBe(materials.barFront.clearcoat)
    expect(materials.barCabinet.clearcoatRoughness).toBe(materials.barFront.clearcoatRoughness)
    expect(materials.barCabinet.clearcoat).not.toBe(materials.barWood.clearcoat)
    expect(materials.barCabinet.color.getHexString()).not.toBe(
      materials.barFront.color.getHexString(),
    )
  })

  it('tiraBarra es emissive y no lleva mapas (comparte programa con bulb/marquee)', () => {

    expect(materials.tiraBarra.emissiveIntensity).toBeGreaterThan(0)
    expect(materials.tiraBarra.map).toBeNull()
  })
})

describe('buildSalon', () => {
  it('cuelga de la escena un grupo llamado "el-salon"', () => {
    const scene = new THREE.Scene()

    const salon = buildSalon(scene)

    expect(salon.name).toBe('el-salon')
    expect(scene.children).toContain(salon)
  })

  it('el suelo vive solo en la capa 1 y no proyecta sombra propia', () => {
    const scene = new THREE.Scene()

    const salon = buildSalon(scene)
    const suelo = collectMeshes(salon).find((mesh) => mesh.material === materials.woodFloor)

    expect(suelo).toBeDefined()
    expect(suelo.castShadow).toBe(false)
    expect(suelo.layers.isEnabled(1)).toBe(true)
    expect(suelo.layers.isEnabled(0)).toBe(false)
  })

  it('deja la repisa baja libre: las botellas de marca las pone decor/botellas', () => {
    const scene = new THREE.Scene()

    const salon = buildSalon(scene)
    const genericas = collectMeshes(salon).filter(
      (mesh) =>
        mesh.geometry.type === 'CylinderGeometry' &&
        mesh.geometry.parameters.radiusTop === 0.05 &&
        mesh.geometry.parameters.height === 0.3,
    )

    expect(genericas).toHaveLength(0)
  })

  it('levanta siete pilastras en el frente de la barra, cada una con basa y capitel', () => {
    const scene = new THREE.Scene()

    const salon = buildSalon(scene)
    const meshes = collectMeshes(salon)
    const fustes = meshes.filter(
      (m) => m.material === materials.barFront && m.geometry.parameters.height === 0.8,
    )
    const basas = meshes.filter(
      (m) => m.material === materials.barFront && m.geometry.parameters.height === 0.12,
    )
    const capiteles = meshes.filter(
      (m) => m.material === materials.barFront && m.geometry.parameters.height === 0.08,
    )

    expect(fustes).toHaveLength(7)
    expect(basas).toHaveLength(7)
    expect(capiteles).toHaveLength(7)
  })

  it('monta una cinta de luz emissive continua bajo el vuelo de la tapa, sin sombra propia', () => {
    const scene = new THREE.Scene()

    const salon = buildSalon(scene)
    const meshes = collectMeshes(salon)
    const cintas = meshes.filter((m) => m.material === materials.tiraBarra)

    expect(cintas).toHaveLength(1)
    const [cinta] = cintas
    expect(cinta.castShadow).toBe(false)
    expect(cinta.geometry.parameters.depth).toBe(7)
    expect(cinta.position.y).toBeGreaterThan(1)
  })

  it('remata el zócalo en los dos extremos del mostrador, además del tramo corrido', () => {
    const scene = new THREE.Scene()

    const salon = buildSalon(scene)
    const zocalos = collectMeshes(salon).filter(
      (m) => m.material === materials.woodDark && m.geometry.parameters.height === 0.14,
    )

    expect(zocalos).toHaveLength(3)
  })

  it('las cajas y cilindros genéricos proyectan y reciben sombra por defecto', () => {
    const scene = new THREE.Scene()

    const salon = buildSalon(scene)
    const escenario = salon.getObjectByName('escenario')
    const tarima = escenario.children.find((child) => child.material === materials.stageWood)

    expect(tarima.castShadow).toBe(true)
    expect(tarima.receiveShadow).toBe(true)
  })

  it('sitúa la mesa de blackjack en la misma posición que su lámpara', () => {
    const scene = new THREE.Scene()

    const salon = buildSalon(scene)
    const mesa = salon.getObjectByName('mesa-blackjack')
    const lamparaBlackjack = LAMPS[LAMPS.length - 1]

    expect(lamparaBlackjack.shadow).toBe(true)
    expect(mesa.position.x).toBe(lamparaBlackjack.x)
    expect(mesa.position.z).toBe(lamparaBlackjack.z)
  })

  it('las velas de las mesas de cóctel no proyectan sombra', () => {
    const scene = new THREE.Scene()

    const salon = buildSalon(scene)
    const velas = collectMeshes(salon).filter(
      (m) => m.material === materials.bulb && m.geometry.type === 'CylinderGeometry',
    )

    expect(velas).toHaveLength(TABLE_SPOTS.length)
    expect(velas.every((vela) => vela.castShadow === false)).toBe(true)
  })

  it('coloca los apliques de pared en las posiciones y orientaciones de SCONCES', () => {
    const scene = new THREE.Scene()

    const salon = buildSalon(scene)
    const apliques = salon.children.filter((child) => child.isGroup && child.position.y === 2.2)

    expect(apliques).toHaveLength(SCONCES.length)
    for (const sconce of SCONCES) {
      const aplique = apliques.find((a) => a.position.x === sconce.x && a.position.z === sconce.z)
      expect(aplique).toBeDefined()
      expect(aplique.rotation.y).toBe(sconce.rotY)
    }
  })

  it('marca cada lámpara colgante para que no la capture el entorno reflejado', () => {
    const scene = new THREE.Scene()

    const salon = buildSalon(scene)
    const fixtures = salon.children.filter((child) => child.userData.hideFromEnv === true)

    expect(fixtures).toHaveLength(LAMPS.length)
  })

  it('la pantalla de cada lámpara colgante proyecta sombra y se ve por las dos caras', () => {
    const scene = new THREE.Scene()

    const salon = buildSalon(scene)
    const fixtures = salon.children.filter((child) => child.userData.hideFromEnv === true)
    const pantallas = fixtures.map((fixture) =>
      fixture.children.find((c) => c.material === materials.shade),
    )

    expect(pantallas.every((shade) => shade.castShadow === true)).toBe(true)
    expect(pantallas.every((shade) => shade.material.side === THREE.DoubleSide)).toBe(true)
  })

  it('el escenario lleva nombre y cinco candilejas', () => {
    const scene = new THREE.Scene()

    const salon = buildSalon(scene)
    const escenario = salon.getObjectByName('escenario')
    const candilejas = escenario.children.filter(
      (child) => child.material === materials.bulb && child.geometry.type === 'SphereGeometry',
    )

    expect(escenario).toBeDefined()
    expect(candilejas).toHaveLength(5)
  })
})
