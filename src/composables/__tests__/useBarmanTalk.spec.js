import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { mount } from '@vue/test-utils'

import { useBarmanTalk } from '../useBarmanTalk'

let wrapper = null

function mountTalk(options) {
  let exposed
  const Host = defineComponent({
    setup() {
      exposed = useBarmanTalk(options)
      return () => null
    },
  })
  wrapper = mount(Host, { attachTo: document.body })
  return exposed
}

function press(code, init = {}, target = window) {
  const event = new KeyboardEvent('keydown', { code, key: code, bubbles: true, cancelable: true, ...init })
  target.dispatchEvent(event)
  return event
}

describe('useBarmanTalk', () => {
  afterEach(() => {
    wrapper?.unmount()
    wrapper = null
    document.body.innerHTML = ''
  })

  it('opens the window when E is pressed near the barman', () => {
    const talk = mountTalk()
    talk.setNear(true)

    press('KeyE')

    expect(talk.open.value).toBe(true)
  })

  it('prevents the default action when it opens', () => {
    const talk = mountTalk()
    talk.setNear(true)

    const event = press('KeyE')

    expect(event.defaultPrevented).toBe(true)
  })

  it('does nothing when the member is not near', () => {
    const onOpen = vi.fn()
    const talk = mountTalk({ onOpen })

    const event = press('KeyE')

    expect(talk.open.value).toBe(false)
    expect(event.defaultPrevented).toBe(false)
    expect(onOpen).not.toHaveBeenCalled()
  })

  it('releases the pointer when it opens', () => {
    const onOpen = vi.fn()
    const talk = mountTalk({ onOpen })
    talk.setNear(true)

    press('KeyE')

    expect(onOpen).toHaveBeenCalledTimes(1)
  })

  it('ignores keys other than E', () => {
    const talk = mountTalk()
    talk.setNear(true)

    press('KeyW')
    press('Enter')

    expect(talk.open.value).toBe(false)
  })

  it('ignores held-down repeat events', () => {
    const talk = mountTalk()
    talk.setNear(true)

    press('KeyE', { repeat: true })

    expect(talk.open.value).toBe(false)
  })

  it.each(['ctrlKey', 'metaKey', 'altKey', 'shiftKey'])('ignores E combined with %s', (modifier) => {
    const talk = mountTalk()
    talk.setNear(true)

    press('KeyE', { [modifier]: true })

    expect(talk.open.value).toBe(false)
  })

  it.each([
    ['an input', () => document.createElement('input')],
    ['a textarea', () => document.createElement('textarea')],
    [
      'a contenteditable element',
      () => {
        const element = document.createElement('div')
        Object.defineProperty(element, 'isContentEditable', { value: true })
        return element
      },
    ],
  ])('ignores E typed in %s', (_name, create) => {
    const talk = mountTalk()
    talk.setNear(true)
    const field = document.body.appendChild(create())

    const event = press('KeyE', {}, field)

    expect(talk.open.value).toBe(false)
    expect(event.defaultPrevented).toBe(false)
  })

  it('does not reopen or release the pointer again while it is already open', () => {
    const onOpen = vi.fn()
    const talk = mountTalk({ onOpen })
    talk.setNear(true)
    press('KeyE')

    const event = press('KeyE')

    expect(onOpen).toHaveBeenCalledTimes(1)
    expect(event.defaultPrevented).toBe(false)
  })

  it('closes with Escape without asking for the pointer again', () => {
    const onOpen = vi.fn()
    const talk = mountTalk({ onOpen })
    talk.setNear(true)
    press('KeyE')

    press('Escape', { key: 'Escape' })

    expect(talk.open.value).toBe(false)
    expect(onOpen).toHaveBeenCalledTimes(1)
  })

  it('Escape does nothing while the window is closed', () => {
    const talk = mountTalk()

    press('Escape', { key: 'Escape' })

    expect(talk.open.value).toBe(false)
  })

  it('can be reopened after closing while still near', () => {
    const talk = mountTalk()
    talk.setNear(true)
    press('KeyE')
    talk.closeWindow()

    press('KeyE')

    expect(talk.open.value).toBe(true)
  })

  it('stops listening once unmounted', () => {
    const talk = mountTalk()
    talk.setNear(true)
    wrapper.unmount()

    press('KeyE')

    expect(talk.open.value).toBe(false)
  })

  it('treats anything but true as not near', () => {
    const talk = mountTalk()
    talk.setNear(true)

    talk.setNear(undefined)

    expect(talk.near.value).toBe(false)
  })
})
