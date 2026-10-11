import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

import BlackjackBar from '../blackjack/BlackjackBar.vue'
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

function failure(status, code) {
  return Object.assign(new Error(code), { status, code })
}

let wrapper = null

async function mountBar(hand = null, balance = 100) {
  const blackjack = useBlackjackStore()
  const finished = hand?.status === 'FINISHED'
  blackjack.hand = finished ? { ...hand, status: 'PLAYER_TURN', outcome: null, payout: null } : hand
  blackjack.bets = BETS
  useWalletStore().balance = balance
  wrapper = mount(BlackjackBar, { global: { plugins: [i18n] }, attachTo: document.body })
  if (finished) {
    blackjack.hand = hand
    await flushPromises()
  }
  return wrapper
}

async function press(selector) {
  await wrapper.find(selector).trigger('click')
  await flushPromises()
}

function chipLabels() {
  return wrapper.findAll('.bet-chip').map((chip) => chip.text())
}

function actionLabels() {
  return wrapper.findAll('.action').map((button) => button.text())
}

describe('BlackjackBar', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    i18n.global.locale.value = 'es'
  })

  afterEach(() => {
    wrapper?.unmount()
    wrapper = null
    document.body.innerHTML = ''
  })

  it('always shows the stand-up hint', () => {
    mountBar()

    expect(wrapper.find('.hint').text()).toBe('Esc para levantarte')
  })

  it('shows the stand-up hint in English', () => {
    i18n.global.locale.value = 'en'

    mountBar()

    expect(wrapper.find('.hint').text()).toBe('Esc to stand up')
  })

  describe('before a hand', () => {
    it('offers the three bets with the twenty chip chosen and a deal button', () => {
      mountBar()

      expect(chipLabels()).toEqual(['10', '20', '50'])
      const pressed = wrapper.findAll('.bet-chip').map((chip) => chip.attributes('aria-pressed'))
      expect(pressed).toEqual(['false', 'true', 'false'])
      expect(wrapper.find('.action.primary').text()).toBe('Repartir · 20 ¢')
    })

    it('falls back to the default bets when the store has none', () => {
      const blackjack = useBlackjackStore()
      blackjack.bets = []
      wrapper = mount(BlackjackBar, { global: { plugins: [i18n] }, attachTo: document.body })

      expect(chipLabels()).toEqual(['10', '20', '50'])
    })

    it('focuses the deal button when it appears', async () => {
      mountBar()
      await wrapper.vm.$nextTick()

      expect(document.activeElement).toBe(wrapper.find('.action.primary').element)
    })

    it('changes the chosen bet and the deal label', async () => {
      mountBar()

      await wrapper.findAll('.bet-chip')[2].trigger('click')

      expect(wrapper.find('.action.primary').text()).toBe('Repartir · 50 ¢')
    })

    it('disables the chips and the deal button the balance cannot cover', () => {
      mountBar(null, 15)

      const disabled = wrapper.findAll('.bet-chip').map((chip) => chip.attributes('disabled') !== undefined)
      expect(disabled).toEqual([false, true, true])
      expect(wrapper.find('.action.primary').attributes('disabled')).toBeDefined()
    })

    it('does not block bets while the balance is still unknown', () => {
      mountBar(null, null)

      expect(wrapper.findAll('.bet-chip').every((chip) => chip.attributes('disabled') === undefined)).toBe(true)
    })

    it('deals the chosen bet with an idempotency key', async () => {
      mountBar()
      await wrapper.findAll('.bet-chip')[0].trigger('click')
      api.mockResolvedValueOnce({ hand: playingHand({ bet: 10 }), balance: 90 })

      await press('.action.primary')

      expect(api).toHaveBeenCalledWith(
        '/blackjack/hands',
        expect.objectContaining({
          method: 'POST',
          body: { bet: 'TEN' },
          headers: { 'Idempotency-Key': expect.stringMatching(/^[0-9a-f-]{36}$/) },
        }),
      )
      expect(useWalletStore().balance).toBe(90)
      expect(wrapper.find('.bet-chip').exists()).toBe(false)
    })

    it('shows the deal in progress while the request is open', async () => {
      mountBar()
      api.mockReturnValueOnce(new Promise(() => {}))

      await wrapper.find('.action.primary').trigger('click')

      expect(wrapper.find('.action.primary').text()).toBe('Repartiendo…')
      expect(wrapper.find('.action.primary').attributes('disabled')).toBeDefined()
      expect(wrapper.find('section').attributes('aria-busy')).toBe('true')
    })

    it('shows the mapped error and stays on the bets when the deal fails', async () => {
      mountBar()
      api.mockRejectedValueOnce(failure(422, 'wallet.insufficient_funds'))

      await press('.action.primary')

      expect(wrapper.find('[role="alert"]').text()).toBe(
        'Eso cuesta más monedas de las que llevas encima.',
      )
      expect(wrapper.findAll('.bet-chip')).toHaveLength(3)
    })
  })

  describe('player turn', () => {
    it('shows the hidden dealer total, your total, the bet and hit and stand', () => {
      mountBar(playingHand())

      const values = wrapper.findAll('.datum').map((datum) => datum.text())
      expect(values).toEqual(['La banca10 + ?', 'Tú15', 'Apuesta20 ¢'])
      expect(actionLabels()).toEqual(['Pedir carta', 'Plantarse'])
      expect(wrapper.find('.bet-chip').exists()).toBe(false)
    })

    it('announces the turn to screen readers', () => {
      mountBar(playingHand())

      expect(wrapper.find('[role="status"]').text()).toBe('Tu turno · llevas 15')
    })

    it('focuses hit when the hand is open', async () => {
      mountBar(playingHand())
      await wrapper.vm.$nextTick()

      expect(document.activeElement).toBe(wrapper.find('.action.primary').element)
    })

    it('hits and keeps playing with the new total', async () => {
      mountBar(playingHand())
      api.mockResolvedValueOnce({
        hand: playingHand({
          playerCards: [card('TEN', 'SPADES'), card('FIVE', 'HEARTS'), card('TWO', 'CLUBS')],
          playerTotal: 17,
        }),
        balance: 80,
      })

      await press('.action.primary')

      expect(api).toHaveBeenCalledWith(`/blackjack/hands/${HAND_ID}/hit`, { method: 'POST' })
      expect(wrapper.findAll('.datum')[1].text()).toBe('Tú17')
      expect(document.activeElement).toBe(wrapper.find('.action.primary').element)
    })

    it('stands and shows the result', async () => {
      mountBar(playingHand())
      api.mockResolvedValueOnce({ hand: finishedHand(), balance: 120 })

      await wrapper.findAll('.action')[1].trigger('click')
      await flushPromises()

      expect(api).toHaveBeenCalledWith(`/blackjack/hands/${HAND_ID}/stand`, { method: 'POST' })
      expect(wrapper.find('.result').text()).toBe('Ganas')
    })

    it('disables hit and stand while a request is open', async () => {
      mountBar(playingHand())
      api.mockReturnValueOnce(new Promise(() => {}))

      await wrapper.find('.action.primary').trigger('click')

      expect(wrapper.findAll('.action').every((button) => button.attributes('disabled') !== undefined)).toBe(true)
    })

    it('marks your total when you go over 21', () => {
      mountBar(playingHand({ playerTotal: 25 }))

      expect(wrapper.findAll('.value')[1].text()).toBe('25 · se pasa')
      expect(wrapper.findAll('.value')[1].classes()).toContain('bust')
    })

    it('shows a mapped error when hitting fails', async () => {
      mountBar(playingHand())
      api.mockRejectedValueOnce(failure(409, 'wallet.conflict'))
      api.mockResolvedValueOnce({ hand: playingHand(), bets: BETS, balance: 80 })

      await press('.action.primary')

      expect(wrapper.find('[role="alert"]').text()).toBe('Tu cartera estaba ocupada. Inténtalo otra vez.')
    })
  })

  describe('finished hand', () => {
    it('shows the dealer total, the result with its payout and the another-hand button', async () => {
      await mountBar(finishedHand())

      const values = wrapper.findAll('.datum').map((datum) => datum.text())
      expect(values).toEqual(['La banca25 · se pasa', 'Tú19', 'Apuesta20 ¢', 'Ganas+40 ¢'])
      expect(wrapper.find('.result').classes()).toContain('won')
      expect(actionLabels()).toEqual(['Otra mano'])
      expect(wrapper.findAll('.value')[0].classes()).toContain('bust')
    })

    it('announces the result and the payout', async () => {
      await mountBar(finishedHand())

      expect(wrapper.find('[role="status"]').text()).toBe('Ganas · +40 ¢')
    })

    it.each([
      ['BLACKJACK', 'won', '¡Blackjack!'],
      ['PUSH', 'tied', 'Empate'],
      ['LOSE', 'lost', 'Pierdes'],
    ])('styles a %s result as %s', async (outcome, tone, text) => {
      await mountBar(finishedHand({ outcome, payout: outcome === 'LOSE' ? 0 : 20 }))

      expect(wrapper.find('.result').classes()).toContain(tone)
      expect(wrapper.find('.result').text()).toBe(text)
    })

    it('omits the payout when nothing is paid', async () => {
      await mountBar(finishedHand({ outcome: 'LOSE', payout: 0 }))

      expect(wrapper.findAll('.datum').at(-1).text()).toBe('Pierdes')
      expect(wrapper.find('[role="status"]').text()).toBe('Pierdes')
    })

    it('goes back to the bets with another hand and focuses the deal button', async () => {
      await mountBar(finishedHand())

      await press('.action.primary')

      expect(chipLabels()).toEqual(['10', '20', '50'])
      expect(wrapper.find('.action.primary').text()).toBe('Repartir · 20 ¢')
      expect(wrapper.find('[role="status"]').text()).toBe('')
      expect(document.activeElement).toBe(wrapper.find('.action.primary').element)
    })

    it('deals a new hand after another hand', async () => {
      await mountBar(finishedHand())
      await press('.action.primary')
      api.mockResolvedValueOnce({ hand: playingHand({ id: 'next-hand' }), balance: 60 })

      await press('.action.primary')

      expect(wrapper.find('.bet-chip').exists()).toBe(false)
      expect(wrapper.findAll('.datum')[0].text()).toBe('La banca10 + ?')
    })

    it('translates the result to English', async () => {
      i18n.global.locale.value = 'en'

      await mountBar(finishedHand())

      expect(wrapper.find('.result').text()).toBe('You win')
      expect(actionLabels()).toEqual(['Another hand'])
    })
  })
})
