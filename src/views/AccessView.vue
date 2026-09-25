<script setup>
import { computed, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'

import { useAuthStore } from '@/stores/auth'

// La puerta del club: entrar o hacerse socio. Los errores llegan como claves del backend (ADR-06)
// y aquí se traducen; nunca se pinta texto que venga del servidor
const { t, te, locale } = useI18n()
const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const mode = ref('login') // 'login' | 'register'
const form = reactive({ username: '', email: '', password: '' })
const fieldErrors = ref({}) // { campo: clave }
const formError = ref(null) // clave del error general
const working = ref(false)

const isRegister = computed(() => mode.value === 'register')

function switchMode(next) {
  mode.value = next
  fieldErrors.value = {}
  formError.value = null
}

function message(code) {
  return te(`errors.${code}`) ? t(`errors.${code}`) : t('errors.generic')
}

async function submit() {
  working.value = true
  fieldErrors.value = {}
  formError.value = null
  try {
    if (isRegister.value) {
      await auth.register({ ...form, locale: locale.value })
    } else {
      await auth.login(form.username, form.password)
    }
    // Vuelve a donde quería ir antes de que le pararan en la puerta (solo rutas internas)
    const next = typeof route.query.next === 'string' && route.query.next.startsWith('/') ? route.query.next : '/'
    await router.replace(next)
  } catch (error) {
    fieldErrors.value = error?.errors ?? {}
    formError.value = error?.code ?? 'generic'
  } finally {
    working.value = false
  }
}
</script>

<template>
  <main class="puerta">
    <section class="tarjeta" aria-labelledby="titulo-club">
      <h1 id="titulo-club" class="letrero">{{ t('club.name') }}</h1>
      <p class="subtitulo">{{ t('auth.subtitle') }}</p>

      <div class="pestanas" role="tablist">
        <button
          type="button"
          role="tab"
          :aria-selected="!isRegister"
          :class="{ activa: !isRegister }"
          @click="switchMode('login')"
        >
          {{ t('auth.tabs.login') }}
        </button>
        <button
          type="button"
          role="tab"
          :aria-selected="isRegister"
          :class="{ activa: isRegister }"
          @click="switchMode('register')"
        >
          {{ t('auth.tabs.register') }}
        </button>
      </div>

      <form novalidate @submit.prevent="submit">
        <label class="campo">
          <span>{{ t('auth.fields.username') }}</span>
          <input
            v-model.trim="form.username"
            name="username"
            autocomplete="username"
            required
            :aria-invalid="Boolean(fieldErrors.username)"
          />
          <small v-if="fieldErrors.username" class="error">{{ message(fieldErrors.username) }}</small>
        </label>

        <label v-if="isRegister" class="campo">
          <span>{{ t('auth.fields.email') }}</span>
          <input
            v-model.trim="form.email"
            name="email"
            type="email"
            autocomplete="email"
            required
            :aria-invalid="Boolean(fieldErrors.email)"
          />
          <small v-if="fieldErrors.email" class="error">{{ message(fieldErrors.email) }}</small>
        </label>

        <label class="campo">
          <span>{{ t('auth.fields.password') }}</span>
          <input
            v-model="form.password"
            name="password"
            type="password"
            :autocomplete="isRegister ? 'new-password' : 'current-password'"
            required
            :aria-invalid="Boolean(fieldErrors.password)"
          />
          <small v-if="fieldErrors.password" class="error">{{ message(fieldErrors.password) }}</small>
        </label>

        <p v-if="formError" class="error-general" role="alert">{{ message(formError) }}</p>

        <button class="llamar" type="submit" :disabled="working">
          {{ working ? t('auth.submit.working') : t(isRegister ? 'auth.submit.register' : 'auth.submit.login') }}
        </button>
      </form>
    </section>
  </main>
</template>

<style scoped>
.puerta {
  /* El body tiene overflow: hidden por el lounge 3D: el scroll lo lleva esta pantalla (móvil pequeño) */
  height: 100dvh;
  overflow-y: auto;
  box-sizing: border-box;
  display: grid;
  place-items: center;
  padding: 16px;
  /* Un halo cálido detrás de la tarjeta, como la luz que se escapa por la mirilla */
  background: radial-gradient(ellipse at 50% 35%, var(--tapete) 0%, var(--medianoche) 65%);
}

.tarjeta {
  width: min(100%, 380px);
  padding: 40px 32px 32px;
  background: var(--fieltro);
  border: 1px solid var(--linea);
  outline: 1px solid var(--linea-suave);
  outline-offset: 6px;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.55);
}

.letrero {
  margin: 0;
  text-align: center;
  font-family: var(--f-letrero);
  font-weight: 400;
  font-size: 2.6rem;
  color: var(--oro);
  letter-spacing: 0.04em;
}

.subtitulo {
  margin: 6px 0 28px;
  text-align: center;
  font-family: var(--f-titulo);
  font-style: italic;
  color: var(--humo);
}

.pestanas {
  display: flex;
  margin-bottom: 24px;
  border-bottom: 1px solid var(--linea);
}

.pestanas button {
  flex: 1;
  padding: 10px 0;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  font-family: var(--f-ui);
  font-size: 0.95rem;
  color: var(--humo);
  cursor: pointer;
  transition: color var(--duracion-corta), border-color var(--duracion-corta);
}

.pestanas button:hover {
  color: var(--marfil);
}

.pestanas button:focus-visible {
  outline: 1px solid var(--laton);
  outline-offset: -1px;
}

.pestanas button.activa {
  color: var(--marfil);
  border-bottom-color: var(--laton);
}

.campo {
  display: block;
  margin-bottom: 18px;
}

.campo span {
  display: block;
  margin-bottom: 6px;
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--laton);
}

.campo input {
  width: 100%;
  box-sizing: border-box;
  padding: 10px 12px;
  background: var(--medianoche);
  border: 1px solid var(--linea);
  color: var(--marfil);
  font: inherit;
  transition: border-color var(--duracion-corta);
}

.campo input:focus-visible {
  outline: none;
  border-color: var(--laton);
}

.campo input[aria-invalid='true'] {
  border-color: var(--burdeos);
}

.error {
  display: block;
  margin-top: 6px;
  font-size: 0.8rem;
}

.error,
.error-general {
  color: var(--burdeos);
}

.error-general {
  margin: 0 0 16px;
  font-size: 0.9rem;
}

.llamar {
  width: 100%;
  margin-top: 8px;
  padding: 12px;
  background: transparent;
  border: 1px solid var(--laton);
  color: var(--marfil);
  font-family: var(--f-ui);
  font-size: 0.95rem;
  letter-spacing: 0.06em;
  cursor: pointer;
  transition: background var(--duracion-corta), color var(--duracion-corta);
}

.llamar:hover:not(:disabled) {
  background: var(--laton);
  color: var(--medianoche);
}

.llamar:focus-visible {
  outline: 2px solid var(--oro);
  outline-offset: 3px;
}

.llamar:disabled {
  opacity: 0.6;
  cursor: wait;
}
</style>
