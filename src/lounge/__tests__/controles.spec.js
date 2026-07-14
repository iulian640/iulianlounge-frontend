import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as THREE from 'three'

import { createWalkControls } from '../walkControls'
import { createTuningPanel } from '../tuningPanel'
import { materials } from '../salon'

// limpia spies globales (window, console) entre tests; los objetos three.js
// de cada test son siempre instancias nuevas, así que no necesitan reset
afterEach(() => {
  vi.restoreAllMocks()
})

describe('createWalkControls', () => {
  let camera
  let canvas

  beforeEach(() => {
    // Arrange: cámara + canvas de jsdom, con el pointer lock mockeado (jsdom
    // no implementa la Pointer Lock API)
    camera = new THREE.PerspectiveCamera()
    canvas = document.createElement('canvas')
    canvas.requestPointerLock = vi.fn()
    document.exitPointerLock = vi.fn()
  })

  it('al hacer click en el canvas se solicita el pointer lock', () => {
    // Arrange
    createWalkControls(camera, canvas)

    // Act
    canvas.dispatchEvent(new Event('click'))

    // Assert
    expect(canvas.requestPointerLock).toHaveBeenCalled()
  })

  it('con el puntero bloqueado, pulsar W mueve la cámara hacia delante', () => {
    // Arrange
    const walk = createWalkControls(camera, canvas)
    walk.controls.isLocked = true
    const moveForwardSpy = vi.spyOn(walk.controls, 'moveForward').mockImplementation(() => {})
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }))

    // Act
    walk.update(0.1)

    // Assert: velocidad de paseo (WALK_SPEED = 2.6) por el delta
    expect(moveForwardSpy).toHaveBeenCalledWith(2.6 * 0.1)
  })

  it('pulsar S mueve la cámara hacia atrás', () => {
    // Arrange
    const walk = createWalkControls(camera, canvas)
    walk.controls.isLocked = true
    const moveForwardSpy = vi.spyOn(walk.controls, 'moveForward').mockImplementation(() => {})
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyS' }))

    // Act
    walk.update(0.1)

    // Assert: distancia negativa = hacia atrás
    expect(moveForwardSpy).toHaveBeenCalledWith(-2.6 * 0.1)
  })

  it('pulsar D mueve la cámara hacia la derecha', () => {
    // Arrange
    const walk = createWalkControls(camera, canvas)
    walk.controls.isLocked = true
    const moveRightSpy = vi.spyOn(walk.controls, 'moveRight').mockImplementation(() => {})
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyD' }))

    // Act
    walk.update(0.1)

    // Assert
    expect(moveRightSpy).toHaveBeenCalledWith(2.6 * 0.1)
  })

  it('pulsar A mueve la cámara hacia la izquierda', () => {
    // Arrange
    const walk = createWalkControls(camera, canvas)
    walk.controls.isLocked = true
    const moveRightSpy = vi.spyOn(walk.controls, 'moveRight').mockImplementation(() => {})
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA' }))

    // Act
    walk.update(0.1)

    // Assert
    expect(moveRightSpy).toHaveBeenCalledWith(-2.6 * 0.1)
  })

  it('mantener Shift multiplica la velocidad de avance (correr)', () => {
    // Arrange
    const walk = createWalkControls(camera, canvas)
    walk.controls.isLocked = true
    const moveForwardSpy = vi.spyOn(walk.controls, 'moveForward').mockImplementation(() => {})
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }))
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ShiftLeft' }))

    // Act
    walk.update(0.1)

    // Assert: velocidad de carrera (RUN_SPEED = 4.6) por el delta
    expect(moveForwardSpy).toHaveBeenCalledWith(4.6 * 0.1)
  })

  it('soltar la tecla W (keyup) detiene el avance', () => {
    // Arrange
    const walk = createWalkControls(camera, canvas)
    walk.controls.isLocked = true
    const moveForwardSpy = vi.spyOn(walk.controls, 'moveForward').mockImplementation(() => {})
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }))
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW' }))

    // Act
    walk.update(0.1)

    // Assert
    expect(moveForwardSpy).not.toHaveBeenCalled()
  })

  it('sin el puntero bloqueado, update no mueve la cámara ni fuerza la altura de los ojos', () => {
    // Arrange
    const walk = createWalkControls(camera, canvas)
    const moveForwardSpy = vi.spyOn(walk.controls, 'moveForward').mockImplementation(() => {})
    camera.position.y = 99
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }))

    // Act: nunca se bloqueó el puntero (walk.controls.isLocked sigue false)
    walk.update(0.1)

    // Assert
    expect(moveForwardSpy).not.toHaveBeenCalled()
    expect(camera.position.y).toBe(99)
  })

  it('con el puntero bloqueado, la cámara mantiene siempre los pies en el suelo', () => {
    // Arrange
    const walk = createWalkControls(camera, canvas)
    walk.controls.isLocked = true
    camera.position.y = 99

    // Act: sin teclas pulsadas, solo el efecto de "pies en el suelo"
    walk.update(0.1)

    // Assert: EYE_HEIGHT = 1.7
    expect(camera.position.y).toBe(1.7)
  })

  it('dispose() retira del window los mismos listeners de teclado que registró', () => {
    // Arrange
    const addSpy = vi.spyOn(window, 'addEventListener')
    const removeSpy = vi.spyOn(window, 'removeEventListener')
    const walk = createWalkControls(camera, canvas)
    const [, keydownHandler] = addSpy.mock.calls.find(([tipo]) => tipo === 'keydown')
    const [, keyupHandler] = addSpy.mock.calls.find(([tipo]) => tipo === 'keyup')

    // Act
    walk.dispose()

    // Assert: mismas referencias de función que las registradas
    expect(removeSpy).toHaveBeenCalledWith('keydown', keydownHandler)
    expect(removeSpy).toHaveBeenCalledWith('keyup', keyupHandler)
  })

  it('dispose() suelta el pointer lock y limpia los controles internos', () => {
    // Arrange
    const walk = createWalkControls(camera, canvas)
    const unlockSpy = vi.spyOn(walk.controls, 'unlock')
    const disposeSpy = vi.spyOn(walk.controls, 'dispose')

    // Act
    walk.dispose()

    // Assert
    expect(unlockSpy).toHaveBeenCalled()
    expect(disposeSpy).toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------

// helpers para montar una escena de mentira con luces etiquetadas, tal y
// como las deja addSalonLights en producción (ver lights-escena.spec.js)
function crearLuz(Tipo, kind, baseIntensity) {
  const luz = new Tipo()
  luz.intensity = baseIntensity
  luz.userData.kind = kind
  luz.userData.baseIntensity = baseIntensity
  return luz
}

function crearMeshConBrillo(nombre, emissiveIntensity) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(),
    new THREE.MeshStandardMaterial({ emissiveIntensity }),
  )
  mesh.name = nombre
  return mesh
}

function crearEscena({ conBackglow = true, conLetreroTexto = true } = {}) {
  const scene = new THREE.Scene()
  scene.add(crearLuz(THREE.PointLight, 'fill', 1.5))
  scene.add(crearLuz(THREE.PointLight, 'lamp', 2))
  scene.add(crearLuz(THREE.PointLight, 'pie', 1))
  scene.add(crearLuz(THREE.PointLight, 'candle', 0.6))
  scene.add(crearLuz(THREE.PointLight, 'shelf', 0.8))
  scene.add(crearLuz(THREE.PointLight, 'tira', 0.4))
  scene.add(crearLuz(THREE.PointLight, 'letrero', 1))
  scene.add(crearLuz(THREE.PointLight, 'escenario', 1))
  scene.add(crearLuz(THREE.SpotLight, 'foco', 1))
  if (conBackglow) scene.add(crearMeshConBrillo('backglow', 0.18))
  if (conLetreroTexto) scene.add(crearMeshConBrillo('letrero-texto', 0.85))
  return scene
}

function luzPorKind(scene, kind) {
  let encontrada
  scene.traverse((objeto) => {
    if (objeto.isLight && objeto.userData.kind === kind) encontrada = objeto
  })
  return encontrada
}

function crearRenderer(esWebGPU) {
  return {
    backend: esWebGPU ? { isWebGPUBackend: true } : undefined,
    toneMappingExposure: 2.2,
  }
}

function crearBloom() {
  return { strength: { value: 0.2 } }
}

function crearSmoke() {
  return { opacity: { value: 0 }, scaleMul: { value: 1 }, mesh: { count: 200 } }
}

function crearStageSpots() {
  return {
    beamMaterial: { opacity: 0 },
    lensMaterial: { emissiveIntensity: 0 },
    setWidth: vi.fn(),
  }
}

// lil-gui: busca un mando por el nombre de la propiedad que controla, sin
// importar si vive en el panel raíz o en una de sus carpetas
function findController(gui, propiedad) {
  return gui.controllersRecursive().find((controlador) => controlador.property === propiedad)
}

function marcadoresDeLuz(scene) {
  const encontrados = []
  scene.traverse((objeto) => {
    if (objeto instanceof THREE.PointLightHelper || objeto instanceof THREE.SpotLightHelper) {
      encontrados.push(objeto)
    }
  })
  return encontrados
}

function contarMarcadoresDeLuz(scene) {
  return marcadoresDeLuz(scene).length
}

describe('createTuningPanel', () => {
  let scene
  let renderer
  let bloom
  let smoke
  let stageSpots
  let setQuality
  let gui

  beforeEach(() => {
    // Arrange: escena con luces etiquetadas (kind + baseIntensity) y un
    // renderer/bloom/humo/focos de mentira, con backend WebGPU
    scene = crearEscena()
    renderer = crearRenderer(true)
    bloom = crearBloom()
    smoke = crearSmoke()
    stageSpots = crearStageSpots()
    setQuality = vi.fn()
    gui = createTuningPanel({ scene, renderer, bloom, setQuality, smoke, stageSpots })
  })

  afterEach(() => {
    gui.destroy()
  })

  it('devuelve un GUI que se puede destruir', () => {
    // Assert: el panel se monta en el documento
    expect(gui.domElement.parentElement).toBe(document.body)

    // Act
    gui.destroy()

    // Assert: se desmonta limpio
    expect(gui.domElement.parentElement).toBeNull()
  })

  describe('mando "calidad"', () => {
    it('con backend WebGPU arranca en alta', () => {
      // Assert: el gui del beforeEach usa un renderer con backend WebGPU
      expect(findController(gui, 'calidad').getValue()).toBe('alta')
    })

    it('sin backend WebGPU arranca en baja', () => {
      // Arrange
      const guiRespaldo = createTuningPanel({
        scene: crearEscena(),
        renderer: crearRenderer(false),
        bloom: crearBloom(),
        setQuality,
      })

      // Assert
      expect(findController(guiRespaldo, 'calidad').getValue()).toBe('baja')

      guiRespaldo.destroy()
    })

    it('cambiarlo llama a setQuality con el valor elegido', () => {
      // Act
      findController(gui, 'calidad').setValue('media')

      // Assert
      expect(setQuality).toHaveBeenCalledWith('media')
    })

    it('sin setQuality, cambiarlo no lanza ningún error', () => {
      // Arrange
      const guiSinSetQuality = createTuningPanel({
        scene: crearEscena(),
        renderer: crearRenderer(true),
        bloom: crearBloom(),
      })

      // Act & Assert
      expect(() => findController(guiSinSetQuality, 'calidad').setValue('baja')).not.toThrow()

      guiSinSetQuality.destroy()
    })
  })

  it('el mando "exposicion" actualiza toneMappingExposure del renderer', () => {
    // Act
    findController(gui, 'exposicion').setValue(1.8)

    // Assert
    expect(renderer.toneMappingExposure).toBe(1.8)
  })

  it('el mando "bloomFuerza" actualiza el uniform de fuerza del bloom', () => {
    // Act
    findController(gui, 'bloomFuerza').setValue(0.5)

    // Assert
    expect(bloom.strength.value).toBe(0.5)
  })

  it('el mando "relleno" escala la luz de relleno (kind fill) sobre su baseIntensity', () => {
    // Arrange
    const luz = luzPorKind(scene, 'fill')

    // Act
    findController(gui, 'relleno').setValue(0.5)

    // Assert
    expect(luz.intensity).toBe(luz.userData.baseIntensity * 0.5)
  })

  it('el mando "lamparas" escala las lámparas colgantes (kind lamp) sobre su baseIntensity', () => {
    // Arrange
    const luz = luzPorKind(scene, 'lamp')

    // Act
    findController(gui, 'lamparas').setValue(1.5)

    // Assert
    expect(luz.intensity).toBe(luz.userData.baseIntensity * 1.5)
  })

  it('el mando "lamparasPie" escala las lámparas de pie (kind pie) sobre su baseIntensity', () => {
    // Arrange
    const luz = luzPorKind(scene, 'pie')

    // Act
    findController(gui, 'lamparasPie').setValue(0.25)

    // Assert
    expect(luz.intensity).toBe(luz.userData.baseIntensity * 0.25)
  })

  it('el mando "velas" escala las velas de mesa (kind candle) sobre su baseIntensity', () => {
    // Arrange
    const luz = luzPorKind(scene, 'candle')

    // Act
    findController(gui, 'velas').setValue(0.8)

    // Assert
    expect(luz.intensity).toBe(luz.userData.baseIntensity * 0.8)
  })

  it('el mando "escenario" escala las luces del escenario (kind escenario) sobre su baseIntensity', () => {
    // Arrange
    const luz = luzPorKind(scene, 'escenario')

    // Act
    findController(gui, 'escenario').setValue(1.2)

    // Assert
    expect(luz.intensity).toBe(luz.userData.baseIntensity * 1.2)
  })

  it('el mando "trasbarra" escala las luces de la repisa (kind shelf) y el resplandor trasero a la vez', () => {
    // Arrange
    const luz = luzPorKind(scene, 'shelf')
    const backglow = scene.getObjectByName('backglow')

    // Act
    findController(gui, 'trasbarra').setValue(0.5)

    // Assert: mismo mando gobierna la luz y el material emissive del panel
    expect(luz.intensity).toBe(luz.userData.baseIntensity * 0.5)
    expect(backglow.material.emissiveIntensity).toBe(0.18 * 0.5)
  })

  it('el mando "trasbarra" no lanza si la escena no tiene el objeto "backglow"', () => {
    // Arrange: escena sin el resplandor trasero, solo la luz shelf
    const guiSinBackglow = createTuningPanel({
      scene: crearEscena({ conBackglow: false }),
      renderer: crearRenderer(true),
      bloom: crearBloom(),
      setQuality,
    })

    // Act & Assert
    expect(() => findController(guiSinBackglow, 'trasbarra').setValue(0.5)).not.toThrow()

    guiSinBackglow.destroy()
  })

  it('el mando "tiraBarra" escala las puntuales de la tira (kind tira) y la cinta emissive a la vez', () => {
    // Arrange
    const luz = luzPorKind(scene, 'tira')

    // Act
    findController(gui, 'tiraBarra').setValue(0.5)

    // Assert: la luz del charco y el material materials.tiraBarra, a la una
    expect(luz.intensity).toBe(luz.userData.baseIntensity * 0.5)
    expect(materials.tiraBarra.emissiveIntensity).toBe(1.2 * 0.5)
  })

  it('el mando "letrero" escala sus luces (kind letrero) y el brillo del texto a la vez', () => {
    // Arrange
    const luz = luzPorKind(scene, 'letrero')
    const texto = scene.getObjectByName('letrero-texto')

    // Act
    findController(gui, 'letrero').setValue(0.5)

    // Assert
    expect(luz.intensity).toBe(luz.userData.baseIntensity * 0.5)
    expect(texto.material.emissiveIntensity).toBe(0.85 * 0.5)
  })

  it('el mando "letrero" no lanza si la escena no tiene el objeto "letrero-texto"', () => {
    // Arrange: escena sin el texto del letrero, solo su luz
    const guiSinTexto = createTuningPanel({
      scene: crearEscena({ conLetreroTexto: false }),
      renderer: crearRenderer(true),
      bloom: crearBloom(),
      setQuality,
    })

    // Act & Assert
    expect(() => findController(guiSinTexto, 'letrero').setValue(0.5)).not.toThrow()

    guiSinTexto.destroy()
  })

  it('el mando "reflejos" ajusta la intensidad del entorno (environmentIntensity) de la escena', () => {
    // Act
    findController(gui, 'reflejos').setValue(1.2)

    // Assert
    expect(scene.environmentIntensity).toBe(1.2)
  })

  describe('carpeta "Materiales"', () => {
    it('"barraBarniz" ajusta el clearcoat de la madera de la barra', () => {
      // Act
      findController(gui, 'barraBarniz').setValue(0.7)

      // Assert
      expect(materials.barWood.clearcoat).toBe(0.7)
    })

    it('"barraDifuminado" ajusta la rugosidad de la base y de la laca de la barra a la vez', () => {
      // Act
      findController(gui, 'barraDifuminado').setValue(0.5)

      // Assert: misma fórmula del panel, base 0.35 + v*0.65 / laca v*0.8
      expect(materials.barWood.roughness).toBeCloseTo(0.675)
      expect(materials.barWood.clearcoatRoughness).toBeCloseTo(0.4)
    })

    it('"sueloBarniz" ajusta el clearcoat del parquet', () => {
      // Act
      findController(gui, 'sueloBarniz').setValue(0.9)

      // Assert
      expect(materials.woodFloor.clearcoat).toBe(0.9)
    })

    it('"sueloDifuminado" ajusta la rugosidad de la base y de la laca del parquet a la vez', () => {
      // Act
      findController(gui, 'sueloDifuminado').setValue(0.2)

      // Assert
      expect(materials.woodFloor.roughness).toBeCloseTo(0.48)
      expect(materials.woodFloor.clearcoatRoughness).toBeCloseTo(0.16)
    })

    it('"barraVeta" ajusta la anisotropía de la madera de la barra', () => {
      // Act
      findController(gui, 'barraVeta').setValue(0.6)

      // Assert
      expect(materials.barWood.anisotropy).toBe(0.6)
    })

    it('"sueloVeta" ajusta la anisotropía del parquet', () => {
      // Act
      findController(gui, 'sueloVeta').setValue(0.3)

      // Assert
      expect(materials.woodFloor.anisotropy).toBe(0.3)
    })
  })

  describe('carpeta "Focos" (solo si hay stageSpots)', () => {
    it('sin stageSpots no se crea la carpeta', () => {
      // Arrange
      const guiSinFocos = createTuningPanel({
        scene: crearEscena(),
        renderer: crearRenderer(true),
        bloom: crearBloom(),
        setQuality,
      })

      // Assert
      expect(findController(guiSinFocos, 'focoIntensidad')).toBeUndefined()

      guiSinFocos.destroy()
    })

    it('"focoIntensidad" escala las luces de los focos (kind foco) sobre su baseIntensity', () => {
      // Arrange
      const luz = luzPorKind(scene, 'foco')

      // Act
      findController(gui, 'focoIntensidad').setValue(0.5)

      // Assert
      expect(luz.intensity).toBe(luz.userData.baseIntensity * 0.5)
    })

    it('"focoAnchura" delega en setWidth de stageSpots', () => {
      // Act
      findController(gui, 'focoAnchura').setValue(1.8)

      // Assert
      expect(stageSpots.setWidth).toHaveBeenCalledWith(1.8)
    })

    it('"focoHaz" ajusta la opacidad del material de niebla del haz', () => {
      // Act
      findController(gui, 'focoHaz').setValue(0.08)

      // Assert
      expect(stageSpots.beamMaterial.opacity).toBe(0.08)
    })

    it('"focoLente" ajusta la intensidad emisiva de la lente', () => {
      // Act
      findController(gui, 'focoLente').setValue(2)

      // Assert
      expect(stageSpots.lensMaterial.emissiveIntensity).toBe(2)
    })
  })

  describe('carpeta "Humo" (solo si hay smoke)', () => {
    it('sin smoke no se crea la carpeta', () => {
      // Arrange
      const guiSinHumo = createTuningPanel({
        scene: crearEscena(),
        renderer: crearRenderer(true),
        bloom: crearBloom(),
        setQuality,
        stageSpots,
      })

      // Assert
      expect(findController(guiSinHumo, 'humoOpacidad')).toBeUndefined()

      guiSinHumo.destroy()
    })

    it('"humoOpacidad" ajusta el uniform de opacidad del humo', () => {
      // Act
      findController(gui, 'humoOpacidad').setValue(0.1)

      // Assert
      expect(smoke.opacity.value).toBe(0.1)
    })

    it('"humoTamano" ajusta el multiplicador de escala de las volutas', () => {
      // Act
      findController(gui, 'humoTamano').setValue(2)

      // Assert
      expect(smoke.scaleMul.value).toBe(2)
    })

    it('"humoSoplos" ajusta el número de sprites de humo visibles (mesh.count)', () => {
      // Act
      findController(gui, 'humoSoplos').setValue(50)

      // Assert
      expect(smoke.mesh.count).toBe(50)
    })
  })

  describe('mando "verLuces" (debug)', () => {
    it('desactivarlo sin haberlo activado antes no crea marcadores ni lanza error', () => {
      // Act & Assert
      expect(() => findController(gui, 'verLuces').setValue(false)).not.toThrow()
      expect(contarMarcadoresDeLuz(scene)).toBe(0)
    })

    it('al activarlo crea un marcador visible por cada PointLight y SpotLight de la escena', () => {
      // Act
      findController(gui, 'verLuces').setValue(true)

      // Assert
      expect(contarMarcadoresDeLuz(scene)).toBeGreaterThan(0)
    })

    it('activarlo dos veces no duplica los marcadores', () => {
      // Arrange
      findController(gui, 'verLuces').setValue(true)
      const totalTrasPrimeraActivacion = contarMarcadoresDeLuz(scene)

      // Act
      findController(gui, 'verLuces').setValue(true)

      // Assert
      expect(contarMarcadoresDeLuz(scene)).toBe(totalTrasPrimeraActivacion)
    })

    it('desactivarlo oculta los marcadores sin eliminarlos', () => {
      // Arrange
      findController(gui, 'verLuces').setValue(true)
      const totalConMarcadores = contarMarcadoresDeLuz(scene)

      // Act
      findController(gui, 'verLuces').setValue(false)

      // Assert: siguen existiendo, pero ocultos
      const marcadores = marcadoresDeLuz(scene)
      expect(marcadores).toHaveLength(totalConMarcadores)
      expect(marcadores.every((marcador) => marcador.visible === false)).toBe(true)
    })
  })

  it('"volcarValores" imprime por consola un resumen sin incluir la propia función', () => {
    // Arrange
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const volcarValores = findController(gui, 'volcarValores')

    // Act: mismo efecto que pulsar el botón del panel
    volcarValores.getValue().call(volcarValores.object)

    // Assert
    const [mensaje, dump] = consoleLogSpy.mock.calls[0]
    expect(mensaje).toContain('[afinado]')
    expect(JSON.parse(dump)).not.toHaveProperty('volcarValores')
  })
})
