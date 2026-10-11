import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

import BlackjackTable from '../blackjack/BlackjackTable.vue'
import i18n from '@/i18n'
import { api } from '@/api/http'
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
const NEXT_HAND_ID = '0d9c8b7a-6f5e-4d3c-8b2a-1f0e9d8c7b6a'
const BETS = [
  { code: 'TEN', chips: 10 },
  { code: 'TWENTY', chips: 20 },
  { code: 'FIFTY', chips: 50 },
]

function card(face, suit) {
  return { face, suit }
}

function playingHand(overrides = {}) {
  return {
    id: HAND_ID,
    bet: 20,
    status: 'PLAYER_TURN',
    playerCards: [card('TEN', 'SPADES'), card('FIVE', 'HEARTS')],
    playerTotal: 15,
    dealerCards: [card('KING', 'CLUBS')],
    dealerTotal: 10,
    outcome: null,
    payout: null,
    ...overrides,
  }
}

function finishedHand(overrides = {}) {
  return playingHand({
    status: 'FINISHED',
    playerCards: [card('SEVEN', 'HEARTS'), card('EIGHT', 'CLUBS'), card('FOUR', 'SPADES')],
    playerTotal: 19,
    dealerCards: [card('KING', 'SPADES'), card('SIX', 'DIAMONDS'), card('NINE', 'CLUBS')],
    dealerTotal: 25,
    outcome: 'WIN',
    payout: 40,
    ...overrides,
  })
}

function table(overrides = {}) {
  return { hand: null, balance: 100, bets: BETS, ...overrides }
}

function failure(status, code) {
  return Object.assign(new Error(code), { status, code })
}

let wrapper = null

async function mountTable(initial = table()) {
  api.mockResolvedValueOnce(initial)
  wrapper = mount(BlackjackTable, { global: { plugins: [i18n] }, attachTo: document.body })
  await flushPromises()
  return wrapper
}

async function press(selector) {
  await wrapper.find(selector).trigger('click')
  await flushPromises()
}

function chipLabels() {
  return wrapper.findAll('.bet-chip').map((chip) => chip.text())
}

describe('BlackjackTable', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    i18n.global.locale.value = 'es'
    useWalletStore().balance = 100
  })

  afterEach(() => {
    wrapper?.unmount()
    wrapper = null
    document.body.innerHTML = ''
  })

  describe('betting', () => {
    it('loads the table on mount', async () => {
      await mountTable()

      expect(api).toHaveBeenCalledWith('/blackjack')
    })

    it('offers the three bets with the twenty chip chosen', async () => {
      await mountTable()

      expect(wrapper.text()).toContain('Elige tu apuesta')
      expect(chipLabels()).toEqual(['10', '20', '50'])
      const pressed = wrapper.findAll('.bet-chip').map((chip) => chip.attributes('aria-pressed'))
      expect(pressed).toEqual(['false', 'true', 'false'])
      expect(wrapper.find('.action.primary').text()).toBe('Repartir · 20 ¢')
      expect(wrapper.find('.rules').text()).toBe('La banca pide hasta 17 · Blackjack paga 3:2')
    })

    it('keeps the three bets available when loading the table fails', async () => {
      api.mockRejectedValueOnce(failure(500, 'generic'))
      wrapper = mount(BlackjackTable, { global: { plugins: [i18n] } })
      await flushPromises()

      expect(chipLabels()).toEqual(['10', '20', '50'])
      expect(wrapper.find('[role="alert"]').text()).toBe('Algo ha fallado. Inténtalo otra vez.')
    })

    it('changes the chosen bet and the deal label', async () => {
      await mountTable()

      await wrapper.findAll('.bet-chip')[2].trigger('click')

      expect(wrapper.findAll('.bet-chip')[2].attributes('aria-pressed')).toBe('true')
      expect(wrapper.find('.action.primary').text()).toBe('Repartir · 50 ¢')
    })

    it('disables the chips the balance cannot cover', async () => {
      await mountTable(table({ balance: 15 }))

      const disabled = wrapper.findAll('.bet-chip').map((chip) => chip.attributes('disabled') !== undefined)
      expect(disabled).toEqual([false, true, true])
    })

    it('disables the deal button when the chosen bet is out of reach', async () => {
      await mountTable(table({ balance: 15 }))

      expect(wrapper.find('.action.primary').attributes('disabled')).toBeDefined()
    })

    it('translates the betting panel to English', async () => {
      i18n.global.locale.value = 'en'

      await mountTable()

      expect(wrapper.text()).toContain('Choose your bet')
      expect(wrapper.find('.action.primary').text()).toBe('Deal · 20 ¢')
    })

    it('deals the chosen bet with an idempotency key and shows the hand', async () => {
      await mountTable()
      await wrapper.findAll('.bet-chip')[0].trigger('click')
      api.mockResolvedValueOnce({ hand: playingHand({ bet: 10 }), balance: 90 })

      await press('.action.primary')

      expect(api).toHaveBeenLastCalledWith(
        '/blackjack/hands',
        expect.objectContaining({
          method: 'POST',
          body: { bet: 'TEN' },
          headers: { 'Idempotency-Key': expect.stringMatching(/^[0-9a-f-]{36}$/) },
        }),
      )
      expect(useWalletStore().balance).toBe(90)
      expect(wrapper.find('.bet-chip').exists()).toBe(false)
      expect(wrapper.findAll('.hand')).toHaveLength(2)
    })

    it('shows the deal in progress while the request is open', async () => {
      await mountTable()
      api.mockReturnValueOnce(new Promise(() => {}))

      await wrapper.find('.action.primary').trigger('click')

      expect(wrapper.find('.action.primary').text()).toBe('Repartiendo…')
      expect(wrapper.find('.action.primary').attributes('disabled')).toBeDefined()
      expect(wrapper.find('section').attributes('aria-busy')).toBe('true')
    })

    it('shows the mapped error and stays on the bets when the deal fails', async () => {
      await mountTable()
      api.mockRejectedValueOnce(failure(422, 'wallet.insufficient_funds'))

      await press('.action.primary')

      expect(wrapper.find('[role="alert"]').text()).toBe(
        'Eso cuesta más monedas de las que llevas encima.',
      )
      expect(wrapper.findAll('.bet-chip')).toHaveLength(3)
    })

    it('moves to the open hand when the server says one is already in progress', async () => {
      await mountTable()
      api.mockRejectedValueOnce(failure(409, 'blackjack.hand_in_progress'))
      api.mockResolvedValueOnce(table({ hand: playingHand() }))

      await press('.action.primary')

      expect(wrapper.find('[role="alert"]').text()).toBe(
        'Ya tienes una mano abierta. Termínala antes de repartir otra.',
      )
      expect(wrapper.find('.bet-chip').exists()).toBe(false)
      expect(wrapper.findAll('.action')).toHaveLength(2)
    })
  })

  describe('player turn', () => {
    async function mountPlaying(hand = playingHand()) {
      return mountTable(table({ hand }))
    }

    it('resumes an open hand with the up card, a hidden card and the partial total', async () => {
      await mountPlaying()

      const dealerCards = wrapper.findAll('.hand')[0].findAll('.card')
      expect(dealerCards).toHaveLength(2)
      expect(dealerCards[0].attributes('aria-label')).toBe('rey de tréboles')
      expect(dealerCards[1].classes()).toContain('hidden')
      expect(dealerCards[1].attributes('aria-label')).toBe('carta oculta')
      expect(wrapper.findAll('.hand-total')[0].text()).toBe('10 + ?')
      expect(wrapper.findAll('.hand-total')[1].text()).toBe('15')
    })

    it('draws the ranks and suits and marks the red suits', async () => {
      await mountPlaying()

      const playerCards = wrapper.findAll('.hand')[1].findAll('.card')
      expect(playerCards[0].text()).toContain('10♠')
      expect(playerCards[0].classes()).not.toContain('red')
      expect(playerCards[1].text()).toContain('5♥')
      expect(playerCards[1].classes()).toContain('red')
    })

    it('labels the hands and shows the stake', async () => {
      await mountPlaying()

      expect(wrapper.findAll('.hand-label').map((label) => label.text())).toEqual(['La banca', 'Tú'])
      expect(wrapper.find('.result-line').text()).toBe('Apuesta20 ¢')
    })

    it('offers hit and stand and announces the turn', async () => {
      await mountPlaying()

      expect(wrapper.findAll('.action').map((button) => button.text())).toEqual(['Pedir carta', 'Plantarse'])
      expect(wrapper.find('[role="status"]').text()).toBe('Tu turno · llevas 15')
    })

    it('hits and keeps playing with the new card', async () => {
      await mountPlaying()
      api.mockResolvedValueOnce({
        hand: playingHand({
          playerCards: [card('TEN', 'SPADES'), card('FIVE', 'HEARTS'), card('TWO', 'CLUBS')],
          playerTotal: 17,
        }),
        balance: 80,
      })

      await press('.action.primary')

      expect(api).toHaveBeenLastCalledWith(`/blackjack/hands/${HAND_ID}/hit`, { method: 'POST' })
      expect(wrapper.findAll('.hand')[1].findAll('.card')).toHaveLength(3)
      expect(wrapper.find('[role="status"]').text()).toBe('Tu turno · llevas 17')
    })

    it('shows bust and the loss when a hit goes over 21', async () => {
      await mountPlaying()
      api.mockResolvedValueOnce({
        hand: finishedHand({
          playerCards: [card('TEN', 'SPADES'), card('FIVE', 'HEARTS'), card('KING', 'CLUBS')],
          playerTotal: 25,
          dealerCards: [card('KING', 'CLUBS')],
          dealerTotal: 10,
          outcome: 'LOSE',
          payout: 0,
        }),
        balance: 80,
      })

      await press('.action.primary')

      expect(wrapper.findAll('.hand-total')[1].text()).toBe('25 · se pasa')
      expect(wrapper.findAll('.hand-total')[1].classes()).toContain('bust')
      expect(wrapper.find('.result').text()).toBe('Pierdes')
      expect(wrapper.find('.result').classes()).toContain('lost')
      expect(wrapper.find('.payout').exists()).toBe(false)
    })

    it('stands and reveals the dealer hand', async () => {
      await mountPlaying()
      api.mockResolvedValueOnce({ hand: finishedHand(), balance: 120 })

      await press('.action:not(.primary)')

      expect(api).toHaveBeenLastCalledWith(`/blackjack/hands/${HAND_ID}/stand`, { method: 'POST' })
      expect(wrapper.findAll('.hand')[0].findAll('.card.hidden')).toHaveLength(0)
      expect(wrapper.findAll('.hand-total')[0].text()).toBe('25 · se pasa')
    })

    it('disables both actions while a request is open', async () => {
      await mountPlaying()
      api.mockReturnValueOnce(new Promise(() => {}))

      await wrapper.find('.action.primary').trigger('click')

      expect(wrapper.findAll('.action').every((button) => button.attributes('disabled') !== undefined)).toBe(
        true,
      )
    })

    it('shows the mapped error when an action is rejected', async () => {
      await mountPlaying()
      api.mockRejectedValueOnce(failure(429, 'blackjack.too_many_requests'))

      await press('.action.primary')

      expect(wrapper.find('[role="alert"]').text()).toBe('Vas muy rápido. La banca necesita un minuto.')
      expect(wrapper.findAll('.action')).toHaveLength(2)
    })

    it('keeps the focus on the primary action after hitting', async () => {
      await mountPlaying()
      api.mockResolvedValueOnce({ hand: playingHand({ playerTotal: 16 }), balance: 80 })

      await press('.action.primary')

      expect(document.activeElement).toBe(wrapper.find('.action.primary').element)
    })
  })

  describe('result', () => {
    async function mountFinished(hand = finishedHand()) {
      return mountTable(table({ hand }))
    }

    it('shows the outcome with the payout between the hands', async () => {
      await mountFinished()

      expect(wrapper.find('.result').text()).toBe('Ganas')
      expect(wrapper.find('.result').classes()).toContain('won')
      expect(wrapper.find('.payout').text()).toBe('+40 ¢')
      expect(wrapper.findAll('.hand-total').map((total) => total.text())).toEqual(['25 · se pasa', '19'])
    })

    it('announces the result and the payout', async () => {
      await mountFinished()

      expect(wrapper.find('[role="status"]').text()).toBe('Ganas · +40 ¢')
    })

    it('styles a push as neutral', async () => {
      await mountFinished(finishedHand({ outcome: 'PUSH', payout: 20 }))

      expect(wrapper.find('.result').text()).toBe('Empate')
      expect(wrapper.find('.result').classes()).toContain('tied')
    })

    it('celebrates a natural that comes back already finished', async () => {
      await mountTable()
      api.mockResolvedValueOnce({
        hand: finishedHand({
          playerCards: [card('ACE', 'SPADES'), card('KING', 'HEARTS')],
          playerTotal: 21,
          dealerCards: [card('NINE', 'CLUBS'), card('SEVEN', 'DIAMONDS')],
          dealerTotal: 16,
          outcome: 'BLACKJACK',
          payout: 50,
        }),
        balance: 130,
      })

      await press('.action.primary')

      expect(wrapper.find('.result').text()).toBe('¡Blackjack!')
      expect(wrapper.find('.result').classes()).toContain('won')
      expect(wrapper.find('.payout').text()).toBe('+50 ¢')
      expect(wrapper.find('.action.primary').text()).toBe('Otra mano')
    })

    it('translates the result to English', async () => {
      i18n.global.locale.value = 'en'

      await mountFinished()

      expect(wrapper.find('.result').text()).toBe('You win')
      expect(wrapper.find('.action.primary').text()).toBe('Another hand')
      expect(wrapper.findAll('.hand-total')[0].text()).toBe('25 · bust')
    })

    it('goes back to the bets with another hand and keeps the last result out of the way', async () => {
      await mountFinished()

      await press('.action.primary')

      expect(wrapper.findAll('.bet-chip')).toHaveLength(3)
      expect(wrapper.find('.result').exists()).toBe(false)
      expect(wrapper.find('[role="status"]').text()).toBe('')
    })

    it('deals a new hand after another hand', async () => {
      await mountFinished()
      await press('.action.primary')
      api.mockResolvedValueOnce({ hand: playingHand({ id: NEXT_HAND_ID }), balance: 80 })

      await press('.action.primary')

      expect(api).toHaveBeenLastCalledWith(
        '/blackjack/hands',
        expect.objectContaining({ body: { bet: 'TWENTY' } }),
      )
      expect(wrapper.findAll('.action')).toHaveLength(2)
      expect(wrapper.find('.bet-chip').exists()).toBe(false)
    })

    it('stays on the bets when the next deal fails', async () => {
      await mountFinished()
      await press('.action.primary')
      api.mockRejectedValueOnce(failure(422, 'wallet.insufficient_funds'))

      await press('.action.primary')

      expect(wrapper.findAll('.bet-chip')).toHaveLength(3)
      expect(wrapper.find('[role="alert"]').exists()).toBe(true)
    })
  })

  it('goes back to the bets when the table is reset', async () => {
    await mountTable(table({ hand: playingHand() }))

    useBlackjackStore().$reset()
    await flushPromises()

    expect(wrapper.findAll('.bet-chip')).toHaveLength(3)
  })
})
