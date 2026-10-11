import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { h } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

import LoungeView from '../LoungeView.vue'
import BarmanPrompt from '@/components/bar/BarmanPrompt.vue'
import BarWindow from '@/components/bar/BarWindow.vue'
import BlackjackBar from '@/components/blackjack/BlackjackBar.vue'
import BlackjackPrompt from '@/components/blackjack/BlackjackPrompt.vue'
import i18n from '@/i18n'
import { api } from '@/api/http'
import { createLounge } from '@/lounge/createLounge'
import { useBlackjackStore } from '@/stores/blackjack'

const mocks = vi.hoisted(() => ({ flat: false }))

vi.mock('@/api/http', () => ({
  api: vi.fn(),
  endSession: vi.fn(),
  refreshAccessToken: vi.fn(),
  setAccessToken: vi.fn(),
  waitForRefresh: vi.fn(),
}))
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
  const sitDown = vi.fn()
  const standUp = vi.fn()
  const setHand = vi.fn()
  createLounge.mockResolvedValue({ dispose, releasePointer, sitDown, standUp, setHand })
  const wrapper = montar(stubs)
  await vi.waitFor(() => expect(createLounge).toHaveBeenCalled())
  await vi.advanceTimersByTimeAsync(800)
  return {
    wrapper,
    releasePointer,
    dispose,
    sitDown,
    standUp,
    setHand,
    setNear: createLounge.mock.lastCall[4],
    setNearTable: createLounge.mock.lastCall[5],
  }
}

function press(key, code = key) {
  window.dispatchEvent(new KeyboardEvent('keydown', { key, code, bubbles: true, cancelable: true }))
}

describe('LoungeView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    api.mockResolvedValue({ hand: null, balance: 100, bets: [] })
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

  describe('sitting at the blackjack table', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    function playingHand(overrides = {}) {
      return {
        id: 'hand-1',
        bet: 20,
        status: 'PLAYER_TURN',
        playerCards: [{ face: 'TEN', suit: 'SPADES' }],
        playerTotal: 10,
        dealerCards: [{ face: 'KING', suit: 'CLUBS' }],
        dealerTotal: 10,
        outcome: null,
        payout: null,
        ...overrides,
      }
    }

    async function sit(ready) {
      ready.setNearTable(true)
      await ready.wrapper.vm.$nextTick()
      press('e', 'KeyE')
      await flushPromises()
    }

    it('hands the lounge a callback to report when the table is within reach', async () => {
      const { wrapper, setNearTable } = await mountReady()

      expect(setNearTable).toBeTypeOf('function')
      wrapper.unmount()
    })

    it('shows the sit prompt only while near the table and standing', async () => {
      const { wrapper, setNearTable } = await mountReady()
      expect(wrapper.findComponent(BlackjackPrompt).exists()).toBe(false)

      setNearTable(true)
      await wrapper.vm.$nextTick()
      expect(wrapper.findComponent(BlackjackPrompt).exists()).toBe(true)
      expect(wrapper.findComponent(BarmanPrompt).exists()).toBe(false)

      setNearTable(false)
      await wrapper.vm.$nextTick()
      expect(wrapper.findComponent(BlackjackPrompt).exists()).toBe(false)
      wrapper.unmount()
    })

    it('sits down with E: moves the camera, loads the table and swaps the prompt for the bar', async () => {
      const ready = await mountReady()
      ready.setNearTable(true)
      await ready.wrapper.vm.$nextTick()

      press('e', 'KeyE')
      await flushPromises()

      expect(ready.sitDown).toHaveBeenCalledTimes(1)
      expect(api).toHaveBeenCalledWith('/blackjack')
      expect(ready.wrapper.findComponent(BlackjackBar).exists()).toBe(true)
      expect(ready.wrapper.findComponent(BlackjackPrompt).exists()).toBe(false)
      ready.wrapper.unmount()
    })

    it('does not sit with E when far from the table', async () => {
      const ready = await mountReady()

      press('e', 'KeyE')
      await flushPromises()

      expect(ready.sitDown).not.toHaveBeenCalled()
      expect(ready.wrapper.findComponent(BlackjackBar).exists()).toBe(false)
      ready.wrapper.unmount()
    })

    it('closes the accounts book when sitting down', async () => {
      const dismissBook = vi.fn()
      const HudStub = { setup: (_, { expose }) => (expose({ dismissBook }), () => h('div')) }
      const ready = await mountReady({ HudLounge: HudStub })

      await sit(ready)

      expect(dismissBook).toHaveBeenCalledTimes(1)
      ready.wrapper.unmount()
    })

    it('stands up with Escape and brings the prompt back', async () => {
      const ready = await mountReady()
      await sit(ready)

      press('Escape')
      await flushPromises()

      expect(ready.standUp).toHaveBeenCalledTimes(1)
      expect(ready.wrapper.findComponent(BlackjackBar).exists()).toBe(false)
      expect(ready.wrapper.findComponent(BlackjackPrompt).exists()).toBe(true)
      ready.wrapper.unmount()
    })

    it('puts a hand already in the store back on the table when the lounge is rebuilt', async () => {
      const hand = playingHand()
      useBlackjackStore().hand = hand

      const ready = await mountReady()

      expect(ready.setHand).toHaveBeenCalledWith(hand)
      ready.wrapper.unmount()
    })

    it('keeps the member seated with Escape while a hand request is in flight', async () => {
      const ready = await mountReady()
      await sit(ready)
      useBlackjackStore().busy = true

      press('Escape')
      await flushPromises()

      expect(ready.standUp).not.toHaveBeenCalled()
      expect(ready.wrapper.findComponent(BlackjackBar).exists()).toBe(true)
      ready.wrapper.unmount()
    })

    it('hands the focus to the scene when standing up', async () => {
      const ready = await mountReady()
      await sit(ready)
      const canvas = ready.wrapper.find('canvas')
      const focus = vi.spyOn(canvas.element, 'focus')

      press('Escape')
      await flushPromises()

      expect(canvas.attributes('tabindex')).toBe('-1')
      expect(focus).toHaveBeenCalled()
      ready.wrapper.unmount()
    })

    it('hands every new hand to the lounge', async () => {
      const ready = await mountReady()
      await sit(ready)
      const hand = playingHand()

      useBlackjackStore().hand = hand
      await flushPromises()

      expect(ready.setHand).toHaveBeenCalledWith(hand)
      ready.wrapper.unmount()
    })

    it('hands the lounge a cleared table when the hand goes away', async () => {
      const ready = await mountReady()
      await sit(ready)
      useBlackjackStore().hand = playingHand()
      await flushPromises()

      useBlackjackStore().hand = null
      await flushPromises()

      expect(ready.setHand).toHaveBeenLastCalledWith(null)
      ready.wrapper.unmount()
    })

    it('renders the resumed hand in the bar after sitting', async () => {
      api.mockResolvedValue({ hand: playingHand(), balance: 80, bets: [] })
      const ready = await mountReady()

      await sit(ready)

      expect(ready.setHand).toHaveBeenCalledWith(expect.objectContaining({ id: 'hand-1' }))
      expect(ready.wrapper.findComponent(BlackjackBar).text()).toContain('10 + ?')
      ready.wrapper.unmount()
    })

    it('never opens the bar window while seated', async () => {
      const ready = await mountReady()
      await sit(ready)

      ready.setNear(true)
      press('e', 'KeyE')
      await flushPromises()

      expect(ready.wrapper.findComponent(BarWindow).exists()).toBe(false)
      expect(ready.releasePointer).not.toHaveBeenCalled()
      expect(ready.wrapper.findComponent(BarmanPrompt).exists()).toBe(false)
      ready.wrapper.unmount()
    })

    it('never sits down while the bar window is open', async () => {
      const ready = await mountReady()
      ready.setNear(true)
      await ready.wrapper.vm.$nextTick()
      press('e', 'KeyE')
      await flushPromises()

      ready.setNearTable(true)
      press('e', 'KeyE')
      await flushPromises()

      expect(ready.wrapper.findComponent(BarWindow).exists()).toBe(true)
      expect(ready.sitDown).not.toHaveBeenCalled()
      expect(ready.wrapper.findComponent(BlackjackBar).exists()).toBe(false)
      expect(ready.wrapper.findComponent(BlackjackPrompt).exists()).toBe(false)
      ready.wrapper.unmount()
    })

    it('never mounts the prompt or the bar on the flat mobile experience', async () => {
      mocks.flat = true
      const wrapper = montar()
      press('e', 'KeyE')
      await wrapper.vm.$nextTick()

      expect(wrapper.findComponent(BlackjackPrompt).exists()).toBe(false)
      expect(wrapper.findComponent(BlackjackBar).exists()).toBe(false)
      wrapper.unmount()
    })
  })
})
