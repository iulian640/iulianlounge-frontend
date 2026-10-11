import { computed, nextTick, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import {
  BUST_LIMIT,
  DEFAULT_BETS,
  DEFAULT_BET_CODE,
  outcomeTone,
  totalLabel,
} from '@/components/blackjack/betOptions'
import { useBlackjackStore } from '@/stores/blackjack'
import { useWalletStore } from '@/stores/wallet'

export function useBlackjackRound() {
  const { t } = useI18n()
  const blackjack = useBlackjackStore()
  const wallet = useWalletStore()

  const selectedCode = ref(DEFAULT_BET_CODE)
  const dismissedHandId = ref(null)
  const focusTarget = ref(null)

  const hand = computed(() => blackjack.hand)
  const options = computed(() => (blackjack.bets.length > 0 ? blackjack.bets : DEFAULT_BETS))
  const activeBet = computed(
    () => options.value.find((bet) => bet.code === selectedCode.value) ?? options.value[0],
  )
  const isBetting = computed(() => !hand.value || hand.value.id === dismissedHandId.value)
  const outcomeClass = computed(() => outcomeTone(hand.value?.outcome))
  const outcomeText = computed(() =>
    hand.value?.outcome ? t(`blackjack.outcome.${hand.value.outcome}`) : '',
  )
  const payoutText = computed(() =>
    hand.value?.payout > 0 ? t('blackjack.payout', { amount: hand.value.payout }) : '',
  )
  const dealerTotalText = computed(() =>
    totalLabel(t, hand.value?.dealerTotal ?? 0, blackjack.playing),
  )
  const playerTotalText = computed(() => totalLabel(t, hand.value?.playerTotal ?? 0, false))
  const playerBust = computed(() => (hand.value?.playerTotal ?? 0) > BUST_LIMIT)
  const dealerBust = computed(
    () => !blackjack.playing && (hand.value?.dealerTotal ?? 0) > BUST_LIMIT,
  )
  const announcement = computed(() => {
    if (isBetting.value) return ''
    if (blackjack.playing) return t('blackjack.turn', { total: hand.value.playerTotal })
    return [outcomeText.value, payoutText.value].filter(Boolean).join(' · ')
  })

  function canAfford(bet) {
    return wallet.balance === null || bet.chips <= wallet.balance
  }

  function chipsText(amount) {
    return t('bar.menu.price', { amount })
  }

  async function focusPrimary() {
    await nextTick()
    focusTarget.value?.focus()
  }

  async function perform(action) {
    await action()
    await focusPrimary()
  }

  function deal() {
    return perform(() => blackjack.deal(activeBet.value.code))
  }

  function again() {
    return perform(async () => {
      dismissedHandId.value = hand.value?.id ?? null
    })
  }

  return {
    selectedCode,
    focusTarget,
    hand,
    options,
    activeBet,
    isBetting,
    outcomeClass,
    outcomeText,
    payoutText,
    dealerTotalText,
    playerTotalText,
    playerBust,
    dealerBust,
    announcement,
    canAfford,
    chipsText,
    focusPrimary,
    perform,
    deal,
    again,
  }
}
