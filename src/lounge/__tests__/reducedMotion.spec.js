import { describe, expect, it } from 'vitest'

import { prefersReducedMotion, toReducedMotionCheck } from '../reducedMotion'

describe('prefersReducedMotion', () => {
  it('reads the media query', () => {
    const win = {
      matchMedia: (query) => ({ matches: query === '(prefers-reduced-motion: reduce)' }),
    }

    expect(prefersReducedMotion(win)).toBe(true)
  })

  it('is false when the member did not ask for less motion', () => {
    const win = { matchMedia: () => ({ matches: false }) }

    expect(prefersReducedMotion(win)).toBe(false)
  })

  it('is false without matchMedia', () => {
    expect(prefersReducedMotion({})).toBe(false)
  })

  it('reads the real window by default', () => {
    expect(typeof prefersReducedMotion()).toBe('boolean')
  })
})

describe('toReducedMotionCheck', () => {
  it('keeps a function as it is', () => {
    const check = () => true

    expect(toReducedMotionCheck(check)).toBe(check)
  })

  it('wraps a boolean', () => {
    expect(toReducedMotionCheck(true)()).toBe(true)
    expect(toReducedMotionCheck(false)()).toBe(false)
    expect(toReducedMotionCheck(undefined)()).toBe(false)
  })
})
