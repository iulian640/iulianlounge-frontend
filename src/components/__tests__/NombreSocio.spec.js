import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import NombreSocio from '../hud/NombreSocio.vue'
import i18n from '@/i18n'

function mountMember(props) {
  return mount(NombreSocio, { props, global: { plugins: [i18n] } })
}

describe('NombreSocio', () => {
  beforeEach(() => {
    i18n.global.locale.value = 'es'
  })

  it('shows the member name with the rank under it', () => {
    const wrapper = mountMember({ username: 'iulian', rank: 'HABITUAL' })

    expect(wrapper.find('.nombre').text()).toBe('iulian')
    expect(wrapper.find('.rango').text()).toBe('Cliente')
  })

  it('keeps the full name in the tooltip when it does not fit', () => {
    const name = 'a_member_with_a_very_long_name'
    const wrapper = mountMember({ username: name, rank: 'NADIE' })

    expect(wrapper.find('.nombre').attributes('title')).toBe(name)
  })

  it('asks to sign out from the exit button', async () => {
    const wrapper = mountMember({ username: 'iulian', rank: 'SOCIO' })

    await wrapper.find('button').trigger('click')

    expect(wrapper.find('button').attributes('aria-label')).toBe('Salir')
    expect(wrapper.emitted('logout')).toHaveLength(1)
  })
})
