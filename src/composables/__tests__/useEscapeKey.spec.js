import { describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { mount } from '@vue/test-utils'

import { useEscapeKey } from '../useEscapeKey'

function mountWith(handler) {
  const Host = defineComponent({
    setup() {
      useEscapeKey(handler)
      return () => null
    },
  })
  return mount(Host)
}

function press(key) {
  window.dispatchEvent(new KeyboardEvent('keydown', { key }))
}

describe('useEscapeKey', () => {
  it('calls the handler when Escape is pressed', () => {
    const handler = vi.fn()
    const wrapper = mountWith(handler)

    press('Escape')

    expect(handler).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })

  it('ignores every other key', () => {
    const handler = vi.fn()
    const wrapper = mountWith(handler)

    press('Enter')
    press('e')

    expect(handler).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('stops listening once the component is unmounted', () => {
    const handler = vi.fn()
    const wrapper = mountWith(handler)

    wrapper.unmount()
    press('Escape')

    expect(handler).not.toHaveBeenCalled()
  })

  it('passes the keyboard event to the handler', () => {
    const handler = vi.fn()
    const wrapper = mountWith(handler)

    press('Escape')

    expect(handler.mock.calls[0][0]).toBeInstanceOf(KeyboardEvent)
    wrapper.unmount()
  })
})
