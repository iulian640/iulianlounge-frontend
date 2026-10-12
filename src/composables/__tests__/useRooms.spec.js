import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, nextTick } from 'vue'
import { mount } from '@vue/test-utils'

import { useRooms } from '../useRooms'

const ROOMS = ['bar', 'cards']

let wrapper = null

function setup() {
  let rooms
  const Host = defineComponent({
    setup() {
      rooms = useRooms(ROOMS)
      return () => null
    },
  })
  wrapper = mount(Host)
  return rooms
}

function fakeScroller(scrollLeft = 0) {
  return { clientWidth: 390, scrollLeft, scrollTo: vi.fn() }
}

function key(name) {
  return { key: name, preventDefault: vi.fn() }
}

describe('useRooms', () => {
  beforeEach(() => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      callback()
      return 0
    })
    window.matchMedia = vi.fn(() => ({ matches: false }))
  })

  afterEach(() => {
    wrapper?.unmount()
    wrapper = null
    vi.restoreAllMocks()
  })

  it('starts in the first room', () => {
    expect(setup().active.value).toBe('bar')
  })

  it('goes to a room and slides the scroller to it smoothly', () => {
    const rooms = setup()
    const scroller = fakeScroller()
    rooms.scroller.value = scroller

    rooms.goTo('cards')

    expect(rooms.active.value).toBe('cards')
    expect(scroller.scrollTo).toHaveBeenCalledWith({ left: 390, behavior: 'smooth' })
  })

  it('jumps without animation when the member prefers reduced motion', () => {
    window.matchMedia = vi.fn(() => ({ matches: true }))
    const rooms = setup()
    const scroller = fakeScroller()
    rooms.scroller.value = scroller

    rooms.goTo('cards')

    expect(scroller.scrollTo).toHaveBeenCalledWith({ left: 390, behavior: 'auto' })
  })

  it('ignores a room that does not exist', () => {
    const rooms = setup()

    rooms.goTo('stage')

    expect(rooms.active.value).toBe('bar')
  })

  it('follows a swipe by reading where the scroller stopped', () => {
    const rooms = setup()
    rooms.scroller.value = fakeScroller(380)

    rooms.onScroll()

    expect(rooms.active.value).toBe('cards')
  })

  it('ignores the frames of its own slide and settles when it arrives', () => {
    const rooms = setup()
    const scroller = fakeScroller()
    rooms.scroller.value = scroller
    rooms.goTo('cards')

    scroller.scrollLeft = 100
    rooms.onScroll()
    expect(rooms.active.value).toBe('cards')

    scroller.scrollLeft = 390
    rooms.onScroll()
    scroller.scrollLeft = 0
    rooms.onScroll()
    expect(rooms.active.value).toBe('bar')
  })

  it('lets a swipe take over when its own slide never arrives', () => {
    vi.useFakeTimers()
    const rooms = setup()
    const scroller = fakeScroller()
    rooms.scroller.value = scroller
    rooms.goTo('cards')

    vi.advanceTimersByTime(900)
    scroller.scrollLeft = 0
    rooms.onScroll()

    expect(rooms.active.value).toBe('bar')
    vi.useRealTimers()
  })

  it('snaps back to the current room when the scroller is resized', async () => {
    let onResize
    window.ResizeObserver = class {
      constructor(callback) {
        onResize = callback
      }
      observe() {}
      disconnect() {}
    }
    const rooms = setup()
    const scroller = fakeScroller()
    rooms.scroller.value = scroller
    await nextTick()
    rooms.goTo('cards')
    scroller.scrollTo.mockClear()

    scroller.clientWidth = 667
    onResize()

    expect(scroller.scrollTo).toHaveBeenCalledWith({ left: 667, behavior: 'auto' })
    delete window.ResizeObserver
  })

  it('still follows a swipe after the first measure of the scroller', async () => {
    window.ResizeObserver = class {
      constructor(callback) {
        this.callback = callback
      }
      observe() {
        this.callback()
      }
      disconnect() {}
    }
    const rooms = setup()
    const scroller = fakeScroller()
    rooms.scroller.value = scroller
    await nextTick()

    scroller.scrollLeft = 390
    rooms.onScroll()

    expect(scroller.scrollTo).not.toHaveBeenCalled()
    expect(rooms.active.value).toBe('cards')
    delete window.ResizeObserver
  })

  it('moves between rooms with the arrow keys and stops at the ends', () => {
    const rooms = setup()
    rooms.scroller.value = fakeScroller()
    const right = key('ArrowRight')

    rooms.onKeydown(right)
    rooms.onKeydown(key('ArrowRight'))

    expect(right.preventDefault).toHaveBeenCalled()
    expect(rooms.active.value).toBe('cards')
    rooms.onKeydown(key('ArrowLeft'))
    expect(rooms.active.value).toBe('bar')
    expect(rooms.scroller.value.scrollTo).toHaveBeenLastCalledWith({ left: 0, behavior: 'smooth' })
  })

  it('leaves other keys alone', () => {
    const rooms = setup()
    const enter = key('Enter')

    rooms.onKeydown(enter)

    expect(enter.preventDefault).not.toHaveBeenCalled()
    expect(rooms.active.value).toBe('bar')
  })
})
