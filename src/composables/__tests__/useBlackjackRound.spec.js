import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, defineComponent, h } from 'vue'
import { createPinia, setActivePinia } from 'pinia'

import i18n from '@/i18n'
import { useBlackjackRound } from '../useBlackjackRound'
import { useBlackjackStore } from '@/stores/blackjack'
import { useWalletStore } from '@/stores/wallet'

vi.mock('@/api/http', () => ({
  api: vi.fn(),
  endSession: vi.fn(),
  refreshAccessToken: vi.fn(),
  setAccessToken: vi.fn(),
  waitForRefresh: vi.fn(),
}))

const HAND_ID = '7f1c2d9e-3a4b-4c5d-8e6f-0a1b2c3d4e5f'

function handOf(overrides) {
  return {
    id: HAND_ID,
    bet: 20,
    status: 'PLAYER_TURN',
    playerCards: [],
    playerTotal: 15,
    dealerCards: [],
    dealerTotal: 10,
    outcome: null,
    payout: null,
    ...overrides,
  }
}

function mountRound(prepare = () => {}) {
  let round
  const pinia = createPinia()
  setActivePinia(pinia)
  prepare(useBlackjackStore())
  const app = createApp(
    defineComponent({
      setup() {
        round = useBlackjackRound()
        return () => h('div')
      },
    }),
  )
  app.use(pinia)
  app.use(i18n)
  app.mount(document.createElement('div'))
  return round
}

describe('useBlackjackRound', () => {
  beforeEach(() => {
    i18n.global.locale.value = 'en'
  })

  it('offers the default bets and selects twenty chips before any hand', () => {
    const round = mountRound()

    expect(round.isBetting.value).toBe(true)
    expect(round.activeBet.value).toEqual({ code: 'TWENTY', chips: 20 })
    expect(round.announcement.value).toBe('')
  })

  it('announces the turn total while the hand is in progress', () => {
    const round = mountRound()
    useBlackjackStore().hand = handOf({})

    expect(round.isBetting.value).toBe(false)
    expect(round.announcement.value).toContain('15')
  })

  it('hides the dealer total while playing and flags a bust once finished', () => {
    const round = mountRound()
    const store = useBlackjackStore()
    store.hand = handOf({})
    const hidden = round.dealerTotalText.value

    store.hand = handOf({ status: 'FINISHED', dealerTotal: 25, outcome: 'WIN', payout: 40 })

    expect(hidden).not.toBe('10')
    expect(round.dealerBust.value).toBe(true)
    expect(round.outcomeClass.value).toBe('won')
    expect(round.announcement.value).toContain('40')
  })

  it('returns to betting after dismissing a finished hand', async () => {
    const round = mountRound()
    useBlackjackStore().hand = handOf({ status: 'FINISHED', outcome: 'LOSE', payout: 0 })

    await round.again()

    expect(round.isBetting.value).toBe(true)
    expect(round.announcement.value).toBe('')
  })

  it('opens on the bets when the last hand was already finished before sitting down', () => {
    const round = mountRound((store) => {
      store.hand = handOf({ status: 'FINISHED', outcome: 'WIN', payout: 40 })
    })

    expect(round.isBetting.value).toBe(true)
    expect(round.announcement.value).toBe('')
  })

  it('does not bring back an old result that arrives finished from a reload', () => {
    const round = mountRound()

    useBlackjackStore().hand = handOf({ id: 'old-hand', status: 'FINISHED', outcome: 'LOSE', payout: 0 })

    expect(round.isBetting.value).toBe(true)
  })

  it('shows the result of a hand the member just played, even when it ends on the deal', async () => {
    const round = mountRound()
    const store = useBlackjackStore()

    await round.perform(async () => {
      store.hand = handOf({ id: 'natural', status: 'FINISHED', outcome: 'BLACKJACK', payout: 50 })
    })

    expect(round.isBetting.value).toBe(false)
    expect(round.announcement.value).toContain('50')
  })

  it('refuses bets above the wallet balance', () => {
    const round = mountRound()
    useWalletStore().balance = 15

    expect(round.canAfford({ code: 'TEN', chips: 10 })).toBe(true)
    expect(round.canAfford({ code: 'FIFTY', chips: 50 })).toBe(false)
  })
})
