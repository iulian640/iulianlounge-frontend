import { computed, toValue } from 'vue'
import { useI18n } from 'vue-i18n'

const LOWEST_RANK = 'nadie'

export function useRankName(rank) {
  const { t, te } = useI18n()
  return computed(() => {
    const code = String(toValue(rank) ?? '').toLowerCase()
    return t(te(`rank.${code}`) ? `rank.${code}` : `rank.${LOWEST_RANK}`)
  })
}
