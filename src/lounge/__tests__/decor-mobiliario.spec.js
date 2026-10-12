import * as THREE from 'three'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { addAshtrays } from '../decor/ashtrays'
import { addFloorLamps } from '../decor/floorLamps'
import { addHatDisplay } from '../decor/hatDisplay'
import { addStageSpots } from '../decor/stageSpots'
import { NICHE } from '../salon'

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
    const scene = new THREE.Scene()

    addStageSpots(scene)

    const spotLights = collect(scene, (child) => child instanceof THREE.SpotLight)
    expect(spotLights).toHaveLength(2)
  })

  it('las 2 luces reales no proyectan sombra y guardan su kind y baseIntensity', () => {
    const scene = new THREE.Scene()

    addStageSpots(scene)

    const spotLights = collect(scene, (child) => child instanceof THREE.SpotLight)
    for (const light of spotLights) {
      expect(light.castShadow).toBe(false)
      expect(light.userData.kind).toBe('foco')
      expect(light.userData.baseIntensity).toBe(6)
    }
  })

  it('monta 4 conos de haz de niebla marcados como haz y fuera de la captura de entorno', () => {
    const scene = new THREE.Scene()

    addStageSpots(scene)

    const beams = collect(scene, (child) => child.userData.haz === true)
    expect(beams).toHaveLength(4)
    for (const beam of beams) {
      expect(beam.userData.hideFromEnv).toBe(true)
    }
  })

  it('los 9 foquitos quedan fuera de la captura de entorno (presupuesto de compilación)', () => {
    const scene = new THREE.Scene()

    addStageSpots(scene)

    const hidden = scene.children.filter((child) => child.userData.hideFromEnv === true)
    expect(hidden).toHaveLength(9)
  })

  it('setWidth(v) escala los conos del haz y abre el ángulo de las luces a juego', () => {
    const scene = new THREE.Scene()
    const controls = addStageSpots(scene)
    const beams = collect(scene, (child) => child.userData.haz === true)
    const spotLights = collect(scene, (child) => child instanceof THREE.SpotLight)
    const anguloInicial = spotLights[0].angle

    controls.setWidth(2)

    for (const beam of beams) {
      expect(beam.scale.x).toBe(2)
      expect(beam.scale.y).toBe(2)
      expect(beam.scale.z).toBe(1)
    }
    for (const light of spotLights) {
      expect(light.angle).toBeCloseTo(anguloInicial * 2)
    }
  })
})

describe('decor/ashtrays — ceniceros y puros', () => {
  it('devuelve las puntas de los puros encendidos: solo 2 de los 3 ceniceros fuman', () => {
    const scene = new THREE.Scene()
    const updatables = []

    const { tips } = addAshtrays(scene, updatables)

    expect(tips).toHaveLength(2)
    for (const tip of tips) expect(tip).toBeInstanceOf(THREE.Vector3)
  })

  it('coloca los 3 ceniceros fuera de la captura de entorno', () => {
    const scene = new THREE.Scene()

    addAshtrays(scene, [])

    const ashtrays = scene.children.filter((child) => child.name?.startsWith('cenicero-'))
    expect(ashtrays).toHaveLength(3)
    for (const ashtray of ashtrays) expect(ashtray.userData.hideFromEnv).toBe(true)
  })

  it('el cenicero de cristal es de vidrio de verdad: transparente y sin escribir en el z-buffer', () => {
    const scene = new THREE.Scene()

    addAshtrays(scene, [])

    const cristal = scene.children.find((child) => child.name === 'cenicero-cristal')
    const glassMeshes = collect(cristal, (child) => child.isMesh && child.material.transparent)
    expect(glassMeshes.length).toBeGreaterThan(0)
    for (const mesh of glassMeshes) expect(mesh.material.depthWrite).toBe(false)
  })

  it('registra un updatable que hace latir las brasas: llamar a update(delta) cambia su intensidad', () => {
    const scene = new THREE.Scene()
    const updatables = []
    addAshtrays(scene, updatables)
    const embers = collect(scene, isEmissive)
    expect(embers).toHaveLength(2)
    const antes = embers.map((ember) => ember.material.emissiveIntensity)

    updatables[0](0.3)

    const despues = embers.map((ember) => ember.material.emissiveIntensity)
    expect(despues).not.toEqual(antes)
  })
})

describe('decor/hatDisplay — expositor de sombreros en el nicho', () => {
  it('encaja el expositor en el nicho del muro norte: misma x/y que NICHE en salon.js', () => {
    const scene = new THREE.Scene()

    const display = addHatDisplay(scene)

    expect(display.position.x).toBe(NICHE.x)
    expect(display.position.y).toBe(NICHE.bottom)
  })

  it('cubre cada balda con un velo de polvo transparente y sin escritura en el z-buffer', () => {
    const scene = new THREE.Scene()

    const display = addHatDisplay(scene)

    const dustVeils = collect(display, (child) => child.geometry?.type === 'PlaneGeometry')
    expect(dustVeils).toHaveLength(4)
    for (const veil of dustVeils) {
      expect(veil.material.transparent).toBe(true)
      expect(veil.material.depthWrite).toBe(false)
      expect(veil.material.alphaMap).toBeInstanceOf(THREE.Texture)
    }
  })

  it('ilumina cada balda con una puntual de cornisa sin sombra, escondida tras el faldón', () => {
    const scene = new THREE.Scene()

    addHatDisplay(scene)

    const glows = collect(scene, (child) => child instanceof THREE.PointLight)
    expect(glows).toHaveLength(4)
    for (const glow of glows) {
      expect(glow.userData.kind).toBe('vitrina')
      expect(glow.castShadow).toBe(false)
    }
  })
})

describe('decor/floorLamps — lámparas de pie victorianas', () => {
  it('coloca 4 lámparas (una por esquina) con su luz kind "pie", de alcance corto y sin sombra', () => {
    const scene = new THREE.Scene()

    addFloorLamps(scene)

    const glows = collect(scene, (child) => child instanceof THREE.PointLight)
    expect(glows).toHaveLength(4)
    for (const glow of glows) {
      expect(glow.userData.kind).toBe('pie')
      expect(glow.userData.baseIntensity).toBe(8)
      expect(glow.castShadow).toBe(false)
      expect(glow.distance).toBe(4)
    }
  })

  it('marca la lámpara entera fuera de la captura de entorno, no solo la pantalla', () => {
    const scene = new THREE.Scene()

    addFloorLamps(scene)

    const lamps = scene.children.filter((child) => child.name === 'lampara-pie')
    expect(lamps).toHaveLength(4)
    for (const lamp of lamps) expect(lamp.userData.hideFromEnv).toBe(true)
  })

  it('la pantalla y la bombilla son las únicas piezas emissive de la lámpara, y van hideFromEnv', () => {
    const scene = new THREE.Scene()

    addFloorLamps(scene)

    const emissiveParts = collect(scene, isEmissive)
    expect(emissiveParts).toHaveLength(8)
    for (const part of emissiveParts) expect(part.userData.hideFromEnv).toBe(true)
  })

  it('cuelga un fleco de 36 cuentas por lámpara, sin sombra propia', () => {
    const scene = new THREE.Scene()

    addFloorLamps(scene)

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
    const { addBotellas, CARTA } = await import('../decor/botellas')
    const scene = new THREE.Scene()

    const grupo = addBotellas(scene)

    expect(scene.getObjectByName('botellas-reales')).toBe(grupo)
    expect(grupo.children).toHaveLength(42)
    const marcas = new Set(grupo.children.map((botella) => botella.name))
    expect(marcas.size).toBe(CARTA.length)
    for (const receta of CARTA) {
      expect(marcas.has(receta.nombre)).toBe(true)
    }
  })

  it('el lineal nunca repite marca en dos botellas vecinas, como en una barra real', async () => {
    const { addBotellas } = await import('../decor/botellas')
    const scene = new THREE.Scene()

    const grupo = addBotellas(scene)

    for (let i = 1; i < grupo.children.length; i++) {
      expect(grupo.children[i].name).not.toBe(grupo.children[i - 1].name)
    }
  })

  it('todas apoyan en la repisa baja y caben bajo la repisa alta', async () => {
    const { addBotellas } = await import('../decor/botellas')
    const scene = new THREE.Scene()

    const grupo = addBotellas(scene)

    for (const botella of grupo.children) {
      expect(botella.position.y).toBe(1.575)
      const alto = new THREE.Box3().setFromObject(botella)
      expect(alto.max.y).toBeLessThan(2.025)
      expect(botella.position.z).toBeGreaterThan(-3.1)
      expect(botella.position.z).toBeLessThan(2.4)
    }
  })

  it('cumple la ley de materiales: MeshStandard sin mapas en todas las piezas', async () => {
    const { addBotellas } = await import('../decor/botellas')
    const scene = new THREE.Scene()

    const grupo = addBotellas(scene)
    const materiales = new Set()
    grupo.traverse((o) => {
      if (o.isMesh) materiales.add(o.material)
    })

    expect(materiales.size).toBeLessThan(20)
    for (const material of materiales) {
      expect(material.type).toBe('MeshStandardMaterial')
      expect(material.map).toBeNull()
    }
  })
})
