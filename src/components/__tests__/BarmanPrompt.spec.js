import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import BarmanPrompt from '../bar/BarmanPrompt.vue'
import i18n from '@/i18n'

describe('BarmanPrompt', () => {
  beforeEach(() => {
    i18n.global.locale.value = 'es'
  })

  it('shows the key and the action', () => {
    const wrapper = mount(BarmanPrompt, { global: { plugins: [i18n] } })

    expect(wrapper.find('.key').text()).toBe('E')
    expect(wrapper.find('.action').text()).toBe('Hablar con el barman')
  })

  it('announces itself as a status message', () => {
    const wrapper = mount(BarmanPrompt, { global: { plugins: [i18n] } })

    expect(wrapper.attributes('role')).toBe('status')
  })

  it('speaks English when the locale is English', () => {
    i18n.global.locale.value = 'en'

    const wrapper = mount(BarmanPrompt, { global: { plugins: [i18n] } })

    expect(wrapper.find('.action').text()).toBe('Talk to the barman')
  })
})
