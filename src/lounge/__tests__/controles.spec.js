import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as THREE from 'three'

import { createWalkControls } from '../walkControls'
import { createTuningPanel } from '../tuningPanel'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('createWalkControls', () => {
  let camera
  let canvas

  beforeEach(() => {
    camera = new THREE.PerspectiveCamera()
    canvas = document.createElement('canvas')
    canvas.requestPointerLock = vi.fn()
    document.exitPointerLock = vi.fn()
  })

  it('al hacer click en el canvas se solicita el pointer lock', () => {
    createWalkControls(camera, canvas)

    canvas.dispatchEvent(new Event('click'))

    expect(canvas.requestPointerLock).toHaveBeenCalled()
  })

  it('con los controles desactivados el click no pide el pointer lock', () => {
    const walk = createWalkControls(camera, canvas)
    walk.controls.enabled = false

    canvas.dispatchEvent(new Event('click'))

    expect(canvas.requestPointerLock).not.toHaveBeenCalled()
  })

  it('con el puntero bloqueado, pulsar W mueve la cámara hacia delante', () => {
    const walk = createWalkControls(camera, canvas)
    walk.controls.isLocked = true
    const moveForwardSpy = vi.spyOn(walk.controls, 'moveForward').mockImplementation(() => {})
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }))

    walk.update(0.1)

    expect(moveForwardSpy).toHaveBeenCalledWith(2.6 * 0.1)
  })

  it('pulsar S mueve la cámara hacia atrás', () => {
    const walk = createWalkControls(camera, canvas)
    walk.controls.isLocked = true
    const moveForwardSpy = vi.spyOn(walk.controls, 'moveForward').mockImplementation(() => {})
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyS' }))

    walk.update(0.1)

    expect(moveForwardSpy).toHaveBeenCalledWith(-2.6 * 0.1)
  })

  it('pulsar D mueve la cámara hacia la derecha', () => {
    const walk = createWalkControls(camera, canvas)
    walk.controls.isLocked = true
    const moveRightSpy = vi.spyOn(walk.controls, 'moveRight').mockImplementation(() => {})
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyD' }))

    walk.update(0.1)

    expect(moveRightSpy).toHaveBeenCalledWith(2.6 * 0.1)
  })

  it('pulsar A mueve la cámara hacia la izquierda', () => {
    const walk = createWalkControls(camera, canvas)
    walk.controls.isLocked = true
    const moveRightSpy = vi.spyOn(walk.controls, 'moveRight').mockImplementation(() => {})
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA' }))

    walk.update(0.1)

    expect(moveRightSpy).toHaveBeenCalledWith(-2.6 * 0.1)
  })

  it('mantener Shift multiplica la velocidad de avance (correr)', () => {
    const walk = createWalkControls(camera, canvas)
    walk.controls.isLocked = true
    const moveForwardSpy = vi.spyOn(walk.controls, 'moveForward').mockImplementation(() => {})
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }))
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ShiftLeft' }))

    walk.update(0.1)

    expect(moveForwardSpy).toHaveBeenCalledWith(4.6 * 0.1)
  })

  it('soltar la tecla W (keyup) detiene el avance', () => {
    const walk = createWalkControls(camera, canvas)
    walk.controls.isLocked = true
    const moveForwardSpy = vi.spyOn(walk.controls, 'moveForward').mockImplementation(() => {})
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }))
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW' }))

    walk.update(0.1)

    expect(moveForwardSpy).not.toHaveBeenCalled()
  })

  it('sin el puntero bloqueado, update no mueve la cámara ni fuerza la altura de los ojos', () => {
    const walk = createWalkControls(camera, canvas)
    const moveForwardSpy = vi.spyOn(walk.controls, 'moveForward').mockImplementation(() => {})
    camera.position.y = 99
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }))

    walk.update(0.1)

    expect(moveForwardSpy).not.toHaveBeenCalled()
    expect(camera.position.y).toBe(99)
  })

  it('con el puntero bloqueado, la cámara mantiene siempre los pies en el suelo', () => {
    const walk = createWalkControls(camera, canvas)
    walk.controls.isLocked = true
    camera.position.y = 99

    walk.update(0.1)

    expect(camera.position.y).toBe(1.7)
  })

  it('a key held when the window loses focus does not keep walking', () => {
    const walk = createWalkControls(camera, canvas)
    walk.controls.isLocked = true
    const moveForwardSpy = vi.spyOn(walk.controls, 'moveForward').mockImplementation(() => {})
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }))

    window.dispatchEvent(new Event('blur'))
    walk.update(0.1)

    expect(moveForwardSpy).not.toHaveBeenCalled()
    walk.dispose()
  })

  it('releaseKeys forgets the keys held so far', () => {
    const walk = createWalkControls(camera, canvas)
    walk.controls.isLocked = true
    const moveForwardSpy = vi.spyOn(walk.controls, 'moveForward').mockImplementation(() => {})
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }))

    walk.releaseKeys()
    walk.update(0.1)

    expect(moveForwardSpy).not.toHaveBeenCalled()
    walk.dispose()
  })

  it('dispose() retira del window los mismos listeners de teclado que registró', () => {
    const addSpy = vi.spyOn(window, 'addEventListener')
    const removeSpy = vi.spyOn(window, 'removeEventListener')
    const walk = createWalkControls(camera, canvas)
    const [, keydownHandler] = addSpy.mock.calls.find(([tipo]) => tipo === 'keydown')
    const [, keyupHandler] = addSpy.mock.calls.find(([tipo]) => tipo === 'keyup')

    walk.dispose()

    expect(removeSpy).toHaveBeenCalledWith('keydown', keydownHandler)
    expect(removeSpy).toHaveBeenCalledWith('keyup', keyupHandler)
  })

  it('dispose() suelta el pointer lock y limpia los controles internos', () => {
    const walk = createWalkControls(camera, canvas)
    const unlockSpy = vi.spyOn(walk.controls, 'unlock')
    const disposeSpy = vi.spyOn(walk.controls, 'dispose')

    walk.dispose()

    expect(unlockSpy).toHaveBeenCalled()
    expect(disposeSpy).toHaveBeenCalled()
  })
})

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
    findController(gui, 'calidad').setValue('media')

    expect(setQuality).toHaveBeenCalledWith('media')
  })

  it('el mando "brillo" ajusta toneMappingExposure del renderer', () => {
    findController(gui, 'brillo').setValue(1.6)

    expect(renderer.toneMappingExposure).toBe(1.6)
  })
})
