import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

import BarWindow from '../bar/BarWindow.vue'
import i18n from '@/i18n'
import { api } from '@/api/http'
import { useAuthStore } from '@/stores/auth'
import { useBarStore } from '@/stores/bar'
import { useWalletStore } from '@/stores/wallet'

vi.mock('@/api/http', () => ({
  api: vi.fn(),
  endSession: vi.fn(),
  refreshAccessToken: vi.fn(),
  setAccessToken: vi.fn(),
  waitForRefresh: vi.fn(),
}))

const MENU = {
  drinks: [
    { code: 'BATHTUB_GIN', price: 5 },
    { code: 'BEES_KNEES', price: 10 },
    { code: 'GIN_RICKEY', price: 15 },
    { code: 'SIDECAR', price: 25 },
    { code: 'FRENCH_75', price: 40 },
  ],
  balance: 60,
  rank: 'HABITUAL',
  creditAvailable: false,
  line: 'barman.greeting.habitual',
}

let wrapper = null

async function mountWindow() {
  wrapper = mount(BarWindow, {
    global: { plugins: [i18n], stubs: { RouterLink: RouterLinkStub } },
    attachTo: document.body,
  })
  await flushPromises()
  return wrapper
}

function pressTab(init = {}) {
  const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true, ...init })
  window.dispatchEvent(event)
  return event
}

function press(key, init = {}) {
  window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...init }))
}

describe('BarWindow', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    i18n.global.locale.value = 'es'
    api.mockResolvedValue(MENU)
    useAuthStore().user = { username: 'cursaito', rank: 'HABITUAL' }
    useWalletStore().balance = 60
  })

  afterEach(() => {
    wrapper?.unmount()
    wrapper = null
    document.body.innerHTML = ''
  })

  it('is an aria-modal dialog labelled by its title', async () => {
    await mountWindow()

    const dialog = wrapper.find('[role="dialog"]')

    expect(dialog.attributes('aria-modal')).toBe('true')
    expect(wrapper.find(`#${dialog.attributes('aria-labelledby')}`).text()).toBe('El barman')
  })

  it('moves the focus into the window when it opens', async () => {
    await mountWindow()

    expect(document.activeElement).toBe(wrapper.find('h2').element)
  })

  it('shows the member rank by its display name', async () => {
    await mountWindow()

    expect(wrapper.find('.rank').text()).toBe('Tu rango: Cliente')
    expect(wrapper.find('.rank-name').text()).toBe('Cliente')
  })

  it('falls back to the lowest rank when the rank is unknown', async () => {
    api.mockResolvedValue({ ...MENU, rank: 'LEGENDARIO' })

    await mountWindow()

    expect(wrapper.find('.rank-name').text()).toBe('Recién llegado')
  })

  it('shows the lowest rank when there is no member loaded', async () => {
    useAuthStore().user = null

    await mountWindow()

    expect(wrapper.find('.rank-name').text()).toBe('Recién llegado')
  })

  it('loads the menu when it opens and shows the greeting and the drinks', async () => {
    await mountWindow()

    expect(api).toHaveBeenCalledWith('/bar')
    expect(wrapper.find('.bubble').text()).toBe('Otra vez por aquí. ¿Qué va a ser?')
    expect(wrapper.findAll('.drink')).toHaveLength(5)
  })

  it('shows the load failure instead of an empty menu', async () => {
    api.mockRejectedValue(Object.assign(new Error('x'), { status: 404, code: 'wallet.not_found' }))

    await mountWindow()

    expect(wrapper.find('[role="alert"]').text()).toBe('No encontramos tu cartera. Avisa a la casa.')
  })

  it('emits close when Escape is pressed', async () => {
    await mountWindow()

    press('Escape')

    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('emits close from the close button', async () => {
    await mountWindow()

    await wrapper.find('.close').trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('tells the member that Escape closes it', async () => {
    await mountWindow()

    expect(wrapper.find('.hint').text()).toBe('Esc para cerrar')
  })

  it('answers the chips locally without calling the backend', async () => {
    await mountWindow()
    api.mockClear()

    await wrapper.findAll('.chip')[0].trigger('click')

    expect(api).not.toHaveBeenCalled()
    const bubbles = wrapper.findAll('.bubble').map((bubble) => bubble.text())
    expect(bubbles.slice(-2)).toEqual([
      '¿Qué me recomiendas?',
      'Si es tu primera vez, un Bee\'s Knees. Suave, con miel.',
    ])
  })

  it('answers the rank chip with the display name of the current rank', async () => {
    await mountWindow()

    await wrapper.findAll('.chip')[1].trigger('click')

    expect(wrapper.findAll('.bubble').at(-1).text()).toBe('Cuanto más pidas, más te conozco. Ahora eres Cliente.')
  })

  it('sends typed text to the barman with the interface language', async () => {
    await mountWindow()
    api.mockResolvedValue({ source: 'LLM', text: 'Un Sidecar, entonces.', line: null })

    await wrapper.find('input').setValue('¿Qué tomo hoy?')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(api).toHaveBeenLastCalledWith(
      '/bar/talk',
      expect.objectContaining({ method: 'POST', body: { text: '¿Qué tomo hoy?', locale: 'es' } }),
    )
    expect(wrapper.findAll('.bubble').map((bubble) => bubble.text()).slice(-2)).toEqual([
      '¿Qué tomo hoy?',
      'Un Sidecar, entonces.',
    ])
  })

  it('sends the English locale when the interface is in English', async () => {
    i18n.global.locale.value = 'en'
    await mountWindow()
    api.mockResolvedValue({ source: 'LLM', text: 'Coming up.', line: null })

    await wrapper.find('input').setValue('A sidecar')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(api.mock.lastCall[1].body).toEqual({ text: 'A sidecar', locale: 'en' })
  })

  it('locks the text input after a fallback reply but keeps the menu and the chips usable', async () => {
    await mountWindow()
    api.mockResolvedValue({ source: 'FALLBACK', text: null, line: 'barman.busy' })

    await wrapper.find('input').setValue('hola')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.find('input').attributes('readonly')).toBeDefined()
    expect(wrapper.find('.chip').attributes('disabled')).toBeUndefined()
    expect(wrapper.find('.order').attributes('disabled')).toBeUndefined()
    useBarStore().$reset()
  })

  it('orders a drink with an idempotency key and updates the balance', async () => {
    await mountWindow()
    api.mockResolvedValue({
      drink: 'FRENCH_75',
      price: 40,
      balance: 20,
      rank: 'HABITUAL',
      promoted: false,
      creditAvailable: false,
      line: 'barman.serve.habitual',
    })

    await wrapper.findAll('.order')[4].trigger('click')
    await flushPromises()

    const [path, options] = api.mock.lastCall
    expect(path).toBe('/bar/orders')
    expect(options.body).toEqual({ drink: 'FRENCH_75' })
    expect(options.headers['Idempotency-Key']).toMatch(/^[0-9a-f-]{36}$/)
    expect(useWalletStore().balance).toBe(20)
    expect(wrapper.findAll('.bubble').map((bubble) => bubble.text()).slice(-2)).toEqual([
      'Un French 75.',
      'Marchando.',
    ])
  })

  it('disables the drinks the member cannot afford', async () => {
    api.mockResolvedValue({ ...MENU, balance: 30 })
    await mountWindow()

    const disabled = wrapper.findAll('.order').map((button) => button.attributes('disabled') !== undefined)

    expect(disabled).toEqual([false, false, false, false, true])
  })

  it('accepts the house invitation when it is available', async () => {
    api.mockResolvedValue({ ...MENU, balance: 0, creditAvailable: true, line: 'barman.broke.habitual' })
    useWalletStore().balance = 0
    await mountWindow()
    api.mockResolvedValue({ amount: 50, balance: 50, rank: 'HABITUAL', line: 'barman.house_credit' })

    await wrapper.find('.credit').trigger('click')
    await flushPromises()

    expect(api).toHaveBeenLastCalledWith('/bar/house-credit', { method: 'POST' })
    expect(useWalletStore().balance).toBe(50)
    expect(wrapper.find('.credit').exists()).toBe(false)
  })

  function controls() {
    const dialog = wrapper.find('[role="dialog"]').element
    return [...dialog.querySelectorAll('a[href], button:not([disabled]), input:not([disabled])')]
  }

  it('keeps the focus inside: Tab on the last control wraps to the first', async () => {
    await mountWindow()
    const items = controls()
    items.at(-1).focus()

    const event = pressTab()

    expect(event.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(items[0])
  })

  it('keeps the focus inside: Shift+Tab on the first control wraps to the last', async () => {
    await mountWindow()
    const items = controls()
    items[0].focus()

    const event = pressTab({ shiftKey: true })

    expect(event.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(items.at(-1))
  })

  it('keeps the focus inside: Shift+Tab on the title wraps to the last control', async () => {
    await mountWindow()
    expect(document.activeElement).toBe(wrapper.find('h2').element)

    const event = pressTab({ shiftKey: true })

    expect(event.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(controls().at(-1))
  })

  it('keeps the focus inside: Tab with the focus outside the window goes to the first control', async () => {
    await mountWindow()
    document.activeElement.blur()

    const event = pressTab()

    expect(event.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(controls()[0])
  })

  it('keeps the focus inside: Shift+Tab with the focus outside the window goes to the last control', async () => {
    await mountWindow()
    document.activeElement.blur()

    const event = pressTab({ shiftKey: true })

    expect(event.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(controls().at(-1))
  })

  it('leaves Tab alone in the middle of the window', async () => {
    await mountWindow()
    const items = controls()
    items[1].focus()

    const event = pressTab()

    expect(event.defaultPrevented).toBe(false)
    expect(document.activeElement).toBe(items[1])
  })

  it('keeps the focus inside the window while the text input is locked after a fallback', async () => {
    await mountWindow()
    api.mockResolvedValue({ source: 'FALLBACK', text: null, line: 'barman.busy' })
    const input = wrapper.find('input').element
    await wrapper.find('input').setValue('hola')
    input.focus()

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.find('[role="dialog"]').element.contains(document.activeElement)).toBe(true)
    expect(document.activeElement).not.toBe(document.body)
    useBarStore().$reset()
  })

  it('stops trapping the focus once it is closed', async () => {
    await mountWindow()
    document.activeElement.blur()
    wrapper.unmount()
    wrapper = null

    const event = pressTab()

    expect(event.defaultPrevented).toBe(false)
  })

  it('gives the focus back to what had it before opening', async () => {
    const opener = document.body.appendChild(document.createElement('button'))
    opener.focus()
    await mountWindow()

    wrapper.unmount()
    wrapper = null

    expect(document.activeElement).toBe(opener)
  })

  it('renders in English', async () => {
    i18n.global.locale.value = 'en'

    await mountWindow()

    expect(wrapper.find('h2').text()).toBe('The barman')
    expect(wrapper.find('.rank').text()).toBe('Your rank: Customer')
  })
})
