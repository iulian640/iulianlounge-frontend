import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as THREE from 'three'

import { createLounge } from '../createLounge'
import { addAshtrays } from '../decor/ashtrays'
import { addCurtains } from '../decor/curtains'
import { addFloorLamps } from '../decor/floorLamps'
import { addSmoke } from '../decor/smoke'
import { addStageSpots } from '../decor/stageSpots'

// Banco headless de createLounge: la escena de three es JS puro y se monta
// en jsdom SIN GPU. Solo se falsean las piezas que tocarían la tarjeta
// (renderer WebGPU, pipeline de postproceso, captura de reflejos) y los
// módulos hermanos pesados (loaders de modelos y tipografías). Con eso se
// puede comprobar el COMPORTAMIENTO del arranque: la dieta del respaldo
// WebGL2, dispose() y el progreso del telón de carga.

// Estado compartido entre los mocks y los tests. Va en vi.hoisted porque
// vi.mock se eleva por encima de los imports: los spies tienen que existir
// antes de que se registren los mocks.
const mocks = vi.hoisted(() => ({
  isWebGPU: true, // qué motor "detecta" el renderer falso en init()
  setSize: vi.fn(),
  setPixelRatio: vi.fn(),
  rendererDispose: vi.fn(),
  deviceDestroy: vi.fn(),
  pipelineRender: vi.fn(),
  panelDestroy: vi.fn(),
  fsr1: vi.fn(() => ({ add: vi.fn(() => ({})) })),
}))

// --- three: mock PARCIAL. Todo lo JS puro (Scene, luces, cámara, materiales,
// MathUtils, Timer, LoadingManager...) sigue siendo el real vía importOriginal;
// solo se sustituye lo que hablaría con la GPU.
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
      // el motor que corre DE VERDAD se decide aquí: WebGPU o respaldo WebGL2
      this.backend.isWebGPUBackend = mocks.isWebGPU
    }
  }

  class RenderPipeline {
    constructor() {
      this.outputNode = null
      this.render = mocks.pipelineRender
    }
  }

  // la CubeCamera de la captura de reflejos: un Object3D real para que
  // scene.add / scene.traverse la traten como un nodo más, con update() falso
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

// --- TSL y bloom: nodos falsos con la interfaz mínima que usa createLounge
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

// el nodo FSR de 'baja' es perezoso: solo se construye si alguien pisa esa
// calidad de verdad — el mock cuenta cuántas veces se construye
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
      this.update = vi.fn()
    }
  },
}))

// --- módulos hermanos. Los que POBLAN la escena crean objetos three reales
// (vi.importActual) para que scene.traverse los recorra de verdad; el resto
// son no-ops.
vi.mock('../salon', () => ({
  buildSalon: vi.fn(),
  materials: {},
  ROOM: { width: 16, depth: 11, height: 3.6 },
}))

vi.mock('../lights', async () => {
  const three = await vi.importActual('three')
  return {
    addSalonLights: vi.fn((scene) => {
      // una luz CON sombra: la dieta del respaldo WebGL2 debe quitarle castShadow
      const lamp = new three.SpotLight()
      lamp.castShadow = true
      lamp.userData.kind = 'lamp'
      scene.add(lamp, lamp.target)
      // una luz de trasbarra: la captura de reflejos la atenúa y la restaura
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
      // un emissive que brilla de verdad: la captura de reflejos lo oculta y
      // lo vuelve a mostrar (por encima del umbral 0.3 del bloom MRT)
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
  createWalkControls: vi.fn(() => ({ update: vi.fn(), dispose: vi.fn() })),
}))

vi.mock('../decor/architecture', () => ({ addArchitecture: vi.fn() }))
vi.mock('../decor/door', () => ({ addDoor: vi.fn() }))
vi.mock('../decor/hatDisplay', () => ({ addHatDisplay: vi.fn() }))

vi.mock('../decor/ashtrays', () => ({
  // tips no vacío: dispara la rama del humo
  addAshtrays: vi.fn(() => ({ tips: [{}] })),
}))

vi.mock('../decor/floorLamps', async () => {
  const three = await vi.importActual('three')
  return {
    addFloorLamps: vi.fn((scene) => {
      // el HAZ volumétrico: la dieta WebGL2 lo hace invisible (userData.haz)
      const beam = new three.Mesh(new three.ConeGeometry(0.3, 1, 8), new three.MeshBasicMaterial())
      beam.userData.haz = true
      scene.add(beam)
      // la pantalla del farol: fuera del envMap (userData.hideFromEnv)
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

// requestAnimationFrame en jsdom no siempre dispara: la barrida de calentamiento
// y el bucle de render lo necesitan, así que se apunta a setTimeout(0).
const disposers = []

async function runLounge({ webgpu = true } = {}) {
  mocks.isWebGPU = webgpu
  const canvas = document.createElement('canvas')
  const onProgress = vi.fn()
  const onQualityBusy = vi.fn()
  const pending = createLounge(canvas, onProgress, onQualityBusy)

  // dejar que createLounge arranque el renderer, monte la escena e instale el
  // gancho del LoadingManager, y quede esperando a que asienten las texturas
  await new Promise((resolve) => setTimeout(resolve, 0))

  // el LoadingManager reparte el progreso de descarga en el tramo 0→0.6
  THREE.DefaultLoadingManager.onProgress?.('x', 0, 0) // total 0: no debe avanzar
  THREE.DefaultLoadingManager.onProgress?.('x', 3, 10) // 30% de la descarga

  // sin loaders reales el manager nunca dispara onLoad: se activa a mano para
  // que texturesSettled resuelva sin agotar la red de seguridad de 8s
  THREE.DefaultLoadingManager.onLoad?.()

  const api = await pending
  disposers.push(api.dispose)
  return { api, onProgress, onQualityBusy }
}

describe('createLounge', () => {
  beforeEach(() => {
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
    // apaga el bucle de render de cada lounge (alive = false)
    for (const dispose of disposers.splice(0)) dispose()
  })

  it('en el respaldo WebGL2 pone la escena a dieta: sin sombras, sin haces y a resolución nativa', async () => {
    // Arrange + Act
    await runLounge({ webgpu: false })

    // Assert
    const scene = window.__lounge.scene
    let lucesConSombra = 0
    let hacesVisibles = 0
    scene.traverse((o) => {
      if (o.isLight && o.castShadow) lucesConSombra += 1
      if (o.userData.haz && o.visible) hacesVisibles += 1
    })
    expect(lucesConSombra).toBe(0) // ninguna luz conserva castShadow
    expect(hacesVisibles).toBe(0) // los haces volumétricos quedan ocultos
    expect(mocks.setPixelRatio).toHaveBeenLastCalledWith(1) // resolución nativa
    expect(window.__lounge.renderer.shadowMap.enabled).toBe(false)
    expect(window.__loungeBackend).toBe('WebGL2 (fallback)')
  })

  it('con WebGPU conserva sombras y haces, sube la resolución y captura el entorno', async () => {
    // Arrange + Act
    await runLounge({ webgpu: true })

    // Assert
    const scene = window.__lounge.scene
    let lucesConSombra = 0
    let hacesVisibles = 0
    scene.traverse((o) => {
      if (o.isLight && o.castShadow) lucesConSombra += 1
      if (o.userData.haz && o.visible) hacesVisibles += 1
    })
    expect(lucesConSombra).toBeGreaterThan(0)
    expect(hacesVisibles).toBeGreaterThan(0)
    expect(mocks.setPixelRatio).toHaveBeenLastCalledWith(2) // min(devicePixelRatio 2, 2)
    expect(window.__lounge.renderer.shadowMap.enabled).toBe(true)
    expect(window.__loungeBackend).toBe('WebGPU')
    // la captura de reflejos deja el envMap puesto con su intensidad de mezcla
    expect(scene.environment).toBeTruthy()
    expect(scene.environmentIntensity).toBe(0.65)
  })

  it('restaura los emissives y la trasbarra que se apagaron solo durante la captura', async () => {
    // Arrange + Act
    await runLounge({ webgpu: true })

    // Assert
    const scene = window.__lounge.scene
    const bombillas = scene.getObjectByName('letrero-bombillas')
    expect(bombillas.visible).toBe(true) // ocultada durante la captura, restaurada después
    let intensidadTrasbarra = null
    scene.traverse((o) => {
      if (o.userData.kind === 'shelf') intensidadTrasbarra = o.intensity
    })
    expect(intensidadTrasbarra).toBe(1.35) // atenuada a 0 en la captura, restaurada
  })

  it('dispose() es idempotente, destruye el GPUDevice y quita los listeners', async () => {
    // Arrange
    const removeSpy = vi.spyOn(window, 'removeEventListener')
    const { api } = await runLounge()

    // Act
    api.dispose()
    api.dispose() // segunda llamada: no debe repetir el trabajo

    // Assert
    expect(mocks.rendererDispose).toHaveBeenCalledTimes(1)
    expect(mocks.deviceDestroy).toHaveBeenCalledTimes(1)
    expect(mocks.panelDestroy).toHaveBeenCalledTimes(1)
    expect(removeSpy).toHaveBeenCalledWith('resize', expect.any(Function))
    expect(removeSpy).toHaveBeenCalledWith('pagehide', expect.any(Function))
    removeSpy.mockRestore()
  })

  it('onProgress avanza sin retroceder y llega a 1', async () => {
    // Arrange + Act
    const { onProgress } = await runLounge()

    // Assert
    const valores = onProgress.mock.calls.map(([v]) => v)
    expect(valores.length).toBeGreaterThan(0)
    expect(Math.max(...valores)).toBe(1) // llega al 100%
    expect(valores.at(-1)).toBe(1) // y termina en 1
    for (const v of valores) {
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(1)
    }
    // nunca retrocede (el valor crudo puede repetir, pero no baja)
    for (let i = 1; i < valores.length; i += 1) {
      expect(valores[i]).toBeGreaterThanOrEqual(valores[i - 1])
    }
  })

  it('publica window.__loungeTiming con los cuatro tramos y el total', async () => {
    // Arrange + Act
    await runLounge()

    // Assert
    const tiempos = window.__loungeTiming
    expect(tiempos).toBeDefined()
    for (const tramo of ['assets', 'reflejos', 'compilacion', 'barrida', 'total']) {
      expect(typeof tiempos[tramo]).toBe('number')
    }
  })

  it('al redimensionar la ventana reajusta la cámara y el renderer', async () => {
    // Arrange
    await runLounge()
    const llamadasPrevias = mocks.setSize.mock.calls.length

    // Act
    window.dispatchEvent(new Event('resize'))

    // Assert
    expect(mocks.setSize.mock.calls.length).toBe(llamadasPrevias + 1)
  })

  it('con ?sin=... omite las piezas de decor marcadas para la bisección de arranque', async () => {
    // Arrange
    window.history.replaceState({}, '', '/?sin=cortinas,focos,lamparas,ceniceros,humo')

    // Act
    await runLounge()

    // Assert
    expect(addFloorLamps).not.toHaveBeenCalled()
    expect(addStageSpots).not.toHaveBeenCalled()
    expect(addCurtains).not.toHaveBeenCalled()
    expect(addAshtrays).not.toHaveBeenCalled()
    expect(addSmoke).not.toHaveBeenCalled()
  })

  // --- el visillo del cambio de calidad: cuando el cambio estrena o retira
  // el grafo FSR de 'baja', el primer render del grafo nuevo compila su
  // pipeline en síncrono y congela el hilo (ley 17); createLounge avisa por
  // onQualityBusy para que la vista lo tape con animación de compositor

  it('cambiar entre alta y media no baja el visillo: es solo un resize, sin grafo nuevo', async () => {
    // Arrange
    const { onQualityBusy } = await runLounge({ webgpu: true })

    // Act
    await window.__lounge.setQuality('media')

    // Assert
    expect(onQualityBusy).not.toHaveBeenCalled()
    expect(mocks.setPixelRatio).toHaveBeenLastCalledWith(1.25)
  })

  it('repetir la calidad que ya está puesta no hace nada (ni visillo ni resize)', async () => {
    // Arrange: WebGPU arranca en 'alta'
    const { onQualityBusy } = await runLounge({ webgpu: true })
    const resizesPrevios = mocks.setPixelRatio.mock.calls.length

    // Act
    await window.__lounge.setQuality('alta')

    // Assert
    expect(onQualityBusy).not.toHaveBeenCalled()
    expect(mocks.setPixelRatio.mock.calls.length).toBe(resizesPrevios)
  })

  it('pisar baja en WebGPU baja el visillo, estrena el grafo FSR y lo vuelve a subir', async () => {
    // Arrange
    const { onQualityBusy } = await runLounge({ webgpu: true })

    // Act
    await window.__lounge.setQuality('baja')

    // Assert: primero avisa de que empieza (true), al terminar lo retira (false)
    expect(onQualityBusy.mock.calls.map(([busy]) => busy)).toEqual([true, false])
    expect(mocks.fsr1).toHaveBeenCalledTimes(1)
  })

  it('volver de baja a alta pasa otra vez por el visillo pero reutiliza el nodo FSR', async () => {
    // Arrange
    const { onQualityBusy } = await runLounge({ webgpu: true })
    await window.__lounge.setQuality('baja')
    onQualityBusy.mockClear()

    // Act
    await window.__lounge.setQuality('alta')

    // Assert: retirar el grafo FSR también recompila el quad (visillo), pero
    // el nodo FSR construido queda guardado para la próxima vez
    expect(onQualityBusy.mock.calls.map(([busy]) => busy)).toEqual([true, false])
    expect(mocks.fsr1).toHaveBeenCalledTimes(1)
  })

  it('en el respaldo WebGL2 el cambio de calidad nunca baja el visillo (no hay grafo FSR)', async () => {
    // Arrange: WebGL2 arranca en 'baja' (la dieta del fallback)
    const { onQualityBusy } = await runLounge({ webgpu: false })

    // Act
    await window.__lounge.setQuality('alta')
    await window.__lounge.setQuality('baja')

    // Assert
    expect(onQualityBusy).not.toHaveBeenCalled()
    expect(mocks.fsr1).not.toHaveBeenCalled()
  })
})
