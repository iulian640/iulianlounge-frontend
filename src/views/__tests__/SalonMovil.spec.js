import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

import SalonMovil from '../SalonMovil.vue'
import i18n from '@/i18n'
import { api } from '@/api/http'
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

const BROKE_MENU = { ...MENU, balance: 0, creditAvailable: true, line: 'barman.broke.habitual' }

const SERVED = {
  drink: 'FRENCH_75',
  price: 40,
  balance: 20,
  rank: 'HABITUAL',
  promoted: false,
  creditAvailable: false,
  line: 'barman.serve.habitual',
}

let wrapper = null

async function mountSalon(menu = MENU) {
  api.mockResolvedValue(menu)
  wrapper = mount(SalonMovil, {
    global: { plugins: [i18n], stubs: { RouterLink: RouterLinkStub } },
    slots: { hud: '<div class="hud-slot"></div>' },
    attachTo: document.body,
  })
  await flushPromises()
  return wrapper
}

async function openBar() {
  await wrapper.find('.toggle').trigger('click')
}

describe('SalonMovil', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    i18n.global.locale.value = 'es'
    useWalletStore().balance = 60
  })

  afterEach(() => {
    wrapper?.unmount()
    wrapper = null
    document.body.innerHTML = ''
  })

  it('renders the hud slot and the room name', async () => {
    await mountSalon()

    expect(wrapper.find('.hud-slot').exists()).toBe(true)
    expect(wrapper.find('h1').text()).toBe('El Salón')
  })

  it('draws the scene with two shelves, the barman and the counter', async () => {
    await mountSalon()

    expect(wrapper.findAll('.shelf')).toHaveLength(2)
    expect(wrapper.findAll('.bottle')).toHaveLength(17)
    expect(wrapper.find('svg.barman').exists()).toBe(true)
    expect(wrapper.find('.counter').exists()).toBe(true)
  })

  it('loads the bar on mount and shows the greeting in the speech bubble', async () => {
    await mountSalon()

    expect(api).toHaveBeenCalledWith('/bar')
    expect(wrapper.find('.speech-text').text()).toBe('Otra vez por aquí. ¿Qué va a ser?')
  })

  it('shows no bubble until the barman has said something', async () => {
    api.mockReturnValue(new Promise(() => {}))
    wrapper = mount(SalonMovil, { global: { plugins: [i18n], stubs: { RouterLink: RouterLinkStub } } })

    expect(wrapper.find('.speech').exists()).toBe(false)
  })

  it('translates the bubble to English', async () => {
    i18n.global.locale.value = 'en'

    await mountSalon()

    expect(wrapper.find('.speech-text').text()).toBe("Back again. What'll it be?")
  })

  it('renders model text in the bubble as plain text', async () => {
    await mountSalon()
    useBarStore().conversation = [{ id: 1, from: 'barman', text: '<b>{x}</b> @:currency.name | y' }]
    await flushPromises()

    expect(wrapper.find('.speech-text').text()).toBe('<b>{x}</b> @:currency.name | y')
    expect(wrapper.find('.speech-text b').exists()).toBe(false)
  })

  it('shows the last barman line, not the last member line', async () => {
    await mountSalon()
    useBarStore().conversation = [
      { id: 1, from: 'barman', key: 'barman.greeting.habitual' },
      { id: 2, from: 'member', text: 'Hola' },
    ]
    await flushPromises()

    expect(wrapper.find('.speech-text').text()).toBe('Otra vez por aquí. ¿Qué va a ser?')
  })

  it('shrinks the text of long lines', async () => {
    await mountSalon()
    useBarStore().conversation = [{ id: 1, from: 'barman', text: 'a'.repeat(120) }]
    await flushPromises()

    expect(wrapper.find('.speech-text').classes()).toContain('long')
  })

  it('starts with the bar collapsed and the toggle wired to the panel', async () => {
    await mountSalon()

    const toggle = wrapper.find('.toggle')

    expect(toggle.element.tagName).toBe('BUTTON')
    expect(toggle.attributes('aria-expanded')).toBe('false')
    expect(toggle.attributes('aria-controls')).toBe('bar-panel')
    expect(wrapper.find('#bar-panel').isVisible()).toBe(false)
    expect(toggle.text()).toContain('La barra')
    expect(toggle.text()).toContain('Pedir una copa')
  })

  it('reveals the chips, the text input and the menu when the toggle is pressed', async () => {
    await mountSalon()

    await openBar()

    expect(wrapper.find('.toggle').attributes('aria-expanded')).toBe('true')
    expect(wrapper.find('#bar-panel').isVisible()).toBe(true)
    expect(wrapper.findAll('.chip')).toHaveLength(2)
    expect(wrapper.find('input.field').exists()).toBe(true)
    expect(wrapper.findAll('.drink')).toHaveLength(5)
  })

  it('collapses the bar again with a second press', async () => {
    await mountSalon()
    await openBar()

    await openBar()

    expect(wrapper.find('.toggle').attributes('aria-expanded')).toBe('false')
    expect(wrapper.find('#bar-panel').isVisible()).toBe(false)
  })

  it('keeps the whole conversation in a compact log inside the panel', async () => {
    await mountSalon()
    await openBar()

    expect(wrapper.find('.chat').classes()).toContain('compact')
    expect(wrapper.find('[role="log"]').exists()).toBe(true)
  })

  it('hides the bubble from assistive technology only while the log is open', async () => {
    await mountSalon()

    expect(wrapper.find('.speech').attributes('aria-hidden')).toBeUndefined()

    await openBar()

    expect(wrapper.find('.speech').attributes('aria-hidden')).toBe('true')
  })

  it('answers a chip locally and shows the answer in the bubble', async () => {
    await mountSalon()
    await openBar()

    await wrapper.findAll('.chip')[0].trigger('click')

    expect(wrapper.find('.speech-text').text()).toBe('Si es tu primera vez, un Bee\'s Knees. Suave, con miel.')
  })

  it('sends free text to the barman with the current locale and shows the reply', async () => {
    await mountSalon()
    await openBar()
    api.mockResolvedValueOnce({ source: 'LLM', text: 'Un Sidecar, sin dudarlo.' })

    await wrapper.find('input.field').setValue('Algo con coñac')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(api).toHaveBeenLastCalledWith(
      '/bar/talk',
      expect.objectContaining({ method: 'POST', body: { text: 'Algo con coñac', locale: 'es' } }),
    )
    expect(wrapper.find('.speech-text').text()).toBe('Un Sidecar, sin dudarlo.')
  })

  it('locks the text input after a fallback reply and keeps chips and menu usable', async () => {
    await mountSalon()
    await openBar()
    api.mockResolvedValueOnce({ source: 'FALLBACK', line: 'barman.busy' })

    await wrapper.find('input.field').setValue('Hola')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.find('input.field').attributes('readonly')).toBeDefined()
    expect(wrapper.find('.chip').attributes('disabled')).toBeUndefined()
    expect(wrapper.find('.order').attributes('disabled')).toBeUndefined()
  })

  it('serves a drink: updates the balance, the bubble and puts a glass on the counter', async () => {
    await mountSalon()
    await openBar()
    expect(wrapper.find('.glass').exists()).toBe(false)
    api.mockResolvedValueOnce(SERVED)

    await wrapper.findAll('.order')[4].trigger('click')
    await flushPromises()

    expect(api).toHaveBeenLastCalledWith(
      '/bar/orders',
      expect.objectContaining({ method: 'POST', body: { drink: 'FRENCH_75' } }),
    )
    expect(wrapper.find('.speech-text').text()).toBe('Marchando.')
    const glass = wrapper.find('.glass')
    expect(glass.exists()).toBe(true)
    expect(glass.attributes('role')).toBe('img')
    expect(glass.attributes('aria-label')).toBe('Una copa servida en la barra')
  })

  it('does not show a glass when the order fails', async () => {
    await mountSalon()
    await openBar()
    api.mockRejectedValueOnce(Object.assign(new Error('x'), { status: 409, code: 'wallet.insufficient_funds' }))

    await wrapper.findAll('.order')[0].trigger('click')
    await flushPromises()

    expect(wrapper.find('.glass').exists()).toBe(false)
    expect(wrapper.find('[role="alert"]').text()).toBe('Eso cuesta más chikilicuatres de los que llevas encima.')
  })

  it('removes the glass when the bar store is reset', async () => {
    await mountSalon()
    await openBar()
    api.mockResolvedValueOnce(SERVED)
    await wrapper.findAll('.order')[4].trigger('click')
    await flushPromises()

    useBarStore().$reset()
    await flushPromises()

    expect(wrapper.find('.glass').exists()).toBe(false)
  })

  it('at zero balance offers the house invitation and disables every drink', async () => {
    useWalletStore().balance = 0

    await mountSalon(BROKE_MENU)
    await openBar()

    expect(wrapper.find('.credit').text()).toBe('Aceptar la invitación · +50 ¢')
    const orders = wrapper.findAll('.order')
    expect(orders).toHaveLength(5)
    expect(orders.every((button) => button.attributes('disabled') !== undefined)).toBe(true)
    expect(wrapper.find('.speech-text').text()).toBe('¿Sin fichas? Tranquilo, hoy invito yo.')
  })

  it('accepting the invitation asks the house credit and enables the drinks', async () => {
    useWalletStore().balance = 0
    await mountSalon(BROKE_MENU)
    await openBar()
    api.mockResolvedValueOnce({ balance: 50, rank: 'HABITUAL', line: 'barman.house_credit' })

    await wrapper.find('.credit').trigger('click')
    await flushPromises()

    expect(api).toHaveBeenLastCalledWith('/bar/house-credit', { method: 'POST' })
    expect(wrapper.find('.credit').exists()).toBe(false)
    expect(wrapper.find('.speech-text').text()).toBe('Aquí tienes 50 fichas. Invita la casa.')
    expect(wrapper.findAll('.order')[0].attributes('disabled')).toBeUndefined()
  })

  it('does not offer the invitation when the house is not offering it', async () => {
    await mountSalon()
    await openBar()

    expect(wrapper.find('.credit').exists()).toBe(false)
  })

  it('keeps the cards table and the stage as closed corners without promising anything', async () => {
    await mountSalon()

    const corners = wrapper.findAll('.corner.closed')

    expect(corners.map((corner) => corner.find('.corner-title').text())).toEqual([
      'La mesa de cartas',
      'El escenario',
    ])
    expect(corners.map((corner) => corner.find('.corner-state').text())).toEqual(['Cerrado', 'Cerrado'])
    expect(corners.some((corner) => corner.find('button, a').exists())).toBe(false)
    expect(wrapper.text()).not.toMatch(/pronto|soon/i)
  })

  it('shows the closed corners in English', async () => {
    i18n.global.locale.value = 'en'

    await mountSalon()

    expect(wrapper.findAll('.corner.closed').map((corner) => corner.text())).toEqual([
      'The card tableClosed',
      'The stageClosed',
    ])
  })

  it('links the privacy page from the notice under the text input', async () => {
    await mountSalon()
    await openBar()

    expect(wrapper.findComponent(RouterLinkStub).props('to')).toBe('/privacidad')
  })
})
