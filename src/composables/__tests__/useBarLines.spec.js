import { beforeEach, describe, expect, it } from 'vitest'
import { defineComponent } from 'vue'
import { mount } from '@vue/test-utils'

import { useBarLines } from '../useBarLines'
import i18n from '@/i18n'

function setup() {
  let result
  const Host = defineComponent({
    setup() {
      result = useBarLines()
      return () => null
    },
  })
  const wrapper = mount(Host, { global: { plugins: [i18n] } })
  return { ...result, wrapper }
}

describe('useBarLines', () => {
  beforeEach(() => {
    i18n.global.locale.value = 'es'
  })

  it('translates a barman line from its key at render time', () => {
    const { lineText, wrapper } = setup()

    expect(lineText({ from: 'barman', key: 'barman.greeting.nadie' })).toBe('Buenas. ¿Qué te pongo?')
    i18n.global.locale.value = 'en'
    expect(lineText({ from: 'barman', key: 'barman.greeting.nadie' })).toBe('Evening. What can I get you?')
    wrapper.unmount()
  })

  it('returns model text untouched, never through the translator', () => {
    const { lineText, wrapper } = setup()
    const text = '<b>{name}</b> @:currency.name | 100%'

    expect(lineText({ from: 'barman', text })).toBe(text)
    wrapper.unmount()
  })

  it('shows what the member typed as it was typed', () => {
    const { lineText, wrapper } = setup()

    expect(lineText({ from: 'member', text: 'Un {trago} @ la barra' })).toBe('Un {trago} @ la barra')
    wrapper.unmount()
  })

  it('translates the rank parameter into its display name', () => {
    const { lineText, wrapper } = setup()

    expect(lineText({ from: 'barman', key: 'barman.ask.rank', params: { rank: 'confianza' } })).toBe(
      'Cuanto más pidas, más te conozco. Ahora eres Habitual.',
    )
    wrapper.unmount()
  })

  it('translates the drink parameter into the drink name', () => {
    const { lineText, wrapper } = setup()

    expect(lineText({ from: 'member', key: 'bar.menu.said', params: { drink: 'FRENCH_75' } })).toBe('Un French 75.')
    wrapper.unmount()
  })

  it('returns an empty string for an entry with neither text nor key', () => {
    const { lineText, wrapper } = setup()

    expect(lineText({ from: 'barman' })).toBe('')
    wrapper.unmount()
  })
})
