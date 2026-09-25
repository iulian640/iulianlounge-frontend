<script setup>
import { computed, nextTick, reactive, ref, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'

import { safeNext } from '@/router/safeNext'
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
const formElement = useTemplateRef('formElement')

const isRegister = computed(() => mode.value === 'register')

function switchMode(next) {
  mode.value = next
  fieldErrors.value = {}
  formError.value = null
}

function message(code) {
  return te(`errors.${code}`) ? t(`errors.${code}`) : t('errors.generic')
}

// Enlaza el input con su mensaje de error para el lector de pantalla (solo si hay error)
function describedBy(field) {
  return fieldErrors.value[field] ? `error-${field}` : undefined
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
    // Vuelve a donde quería ir antes de que le pararan en la puerta (solo rutas propias que existan)
    await router.replace(safeNext(route.query.next, router))
  } catch (error) {
    if (error?.registered) {
      // El alta fue bien y lo que falló fue entrar: a "Entrar" con el nombre puesto, no a repetir el alta
      mode.value = 'login'
      form.password = ''
      formError.value = 'auth.registered_sign_in'
    } else {
      fieldErrors.value = error?.errors ?? {}
      formError.value = error?.code ?? 'generic'
    }
    // El foco va al primer campo que falla; si no hay ninguno, el aviso general ya se anuncia (role=alert)
    await nextTick()
    formElement.value?.querySelector('[aria-invalid="true"]')?.focus()
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

      <!-- Dos botones que conmutan el formulario (aria-pressed): más simple y honesto que un tablist a medias -->
      <div class="pestanas" role="group" :aria-label="t('auth.modes')">
        <button
          type="button"
          :aria-pressed="!isRegister"
          :class="{ activa: !isRegister }"
          @click="switchMode('login')"
        >
          {{ t('auth.tabs.login') }}
        </button>
        <button
          type="button"
          :aria-pressed="isRegister"
          :class="{ activa: isRegister }"
          @click="switchMode('register')"
        >
          {{ t('auth.tabs.register') }}
        </button>
      </div>

      <form ref="formElement" novalidate @submit.prevent="submit">
        <div class="campo">
          <label for="acceso-username">{{ t('auth.fields.username') }}</label>
          <input
            id="acceso-username"
            v-model.trim="form.username"
            name="username"
            autocomplete="username"
            required
            :aria-invalid="Boolean(fieldErrors.username)"
            :aria-describedby="describedBy('username')"
          />
          <small v-if="fieldErrors.username" id="error-username" class="error">
            {{ message(fieldErrors.username) }}
          </small>
        </div>

        <div v-if="isRegister" class="campo">
          <label for="acceso-email">{{ t('auth.fields.email') }}</label>
          <input
            id="acceso-email"
            v-model.trim="form.email"
            name="email"
            type="email"
            autocomplete="email"
            required
            :aria-invalid="Boolean(fieldErrors.email)"
            :aria-describedby="describedBy('email')"
          />
          <small v-if="fieldErrors.email" id="error-email" class="error">{{ message(fieldErrors.email) }}</small>
        </div>

        <div class="campo">
          <label for="acceso-password">{{ t('auth.fields.password') }}</label>
          <input
            id="acceso-password"
            v-model="form.password"
            name="password"
            type="password"
            :autocomplete="isRegister ? 'new-password' : 'current-password'"
            required
            :aria-invalid="Boolean(fieldErrors.password)"
            :aria-describedby="describedBy('password')"
          />
          <small v-if="fieldErrors.password" id="error-password" class="error">
            {{ message(fieldErrors.password) }}
          </small>
        </div>

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

.campo label {
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
