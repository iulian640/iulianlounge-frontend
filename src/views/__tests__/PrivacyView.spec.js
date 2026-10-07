import { beforeEach, describe, expect, it } from 'vitest'
import { mount, RouterLinkStub } from '@vue/test-utils'

import PrivacyView from '../PrivacyView.vue'
import i18n from '@/i18n'

const ISSUES_URL = 'https://github.com/iulian640/iulianlounge-frontend/issues'

function mountPage() {
  return mount(PrivacyView, { global: { plugins: [i18n], stubs: { RouterLink: RouterLinkStub } } })
}

describe('PrivacyView', () => {
  beforeEach(() => {
    i18n.global.locale.value = 'es'
  })

  it('renders without a session, a store or a router', () => {
    const wrapper = mountPage()

    expect(wrapper.find('h1').text()).toBe('Privacidad')
  })

  it('names Iulian Timofei as the data controller', () => {
    const wrapper = mountPage()

    expect(wrapper.find('[aria-labelledby="privacy-controller"]').text()).toContain('Iulian Timofei')
  })

  it('offers an issue in the public GitHub repository as the only contact and no email', () => {
    const wrapper = mountPage()

    const link = wrapper.find('a.issues')

    expect(link.attributes('href')).toBe(ISSUES_URL)
    expect(link.attributes('rel')).toBe('noopener noreferrer')
    expect(wrapper.html()).not.toContain('mailto:')
    expect(wrapper.text()).not.toMatch(/\S+@\S+\.\S+/)
  })

  it('lists the data processed: account, chip movements and text sent to the barman', () => {
    const wrapper = mountPage()

    const items = wrapper.findAll('.items li').map((item) => item.text())

    expect(items).toHaveLength(3)
    expect(items[0]).toContain('cuenta')
    expect(items[1]).toContain('fichas')
    expect(items[2]).toContain('barman')
  })

  it('names Anthropic as processor of the barman text and says no message is stored', () => {
    const wrapper = mountPage()

    expect(wrapper.find('[aria-labelledby="privacy-processor"]').text()).toContain('Anthropic')
    expect(wrapper.find('[aria-labelledby="privacy-processor"]').text()).toContain('encargado del tratamiento')
    expect(wrapper.find('[aria-labelledby="privacy-storage"]').text()).toContain('No guardamos ningún mensaje')
  })

  it('has a labelled section per topic', () => {
    const wrapper = mountPage()

    expect(wrapper.findAll('section')).toHaveLength(7)
    for (const section of wrapper.findAll('section')) {
      expect(wrapper.find(`#${section.attributes('aria-labelledby')}`).text()).not.toBe('')
    }
  })

  it('goes back to the lounge', () => {
    const wrapper = mountPage()

    expect(wrapper.findComponent(RouterLinkStub).props('to')).toBe('/')
    expect(wrapper.find('.back').text()).toBe('Volver')
  })

  it('is fully available in English', () => {
    i18n.global.locale.value = 'en'

    const wrapper = mountPage()

    expect(wrapper.find('h1').text()).toBe('Privacy')
    expect(wrapper.find('[aria-labelledby="privacy-processor"]').text()).toContain('data processor')
    expect(wrapper.find('[aria-labelledby="privacy-storage"]').text()).toContain("We don't store any message")
    expect(wrapper.find('a.issues').text()).toBe('Open an issue on GitHub')
    expect(wrapper.text()).not.toContain('privacy.')
  })
})
