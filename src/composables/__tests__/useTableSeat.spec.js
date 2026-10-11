import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'

import { useTableSeat } from '../useTableSeat'

let wrapper = null

function mountSeat(options) {
  let exposed
  const Host = defineComponent({
    setup() {
      exposed = useTableSeat(options)
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

function pressEscape() {
  return press('Escape')
}

describe('useTableSeat', () => {
  afterEach(() => {
    wrapper?.unmount()
    wrapper = null
    document.body.innerHTML = ''
  })

  it('sits down when E is pressed near the table', () => {
    const onSit = vi.fn()
    const seat = mountSeat({ onSit })
    seat.setNear(true)

    const event = press('KeyE')

    expect(seat.seated.value).toBe(true)
    expect(onSit).toHaveBeenCalledTimes(1)
    expect(event.defaultPrevented).toBe(true)
  })

  it('does nothing when the member is not near', () => {
    const onSit = vi.fn()
    const seat = mountSeat({ onSit })

    const event = press('KeyE')

    expect(seat.seated.value).toBe(false)
    expect(onSit).not.toHaveBeenCalled()
    expect(event.defaultPrevented).toBe(false)
  })

  it('does not sit down twice while already seated', () => {
    const onSit = vi.fn()
    const seat = mountSeat({ onSit })
    seat.setNear(true)
    press('KeyE')

    const event = press('KeyE')

    expect(onSit).toHaveBeenCalledTimes(1)
    expect(event.defaultPrevented).toBe(false)
  })

  it('ignores keys other than E', () => {
    const seat = mountSeat()
    seat.setNear(true)

    press('KeyW')
    press('Enter')

    expect(seat.seated.value).toBe(false)
  })

  it('ignores held-down repeat events', () => {
    const seat = mountSeat()
    seat.setNear(true)

    press('KeyE', { repeat: true })

    expect(seat.seated.value).toBe(false)
  })

  it.each(['ctrlKey', 'metaKey', 'altKey', 'shiftKey'])('ignores E combined with %s', (modifier) => {
    const seat = mountSeat()
    seat.setNear(true)

    press('KeyE', { [modifier]: true })

    expect(seat.seated.value).toBe(false)
  })

  it.each([
    ['an input', () => document.createElement('input')],
    ['a textarea', () => document.createElement('textarea')],
    ['a select', () => document.createElement('select')],
    [
      'a contenteditable element',
      () => {
        const element = document.createElement('div')
        Object.defineProperty(element, 'isContentEditable', { value: true })
        return element
      },
    ],
  ])('ignores E typed in %s', (_name, create) => {
    const seat = mountSeat()
    seat.setNear(true)
    const field = document.body.appendChild(create())

    const event = press('KeyE', {}, field)

    expect(seat.seated.value).toBe(false)
    expect(event.defaultPrevented).toBe(false)
  })

  it('accepts E pressed on a button', () => {
    const seat = mountSeat()
    seat.setNear(true)
    const button = document.body.appendChild(document.createElement('button'))

    press('KeyE', {}, button)

    expect(seat.seated.value).toBe(true)
  })

  it('refuses to sit while canSit says no', () => {
    const onSit = vi.fn()
    const seat = mountSeat({ onSit, canSit: () => false })
    seat.setNear(true)

    const event = press('KeyE')

    expect(seat.seated.value).toBe(false)
    expect(onSit).not.toHaveBeenCalled()
    expect(event.defaultPrevented).toBe(false)
  })

  it('stands up with Escape', () => {
    const onStand = vi.fn()
    const seat = mountSeat({ onStand })
    seat.setNear(true)
    press('KeyE')

    pressEscape()

    expect(seat.seated.value).toBe(false)
    expect(onStand).toHaveBeenCalledTimes(1)
  })

  it('Escape does nothing while standing', () => {
    const onStand = vi.fn()
    mountSeat({ onStand })

    pressEscape()

    expect(onStand).not.toHaveBeenCalled()
  })

  it('refuses to sit again while the stand-up is still in progress', async () => {
    let finishRising = null
    const onStand = vi.fn(() => new Promise((resolve) => (finishRising = resolve)))
    const onSit = vi.fn()
    const seat = mountSeat({ onSit, onStand })
    seat.setNear(true)
    press('KeyE')
    pressEscape()

    press('KeyE')
    expect(seat.seated.value).toBe(false)
    expect(onSit).toHaveBeenCalledTimes(1)

    finishRising()
    await flushPromises()
    press('KeyE')

    expect(seat.seated.value).toBe(true)
    expect(onSit).toHaveBeenCalledTimes(2)
  })

  it('still allows sitting again when the stand-up fails', async () => {
    const onStand = vi.fn(() => Promise.reject(new Error('seat jammed')))
    const seat = mountSeat({ onStand })
    seat.setNear(true)
    press('KeyE')
    pressEscape()
    await flushPromises()

    press('KeyE')

    expect(seat.seated.value).toBe(true)
  })

  it('treats anything but true as not near', () => {
    const seat = mountSeat()
    seat.setNear(true)

    seat.setNear(undefined)

    expect(seat.near.value).toBe(false)
  })

  it('stops listening once unmounted', () => {
    const seat = mountSeat()
    seat.setNear(true)
    wrapper.unmount()

    press('KeyE')

    expect(seat.seated.value).toBe(false)
  })
})
