import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

import LoungeView from '../LoungeView.vue'
import { createLounge } from '@/lounge/createLounge'

vi.mock('@/lounge/createLounge', () => ({ createLounge: vi.fn() }))
vi.mock('@/lounge/deviceMode', () => ({ prefersFlatLounge: () => false }))

function montar() {
  return mount(LoungeView, { global: { stubs: { HudLounge: true, SalonMovil: true } } })
}

describe('LoungeView', () => {
  it('al salir mientras el lounge carga, aborta la carga', async () => {
    createLounge.mockReturnValue(new Promise(() => {}))
    const wrapper = montar()
    const signal = createLounge.mock.lastCall[3]

    wrapper.unmount()

    expect(signal.aborted).toBe(true)
  })

  it('al salir con el lounge ya montado, lo libera', async () => {
    const dispose = vi.fn()
    createLounge.mockResolvedValue({ dispose })
    const wrapper = montar()
    await vi.waitFor(() => expect(createLounge).toHaveBeenCalled())
    await Promise.resolve()

    wrapper.unmount()

    expect(dispose).toHaveBeenCalledTimes(1)
  })
})
