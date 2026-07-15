import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as THREE from 'three'

import { createWalkControls } from '../walkControls'
import { createTuningPanel } from '../tuningPanel'

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

// El panel de afinado es andamiaje DEV: sus mandos van y vienen con cada
// pasada de arte y NO estarán en la versión final (decisión de Iulian,
// 2026-07-14) — la UI final solo tendrá calidad y brillo. Aquí se cubre
// exactamente eso y nada más.

function crearRenderer(esWebGPU) {
  return {
    backend: { isWebGPUBackend: esWebGPU },
    toneMappingExposure: 2.2,
  }
}

function findController(gui, propiedad) {
  return gui.controllersRecursive().find((controlador) => controlador.property === propiedad)
}

describe('createTuningPanel', () => {
  let renderer
  let setQuality
  let gui

  beforeEach(() => {
    renderer = crearRenderer(true)
    setQuality = vi.fn()
    gui = createTuningPanel({ renderer, setQuality })
  })

  afterEach(() => {
    gui.destroy()
  })

  it('el mando "calidad" llama a setQuality con el valor elegido', () => {
    // Act
    findController(gui, 'calidad').setValue('media')

    // Assert
    expect(setQuality).toHaveBeenCalledWith('media')
  })

  it('el mando "brillo" ajusta toneMappingExposure del renderer', () => {
    // Act
    findController(gui, 'brillo').setValue(1.6)

    // Assert
    expect(renderer.toneMappingExposure).toBe(1.6)
  })
})
