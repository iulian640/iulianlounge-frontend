import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

import SalonMovil from '../SalonMovil.vue'
import i18n from '@/i18n'
import { api } from '@/api/http'
import { useBarStore } from '@/stores/bar'
import { useBlackjackStore } from '@/stores/blackjack'
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

const BLACKJACK_BETS = [
  { code: 'TEN', chips: 10 },
  { code: 'TWENTY', chips: 20 },
  { code: 'FIFTY', chips: 50 },
]

const EMPTY_TABLE = { hand: null, balance: 60, bets: BLACKJACK_BETS }

const BLACKJACK_HAND = {
  id: '7f1c2d9e-3a4b-4c5d-8e6f-0a1b2c3d4e5f',
  bet: 20,
  status: 'PLAYER_TURN',
  playerCards: [
    { face: 'TEN', suit: 'SPADES' },
    { face: 'FIVE', suit: 'HEARTS' },
  ],
  playerTotal: 15,
  dealerCards: [{ face: 'KING', suit: 'CLUBS' }],
  dealerTotal: 10,
  outcome: null,
  payout: null,
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

function routeApi(menu, blackjackTable = EMPTY_TABLE) {
  api.mockImplementation((path) => {
    if (path === '/blackjack') return Promise.resolve(blackjackTable)
    return Promise.resolve(menu)
  })
}

async function mountSalon(menu = MENU, blackjackTable = EMPTY_TABLE) {
  routeApi(menu, blackjackTable)
  wrapper = mount(SalonMovil, {
    global: { plugins: [i18n], stubs: { RouterLink: RouterLinkStub } },
    slots: { hud: '<div class="hud-slot"></div>' },
    attachTo: document.body,
  })
  await flushPromises()
  return wrapper
}

async function openBar() {
  await wrapper.find('.grab').trigger('click')
}

async function openTalk() {
  await wrapper.find('#bar-sheet-tab-chat').trigger('click')
}

async function openCards() {
  await wrapper.find('#room-tab-cards').trigger('click')
  await flushPromises()
}

async function backToBar() {
  await wrapper.find('#room-tab-bar').trigger('click')
  await flushPromises()
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

  it('renders the hud slot, the club sign and the two rooms with the bar first', async () => {
    await mountSalon()

    expect(wrapper.find('.hud-slot').exists()).toBe(true)
    expect(wrapper.find('h1').text()).toBe("IULIAN'S")
    const tabs = wrapper.findAll('[role="tab"][id^="room-tab-"]')
    expect(tabs.map((tab) => tab.text())).toEqual(['La barra', 'La mesa'])
    expect(tabs.map((tab) => tab.attributes('aria-selected'))).toEqual(['true', 'false'])
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

  it('starts with the sheet lowered on the menu and the grab wired to it', async () => {
    await mountSalon()

    const grab = wrapper.find('.grab')

    expect(grab.element.tagName).toBe('BUTTON')
    expect(grab.attributes('aria-expanded')).toBe('false')
    expect(grab.attributes('aria-controls')).toBe('bar-sheet-body')
    expect(grab.attributes('aria-label')).toBe('Subir la carta')
    expect(wrapper.find('.sheet').classes()).not.toContain('expanded')
    expect(wrapper.find('#bar-sheet-tab-menu').attributes('aria-selected')).toBe('true')
    expect(wrapper.findAll('.drink')).toHaveLength(5)
  })

  it('raises the sheet with the grab and shows the chips and the text input in the talk tab', async () => {
    await mountSalon()

    await openBar()
    await openTalk()

    expect(wrapper.find('.grab').attributes('aria-expanded')).toBe('true')
    expect(wrapper.find('.sheet').classes()).toContain('expanded')
    expect(wrapper.find('#bar-sheet-chat').isVisible()).toBe(true)
    expect(wrapper.find('#bar-sheet-menu').isVisible()).toBe(false)
    expect(wrapper.findAll('.chip')).toHaveLength(2)
    expect(wrapper.find('input.field').exists()).toBe(true)
  })

  it('lowers the sheet again with a second press', async () => {
    await mountSalon()
    await openBar()

    await openBar()

    expect(wrapper.find('.grab').attributes('aria-expanded')).toBe('false')
    expect(wrapper.find('.sheet').classes()).not.toContain('expanded')
  })

  it('shows the whole conversation in the talk tab', async () => {
    await mountSalon()
    await openTalk()

    expect(wrapper.find('.chat').classes()).not.toContain('compact')
    expect(wrapper.find('[role="log"]').isVisible()).toBe(true)
  })

  it('opens the talk tab when the bubble is tapped', async () => {
    await mountSalon()

    await wrapper.find('.speech').trigger('click')

    expect(wrapper.find('.speech').element.tagName).toBe('BUTTON')
    expect(wrapper.find('.sheet').classes()).toContain('expanded')
    expect(wrapper.find('#bar-sheet-tab-chat').attributes('aria-selected')).toBe('true')
  })

  it('answers a chip locally and shows the answer in the bubble', async () => {
    await mountSalon()
    await openTalk()

    await wrapper.findAll('.chip')[0].trigger('click')

    expect(wrapper.find('.speech-text').text()).toBe('Si es tu primera vez, un Bee\'s Knees. Suave, con miel.')
  })

  it('sends free text to the barman with the current locale and shows the reply', async () => {
    await mountSalon()
    await openTalk()
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
    await openTalk()
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
    expect(wrapper.find('[role="alert"]').text()).toBe('Eso cuesta más monedas de las que llevas encima.')
    expect(wrapper.find('.sheet').classes()).toContain('expanded')
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
    expect(wrapper.find('.speech-text').text()).toBe('¿Sin monedas? Tranquilo, hoy invito yo.')
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
    expect(wrapper.find('.speech-text').text()).toBe('Aquí tienes 50 monedas. Invita la casa.')
    expect(wrapper.findAll('.order')[0].attributes('disabled')).toBeUndefined()
  })

  it('does not offer the invitation when the house is not offering it', async () => {
    await mountSalon()
    await openBar()

    expect(wrapper.find('.credit').exists()).toBe(false)
  })

  it('has no closed corners left: the stage is gone', async () => {
    await mountSalon()

    expect(wrapper.find('.corner').exists()).toBe(false)
    expect(wrapper.text()).not.toMatch(/escenario|pronto|soon/i)
  })


  it('keeps the table room inert until the member goes there', async () => {
    await mountSalon()

    const tab = wrapper.find('#room-tab-cards')

    expect(tab.attributes('aria-selected')).toBe('false')
    expect(tab.attributes('aria-controls')).toBe('room-cards')
    expect(tab.attributes('tabindex')).toBe('-1')
    expect(wrapper.find('#room-cards').attributes('inert')).toBeDefined()
    expect(wrapper.find('#room-bar').attributes('inert')).toBeUndefined()
  })

  it('does not touch the blackjack api until the cards table is opened', async () => {
    await mountSalon()

    expect(api).not.toHaveBeenCalledWith('/blackjack')
    expect(wrapper.find('.table').exists()).toBe(false)
  })

  it('opens the betting table when the member goes to the table room', async () => {
    await mountSalon()

    await openCards()

    expect(wrapper.find('#room-tab-cards').attributes('aria-selected')).toBe('true')
    expect(wrapper.find('#room-cards').attributes('inert')).toBeUndefined()
    expect(wrapper.find('#room-bar').attributes('inert')).toBeDefined()
    expect(api).toHaveBeenCalledWith('/blackjack')
    expect(wrapper.findAll('.bet-chip')).toHaveLength(3)
    expect(wrapper.find('#room-cards .action.primary').text()).toBe('Repartir · 20 ¢')
  })

  it('goes to the table from the handle at the edge of the bar', async () => {
    await mountSalon()

    await wrapper.find('.next').trigger('click')
    await flushPromises()

    expect(wrapper.find('#room-tab-cards').attributes('aria-selected')).toBe('true')
  })

  it('goes back to the bar and keeps the hand in play', async () => {
    await mountSalon(MENU, { ...EMPTY_TABLE, hand: BLACKJACK_HAND })
    await openCards()

    await backToBar()

    expect(wrapper.find('#room-tab-bar').attributes('aria-selected')).toBe('true')
    expect(useBlackjackStore().hand.id).toBe(BLACKJACK_HAND.id)
    await openCards()
    expect(api.mock.calls.filter(([path]) => path === '/blackjack')).toHaveLength(1)
  })

  it('keeps the sheet raised while the member visits the table', async () => {
    await mountSalon()
    await openBar()

    await openCards()
    await backToBar()

    expect(wrapper.find('.sheet').classes()).toContain('expanded')
  })

  it('deals a hand from the salon and updates the balance', async () => {
    await mountSalon()
    await openCards()
    api.mockResolvedValueOnce({ hand: BLACKJACK_HAND, balance: 40 })

    await wrapper.find('#room-cards .action.primary').trigger('click')
    await flushPromises()

    expect(api).toHaveBeenLastCalledWith(
      '/blackjack/hands',
      expect.objectContaining({ method: 'POST', body: { bet: 'TWENTY' } }),
    )
    expect(useWalletStore().balance).toBe(40)
    expect(wrapper.findAll('#room-cards .action').map((button) => button.text())).toEqual([
      'Pedir carta',
      'Plantarse',
    ])
  })

  it('names the rooms in English', async () => {
    i18n.global.locale.value = 'en'

    await mountSalon()

    expect(wrapper.find('#room-tab-bar').text()).toBe('The bar')
    expect(wrapper.find('#room-tab-cards').text()).toBe('The table')
  })

  it('links the privacy page from the notice under the text input', async () => {
    await mountSalon()
    await openTalk()

    expect(wrapper.findComponent(RouterLinkStub).props('to')).toBe('/privacidad')
  })
})
