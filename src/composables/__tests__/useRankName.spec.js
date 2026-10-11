import { beforeEach, describe, expect, it } from 'vitest'
import { defineComponent, ref } from 'vue'
import { mount } from '@vue/test-utils'

import { useRankName } from '../useRankName'
import i18n from '@/i18n'

function setup(rank) {
  let result
  const Host = defineComponent({
    setup() {
      result = useRankName(rank)
      return () => null
    },
  })
  mount(Host, { global: { plugins: [i18n] } })
  return result
}

describe('useRankName', () => {
  beforeEach(() => {
    i18n.global.locale.value = 'es'
  })

  it('names the rank code the backend sends', () => {
    expect(setup('HABITUAL').value).toBe('Cliente')
  })

  it('follows a reactive rank and the current language', () => {
    const rank = ref('CONFIANZA')
    const name = setup(rank)

    rank.value = 'SOCIO'
    expect(name.value).toBe('Socio')
    i18n.global.locale.value = 'en'
    expect(name.value).toBe(i18n.global.t('rank.socio'))
  })

  it('falls back to the lowest rank when the code is missing or unknown', () => {
    expect(setup(null).value).toBe('Recién llegado')
    expect(setup('BOSS').value).toBe('Recién llegado')
  })
})
