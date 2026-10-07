import { describe, expect, it, vi } from 'vitest'

import { BARMAN_AT, createBarmanProximity } from '../barmanProximity'

const EYE_HEIGHT = 1.7

function at(distance, { height = EYE_HEIGHT, angle = 0 } = {}) {
  return {
    x: BARMAN_AT[0] + Math.cos(angle) * distance,
    y: height,
    z: BARMAN_AT[2] + Math.sin(angle) * distance,
  }
}

describe('createBarmanProximity', () => {
  it('starts away from the barman without notifying', () => {
    const onChange = vi.fn()
    const proximity = createBarmanProximity(onChange)

    proximity.update(at(10))

    expect(proximity.isNear()).toBe(false)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('measures on the XZ plane so the eye height does not push the member out of range', () => {
    const onChange = vi.fn()
    const proximity = createBarmanProximity(onChange)

    proximity.update(at(2.5, { height: EYE_HEIGHT }))

    expect(onChange).toHaveBeenCalledExactlyOnceWith(true)
  })

  it('does not enter beyond the enter radius', () => {
    const onChange = vi.fn()
    const proximity = createBarmanProximity(onChange)

    proximity.update(at(2.7))

    expect(proximity.isNear()).toBe(false)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('keeps being near between the enter and the exit radius', () => {
    const onChange = vi.fn()
    const proximity = createBarmanProximity(onChange)
    proximity.update(at(2.5))

    proximity.update(at(2.9))

    expect(proximity.isNear()).toBe(true)
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('leaves once past the exit radius and notifies once', () => {
    const onChange = vi.fn()
    const proximity = createBarmanProximity(onChange)
    proximity.update(at(2.5))

    proximity.update(at(3.1))
    proximity.update(at(3.5))

    expect(proximity.isNear()).toBe(false)
    expect(onChange.mock.calls).toEqual([[true], [false]])
  })

  it('does not re-enter in the hysteresis band after leaving', () => {
    const onChange = vi.fn()
    const proximity = createBarmanProximity(onChange)
    proximity.update(at(2.5))
    proximity.update(at(3.1))

    proximity.update(at(2.8))

    expect(proximity.isNear()).toBe(false)
    expect(onChange).toHaveBeenCalledTimes(2)
  })

  it('does not notify again while staying inside', () => {
    const onChange = vi.fn()
    const proximity = createBarmanProximity(onChange)

    proximity.update(at(1))
    proximity.update(at(1.5))
    proximity.update(at(0.5))

    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('works from any direction around the barman', () => {
    const onChange = vi.fn()
    const proximity = createBarmanProximity(onChange)

    proximity.update(at(2.5, { angle: Math.PI / 2 }))

    expect(onChange).toHaveBeenCalledExactlyOnceWith(true)
  })
})
