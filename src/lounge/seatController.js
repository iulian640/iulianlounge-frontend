import * as THREE from 'three'

import { TIMING, clamp01, easeInOutCubic } from './cardTween'
import { toReducedMotionCheck } from './reducedMotion'

export const SEAT_STATE = Object.freeze({
  STANDING: 'standing',
  SITTING: 'sitting',
  SEATED: 'seated',
  RISING: 'rising',
})

export function advanceProgress(progress, delta, duration) {
  if (duration <= 0) return 1
  return clamp01(progress + delta / duration)
}

export function createSeatController({
  camera,
  pose,
  duration = TIMING.seatDuration,
  reducedMotion = false,
}) {
  const isReduced = toReducedMotionCheck(reducedMotion)

  const savedPosition = new THREE.Vector3()
  const savedQuaternion = new THREE.Quaternion()
  const fromPosition = new THREE.Vector3()
  const fromQuaternion = new THREE.Quaternion()
  const toPosition = new THREE.Vector3()
  const toQuaternion = new THREE.Quaternion()
  const seatPosition = new THREE.Vector3().copy(pose.position)
  const seatQuaternion = new THREE.Quaternion().setFromRotationMatrix(
    new THREE.Matrix4().lookAt(pose.position, pose.lookAt, camera.up),
  )

  let state = SEAT_STATE.STANDING
  let progress = 0
  let settled = Promise.resolve()
  let resolveSettled = null

  function settle() {
    if (!resolveSettled) return
    resolveSettled()
    resolveSettled = null
  }

  function begin(movingState, endPosition, endQuaternion) {
    settle()
    fromPosition.copy(camera.position)
    fromQuaternion.copy(camera.quaternion)
    toPosition.copy(endPosition)
    toQuaternion.copy(endQuaternion)
    progress = 0
    state = movingState
    settled = new Promise((resolve) => {
      resolveSettled = resolve
    })
    if (isReduced() || duration <= 0) finish()
    return settled
  }

  function finish() {
    camera.position.copy(toPosition)
    camera.quaternion.copy(toQuaternion)
    state = state === SEAT_STATE.SITTING ? SEAT_STATE.SEATED : SEAT_STATE.STANDING
    progress = 1
    settle()
  }

  function sitDown() {
    if (state !== SEAT_STATE.STANDING) return settled
    savedPosition.copy(camera.position)
    savedQuaternion.copy(camera.quaternion)
    return begin(SEAT_STATE.SITTING, seatPosition, seatQuaternion)
  }

  function standUp() {
    if (state === SEAT_STATE.STANDING || state === SEAT_STATE.RISING) return settled
    return begin(SEAT_STATE.RISING, savedPosition, savedQuaternion)
  }

  function update(delta) {
    if (state !== SEAT_STATE.SITTING && state !== SEAT_STATE.RISING) return
    progress = advanceProgress(progress, delta, duration)
    if (progress >= 1) {
      finish()
      return
    }
    const eased = easeInOutCubic(progress)
    camera.position.lerpVectors(fromPosition, toPosition, eased)
    camera.quaternion.slerpQuaternions(fromQuaternion, toQuaternion, eased)
  }

  return {
    sitDown,
    standUp,
    update,
    getState: () => state,
    isActive: () => state !== SEAT_STATE.STANDING,
    isSeated: () => state === SEAT_STATE.SEATED,
  }
}
