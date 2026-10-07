import { useI18n } from 'vue-i18n'

const PARAM_NAMESPACES = { drink: 'bar.drinks', rank: 'rank' }

export function useBarLines() {
  const { t } = useI18n()

  function resolveParams(params = {}) {
    return Object.fromEntries(
      Object.entries(params).map(([name, value]) => [
        name,
        name in PARAM_NAMESPACES ? t(`${PARAM_NAMESPACES[name]}.${value}`) : value,
      ]),
    )
  }

  function lineText(entry) {
    if (typeof entry.text === 'string') return entry.text
    if (typeof entry.key === 'string') return t(entry.key, resolveParams(entry.params))
    return ''
  }

  return { lineText }
}
