import { describe, expect, it } from 'vitest'

import {
  TIMING,
  arcOffset,
  clamp01,
  easeInOutCubic,
  easeOutCubic,
  lerp,
  progressAt,
} from '../cardTween'

describe('clamp01', () => {
  it('keeps values inside 0 and 1', () => {
    expect(clamp01(-3)).toBe(0)
    expect(clamp01(0.4)).toBe(0.4)
    expect(clamp01(7)).toBe(1)
  })
})

describe('progressAt', () => {
  it('stays at 0 until the delay has passed', () => {
    expect(progressAt(0.1, 0.3, 0.5)).toBe(0)
  })

  it('advances linearly after the delay', () => {
    expect(progressAt(0.55, 0.3, 0.5)).toBeCloseTo(0.5, 10)
  })

  it('stops at 1 once the duration is over', () => {
    expect(progressAt(5, 0.3, 0.5)).toBe(1)
  })

  it('jumps straight to 1 with a zero duration once the delay has passed', () => {
    expect(progressAt(0.1, 0.3, 0)).toBe(0)
    expect(progressAt(0.3, 0.3, 0)).toBe(1)
  })
})

describe('easing', () => {
  it('easeOutCubic starts at 0, ends at 1 and is ahead of linear in the middle', () => {
    expect(easeOutCubic(0)).toBe(0)
    expect(easeOutCubic(1)).toBe(1)
    expect(easeOutCubic(0.5)).toBeCloseTo(0.875, 10)
  })

  it('easeInOutCubic is symmetric around the middle', () => {
    expect(easeInOutCubic(0)).toBe(0)
    expect(easeInOutCubic(1)).toBe(1)
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5, 10)
    expect(easeInOutCubic(0.25) + easeInOutCubic(0.75)).toBeCloseTo(1, 10)
  })

  it('both easings never decrease', () => {
    for (let i = 1; i <= 20; i++) {
      expect(easeOutCubic(i / 20)).toBeGreaterThanOrEqual(easeOutCubic((i - 1) / 20))
      expect(easeInOutCubic(i / 20)).toBeGreaterThanOrEqual(easeInOutCubic((i - 1) / 20))
    }
  })
})

describe('lerp and arcOffset', () => {
  it('interpolates between two values', () => {
    expect(lerp(2, 6, 0)).toBe(2)
    expect(lerp(2, 6, 0.25)).toBe(3)
    expect(lerp(2, 6, 1)).toBe(6)
  })

  it('arcs from zero up to the height at the middle and back to zero', () => {
    expect(arcOffset(0, 0.07)).toBeCloseTo(0, 10)
    expect(arcOffset(0.5, 0.07)).toBeCloseTo(0.07, 10)
    expect(arcOffset(1, 0.07)).toBeCloseTo(0, 10)
  })
})

describe('TIMING', () => {
  it('deals one card faster than it takes a card to land', () => {
    expect(TIMING.dealStep).toBeLessThan(TIMING.dealDuration)
  })

  it('waits for the clear sweep to start before dealing again', () => {
    expect(TIMING.clearDelay).toBeLessThanOrEqual(TIMING.clearDuration)
  })
})
