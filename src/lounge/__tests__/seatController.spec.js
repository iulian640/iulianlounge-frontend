import * as THREE from 'three'
import { describe, expect, it } from 'vitest'

import { SEAT_STATE, advanceProgress, createSeatController } from '../seatController'

const POSE = {
  position: new THREE.Vector3(3.4, 1.3, 1.6),
  lookAt: new THREE.Vector3(4.2, 0.9, 1.9),
}

function makeCamera() {
  const camera = new THREE.PerspectiveCamera()
  camera.position.set(0, 1.7, 4.6)
  camera.lookAt(-3, 1.5, 0)
  return camera
}

function make(options = {}) {
  const camera = makeCamera()
  const controller = createSeatController({ camera, pose: POSE, duration: 1, ...options })
  return { camera, controller }
}

function run(controller, seconds, step = 0.05) {
  for (let elapsed = 0; elapsed < seconds - 1e-9; elapsed += step) controller.update(step)
}

function lookDirection(camera) {
  return camera.getWorldDirection(new THREE.Vector3())
}

describe('advanceProgress', () => {
  it('advances by delta over duration', () => {
    expect(advanceProgress(0.2, 0.25, 1)).toBeCloseTo(0.45, 10)
  })

  it('stops at 1', () => {
    expect(advanceProgress(0.9, 5, 1)).toBe(1)
  })

  it('finishes at once with a zero duration', () => {
    expect(advanceProgress(0, 0.01, 0)).toBe(1)
  })
})

describe('seat state machine', () => {
  it('starts standing, with walking allowed', () => {
    const { controller } = make()

    expect(controller.getState()).toBe(SEAT_STATE.STANDING)
    expect(controller.isActive()).toBe(false)
    expect(controller.isSeated()).toBe(false)
  })

  it('goes standing, sitting, seated when sitting down', async () => {
    const { controller } = make()

    const arrival = controller.sitDown()
    expect(controller.getState()).toBe(SEAT_STATE.SITTING)
    expect(controller.isActive()).toBe(true)
    run(controller, 1.2)
    await arrival

    expect(controller.getState()).toBe(SEAT_STATE.SEATED)
    expect(controller.isSeated()).toBe(true)
  })

  it('goes seated, rising, standing when standing up', async () => {
    const { controller } = make()
    controller.sitDown()
    run(controller, 1.2)

    const departure = controller.standUp()
    expect(controller.getState()).toBe(SEAT_STATE.RISING)
    expect(controller.isActive()).toBe(true)
    run(controller, 1.2)
    await departure

    expect(controller.getState()).toBe(SEAT_STATE.STANDING)
    expect(controller.isActive()).toBe(false)
  })

  it('ignores sitDown when already sitting or seated', () => {
    const { controller } = make()
    controller.sitDown()

    controller.sitDown()
    expect(controller.getState()).toBe(SEAT_STATE.SITTING)
    run(controller, 1.2)
    controller.sitDown()

    expect(controller.getState()).toBe(SEAT_STATE.SEATED)
  })

  it('ignores standUp when standing or already rising', () => {
    const { controller } = make()

    controller.standUp()
    expect(controller.getState()).toBe(SEAT_STATE.STANDING)
    controller.sitDown()
    run(controller, 1.2)
    controller.standUp()
    controller.standUp()

    expect(controller.getState()).toBe(SEAT_STATE.RISING)
  })

  it('can stand up in the middle of sitting down', async () => {
    const { controller } = make()
    const sitting = controller.sitDown()
    run(controller, 0.4)

    const departure = controller.standUp()
    expect(controller.getState()).toBe(SEAT_STATE.RISING)
    run(controller, 1.2)

    await sitting
    await departure
    expect(controller.getState()).toBe(SEAT_STATE.STANDING)
  })

  it('does nothing in update while standing or seated', () => {
    const { camera, controller } = make()
    const before = camera.position.clone()

    run(controller, 1)
    expect(camera.position.equals(before)).toBe(true)
    controller.sitDown()
    run(controller, 1.2)
    const seated = camera.position.clone()
    run(controller, 1)

    expect(camera.position.equals(seated)).toBe(true)
  })
})

describe('seat camera movement', () => {
  it('moves the camera to the seat pose, looking at the felt', () => {
    const { camera, controller } = make()

    controller.sitDown()
    run(controller, 1.2)

    expect(camera.position.distanceTo(POSE.position)).toBeLessThan(1e-6)
    const expected = POSE.lookAt.clone().sub(POSE.position).normalize()
    expect(lookDirection(camera).dot(expected)).toBeCloseTo(1, 5)
  })

  it('is halfway through the way at half the time', () => {
    const { camera, controller } = make()
    const start = camera.position.clone()

    controller.sitDown()
    run(controller, 0.5)

    const total = start.distanceTo(POSE.position)
    expect(camera.position.distanceTo(start)).toBeCloseTo(total / 2, 3)
  })

  it('moves smoothly without overshooting the seat', () => {
    const { camera, controller } = make()
    const start = camera.position.clone()
    const total = start.distanceTo(POSE.position)

    controller.sitDown()
    let previous = 0
    for (let i = 0; i < 30; i++) {
      controller.update(0.05)
      const travelled = camera.position.distanceTo(start)
      expect(travelled).toBeGreaterThanOrEqual(previous - 1e-9)
      expect(travelled).toBeLessThanOrEqual(total + 1e-9)
      previous = travelled
    }
  })

  it('keeps the camera rotation a unit quaternion all the way', () => {
    const { camera, controller } = make()

    controller.sitDown()
    for (let i = 0; i < 25; i++) {
      controller.update(0.04)
      expect(camera.quaternion.length()).toBeCloseTo(1, 6)
    }
  })

  it('restores the previous position and look direction when standing up', () => {
    const { camera, controller } = make()
    const position = camera.position.clone()
    const direction = lookDirection(camera)

    controller.sitDown()
    run(controller, 1.2)
    controller.standUp()
    run(controller, 1.2)

    expect(camera.position.distanceTo(position)).toBeLessThan(1e-6)
    expect(lookDirection(camera).dot(direction)).toBeCloseTo(1, 5)
  })

  it('restores the pose the member had when sitting, not the one from the first time', () => {
    const { camera, controller } = make()
    controller.sitDown()
    run(controller, 1.2)
    controller.standUp()
    run(controller, 1.2)
    camera.position.set(2, 1.7, 0)

    controller.sitDown()
    run(controller, 1.2)
    controller.standUp()
    run(controller, 1.2)

    expect(camera.position.distanceTo(new THREE.Vector3(2, 1.7, 0))).toBeLessThan(1e-6)
  })

  it('starts rising from where the camera is when interrupted halfway', () => {
    const { camera, controller } = make()
    const home = camera.position.clone()
    controller.sitDown()
    run(controller, 0.5)
    const halfway = camera.position.clone()

    controller.standUp()
    controller.update(0.01)

    expect(camera.position.distanceTo(halfway)).toBeLessThan(halfway.distanceTo(home) + 0.5)
    run(controller, 1.2)
    expect(camera.position.distanceTo(home)).toBeLessThan(1e-6)
  })
})

describe('seat controller with reduced motion', () => {
  it('sits at once and resolves right away', async () => {
    const { camera, controller } = make({ reducedMotion: true })

    await controller.sitDown()

    expect(controller.getState()).toBe(SEAT_STATE.SEATED)
    expect(camera.position.distanceTo(POSE.position)).toBeLessThan(1e-6)
  })

  it('stands up at once to the previous pose', async () => {
    const { camera, controller } = make({ reducedMotion: () => true })
    const home = camera.position.clone()
    await controller.sitDown()

    await controller.standUp()

    expect(controller.getState()).toBe(SEAT_STATE.STANDING)
    expect(camera.position.distanceTo(home)).toBeLessThan(1e-6)
  })

  it('also snaps with a zero duration', async () => {
    const { controller } = make({ duration: 0 })

    await controller.sitDown()

    expect(controller.isSeated()).toBe(true)
  })
})
