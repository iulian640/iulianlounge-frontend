import { useI18n } from 'vue-i18n'

const GENERIC_KEY = 'errors.generic'

export function useErrorMessage() {
  const { t, te } = useI18n()

  function errorKey(code) {
    if (typeof code !== 'string' || code === '') return GENERIC_KEY
    const key = `errors.${code}`
    return te(key) ? key : GENERIC_KEY
  }

  function message(code) {
    return t(errorKey(code))
  }

  return { errorKey, message }
}
