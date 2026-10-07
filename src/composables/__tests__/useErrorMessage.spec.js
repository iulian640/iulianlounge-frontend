import { beforeEach, describe, expect, it } from 'vitest'
import { defineComponent } from 'vue'
import { mount } from '@vue/test-utils'

import { useErrorMessage } from '../useErrorMessage'
import i18n from '@/i18n'

function setup() {
  let result
  const Host = defineComponent({
    setup() {
      result = useErrorMessage()
      return () => null
    },
  })
  const wrapper = mount(Host, { global: { plugins: [i18n] } })
  return { ...result, wrapper }
}

describe('useErrorMessage', () => {
  beforeEach(() => {
    i18n.global.locale.value = 'es'
  })

  it('translates a known backend code', () => {
    const { message, wrapper } = setup()

    expect(message('wallet.insufficient_funds')).toBe('Eso cuesta más chikilicuatres de los que llevas encima.')
    wrapper.unmount()
  })

  it('follows the active locale', () => {
    const { message, wrapper } = setup()
    i18n.global.locale.value = 'en'

    expect(message('auth.required')).toBe(i18n.global.t('errors.auth.required'))
    expect(message('auth.required')).not.toBe('Primero hay que entrar.')
    wrapper.unmount()
  })

  it('falls back to the generic message for a code with no translation', () => {
    const { message, wrapper } = setup()

    expect(message('something.new')).toBe('Algo ha fallado. Inténtalo otra vez.')
    wrapper.unmount()
  })

  it('falls back to the generic message when there is no code', () => {
    const { message, wrapper } = setup()

    expect(message(undefined)).toBe('Algo ha fallado. Inténtalo otra vez.')
    expect(message(null)).toBe('Algo ha fallado. Inténtalo otra vez.')
    wrapper.unmount()
  })

  it('never turns a raw server string into a translation key by accident', () => {
    const { errorKey, wrapper } = setup()

    expect(errorKey('wallet.not_found')).toBe('errors.wallet.not_found')
    expect(errorKey('wallet')).toBe('errors.generic')
    expect(errorKey('')).toBe('errors.generic')
    wrapper.unmount()
  })
})
