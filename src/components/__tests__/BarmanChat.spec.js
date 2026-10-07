import { beforeEach, describe, expect, it } from 'vitest'
import { mount, RouterLinkStub } from '@vue/test-utils'

import BarmanChat from '../bar/BarmanChat.vue'
import i18n from '@/i18n'

const LINES = [
  { id: 1, from: 'barman', key: 'barman.greeting.nadie' },
  { id: 2, from: 'member', key: 'bar.talk.chips.recommend' },
  { id: 3, from: 'barman', text: 'Un Gin Rickey, fresco y ligero.' },
]

function mountChat(props = {}) {
  return mount(BarmanChat, {
    props: { lines: LINES, ...props },
    global: { plugins: [i18n], stubs: { RouterLink: RouterLinkStub } },
    attachTo: document.body,
  })
}

describe('BarmanChat', () => {
  let wrapper

  beforeEach(() => {
    i18n.global.locale.value = 'es'
    wrapper?.unmount()
    document.body.innerHTML = ''
  })

  it('renders the conversation inside a labelled log', () => {
    wrapper = mountChat()

    const log = wrapper.find('[role="log"]')

    expect(log.attributes('aria-label')).toBe('Conversación con el barman')
    expect(log.findAll('.bubble').map((bubble) => bubble.text())).toEqual([
      'Buenas. ¿Qué te pongo?',
      '¿Qué me recomiendas?',
      'Un Gin Rickey, fresco y ligero.',
    ])
  })

  it('tells barman bubbles from member bubbles', () => {
    wrapper = mountChat()

    const bubbles = wrapper.findAll('.bubble')

    expect(bubbles.map((bubble) => bubble.classes())).toEqual([
      expect.arrayContaining(['barman']),
      expect.arrayContaining(['member']),
      expect.arrayContaining(['barman']),
    ])
  })

  it('renders model text as plain text and never as markup', () => {
    wrapper = mountChat({ lines: [{ id: 1, from: 'barman', text: '<b>x</b><img src=x onerror=alert(1)>' }] })

    expect(wrapper.find('.bubble').text()).toBe('<b>x</b><img src=x onerror=alert(1)>')
    expect(wrapper.find('.bubble b').exists()).toBe(false)
    expect(wrapper.find('.bubble img').exists()).toBe(false)
  })

  it('does not let vue-i18n interpret braces, at signs or pipes in model text', () => {
    const text = 'Dos {copas} @:currency.name | tres'
    wrapper = mountChat({ lines: [{ id: 1, from: 'barman', text }] })

    expect(wrapper.find('.bubble').text()).toBe(text)
  })

  it('resolves the rank parameter of the ask-rank answer', () => {
    wrapper = mountChat({
      lines: [{ id: 1, from: 'barman', key: 'barman.ask.rank', params: { rank: 'habitual' } }],
    })

    expect(wrapper.find('.bubble').text()).toBe('Cuanto más pidas, más te conozco. Ahora eres Cliente.')
  })

  it('emits ask with the option when a chip is clicked', async () => {
    wrapper = mountChat()

    const chips = wrapper.findAll('.chip')
    await chips[0].trigger('click')
    await chips[1].trigger('click')

    expect(chips.map((chip) => chip.text())).toEqual(['¿Qué me recomiendas?', '¿Cómo subo de rango?'])
    expect(wrapper.emitted('ask')).toEqual([['recommend'], ['rank']])
  })

  it('limits the text input to 280 characters', () => {
    wrapper = mountChat()

    expect(wrapper.find('input').attributes('maxlength')).toBe('280')
  })

  it('sends the trimmed text on submit and clears the input', async () => {
    wrapper = mountChat()
    const input = wrapper.find('input')

    await input.setValue('  ¿Qué tal la noche?  ')
    await wrapper.find('form').trigger('submit')

    expect(wrapper.emitted('say')).toEqual([['¿Qué tal la noche?']])
    expect(input.element.value).toBe('')
  })

  it('does not send an empty or blank message', async () => {
    wrapper = mountChat()

    await wrapper.find('input').setValue('   ')
    await wrapper.find('form').trigger('submit')

    expect(wrapper.emitted('say')).toBeUndefined()
    expect(wrapper.find('.send').attributes('disabled')).toBeDefined()
  })

  it('enables the send button once there is text', async () => {
    wrapper = mountChat()

    await wrapper.find('input').setValue('hola')

    expect(wrapper.find('.send').attributes('disabled')).toBeUndefined()
  })

  it('blocks the input and disables the button while the barman is thinking', () => {
    wrapper = mountChat({ thinking: true })

    expect(wrapper.find('input').attributes('readonly')).toBeDefined()
    expect(wrapper.find('input').attributes('aria-disabled')).toBe('true')
    expect(wrapper.find('input').attributes('disabled')).toBeUndefined()
    expect(wrapper.find('.send').attributes('disabled')).toBeDefined()
    expect(wrapper.find('[role="status"]').text()).toBe('El barman lo está pensando…')
  })

  it('does not send while thinking even if the form is submitted', async () => {
    wrapper = mountChat({ thinking: true })
    await wrapper.find('input').setValue('hola')

    await wrapper.find('form').trigger('submit')

    expect(wrapper.emitted('say')).toBeUndefined()
  })

  it('locks the text input after a fallback but keeps the chips usable', async () => {
    wrapper = mountChat({ locked: true })

    await wrapper.find('.chip').trigger('click')

    expect(wrapper.find('input').attributes('readonly')).toBeDefined()
    expect(wrapper.find('[role="status"]').text()).toBe(
      'El barman descansa un momento. Usa las preguntas o la carta.',
    )
    expect(wrapper.find('.chip').attributes('disabled')).toBeUndefined()
    expect(wrapper.emitted('ask')).toEqual([['recommend']])
  })

  it('shows no status line when the barman is free', () => {
    wrapper = mountChat()

    expect(wrapper.find('[role="status"]').exists()).toBe(false)
  })

  it('keeps the focus in the input while the barman is thinking', async () => {
    wrapper = mountChat()
    wrapper.find('input').element.focus()

    await wrapper.setProps({ thinking: true })

    expect(document.activeElement).toBe(wrapper.find('input').element)
  })

  it('keeps the focus in the input when it gets locked after a fallback', async () => {
    wrapper = mountChat({ thinking: true })
    wrapper.find('input').element.focus()

    await wrapper.setProps({ thinking: false, locked: true })

    expect(document.activeElement).toBe(wrapper.find('input').element)
    expect(wrapper.find('input').attributes('readonly')).toBeDefined()
  })

  it('keeps the focus in the input after sending with the button', async () => {
    wrapper = mountChat()
    await wrapper.find('input').setValue('hola')
    wrapper.find('.send').element.focus()

    await wrapper.find('form').trigger('submit')

    expect(document.activeElement).toBe(wrapper.find('input').element)
  })

  it('does not take the focus away from a chip when the barman finishes thinking', async () => {
    wrapper = mountChat({ thinking: true })
    wrapper.find('.chip').element.focus()

    await wrapper.setProps({ thinking: false })

    expect(document.activeElement).toBe(wrapper.find('.chip').element)
  })

  it('scrolls the log to the newest line', async () => {
    wrapper = mountChat()
    const log = wrapper.find('[role="log"]').element
    Object.defineProperty(log, 'scrollHeight', { value: 480, configurable: true })

    await wrapper.setProps({ lines: [...LINES, { id: 4, from: 'member', text: 'Un Sidecar.' }] })
    await wrapper.vm.$nextTick()

    expect(log.scrollTop).toBe(480)
  })

  it('shows the privacy notice with a link to the privacy page', () => {
    wrapper = mountChat()

    const notice = wrapper.find('.notice')
    const link = wrapper.findComponent(RouterLinkStub)

    expect(notice.text()).toContain('se envía a Anthropic (EE. UU.)')
    expect(notice.text()).toContain('No escribas datos personales.')
    expect(link.props('to')).toBe('/privacidad')
    expect(link.text()).toBe('Privacidad')
  })

  it('shows the privacy notice in English', () => {
    i18n.global.locale.value = 'en'
    wrapper = mountChat()

    expect(wrapper.find('.notice').text()).toContain('sent to Anthropic (USA)')
    expect(wrapper.findComponent(RouterLinkStub).text()).toBe('Privacy')
  })

  describe('compact mode', () => {
    it('keeps the log as a labelled role=log list that screen readers still reach', () => {
      wrapper = mountChat({ compact: true })

      const log = wrapper.find('[role="log"]')

      expect(wrapper.find('.chat').classes()).toContain('compact')
      expect(log.attributes('aria-label')).toBe('Conversación con el barman')
      expect(log.findAll('.bubble')).toHaveLength(3)
    })

    it('is not compact by default', () => {
      wrapper = mountChat()

      expect(wrapper.find('.chat').classes()).not.toContain('compact')
    })

    it('still offers chips, input and privacy notice', () => {
      wrapper = mountChat({ compact: true })

      expect(wrapper.findAll('.chip')).toHaveLength(2)
      expect(wrapper.find('input.field').exists()).toBe(true)
      expect(wrapper.find('.notice').exists()).toBe(true)
    })
  })
})
