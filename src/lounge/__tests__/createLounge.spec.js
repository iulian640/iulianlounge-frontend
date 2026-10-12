import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as THREE from 'three'

import { createLounge } from '../createLounge'
import { createWalkControls } from '../walkControls'
import { BLACKJACK_TABLE, SEAT_POSE } from '../blackjackLayout'
import { stubCanvasContext } from './canvasStub'
import { addAshtrays } from '../decor/ashtrays'
import { addCurtains } from '../decor/curtains'
import { addFloorLamps } from '../decor/floorLamps'
import { addSmoke } from '../decor/smoke'
import { addStageSpots } from '../decor/stageSpots'

const mocks = vi.hoisted(() => ({
  isWebGPU: true,
  setSize: vi.fn(),
  setPixelRatio: vi.fn(),
  rendererDispose: vi.fn(),
  deviceDestroy: vi.fn(),
  pipelineRender: vi.fn(),
  panelDestroy: vi.fn(),
  unlock: vi.fn(),
  fsr1: vi.fn(() => ({ add: vi.fn(() => ({})) })),
}))

vi.mock('three', async (importOriginal) => {
  const actual = await importOriginal()

  class WebGPURenderer {
    constructor(params) {
      this.params = params
      this.shadowMap = { enabled: false, type: null, autoUpdate: true, needsUpdate: false }
      this.toneMapping = null
      this.toneMappingExposure = 1
      this.lighting = null
      this.setSize = mocks.setSize
      this.setPixelRatio = mocks.setPixelRatio
      this.dispose = mocks.rendererDispose
      this.backend = { isWebGPUBackend: false, device: { destroy: mocks.deviceDestroy } }
    }
    async init() {
      this.backend.isWebGPUBackend = mocks.isWebGPU
    }
  }

  class RenderPipeline {
    constructor() {
      this.outputNode = null
      this.render = mocks.pipelineRender
    }
  }

  class CubeCamera extends actual.Object3D {
    constructor() {
      super()
      this.update = vi.fn()
    }
  }

  class CubeRenderTarget {
    constructor() {
      this.texture = {}
    }
  }

  return { ...actual, WebGPURenderer, RenderPipeline, CubeCamera, CubeRenderTarget }
})

vi.mock('three/tsl', () => ({
  pass: vi.fn(() => ({
    setMRT: vi.fn(),
    getTextureNode: vi.fn(() => ({ add: vi.fn(() => ({})) })),
    compileAsync: vi.fn(async () => {}),
    setResolutionScale: vi.fn(),
  })),
  mrt: vi.fn(() => ({})),
  output: {},
  emissive: {},
}))

vi.mock('three/addons/tsl/display/BloomNode.js', () => ({
  bloom: vi.fn(() => ({ resolutionScale: 0 })),
}))

vi.mock('three/addons/tsl/display/FSR1Node.js', () => ({
  fsr1: mocks.fsr1,
}))

vi.mock('three/addons/lighting/DynamicLighting.js', () => ({
  DynamicLighting: class {},
}))

vi.mock('three/addons/libs/stats.module.js', () => ({
  default: class {
    constructor() {
      this.dom = document.createElement('div')
      this.dom.className = 'stats-falso'
      this.update = vi.fn()
    }
  },
}))

vi.mock('../salon', () => ({
  buildSalon: vi.fn(),
  materials: {},
  ROOM: { width: 16, depth: 11, height: 3.6 },
}))

vi.mock('../lights', async () => {
  const three = await vi.importActual('three')
  return {
    addSalonLights: vi.fn((scene) => {
      const lamp = new three.SpotLight()
      lamp.castShadow = true
      lamp.userData.kind = 'lamp'
      scene.add(lamp, lamp.target)
      const shelf = new three.PointLight()
      shelf.intensity = 1.35
      shelf.userData.kind = 'shelf'
      scene.add(shelf)
    }),
  }
})

vi.mock('../furnish', () => ({
  furnishSalon: vi.fn(async () => {}),
}))

vi.mock('../letrero', async () => {
  const three = await vi.importActual('three')
  return {
    addLetrero: vi.fn(async (scene) => {
      const bulb = new three.Mesh(
        new three.BoxGeometry(0.1, 0.1, 0.1),
        new three.MeshStandardMaterial({ emissive: '#e8cd8f', emissiveIntensity: 2.2 }),
      )
      bulb.name = 'letrero-bombillas'
      scene.add(bulb)
    }),
  }
})

vi.mock('../walkControls', () => ({
  createWalkControls: vi.fn(() => ({
    controls: { unlock: mocks.unlock, enabled: true },
    update: vi.fn(),
    releaseKeys: vi.fn(),
    dispose: vi.fn(),
  })),
}))

vi.mock('../decor/architecture', () => ({ addArchitecture: vi.fn() }))
vi.mock('../decor/door', () => ({ addDoor: vi.fn() }))
vi.mock('../decor/hatDisplay', () => ({ addHatDisplay: vi.fn() }))

vi.mock('../decor/ashtrays', () => ({
  addAshtrays: vi.fn(() => ({ tips: [{}] })),
}))

vi.mock('../decor/floorLamps', async () => {
  const three = await vi.importActual('three')
  return {
    addFloorLamps: vi.fn((scene) => {
      const beam = new three.Mesh(new three.ConeGeometry(0.3, 1, 8), new three.MeshBasicMaterial())
      beam.userData.haz = true
      scene.add(beam)
      const shade = new three.Mesh(
        new three.BoxGeometry(0.2, 0.2, 0.2),
        new three.MeshStandardMaterial(),
      )
      shade.userData.hideFromEnv = true
      scene.add(shade)
    }),
  }
})

vi.mock('../decor/stageSpots', () => ({ addStageSpots: vi.fn(() => ({})) }))
vi.mock('../decor/curtains', () => ({ addCurtains: vi.fn() }))
vi.mock('../decor/smoke', () => ({
  addSmoke: vi.fn(() => ({ update: vi.fn() })),
}))

vi.mock('../tuningPanel', () => ({
  createTuningPanel: vi.fn(() => ({ destroy: mocks.panelDestroy })),
}))

const disposers = []

async function runLounge({ webgpu = true, signal, onNearBarman, onNearTable } = {}) {
  mocks.isWebGPU = webgpu
  const canvas = document.createElement('canvas')
  const onProgress = vi.fn()
  const onQualityBusy = vi.fn()
  const pending = createLounge(
    canvas,
    onProgress,
    onQualityBusy,
    signal,
    onNearBarman,
    onNearTable,
  )

  await new Promise((resolve) => setTimeout(resolve, 0))

  THREE.DefaultLoadingManager.onProgress?.('x', 0, 0)
  THREE.DefaultLoadingManager.onProgress?.('x', 3, 10)

  THREE.DefaultLoadingManager.onLoad?.()

  const api = await pending
  disposers.push(api.dispose)
  return { api, onProgress, onQualityBusy }
}

describe('createLounge', () => {
  let canvasStub

  beforeEach(() => {
    canvasStub = stubCanvasContext()
    vi.clearAllMocks()
    mocks.isWebGPU = true
    Object.defineProperty(window, 'devicePixelRatio', {
      value: 2,
      configurable: true,
      writable: true,
    })
    window.history.replaceState({}, '', '/')
    delete window.__lounge
    delete window.__loungeTiming
    delete window.__loungeBackend
    THREE.DefaultLoadingManager.onLoad = undefined
    THREE.DefaultLoadingManager.onProgress = undefined
  })

  afterEach(() => {
    for (const dispose of disposers.splice(0)) dispose()
    vi.unstubAllEnvs()
    canvasStub.spy.mockRestore()
    delete window.matchMedia
  })

  it('en desarrollo cuelga el contador de FPS y dispose() lo retira', async () => {
    vi.stubEnv('DEV', true)

    const { api } = await runLounge()

    expect(document.querySelector('.stats-falso')).not.toBeNull()

    api.dispose()

    expect(document.querySelector('.stats-falso')).toBeNull()
  })

  it('fuera de desarrollo no cuelga el contador de FPS', async () => {
    vi.stubEnv('DEV', false)

    await runLounge()

    expect(document.querySelector('.stats-falso')).toBeNull()
  })

  it('en el respaldo WebGL2 pone la escena a dieta: sin sombras, sin haces y a resolución nativa', async () => {
    await runLounge({ webgpu: false })

    const scene = window.__lounge.scene
    let lucesConSombra = 0
    let hacesVisibles = 0
    scene.traverse((o) => {
      if (o.isLight && o.castShadow) lucesConSombra += 1
      if (o.userData.haz && o.visible) hacesVisibles += 1
    })
    expect(lucesConSombra).toBe(0)
    expect(hacesVisibles).toBe(0)
    expect(mocks.setPixelRatio).toHaveBeenLastCalledWith(1)
    expect(window.__lounge.renderer.shadowMap.enabled).toBe(false)
    expect(window.__loungeBackend).toBe('WebGL2 (fallback)')
  })

  it('con WebGPU conserva sombras y haces, sube la resolución y captura el entorno', async () => {
    await runLounge({ webgpu: true })

    const scene = window.__lounge.scene
    let lucesConSombra = 0
    let hacesVisibles = 0
    scene.traverse((o) => {
      if (o.isLight && o.castShadow) lucesConSombra += 1
      if (o.userData.haz && o.visible) hacesVisibles += 1
    })
    expect(lucesConSombra).toBeGreaterThan(0)
    expect(hacesVisibles).toBeGreaterThan(0)
    expect(mocks.setPixelRatio).toHaveBeenLastCalledWith(1.4)
    expect(window.__lounge.renderer.shadowMap.enabled).toBe(true)
    expect(window.__loungeBackend).toBe('WebGPU')
    expect(scene.environment).toBeTruthy()
    expect(scene.environmentIntensity).toBe(0.65)
  })

  it('restaura los emissives y la trasbarra que se apagaron solo durante la captura', async () => {
    await runLounge({ webgpu: true })

    const scene = window.__lounge.scene
    const bombillas = scene.getObjectByName('letrero-bombillas')
    expect(bombillas.visible).toBe(true)
    let intensidadTrasbarra = null
    scene.traverse((o) => {
      if (o.userData.kind === 'shelf') intensidadTrasbarra = o.intensity
    })
    expect(intensidadTrasbarra).toBe(1.35)
  })

  it('dispose() es idempotente, destruye el GPUDevice y quita los listeners', async () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener')
    const { api } = await runLounge()

    api.dispose()
    api.dispose()

    expect(mocks.rendererDispose).toHaveBeenCalledTimes(1)
    expect(mocks.deviceDestroy).toHaveBeenCalledTimes(1)
    expect(mocks.panelDestroy).toHaveBeenCalledTimes(1)
    expect(removeSpy).toHaveBeenCalledWith('resize', expect.any(Function))
    expect(removeSpy).toHaveBeenCalledWith('pagehide', expect.any(Function))
    removeSpy.mockRestore()
  })

  it('abortado mientras carga devuelve null, libera la GPU y no arranca el bucle ni los listeners', async () => {
    const addSpy = vi.spyOn(window, 'addEventListener')
    const controller = new AbortController()
    const pending = createLounge(document.createElement('canvas'), vi.fn(), vi.fn(), controller.signal)
    await new Promise((resolve) => setTimeout(resolve, 0))

    controller.abort()
    THREE.DefaultLoadingManager.onLoad?.()
    const result = await pending

    expect(result).toBeNull()
    expect(mocks.rendererDispose).toHaveBeenCalledTimes(1)
    expect(mocks.deviceDestroy).toHaveBeenCalledTimes(1)
    expect(addSpy).not.toHaveBeenCalledWith('resize', expect.any(Function))
    expect(window.__loungeTiming).toBeUndefined()
    addSpy.mockRestore()
  })

  it('abortado antes de que arranque el renderer también libera la GPU', async () => {
    const controller = new AbortController()
    const pending = createLounge(document.createElement('canvas'), vi.fn(), vi.fn(), controller.signal)

    controller.abort()

    await expect(pending).resolves.toBeNull()
    expect(mocks.rendererDispose).toHaveBeenCalledTimes(1)
    expect(mocks.deviceDestroy).toHaveBeenCalledTimes(1)
  })

  it('abortar con el lounge ya montado equivale a dispose()', async () => {
    const controller = new AbortController()
    await runLounge({ signal: controller.signal })

    controller.abort()

    expect(mocks.rendererDispose).toHaveBeenCalledTimes(1)
    expect(mocks.deviceDestroy).toHaveBeenCalledTimes(1)
  })

  it('onProgress avanza sin retroceder y llega a 1', async () => {
    const { onProgress } = await runLounge()

    const valores = onProgress.mock.calls.map(([v]) => v)
    expect(valores.length).toBeGreaterThan(0)
    expect(Math.max(...valores)).toBe(1)
    expect(valores.at(-1)).toBe(1)
    for (const v of valores) {
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(1)
    }
    for (let i = 1; i < valores.length; i += 1) {
      expect(valores[i]).toBeGreaterThanOrEqual(valores[i - 1])
    }
  })

  it('publica window.__loungeTiming con los cuatro tramos y el total', async () => {
    await runLounge()

    const tiempos = window.__loungeTiming
    expect(tiempos).toBeDefined()
    for (const tramo of ['assets', 'reflejos', 'compilacion', 'barrida', 'total']) {
      expect(typeof tiempos[tramo]).toBe('number')
    }
  })

  it('al redimensionar la ventana reajusta la cámara y el renderer', async () => {
    await runLounge()
    const llamadasPrevias = mocks.setSize.mock.calls.length

    window.dispatchEvent(new Event('resize'))

    expect(mocks.setSize.mock.calls.length).toBe(llamadasPrevias + 1)
  })

  it('con ?sin=... omite las piezas de decor marcadas para la bisección de arranque', async () => {
    window.history.replaceState({}, '', '/?sin=cortinas,focos,lamparas,ceniceros,humo')

    await runLounge()

    expect(addFloorLamps).not.toHaveBeenCalled()
    expect(addStageSpots).not.toHaveBeenCalled()
    expect(addCurtains).not.toHaveBeenCalled()
    expect(addAshtrays).not.toHaveBeenCalled()
    expect(addSmoke).not.toHaveBeenCalled()
  })

  it('cambiar entre alta y media no baja el visillo: es solo un resize, sin grafo nuevo', async () => {
    const { onQualityBusy } = await runLounge({ webgpu: true })

    await window.__lounge.setQuality('media')

    expect(onQualityBusy).not.toHaveBeenCalled()
    expect(mocks.setPixelRatio).toHaveBeenLastCalledWith(1.25)
  })

  it('repetir la calidad que ya está puesta no hace nada (ni visillo ni resize)', async () => {
    const { onQualityBusy } = await runLounge({ webgpu: true })
    const resizesPrevios = mocks.setPixelRatio.mock.calls.length

    await window.__lounge.setQuality('alta')

    expect(onQualityBusy).not.toHaveBeenCalled()
    expect(mocks.setPixelRatio.mock.calls.length).toBe(resizesPrevios)
  })

  it('pisar baja en WebGPU baja el visillo, estrena el grafo FSR y lo vuelve a subir', async () => {
    const { onQualityBusy } = await runLounge({ webgpu: true })

    await window.__lounge.setQuality('baja')

    expect(onQualityBusy.mock.calls.map(([busy]) => busy)).toEqual([true, false])
    expect(mocks.fsr1).toHaveBeenCalledTimes(1)
  })

  it('volver de baja a alta pasa otra vez por el visillo pero reutiliza el nodo FSR', async () => {
    const { onQualityBusy } = await runLounge({ webgpu: true })
    await window.__lounge.setQuality('baja')
    onQualityBusy.mockClear()

    await window.__lounge.setQuality('alta')

    expect(onQualityBusy.mock.calls.map(([busy]) => busy)).toEqual([true, false])
    expect(mocks.fsr1).toHaveBeenCalledTimes(1)
  })

  it('en el respaldo WebGL2 el cambio de calidad nunca baja el visillo (no hay grafo FSR)', async () => {
    const { onQualityBusy } = await runLounge({ webgpu: false })

    await window.__lounge.setQuality('alta')
    await window.__lounge.setQuality('baja')

    expect(onQualityBusy).not.toHaveBeenCalled()
    expect(mocks.fsr1).not.toHaveBeenCalled()
  })

  it('reports when the camera comes within reach of the barman and when it walks away', async () => {
    const onNearBarman = vi.fn()
    await runLounge({ onNearBarman })
    const { camera } = window.__lounge

    camera.position.set(-5, 1.7, 0.4)
    await vi.waitFor(() => expect(onNearBarman).toHaveBeenLastCalledWith(true))
    camera.position.set(0, 1.7, 4.6)
    await vi.waitFor(() => expect(onNearBarman).toHaveBeenLastCalledWith(false))

    expect(onNearBarman).toHaveBeenCalledTimes(2)
  })

  it('does not require a proximity callback', async () => {
    await runLounge()
    const { camera } = window.__lounge

    camera.position.set(-5, 1.7, 0.4)

    await expect(new Promise((resolve) => setTimeout(resolve, 50))).resolves.toBeUndefined()
  })

  it('exposes releasePointer to give the mouse back to the page', async () => {
    const { api } = await runLounge()

    api.releasePointer()

    expect(mocks.unlock).toHaveBeenCalledTimes(1)
  })
  describe('blackjack table', () => {
    function stubReducedMotion(matches) {
      Object.defineProperty(window, 'matchMedia', {
        value: () => ({ matches }),
        configurable: true,
        writable: true,
      })
    }

    function lastWalk() {
      return vi.mocked(createWalkControls).mock.results.at(-1).value
    }

    function visibleCards(scene) {
      const cards = []
      scene.traverse((o) => {
        if (o.userData.isCard && o.visible && o.name === 'blackjack-card') cards.push(o)
      })
      return cards
    }

    it('adds the card table to the scene', async () => {
      await runLounge()

      expect(window.__lounge.scene.getObjectByName('blackjack-table-cards')).toBeDefined()
      expect(window.__lounge.scene.getObjectByName('blackjack-shoe')).toBeDefined()
    })

    it('keeps the card meshes out of the receiveShadow unification and leaves the rest in', async () => {
      await runLounge()

      const cards = []
      const others = []
      window.__lounge.scene.traverse((o) => {
        if (!o.isMesh) return
        if (o.userData.isCard) cards.push(o)
        else others.push(o)
      })

      expect(cards.length).toBeGreaterThan(0)
      expect(others.length).toBeGreaterThan(0)
      expect(cards.some((mesh) => mesh.receiveShadow || mesh.castShadow)).toBe(false)
      expect(others.every((mesh) => mesh.receiveShadow)).toBe(true)
    })

    it('hides the parked pool once the warm-up is over and keeps the shoe visible', async () => {
      await runLounge()

      expect(visibleCards(window.__lounge.scene)).toHaveLength(0)
      const shoe = window.__lounge.scene.getObjectByName('blackjack-shoe')
      expect(shoe.children.every((child) => child.visible)).toBe(true)
    })

    it('hides the cards from the environment capture, so the shoe is not baked into the floor', async () => {
      await runLounge()

      const cards = []
      window.__lounge.scene.traverse((o) => {
        if (o.userData.isCard) cards.push(o)
      })

      expect(cards.length).toBeGreaterThan(0)
      expect(cards.every((mesh) => mesh.userData.hideFromEnv)).toBe(true)
    })

    it('exposes sitDown, standUp, setHand and the seat state', async () => {
      const { api } = await runLounge()

      expect(api.sitDown).toBeTypeOf('function')
      expect(api.standUp).toBeTypeOf('function')
      expect(api.setHand).toBeTypeOf('function')
      expect(api.getSeatState()).toBe('standing')
    })

    it('reports when the camera comes within reach of the table and when it walks away', async () => {
      const onNearTable = vi.fn()
      await runLounge({ onNearTable })
      const { camera } = window.__lounge

      camera.position.set(BLACKJACK_TABLE.at[0] - 2, 1.7, BLACKJACK_TABLE.at[2])
      await vi.waitFor(() => expect(onNearTable).toHaveBeenLastCalledWith(true))
      camera.position.set(0, 1.7, 4.6)
      await vi.waitFor(() => expect(onNearTable).toHaveBeenLastCalledWith(false))

      expect(onNearTable).toHaveBeenCalledTimes(2)
    })

    it('does not require a table proximity callback', async () => {
      await runLounge()
      const { camera } = window.__lounge

      camera.position.set(BLACKJACK_TABLE.at[0] - 2, 1.7, BLACKJACK_TABLE.at[2])

      await expect(new Promise((resolve) => setTimeout(resolve, 50))).resolves.toBeUndefined()
    })

    it('sitDown releases the pointer, stops walking and puts the camera at the seat', async () => {
      stubReducedMotion(true)
      const { api } = await runLounge()
      const walk = lastWalk()

      await api.sitDown()
      const updatesAtSeat = walk.update.mock.calls.length
      await new Promise((resolve) => setTimeout(resolve, 60))

      expect(api.getSeatState()).toBe('seated')
      expect(mocks.unlock).toHaveBeenCalled()
      expect(walk.releaseKeys).toHaveBeenCalled()
      expect(walk.controls.enabled).toBe(false)
      expect(walk.update.mock.calls.length).toBe(updatesAtSeat)
      const { camera } = window.__lounge
      camera.position.toArray().forEach((value, axis) => {
        expect(value).toBeCloseTo(SEAT_POSE.position[axis], 6)
      })
    })

    it('standUp restores the previous pose and gives walking back', async () => {
      stubReducedMotion(true)
      const { api } = await runLounge()
      const walk = lastWalk()
      const { camera } = window.__lounge
      camera.position.set(2.5, 1.7, 1)
      await api.sitDown()

      await api.standUp()
      const updatesBefore = walk.update.mock.calls.length
      await vi.waitFor(() => expect(walk.update.mock.calls.length).toBeGreaterThan(updatesBefore))

      expect(api.getSeatState()).toBe('standing')
      expect(walk.controls.enabled).toBe(true)
      expect(camera.position.x).toBeCloseTo(2.5, 5)
      expect(camera.position.z).toBeCloseTo(1, 5)
    })

    it('setHand deals the cards on the felt', async () => {
      stubReducedMotion(true)
      const { api } = await runLounge()
      const card = { face: 'ACE', suit: 'SPADES' }

      api.setHand({
        id: 'h1',
        status: 'PLAYER_TURN',
        playerCards: [card, card],
        dealerCards: [card],
      })

      expect(visibleCards(window.__lounge.scene)).toHaveLength(4)
    })

    it('dispose takes the card table out of the scene', async () => {
      const { api } = await runLounge()
      const { scene } = window.__lounge

      api.dispose()

      expect(scene.getObjectByName('blackjack-table-cards')).toBeUndefined()
    })
  })
})
