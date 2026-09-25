import { beforeEach, describe, expect, it } from 'vitest'
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

  it('enseña el saldo con separador de miles y la moneda del idioma', () => {
    // En español el separador de miles aparece a partir de 5 cifras: 1250, pero 12.500
    const wrapper = montar(12500)

    expect(wrapper.find('.cifra').text()).toBe('12.500')
    expect(wrapper.find('.moneda').text()).toBe('chikilicuatres')
  })

  it('en inglés las fichas son Shrutebucks', () => {
    i18n.global.locale.value = 'en'

    const wrapper = montar(100)

    expect(wrapper.find('.moneda').text()).toBe('Shrutebucks')
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

    expect(wrapper.find('button').attributes('aria-label')).toBe('Saldo: 100 chikilicuatres')
  })
})
