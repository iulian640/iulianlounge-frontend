import * as THREE from 'three'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { addAshtrays } from '../decor/ashtrays'
import { addFloorLamps } from '../decor/floorLamps'
import { addHatDisplay } from '../decor/hatDisplay'
import { addStageSpots } from '../decor/stageSpots'
import { NICHE } from '../salon'

// jsdom no trae un canvas 2D de verdad (haría falta instalar el paquete npm
// "canvas", que este repo no tiene): decor/hatDisplay.js pinta el velo de
// polvo con una CanvasTexture, así que le damos un contexto 2D de mentira
// con los únicos métodos que usa. No es red ni mock de comportamiento del
// proyecto, es solo tapar un hueco de la plataforma de test.
let getContextSpy

beforeAll(() => {
  getContextSpy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation((type) => {
    if (type !== '2d') return null
    return {
      fillStyle: '#000',
      fillRect: () => {},
      beginPath: () => {},
      arc: () => {},
      fill: () => {},
    }
  })
})

afterAll(() => {
  getContextSpy.mockRestore()
})

// recorre un Object3D (escena o grupo) entero y filtra por lo que haga falta
function collect(root, predicate) {
  const found = []
  root.traverse((child) => {
    if (predicate(child)) found.push(child)
  })
  return found
}

function isEmissive(child) {
  return (
    child.isMesh &&
    child.material.emissive &&
    !child.material.emissive.equals(new THREE.Color(0, 0, 0))
  )
}

describe('decor/stageSpots — barra de focos del escenario', () => {
  it('monta exactamente 2 SpotLight reales: el presupuesto de compilación manda sobre los 9 foquitos', () => {
    // Arrange
    const scene = new THREE.Scene()

    // Act
    addStageSpots(scene)

    // Assert
    const spotLights = collect(scene, (child) => child instanceof THREE.SpotLight)
    expect(spotLights).toHaveLength(2)
  })

  it('las 2 luces reales no proyectan sombra y guardan su kind y baseIntensity', () => {
    // Arrange
    const scene = new THREE.Scene()

    // Act
    addStageSpots(scene)

    // Assert
    const spotLights = collect(scene, (child) => child instanceof THREE.SpotLight)
    for (const light of spotLights) {
      expect(light.castShadow).toBe(false)
      expect(light.userData.kind).toBe('foco')
      expect(light.userData.baseIntensity).toBe(6)
    }
  })

  it('monta 4 conos de haz de niebla marcados como haz y fuera de la captura de entorno', () => {
    // Arrange
    const scene = new THREE.Scene()

    // Act
    addStageSpots(scene)

    // Assert
    const beams = collect(scene, (child) => child.userData.haz === true)
    expect(beams).toHaveLength(4)
    for (const beam of beams) {
      expect(beam.userData.hideFromEnv).toBe(true)
    }
  })

  it('los 9 foquitos quedan fuera de la captura de entorno (presupuesto de compilación)', () => {
    // Arrange
    const scene = new THREE.Scene()

    // Act
    addStageSpots(scene)

    // Assert: el flag vive en el grupo del foquito, colgado directo de la escena
    const hidden = scene.children.filter((child) => child.userData.hideFromEnv === true)
    expect(hidden).toHaveLength(9)
  })

  it('setWidth(v) escala los conos del haz y abre el ángulo de las luces a juego', () => {
    // Arrange
    const scene = new THREE.Scene()
    const controls = addStageSpots(scene)
    const beams = collect(scene, (child) => child.userData.haz === true)
    const spotLights = collect(scene, (child) => child instanceof THREE.SpotLight)
    const anguloInicial = spotLights[0].angle

    // Act
    controls.setWidth(2)

    // Assert
    for (const beam of beams) {
      expect(beam.scale.x).toBe(2)
      expect(beam.scale.y).toBe(2)
      expect(beam.scale.z).toBe(1) // el ápice del cono, en el origen local, no se mueve
    }
    for (const light of spotLights) {
      expect(light.angle).toBeCloseTo(anguloInicial * 2)
    }
  })
})

describe('decor/ashtrays — ceniceros y puros', () => {
  it('devuelve las puntas de los puros encendidos: solo 2 de los 3 ceniceros fuman', () => {
    // Arrange
    const scene = new THREE.Scene()
    const updatables = []

    // Act
    const { tips } = addAshtrays(scene, updatables)

    // Assert
    expect(tips).toHaveLength(2)
    for (const tip of tips) expect(tip).toBeInstanceOf(THREE.Vector3)
  })

  it('coloca los 3 ceniceros fuera de la captura de entorno', () => {
    // Arrange
    const scene = new THREE.Scene()

    // Act
    addAshtrays(scene, [])

    // Assert
    const ashtrays = scene.children.filter((child) => child.name?.startsWith('cenicero-'))
    expect(ashtrays).toHaveLength(3)
    for (const ashtray of ashtrays) expect(ashtray.userData.hideFromEnv).toBe(true)
  })

  it('el cenicero de cristal es de vidrio de verdad: transparente y sin escribir en el z-buffer', () => {
    // Arrange
    const scene = new THREE.Scene()

    // Act
    addAshtrays(scene, [])

    // Assert
    const cristal = scene.children.find((child) => child.name === 'cenicero-cristal')
    const glassMeshes = collect(cristal, (child) => child.isMesh && child.material.transparent)
    expect(glassMeshes.length).toBeGreaterThan(0)
    for (const mesh of glassMeshes) expect(mesh.material.depthWrite).toBe(false)
  })

  it('registra un updatable que hace latir las brasas: llamar a update(delta) cambia su intensidad', () => {
    // Arrange
    const scene = new THREE.Scene()
    const updatables = []
    addAshtrays(scene, updatables)
    const embers = collect(scene, isEmissive)
    expect(embers).toHaveLength(2) // solo los 2 puros encendidos llevan brasa
    const antes = embers.map((ember) => ember.material.emissiveIntensity)

    // Act
    updatables[0](0.3)

    // Assert
    const despues = embers.map((ember) => ember.material.emissiveIntensity)
    expect(despues).not.toEqual(antes)
  })
})

describe('decor/hatDisplay — expositor de sombreros en el nicho', () => {
  it('encaja el expositor en el nicho del muro norte: misma x/y que NICHE en salon.js', () => {
    // Arrange
    const scene = new THREE.Scene()

    // Act
    const display = addHatDisplay(scene)

    // Assert
    expect(display.position.x).toBe(NICHE.x)
    expect(display.position.y).toBe(NICHE.bottom)
  })

  it('cubre cada balda con un velo de polvo transparente y sin escritura en el z-buffer', () => {
    // Arrange
    const scene = new THREE.Scene()

    // Act
    const display = addHatDisplay(scene)

    // Assert: una balda por nivel del mueble (4 niveles)
    const dustVeils = collect(display, (child) => child.geometry?.type === 'PlaneGeometry')
    expect(dustVeils).toHaveLength(4)
    for (const veil of dustVeils) {
      expect(veil.material.transparent).toBe(true)
      expect(veil.material.depthWrite).toBe(false)
      expect(veil.material.alphaMap).toBeInstanceOf(THREE.Texture)
    }
  })

  it('ilumina cada balda con una puntual de cornisa sin sombra, escondida tras el faldón', () => {
    // Arrange
    const scene = new THREE.Scene()

    // Act
    addHatDisplay(scene)

    // Assert
    const glows = collect(scene, (child) => child instanceof THREE.PointLight)
    expect(glows).toHaveLength(4)
    for (const glow of glows) {
      expect(glow.userData.kind).toBe('vitrina')
      expect(glow.castShadow).toBe(false)
    }
  })
})

describe('decor/floorLamps — lámparas de pie victorianas', () => {
  it('coloca 2 lámparas con su luz kind "pie", de alcance corto y sin sombra', () => {
    // Arrange
    const scene = new THREE.Scene()

    // Act
    addFloorLamps(scene)

    // Assert
    const glows = collect(scene, (child) => child instanceof THREE.PointLight)
    expect(glows).toHaveLength(2)
    for (const glow of glows) {
      expect(glow.userData.kind).toBe('pie')
      expect(glow.userData.baseIntensity).toBe(8)
      expect(glow.castShadow).toBe(false)
      expect(glow.distance).toBe(4) // corto: muere antes de cruzar la sala
    }
  })

  it('marca la lámpara entera fuera de la captura de entorno, no solo la pantalla', () => {
    // Arrange
    const scene = new THREE.Scene()

    // Act
    addFloorLamps(scene)

    // Assert
    const lamps = scene.children.filter((child) => child.name === 'lampara-pie')
    expect(lamps).toHaveLength(2)
    for (const lamp of lamps) expect(lamp.userData.hideFromEnv).toBe(true)
  })

  it('la pantalla y la bombilla son las únicas piezas emissive de la lámpara, y van hideFromEnv', () => {
    // Arrange
    const scene = new THREE.Scene()

    // Act
    addFloorLamps(scene)

    // Assert: pantalla + bombilla por cada una de las 2 lámparas
    const emissiveParts = collect(scene, isEmissive)
    expect(emissiveParts).toHaveLength(4)
    for (const part of emissiveParts) expect(part.userData.hideFromEnv).toBe(true)
  })

  it('cuelga un fleco de 36 cuentas por lámpara, sin sombra propia', () => {
    // Arrange
    const scene = new THREE.Scene()

    // Act
    addFloorLamps(scene)

    // Assert
    const lamp = scene.children.find((child) => child.name === 'lampara-pie')
    const beads = lamp.children.filter(
      (child) => child.isMesh && child.geometry.type === 'CylinderGeometry' && child.scale.y !== 1,
    )
    expect(beads).toHaveLength(36)
    for (const bead of beads) {
      expect(bead.castShadow).toBe(false)
      expect(bead.userData.hideFromEnv).toBe(true)
    }
  })
})

describe('las botellas de marca de la trasbarra (decor/botellas)', () => {
  it('puebla la repisa con las quince marcas de la carta ampliada, agotándolas todas', async () => {
    // Arrange: la carta es la fuente de verdad — si crece, este test crece con ella
    const { addBotellas, CARTA } = await import('../decor/botellas')
    const scene = new THREE.Scene()

    // Act
    const grupo = addBotellas(scene)

    // Assert: el grupo entra en escena y el lineal agota las 15 marcas de CARTA
    expect(scene.getObjectByName('botellas-reales')).toBe(grupo)
    // 42 botellas: lo que cabe en el largo real de la repisa una vez
    // recortadas las 3 puntas de cada extremo (ver addBotellas). No se
    // deriva de CARTA.length porque depende del ancho acumulado de cada
    // silueta, no del número de marcas — si este número cambia, es que
    // cambió el patrón del lineal y toca revisarlo en pantalla antes de
    // tocar la aserción.
    expect(grupo.children).toHaveLength(42)
    const marcas = new Set(grupo.children.map((botella) => botella.name))
    expect(marcas.size).toBe(CARTA.length)
    for (const receta of CARTA) {
      expect(marcas.has(receta.nombre)).toBe(true)
    }
  })

  it('el lineal nunca repite marca en dos botellas vecinas, como pidió Iulian de una barra real', async () => {
    // Arrange: el orden de inserción en el grupo sigue el recorrido de la
    // repisa de norte a sur, así que comparar vecinos consecutivos basta
    const { addBotellas } = await import('../decor/botellas')
    const scene = new THREE.Scene()

    // Act
    const grupo = addBotellas(scene)

    // Assert
    for (let i = 1; i < grupo.children.length; i++) {
      expect(grupo.children[i].name).not.toBe(grupo.children[i - 1].name)
    }
  })

  it('todas apoyan en la repisa baja y caben bajo la repisa alta', async () => {
    // Arrange
    const { addBotellas } = await import('../decor/botellas')
    const scene = new THREE.Scene()

    // Act
    const grupo = addBotellas(scene)

    // Assert: bases en la tapa de la repisa (1.575) y ninguna alcanza la
    // repisa alta (2.025); todo el lote dentro del tramo libre en z
    for (const botella of grupo.children) {
      expect(botella.position.y).toBe(1.575)
      const alto = new THREE.Box3().setFromObject(botella)
      expect(alto.max.y).toBeLessThan(2.025)
      expect(botella.position.z).toBeGreaterThan(-3.1)
      expect(botella.position.z).toBeLessThan(2.4)
    }
  })

  it('cumple la ley de materiales: vidrio con transmisión compartida, resto MeshStandard, ninguno con mapas', async () => {
    // Arrange
    const { addBotellas } = await import('../decor/botellas')
    const scene = new THREE.Scene()

    // Act
    const grupo = addBotellas(scene)
    const materiales = new Set()
    grupo.traverse((o) => {
      if (o.isMesh) materiales.add(o.material)
    })

    // Assert: pocos materiales compartidos entre muchas botellas (nunca uno
    // por instancia, que es lo que dispararía programas de shader). El
    // vidrio (2026-07-15) es MeshPhysicalMaterial con transmisión real —
    // compartido por color, igual que antes — el resto (etiquetas, tapones)
    // sigue en MeshStandard. Ninguno lleva mapas.
    expect(materiales.size).toBeLessThan(20)
    for (const material of materiales) {
      expect(material.map).toBeNull()
      if (material.type === 'MeshPhysicalMaterial') {
        expect(material.transmission).toBe(1)
      } else {
        expect(material.type).toBe('MeshStandardMaterial')
      }
    }
  })
})
