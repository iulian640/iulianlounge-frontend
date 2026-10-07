import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import DrinkMenu from '../bar/DrinkMenu.vue'
import i18n from '@/i18n'

const DRINKS = [
  { code: 'BATHTUB_GIN', price: 5 },
  { code: 'BEES_KNEES', price: 10 },
  { code: 'GIN_RICKEY', price: 15 },
  { code: 'SIDECAR', price: 25 },
  { code: 'FRENCH_75', price: 40 },
]

function mountMenu(props = {}) {
  return mount(DrinkMenu, { props: { drinks: DRINKS, ...props }, global: { plugins: [i18n] } })
}

describe('DrinkMenu', () => {
  beforeEach(() => {
    i18n.global.locale.value = 'es'
  })

  it('lists the five drinks with their names and prices', () => {
    const wrapper = mountMenu()

    const rows = wrapper.findAll('.drink')

    expect(rows).toHaveLength(5)
    expect(rows[0].find('.name').text()).toBe('Bathtub Gin')
    expect(rows[0].find('.price').text()).toBe('5 ¢')
    expect(rows[4].find('.name').text()).toBe('French 75')
    expect(rows[4].find('.price').text()).toBe('40 ¢')
  })

  it('translates the menu to English', () => {
    i18n.global.locale.value = 'en'

    const wrapper = mountMenu()

    expect(wrapper.find('.title').text()).toBe('The menu')
    expect(wrapper.find('.order').text()).toBe('Order')
  })

  it('falls back to the raw code for a drink that has no translation', () => {
    const wrapper = mountMenu({ drinks: [{ code: 'MYSTERY', price: 1 }] })

    expect(wrapper.find('.name').text()).toBe('MYSTERY')
  })

  it('labels every order button with the drink it orders', () => {
    const wrapper = mountMenu()

    expect(wrapper.findAll('.order')[3].attributes('aria-label')).toBe('Pedir Sidecar')
  })

  it('emits the drink code when a drink is ordered', async () => {
    const wrapper = mountMenu()

    await wrapper.findAll('.order')[4].trigger('click')

    expect(wrapper.emitted('order')).toEqual([['FRENCH_75']])
  })

  it('disables every drink while an order is in flight and says so', () => {
    const wrapper = mountMenu({ ordering: true })

    for (const button of wrapper.findAll('.order')) {
      expect(button.attributes('disabled')).toBeDefined()
    }
    expect(wrapper.find('[role="status"]').text()).toBe('Sirviendo…')
    expect(wrapper.find('section').attributes('aria-busy')).toBe('true')
  })

  it('does not show the in-flight status when idle', () => {
    const wrapper = mountMenu()

    expect(wrapper.find('[role="status"]').exists()).toBe(false)
  })

  it('disables only the drinks the member cannot afford', () => {
    const wrapper = mountMenu({ balance: 12 })

    const disabled = wrapper.findAll('.order').map((button) => button.attributes('disabled') !== undefined)

    expect(disabled).toEqual([false, false, true, true, true])
  })

  it('keeps every drink enabled while the balance is still unknown', () => {
    const wrapper = mountMenu({ balance: null })

    expect(wrapper.findAll('.order').every((button) => button.attributes('disabled') === undefined)).toBe(true)
  })

  it('hides the house invitation when it is not available', () => {
    const wrapper = mountMenu({ creditAvailable: false })

    expect(wrapper.find('.credit').exists()).toBe(false)
  })

  it('offers the house invitation and emits when it is accepted', async () => {
    const wrapper = mountMenu({ creditAvailable: true, balance: 0 })

    const credit = wrapper.find('.credit')
    await credit.trigger('click')

    expect(credit.text()).toBe('Aceptar la invitación · +50 ¢')
    expect(wrapper.emitted('accept-credit')).toHaveLength(1)
  })

  it('disables the invitation while an order is in flight', () => {
    const wrapper = mountMenu({ creditAvailable: true, ordering: true })

    expect(wrapper.find('.credit').attributes('disabled')).toBeDefined()
  })

  it('shows the translated error as an alert', () => {
    const wrapper = mountMenu({ error: 'wallet.insufficient_funds' })

    expect(wrapper.find('[role="alert"]').text()).toBe('Eso cuesta más chikilicuatres de los que llevas encima.')
  })

  it('falls back to the generic message for an unknown error code', () => {
    const wrapper = mountMenu({ error: 'something.new' })

    expect(wrapper.find('[role="alert"]').text()).toBe('Algo ha fallado. Inténtalo otra vez.')
  })
})
