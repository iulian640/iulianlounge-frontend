import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

import HudLounge from '../hud/HudLounge.vue'
import i18n from '@/i18n'
import { api } from '@/api/http'
import { useAuthStore } from '@/stores/auth'
import { useBarStore } from '@/stores/bar'
import { useWalletStore } from '@/stores/wallet'

const replace = vi.fn()

vi.mock('vue-router', () => ({ useRouter: () => ({ replace }) }))
vi.mock('@/api/http', () => ({
  api: vi.fn(),
  endSession: vi.fn(),
  refreshAccessToken: vi.fn(),
  setAccessToken: vi.fn(),
  waitForRefresh: vi.fn(),
}))

describe('HudLounge logout', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    i18n.global.locale.value = 'es'
    api.mockImplementation((path) =>
      Promise.resolve(path.startsWith('/wallet/transactions') ? { content: [] } : { balance: 60 }),
    )
  })

  it('forgets the wallet and the bar conversation when the member signs out', async () => {
    const auth = useAuthStore()
    auth.user = { username: 'cursaito', rank: 'HABITUAL' }
    const bar = useBarStore()
    bar.conversation = [{ id: 1, from: 'member', text: 'private' }]
    const wrapper = mount(HudLounge, { global: { plugins: [i18n] } })
    await flushPromises()

    await wrapper.find('button.salir').trigger('click')
    await flushPromises()

    expect(useWalletStore().balance).toBeNull()
    expect(bar.conversation).toEqual([])
    expect(auth.isAuthenticated).toBe(false)
    expect(replace).toHaveBeenCalledWith({ name: 'acceso' })
    wrapper.unmount()
  })

  it('closes the accounts book on request without moving the focus', async () => {
    useAuthStore().user = { username: 'cursaito', rank: 'HABITUAL' }
    const wrapper = mount(HudLounge, { global: { plugins: [i18n] }, attachTo: document.body })
    await flushPromises()
    await wrapper.find('.ficha').trigger('click')
    await flushPromises()
    expect(wrapper.find('#libro-cuentas').exists()).toBe(true)
    const other = document.body.appendChild(document.createElement('button'))
    other.focus()

    wrapper.vm.dismissBook()
    await flushPromises()

    expect(wrapper.find('#libro-cuentas').exists()).toBe(false)
    expect(document.activeElement).toBe(other)
    wrapper.unmount()
    document.body.innerHTML = ''
  })
})
