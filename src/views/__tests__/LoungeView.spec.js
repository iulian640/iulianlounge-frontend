import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { h } from 'vue'
import { mount } from '@vue/test-utils'

import LoungeView from '../LoungeView.vue'
import BarmanPrompt from '@/components/bar/BarmanPrompt.vue'
import BarWindow from '@/components/bar/BarWindow.vue'
import i18n from '@/i18n'
import { createLounge } from '@/lounge/createLounge'

const mocks = vi.hoisted(() => ({ flat: false }))

vi.mock('@/lounge/createLounge', () => ({ createLounge: vi.fn() }))
vi.mock('@/lounge/deviceMode', () => ({ prefersFlatLounge: () => mocks.flat }))

function montar(stubs = {}) {
  return mount(LoungeView, {
    global: { plugins: [i18n], stubs: { HudLounge: true, SalonMovil: true, BarWindow: true, ...stubs } },
  })
}

async function mountReady(stubs) {
  const releasePointer = vi.fn()
  const dispose = vi.fn()
  createLounge.mockResolvedValue({ dispose, releasePointer })
  const wrapper = montar(stubs)
  await vi.waitFor(() => expect(createLounge).toHaveBeenCalled())
  await vi.advanceTimersByTimeAsync(800)
  return { wrapper, releasePointer, dispose, setNear: createLounge.mock.lastCall[4] }
}

function press(key, code = key) {
  window.dispatchEvent(new KeyboardEvent('keydown', { key, code, bubbles: true, cancelable: true }))
}

describe('LoungeView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.flat = false
    i18n.global.locale.value = 'es'
  })

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

  describe('talking to the barman', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('hands the lounge a callback to report when the barman is within reach', async () => {
      const { wrapper, setNear } = await mountReady()

      expect(setNear).toBeTypeOf('function')
      wrapper.unmount()
    })

    it('shows the E prompt only while near the barman', async () => {
      const { wrapper, setNear } = await mountReady()
      expect(wrapper.findComponent(BarmanPrompt).exists()).toBe(false)

      setNear(true)
      await wrapper.vm.$nextTick()
      expect(wrapper.findComponent(BarmanPrompt).exists()).toBe(true)

      setNear(false)
      await wrapper.vm.$nextTick()
      expect(wrapper.findComponent(BarmanPrompt).exists()).toBe(false)
      wrapper.unmount()
    })

    it('opens the window with E when near, gives the mouse back and hides the prompt', async () => {
      const { wrapper, releasePointer, setNear } = await mountReady()
      setNear(true)
      await wrapper.vm.$nextTick()

      press('e', 'KeyE')
      await wrapper.vm.$nextTick()

      expect(wrapper.findComponent(BarWindow).exists()).toBe(true)
      expect(releasePointer).toHaveBeenCalledTimes(1)
      expect(wrapper.findComponent(BarmanPrompt).exists()).toBe(false)
      wrapper.unmount()
    })

    it('closes the accounts book when the window opens', async () => {
      const dismissBook = vi.fn()
      const HudStub = { setup: (_, { expose }) => (expose({ dismissBook }), () => h('div')) }
      const { wrapper, setNear } = await mountReady({ HudLounge: HudStub })
      setNear(true)
      await wrapper.vm.$nextTick()

      press('e', 'KeyE')
      await wrapper.vm.$nextTick()

      expect(dismissBook).toHaveBeenCalledTimes(1)
      wrapper.unmount()
    })

    it('leaves the accounts book alone when E is pressed far from the barman', async () => {
      const dismissBook = vi.fn()
      const HudStub = { setup: (_, { expose }) => (expose({ dismissBook }), () => h('div')) }
      const { wrapper } = await mountReady({ HudLounge: HudStub })

      press('e', 'KeyE')
      await wrapper.vm.$nextTick()

      expect(dismissBook).not.toHaveBeenCalled()
      wrapper.unmount()
    })

    it('does not open the window with E when far from the barman', async () => {
      const { wrapper, releasePointer } = await mountReady()

      press('e', 'KeyE')
      await wrapper.vm.$nextTick()

      expect(wrapper.findComponent(BarWindow).exists()).toBe(false)
      expect(releasePointer).not.toHaveBeenCalled()
      wrapper.unmount()
    })

    it('closes the window with Escape without grabbing the mouse again', async () => {
      const { wrapper, releasePointer, setNear } = await mountReady()
      setNear(true)
      press('e', 'KeyE')
      await wrapper.vm.$nextTick()

      press('Escape')
      await wrapper.vm.$nextTick()

      expect(wrapper.findComponent(BarWindow).exists()).toBe(false)
      expect(releasePointer).toHaveBeenCalledTimes(1)
      expect(wrapper.findComponent(BarmanPrompt).exists()).toBe(true)
      wrapper.unmount()
    })

    it('closes the window when the window asks to close', async () => {
      const { wrapper, setNear } = await mountReady()
      setNear(true)
      press('e', 'KeyE')
      await wrapper.vm.$nextTick()

      wrapper.findComponent(BarWindow).vm.$emit('close')
      await wrapper.vm.$nextTick()

      expect(wrapper.findComponent(BarWindow).exists()).toBe(false)
      wrapper.unmount()
    })

    it('never mounts the prompt or the window on the flat mobile experience', async () => {
      mocks.flat = true
      const wrapper = montar()
      press('e', 'KeyE')
      await wrapper.vm.$nextTick()

      expect(createLounge).not.toHaveBeenCalled()
      expect(wrapper.findComponent(BarmanPrompt).exists()).toBe(false)
      expect(wrapper.findComponent(BarWindow).exists()).toBe(false)
      wrapper.unmount()
    })
  })
})
