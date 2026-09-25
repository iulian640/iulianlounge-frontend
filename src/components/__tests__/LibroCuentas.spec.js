import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import LibroCuentas from '../hud/LibroCuentas.vue'
import i18n from '@/i18n'

const BONUS = { id: 't-1', amount: 100, type: 'WELCOME_BONUS', balanceAfter: 100, createdAt: '2026-09-25T12:00:00Z' }
const GASTO = { id: 't-2', amount: -30, type: 'DESCONOCIDO', balanceAfter: 70, createdAt: '2026-09-25T13:00:00Z' }

function montar(transactions) {
  return mount(LibroCuentas, { props: { transactions }, global: { plugins: [i18n] }, attachTo: document.body })
}

describe('LibroCuentas', () => {
  beforeEach(() => {
    i18n.global.locale.value = 'es'
  })

  it('traduce el tipo de movimiento y pinta las entradas en oro', () => {
    const wrapper = montar([BONUS])

    expect(wrapper.find('.tipo').text()).toBe('Fichas de bienvenida')
    expect(wrapper.find('.importe').text()).toBe('+100')
    expect(wrapper.find('.importe').classes()).toContain('entra')
    wrapper.unmount()
  })

  it('las salidas van en burdeos y con signo menos', () => {
    const wrapper = montar([GASTO])

    expect(wrapper.find('.importe').text()).toBe('−30')
    expect(wrapper.find('.importe').classes()).toContain('sale')
    wrapper.unmount()
  })

  it('un tipo sin traducción enseña un texto genérico, nunca la clave cruda del servidor', () => {
    const wrapper = montar([GASTO])

    expect(wrapper.find('.tipo').text()).toBe('Movimiento')
    wrapper.unmount()
  })

  it('si la carga falló, lo dice en vez de fingir que no hay movimientos', () => {
    const wrapper = mount(LibroCuentas, {
      props: { transactions: [], error: 'internal.error' },
      global: { plugins: [i18n] },
    })

    expect(wrapper.find('[role="alert"]').exists()).toBe(true)
    expect(wrapper.find('.vacio').exists()).toBe(false)
    wrapper.unmount()
  })

  it('el saldo lleva separador de miles y un importe 0 no sale en burdeos', () => {
    const wrapper = montar([{ ...BONUS, amount: 0, balanceAfter: 12500 }])

    expect(wrapper.find('.importe').text()).toBe('0')
    expect(wrapper.find('.importe').classes()).not.toContain('sale')
    expect(wrapper.find('.saldo').text()).toBe('Saldo: 12.500')
    wrapper.unmount()
  })

  it('al abrirse, el foco entra en el panel', () => {
    const wrapper = montar([BONUS])

    expect(document.activeElement).toBe(wrapper.find('h2').element)
    wrapper.unmount()
  })

  it('sin movimientos lo dice', () => {
    const wrapper = montar([])

    expect(wrapper.find('.vacio').text()).toBe('Aún no hay movimientos.')
    wrapper.unmount()
  })

  it('Escape y el aspa cierran el libro', async () => {
    const wrapper = montar([BONUS])

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await wrapper.find('.cerrar').trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(2)
    wrapper.unmount()
  })
})
