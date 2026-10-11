import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import BlackjackPrompt from '../blackjack/BlackjackPrompt.vue'
import i18n from '@/i18n'

describe('BlackjackPrompt', () => {
  beforeEach(() => {
    i18n.global.locale.value = 'es'
  })

  it('shows the key and the action', () => {
    const wrapper = mount(BlackjackPrompt, { global: { plugins: [i18n] } })

    expect(wrapper.find('.key').text()).toBe('E')
    expect(wrapper.find('.action').text()).toBe('Sentarse a la mesa')
  })

  it('announces itself as a status message', () => {
    const wrapper = mount(BlackjackPrompt, { global: { plugins: [i18n] } })

    expect(wrapper.attributes('role')).toBe('status')
  })

  it('speaks English when the locale is English', () => {
    i18n.global.locale.value = 'en'

    const wrapper = mount(BlackjackPrompt, { global: { plugins: [i18n] } })

    expect(wrapper.find('.action').text()).toBe('Sit at the table')
  })
})
