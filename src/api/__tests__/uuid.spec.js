import { afterEach, describe, expect, it, vi } from 'vitest'

import { newUuid } from '../uuid'

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

describe('newUuid', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('uses crypto.randomUUID when the browser offers it', () => {
    vi.stubGlobal('crypto', { randomUUID: () => '11111111-1111-4111-8111-111111111111' })

    expect(newUuid()).toBe('11111111-1111-4111-8111-111111111111')
  })

  it('builds a valid v4 UUID from random bytes outside secure contexts', () => {
    vi.stubGlobal('crypto', {
      getRandomValues: (bytes) => {
        bytes.fill(255)
        return bytes
      },
    })

    expect(newUuid()).toMatch(UUID_V4)
    expect(newUuid()).toBe('ffffffff-ffff-4fff-bfff-ffffffffffff')
  })

  it('returns a different value on every call', () => {
    expect(newUuid()).not.toBe(newUuid())
    expect(newUuid()).toMatch(UUID_V4)
  })
})
