import { afterEach, describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

import RoomTabs from '../salon/RoomTabs.vue'

const ROOMS = [
  { id: 'bar', label: 'La barra' },
  { id: 'cards', label: 'La mesa' },
]

let wrapper = null

function mountTabs(active = 'bar') {
  wrapper = mount(RoomTabs, { props: { rooms: ROOMS, active, label: 'Salas del club' }, attachTo: document.body })
  return wrapper
}

describe('RoomTabs', () => {
  afterEach(() => {
    wrapper?.unmount()
    wrapper = null
  })

  it('renders one tab per room inside a labelled tablist', () => {
    mountTabs()

    expect(wrapper.find('[role="tablist"]').attributes('aria-label')).toBe('Salas del club')
    const tabs = wrapper.findAll('[role="tab"]')
    expect(tabs.map((tab) => tab.text())).toEqual(['La barra', 'La mesa'])
    expect(tabs.map((tab) => tab.attributes('aria-controls'))).toEqual(['room-bar', 'room-cards'])
  })

  it('marks only the active room as selected and focusable', () => {
    mountTabs('cards')

    const tabs = wrapper.findAll('[role="tab"]')
    expect(tabs.map((tab) => tab.attributes('aria-selected'))).toEqual(['false', 'true'])
    expect(tabs.map((tab) => tab.attributes('tabindex'))).toEqual(['-1', '0'])
  })

  it('asks for a room when its tab is pressed', async () => {
    mountTabs()

    await wrapper.findAll('[role="tab"]')[1].trigger('click')

    expect(wrapper.emitted('select')).toEqual([['cards']])
  })

  it('passes the arrow keys up so the rooms can move', async () => {
    mountTabs()

    await wrapper.find('[role="tablist"]').trigger('keydown', { key: 'ArrowRight' })

    expect(wrapper.emitted('step')).toHaveLength(1)
  })

  it('keeps the keyboard focus on the tab of the room it moved to', async () => {
    mountTabs()
    wrapper.find('#room-tab-bar').element.focus()

    await wrapper.setProps({ active: 'cards' })
    await flushPromises()

    expect(document.activeElement.id).toBe('room-tab-cards')
  })
})
