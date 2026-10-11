import { describe, expect, it, vi } from 'vitest'

import { BLACKJACK_TABLE } from '../blackjackLayout'
import { createProximity } from '../proximity'
import { createTableProximity } from '../tableProximity'

const CENTRE = [2, 0, -1]

function around(distance, angle = 0) {
  return {
    x: CENTRE[0] + Math.cos(angle) * distance,
    y: 1.7,
    z: CENTRE[2] + Math.sin(angle) * distance,
  }
}

describe('createProximity', () => {
  function make(onChange) {
    return createProximity({ at: CENTRE, enterRadius: 2, exitRadius: 3 }, onChange)
  }

  it('starts away without notifying', () => {
    const onChange = vi.fn()
    const proximity = make(onChange)

    proximity.update(around(10))

    expect(proximity.isNear()).toBe(false)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('enters inside the enter radius and notifies once', () => {
    const onChange = vi.fn()
    const proximity = make(onChange)

    proximity.update(around(1.9))
    proximity.update(around(1))

    expect(onChange).toHaveBeenCalledExactlyOnceWith(true)
  })

  it('does not enter beyond the enter radius', () => {
    const onChange = vi.fn()
    const proximity = make(onChange)

    proximity.update(around(2.1))

    expect(proximity.isNear()).toBe(false)
  })

  it('stays near in the hysteresis band and leaves past the exit radius', () => {
    const onChange = vi.fn()
    const proximity = make(onChange)
    proximity.update(around(1))

    proximity.update(around(2.9))
    expect(proximity.isNear()).toBe(true)
    proximity.update(around(3.1))

    expect(proximity.isNear()).toBe(false)
    expect(onChange.mock.calls).toEqual([[true], [false]])
  })

  it('does not re-enter in the hysteresis band after leaving', () => {
    const onChange = vi.fn()
    const proximity = make(onChange)
    proximity.update(around(1))
    proximity.update(around(3.5))

    proximity.update(around(2.5))

    expect(proximity.isNear()).toBe(false)
    expect(onChange).toHaveBeenCalledTimes(2)
  })

  it('measures on the floor plane and from any direction', () => {
    const onChange = vi.fn()
    const proximity = make(onChange)

    proximity.update({ ...around(1.5, Math.PI), y: 40 })

    expect(onChange).toHaveBeenCalledExactlyOnceWith(true)
  })
})

describe('createTableProximity', () => {
  const [tableX, , tableZ] = BLACKJACK_TABLE.at

  function at(distance) {
    return { x: tableX + distance, y: 1.7, z: tableZ }
  }

  it('is near when the member walks up to the table', () => {
    const onChange = vi.fn()
    const proximity = createTableProximity(onChange)

    proximity.update(at(2.4))

    expect(onChange).toHaveBeenCalledExactlyOnceWith(true)
  })

  it('is not near from across the room', () => {
    const onChange = vi.fn()
    const proximity = createTableProximity(onChange)

    proximity.update(at(4))

    expect(proximity.isNear()).toBe(false)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('stays near while seated at the table', () => {
    const onChange = vi.fn()
    const proximity = createTableProximity(onChange)
    proximity.update(at(2))

    proximity.update(at(1.2))

    expect(proximity.isNear()).toBe(true)
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('leaves once the member walks away', () => {
    const onChange = vi.fn()
    const proximity = createTableProximity(onChange)
    proximity.update(at(2))

    proximity.update(at(3.2))

    expect(onChange.mock.calls).toEqual([[true], [false]])
  })
})
