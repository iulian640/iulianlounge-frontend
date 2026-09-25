import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

import AccessView from '../AccessView.vue'
import i18n from '@/i18n'
import { useAuthStore } from '@/stores/auth'

const replace = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({ replace }),
  useRoute: () => ({ query: { next: '/' } }),
}))

// Pinia real con login/register espiados: el componente no llega a la red
function montar() {
  const pinia = createPinia()
  setActivePinia(pinia)
  const auth = useAuthStore()
  vi.spyOn(auth, 'login').mockResolvedValue()
  vi.spyOn(auth, 'register').mockResolvedValue()
  const wrapper = mount(AccessView, { global: { plugins: [pinia, i18n] } })
  return { wrapper, auth }
}

describe('AccessView', () => {
  beforeEach(() => {
    replace.mockClear()
    i18n.global.locale.value = 'es'
  })

  it('entra con nombre y contraseña y pasa al lounge', async () => {
    const { wrapper, auth } = montar()

    await wrapper.find('input[name="username"]').setValue('cursaito')
    await wrapper.find('input[name="password"]').setValue('12345678')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(auth.login).toHaveBeenCalledWith('cursaito', '12345678')
    expect(replace).toHaveBeenCalledWith('/')
  })

  it('traduce el code del backend en vez de pintar texto del servidor', async () => {
    const { wrapper, auth } = montar()
    auth.login.mockRejectedValueOnce({ status: 401, code: 'auth.invalid_credentials', errors: {} })

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.find('[role="alert"]').text()).toBe('Ese nombre y esa contraseña no abren esta puerta.')
    expect(replace).not.toHaveBeenCalled()
  })

  it('un code desconocido cae en el mensaje genérico', async () => {
    const { wrapper, auth } = montar()
    auth.login.mockRejectedValueOnce({ status: 418, code: 'teapot.brewing', errors: {} })

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.find('[role="alert"]').text()).toBe('Algo ha fallado. Inténtalo otra vez.')
  })

  it('hacerse socio pide email, manda el idioma actual y marca el campo que falla', async () => {
    i18n.global.locale.value = 'en'
    const { wrapper, auth } = montar()
    auth.register.mockRejectedValueOnce({
      status: 400,
      code: 'validation.failed',
      errors: { email: 'validation.email' },
    })

    await wrapper.findAll('[role="tab"]')[1].trigger('click')
    await wrapper.find('input[name="username"]').setValue('dwight')
    await wrapper.find('input[name="email"]').setValue('no-es-un-email')
    await wrapper.find('input[name="password"]').setValue('12345678')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(auth.register).toHaveBeenCalledWith({
      username: 'dwight',
      email: 'no-es-un-email',
      password: '12345678',
      locale: 'en',
    })
    expect(wrapper.find('input[name="email"]').attributes('aria-invalid')).toBe('true')
    expect(wrapper.text()).toContain("That doesn't look like an email.")
  })
})
