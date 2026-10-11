import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'

import FichaSaldo from '../hud/FichaSaldo.vue'
import i18n from '@/i18n'

function montar(balance) {
  return mount(FichaSaldo, { props: { balance }, global: { plugins: [i18n] } })
}

describe('FichaSaldo', () => {
  beforeEach(() => {
    i18n.global.locale.value = 'es'
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('enseña el saldo con separador de miles y la moneda del idioma', () => {
    const wrapper = montar(12500)

    expect(wrapper.find('.cifra').text()).toBe('12.500')
    expect(wrapper.find('.moneda').text()).toBe('monedas')
  })

  it('en inglés las monedas son coins', () => {
    i18n.global.locale.value = 'en'

    const wrapper = montar(100)

    expect(wrapper.find('.moneda').text()).toBe('coins')
  })

  it('mientras carga enseña un guion, no un 0 que mentiría', () => {
    const wrapper = montar(null)

    expect(wrapper.find('.cifra').text()).toBe('—')
  })

  it('pulsarla pide abrir el libro de cuentas', async () => {
    const wrapper = montar(100)

    await wrapper.find('button').trigger('click')

    expect(wrapper.emitted('open')).toHaveLength(1)
  })

  it('el lector de pantalla oye el saldo entero, no solo un número suelto', () => {
    const wrapper = montar(100)

    expect(wrapper.find('button').attributes('aria-label')).toBe('Saldo: 100 monedas')
  })

  it('shows what a balance change cost or paid, then lets it go', async () => {
    vi.useFakeTimers()
    const wrapper = montar(100)

    await wrapper.setProps({ balance: 60 })
    expect(wrapper.find('.delta').text()).toBe('−40')
    expect(wrapper.find('.delta').classes()).toContain('out')

    await wrapper.setProps({ balance: 110 })
    expect(wrapper.find('.delta').text()).toBe('+50')
    expect(wrapper.find('.delta').classes()).toContain('in')

    vi.advanceTimersByTime(1100)
    await nextTick()
    expect(wrapper.find('.delta').exists()).toBe(false)
  })

  it('does not take the first balance that arrives for a change', async () => {
    const wrapper = montar(null)

    await wrapper.setProps({ balance: 100 })

    expect(wrapper.find('.delta').exists()).toBe(false)
  })
})
