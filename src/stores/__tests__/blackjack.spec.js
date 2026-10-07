import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { useBlackjackStore } from '../blackjack'
import { useWalletStore } from '../wallet'
import { api } from '@/api/http'

vi.mock('@/api/http', () => ({
  api: vi.fn(),
  endSession: vi.fn(),
  refreshAccessToken: vi.fn(),
  setAccessToken: vi.fn(),
  waitForRefresh: vi.fn(),
}))

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
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
    playerCards: [card('TEN', 'SPADES'), card('NINE', 'HEARTS')],
    playerTotal: 19,
    dealerCards: [card('KING', 'CLUBS'), card('SEVEN', 'DIAMONDS')],
    dealerTotal: 17,
    outcome: 'WIN',
    payout: 40,
    ...overrides,
  })
}

function table(overrides = {}) {
  return { hand: null, balance: 100, bets: BETS, ...overrides }
}

function networkFailure() {
  return new TypeError('Failed to fetch')
}

function rejection(status, code) {
  return Object.assign(new Error(code), { status, code })
}

function deferred() {
  let resolve
  let reject
  const promise = new Promise((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

function keysSent() {
  return api.mock.calls.map(([, options]) => options?.headers?.['Idempotency-Key'])
}

describe('useBlackjackStore', () => {
  let blackjack
  let wallet

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    blackjack = useBlackjackStore()
    wallet = useWalletStore()
  })

  describe('load', () => {
    it('reads the table, the bets and syncs the balance', async () => {
      api.mockResolvedValueOnce(table({ balance: 80 }))

      await blackjack.load()

      expect(api).toHaveBeenCalledWith('/blackjack')
      expect(blackjack.hand).toBeNull()
      expect(blackjack.bets).toEqual(BETS)
      expect(wallet.balance).toBe(80)
      expect(blackjack.error).toBeNull()
      expect(blackjack.busy).toBe(false)
    })

    it('resumes a hand that was left in progress', async () => {
      api.mockResolvedValueOnce(table({ hand: playingHand() }))

      await blackjack.load()

      expect(blackjack.hand).toEqual(playingHand())
      expect(blackjack.playing).toBe(true)
      expect(blackjack.finished).toBe(false)
    })

    it('clears an error from before when it succeeds', async () => {
      api.mockRejectedValueOnce(rejection(404, 'wallet.not_found'))
      api.mockResolvedValueOnce(table())

      await blackjack.load()
      await blackjack.load()

      expect(blackjack.error).toBeNull()
    })

    it('keeps the error code when the table cannot be loaded', async () => {
      api.mockRejectedValueOnce(rejection(404, 'wallet.not_found'))

      await blackjack.load()

      expect(blackjack.error).toBe('wallet.not_found')
      expect(blackjack.bets).toEqual([])
      expect(blackjack.busy).toBe(false)
    })

    it('uses the generic error for a failure without a code', async () => {
      api.mockRejectedValueOnce(networkFailure())

      await blackjack.load()

      expect(blackjack.error).toBe('generic')
    })

    it('is busy while it loads and ignores an action in the meantime', async () => {
      const pending = deferred()
      api.mockReturnValueOnce(pending.promise)

      const loading = blackjack.load()
      expect(blackjack.busy).toBe(true)
      const dealt = await blackjack.deal('TEN')
      pending.resolve(table())
      await loading

      expect(dealt).toBeNull()
      expect(api).toHaveBeenCalledTimes(1)
      expect(blackjack.busy).toBe(false)
    })

    it('ignores a second load while one is in flight', async () => {
      const pending = deferred()
      api.mockReturnValueOnce(pending.promise)

      const first = blackjack.load()
      await blackjack.load()
      pending.resolve(table())
      await first

      expect(api).toHaveBeenCalledTimes(1)
    })

    it('ignores a table that arrives after the reset', async () => {
      const pending = deferred()
      api.mockReturnValueOnce(pending.promise)

      const loading = blackjack.load()
      blackjack.$reset()
      pending.resolve(table({ hand: playingHand(), balance: 5 }))
      await loading

      expect(blackjack.hand).toBeNull()
      expect(blackjack.bets).toEqual([])
      expect(wallet.balance).toBeNull()
    })

    it('ignores a failure that arrives after the reset', async () => {
      const pending = deferred()
      api.mockReturnValueOnce(pending.promise)

      const loading = blackjack.load()
      blackjack.$reset()
      pending.reject(rejection(500, 'internal.error'))
      await loading

      expect(blackjack.error).toBeNull()
    })
  })

  describe('deal', () => {
    it('posts the bet with an Idempotency-Key UUID header', async () => {
      api.mockResolvedValueOnce({ hand: playingHand(), balance: 80 })

      await blackjack.deal('TWENTY')

      const [path, options] = api.mock.calls[0]
      expect(path).toBe('/blackjack/hands')
      expect(options.method).toBe('POST')
      expect(options.body).toEqual({ bet: 'TWENTY' })
      expect(options.headers['Idempotency-Key']).toMatch(UUID)
    })

    it('keeps the hand, syncs the balance and returns the response', async () => {
      api.mockResolvedValueOnce({ hand: playingHand(), balance: 80 })

      const result = await blackjack.deal('TWENTY')

      expect(result).toEqual({ hand: playingHand(), balance: 80 })
      expect(blackjack.hand).toEqual(playingHand())
      expect(wallet.balance).toBe(80)
      expect(blackjack.busy).toBe(false)
    })

    it('keeps a natural as an already finished hand', async () => {
      const natural = finishedHand({ outcome: 'BLACKJACK', payout: 50, bet: 20 })
      api.mockResolvedValueOnce({ hand: natural, balance: 130 })

      await blackjack.deal('TWENTY')

      expect(blackjack.hand.outcome).toBe('BLACKJACK')
      expect(blackjack.finished).toBe(true)
      expect(blackjack.playing).toBe(false)
      expect(wallet.balance).toBe(130)
    })

    it('replaces the finished hand of the previous round', async () => {
      api.mockResolvedValueOnce(table({ hand: finishedHand() }))
      api.mockResolvedValueOnce({ hand: playingHand({ id: 'next' }), balance: 60 })

      await blackjack.load()
      await blackjack.deal('TEN')

      expect(blackjack.hand.id).toBe('next')
    })

    it('is busy while the request is in flight and ignores a second deal', async () => {
      const pending = deferred()
      api.mockReturnValueOnce(pending.promise)

      const first = blackjack.deal('TEN')
      const second = await blackjack.deal('FIFTY')
      expect(blackjack.busy).toBe(true)
      pending.resolve({ hand: playingHand(), balance: 90 })
      await first

      expect(second).toBeNull()
      expect(api).toHaveBeenCalledTimes(1)
      expect(blackjack.busy).toBe(false)
    })

    it('does not deal while a hand is in progress', async () => {
      api.mockResolvedValueOnce(table({ hand: playingHand() }))
      await blackjack.load()
      api.mockClear()

      const result = await blackjack.deal('TEN')

      expect(result).toBeNull()
      expect(api).not.toHaveBeenCalled()
    })

    it('reuses the same key when the retry follows a network failure', async () => {
      api.mockRejectedValueOnce(networkFailure())
      api.mockResolvedValueOnce({ hand: playingHand(), balance: 80 })

      await blackjack.deal('TWENTY')
      expect(blackjack.error).toBe('generic')
      await blackjack.deal('TWENTY')

      const [first, second] = keysSent()
      expect(second).toBe(first)
      expect(blackjack.error).toBeNull()
    })

    it('reuses the same key after a gateway error, since the hand may have been dealt', async () => {
      api.mockRejectedValueOnce(rejection(502, 'request.rejected'))
      api.mockResolvedValueOnce({ hand: playingHand(), balance: 80 })

      await blackjack.deal('TWENTY')
      await blackjack.deal('TWENTY')

      const [first, second] = keysSent()
      expect(second).toBe(first)
    })

    it('uses a new key after a definitive answer from the server', async () => {
      api.mockRejectedValueOnce(rejection(422, 'wallet.insufficient_funds'))
      api.mockResolvedValueOnce({ hand: playingHand(), balance: 80 })

      await blackjack.deal('TWENTY')
      expect(blackjack.error).toBe('wallet.insufficient_funds')
      await blackjack.deal('TWENTY')

      const [first, second] = keysSent()
      expect(second).not.toBe(first)
    })

    it('uses a new key after a success', async () => {
      api.mockResolvedValueOnce({ hand: finishedHand(), balance: 120 })
      api.mockResolvedValueOnce({ hand: finishedHand(), balance: 140 })

      await blackjack.deal('TWENTY')
      await blackjack.deal('TWENTY')

      const [first, second] = keysSent()
      expect(second).not.toBe(first)
    })

    it('uses a different key for a different bet', async () => {
      api.mockRejectedValueOnce(networkFailure())
      api.mockResolvedValueOnce({ hand: playingHand(), balance: 90 })

      await blackjack.deal('TWENTY')
      await blackjack.deal('TEN')

      const [first, second] = keysSent()
      expect(second).not.toBe(first)
    })

    it('keeps the unresolved key of a bet while another bet is dealt in between', async () => {
      api.mockRejectedValueOnce(networkFailure())
      api.mockResolvedValueOnce({ hand: finishedHand(), balance: 90 })
      api.mockResolvedValueOnce({ hand: playingHand(), balance: 80 })

      await blackjack.deal('TWENTY')
      await blackjack.deal('TEN')
      await blackjack.deal('TWENTY')

      const [first, , third] = keysSent()
      expect(third).toBe(first)
    })

    it('keeps the error code and the previous balance when the deal is rejected', async () => {
      wallet.balance = 3
      api.mockRejectedValueOnce(rejection(422, 'wallet.insufficient_funds'))

      const result = await blackjack.deal('FIFTY')

      expect(result).toBeNull()
      expect(blackjack.error).toBe('wallet.insufficient_funds')
      expect(wallet.balance).toBe(3)
      expect(blackjack.hand).toBeNull()
      expect(blackjack.busy).toBe(false)
    })

    it('clears the previous error when a new deal starts', async () => {
      api.mockRejectedValueOnce(rejection(422, 'wallet.insufficient_funds'))
      api.mockResolvedValueOnce({ hand: playingHand(), balance: 80 })

      await blackjack.deal('FIFTY')
      await blackjack.deal('TEN')

      expect(blackjack.error).toBeNull()
    })

    it('resumes the hand in progress when the server says there is one', async () => {
      api.mockRejectedValueOnce(rejection(409, 'blackjack.hand_in_progress'))
      api.mockResolvedValueOnce(table({ hand: playingHand(), balance: 80 }))

      const result = await blackjack.deal('TEN')

      expect(result).toBeNull()
      expect(api).toHaveBeenLastCalledWith('/blackjack')
      expect(blackjack.hand).toEqual(playingHand())
      expect(wallet.balance).toBe(80)
      expect(blackjack.error).toBe('blackjack.hand_in_progress')
      expect(blackjack.busy).toBe(false)
    })

    it('keeps the original error when resuming the hand fails too', async () => {
      api.mockRejectedValueOnce(rejection(409, 'blackjack.hand_in_progress'))
      api.mockRejectedValueOnce(networkFailure())

      await blackjack.deal('TEN')

      expect(blackjack.error).toBe('blackjack.hand_in_progress')
      expect(blackjack.hand).toBeNull()
    })

    it('ignores a deal that completes after the reset', async () => {
      const pending = deferred()
      api.mockReturnValueOnce(pending.promise)
      wallet.balance = 100

      const dealing = blackjack.deal('TEN')
      blackjack.$reset()
      pending.resolve({ hand: playingHand(), balance: 90 })
      await dealing

      expect(wallet.balance).toBe(100)
      expect(blackjack.hand).toBeNull()
      expect(blackjack.busy).toBe(false)
    })

    it('ignores a deal that fails after the reset', async () => {
      const pending = deferred()
      api.mockReturnValueOnce(pending.promise)

      const dealing = blackjack.deal('TEN')
      blackjack.$reset()
      pending.reject(rejection(422, 'wallet.insufficient_funds'))
      await dealing

      expect(blackjack.error).toBeNull()
    })
  })

  describe.each([
    ['hit', 'hit'],
    ['stand', 'stand'],
  ])('%s', (_name, action) => {
    async function startHand() {
      api.mockResolvedValueOnce(table({ hand: playingHand() }))
      await blackjack.load()
      api.mockClear()
    }

    it('posts to the hand of the table without an Idempotency-Key', async () => {
      await startHand()
      api.mockResolvedValueOnce({ hand: playingHand(), balance: 80 })

      await blackjack[action]()

      const [path, options] = api.mock.calls[0]
      expect(path).toBe(`/blackjack/hands/${HAND_ID}/${action}`)
      expect(options).toEqual({ method: 'POST' })
    })

    it('replaces the hand and syncs the balance from the response', async () => {
      await startHand()
      const next = finishedHand()
      api.mockResolvedValueOnce({ hand: next, balance: 120 })

      const result = await blackjack[action]()

      expect(result).toEqual({ hand: next, balance: 120 })
      expect(blackjack.hand).toEqual(next)
      expect(blackjack.finished).toBe(true)
      expect(wallet.balance).toBe(120)
      expect(blackjack.busy).toBe(false)
    })

    it('does nothing without a hand', async () => {
      const result = await blackjack[action]()

      expect(result).toBeNull()
      expect(api).not.toHaveBeenCalled()
    })

    it('does nothing once the hand is finished', async () => {
      api.mockResolvedValueOnce(table({ hand: finishedHand() }))
      await blackjack.load()
      api.mockClear()

      const result = await blackjack[action]()

      expect(result).toBeNull()
      expect(api).not.toHaveBeenCalled()
    })

    it('is busy while the request is in flight and ignores a second action', async () => {
      await startHand()
      const pending = deferred()
      api.mockReturnValueOnce(pending.promise)

      const first = blackjack[action]()
      const second = await blackjack.hit()
      const third = await blackjack.stand()
      expect(blackjack.busy).toBe(true)
      pending.resolve({ hand: playingHand(), balance: 80 })
      await first

      expect(second).toBeNull()
      expect(third).toBeNull()
      expect(api).toHaveBeenCalledTimes(1)
      expect(blackjack.busy).toBe(false)
    })

    it('keeps the hand and the error code when the request fails', async () => {
      await startHand()
      api.mockRejectedValueOnce(rejection(429, 'blackjack.too_many_requests'))

      const result = await blackjack[action]()

      expect(result).toBeNull()
      expect(blackjack.hand).toEqual(playingHand())
      expect(blackjack.error).toBe('blackjack.too_many_requests')
      expect(blackjack.busy).toBe(false)
    })

    it('uses the generic error after a network failure', async () => {
      await startHand()
      api.mockRejectedValueOnce(networkFailure())

      await blackjack[action]()

      expect(blackjack.error).toBe('generic')
      expect(blackjack.hand).toEqual(playingHand())
    })

    it.each(['blackjack.hand_finished', 'blackjack.hand_not_found', 'wallet.conflict'])(
      'rereads the table when the server answers %s',
      async (code) => {
        await startHand()
        api.mockRejectedValueOnce(rejection(409, code))
        api.mockResolvedValueOnce(table({ hand: finishedHand(), balance: 140 }))

        await blackjack[action]()

        expect(api).toHaveBeenLastCalledWith('/blackjack')
        expect(blackjack.hand).toEqual(finishedHand())
        expect(wallet.balance).toBe(140)
        expect(blackjack.error).toBe(code)
        expect(blackjack.busy).toBe(false)
      },
    )

    it('keeps the original error when rereading the table fails too', async () => {
      await startHand()
      api.mockRejectedValueOnce(rejection(404, 'blackjack.hand_not_found'))
      api.mockRejectedValueOnce(networkFailure())

      await blackjack[action]()

      expect(blackjack.error).toBe('blackjack.hand_not_found')
      expect(blackjack.hand).toEqual(playingHand())
    })

    it('ignores an answer that arrives after the reset', async () => {
      await startHand()
      const pending = deferred()
      api.mockReturnValueOnce(pending.promise)
      wallet.balance = 100

      const acting = blackjack[action]()
      blackjack.$reset()
      pending.resolve({ hand: finishedHand(), balance: 140 })
      await acting

      expect(blackjack.hand).toBeNull()
      expect(wallet.balance).toBe(100)
    })

    it('ignores a failure that arrives after the reset', async () => {
      await startHand()
      const pending = deferred()
      api.mockReturnValueOnce(pending.promise)

      const acting = blackjack[action]()
      blackjack.$reset()
      pending.reject(rejection(409, 'blackjack.hand_finished'))
      await acting

      expect(blackjack.error).toBeNull()
      expect(api).toHaveBeenCalledTimes(1)
    })
  })

  describe('$reset', () => {
    it('forgets the hand, the bets, the error and the busy flag', async () => {
      api.mockResolvedValueOnce(table({ hand: playingHand() }))
      await blackjack.load()
      api.mockRejectedValueOnce(rejection(429, 'blackjack.too_many_requests'))
      await blackjack.hit()

      blackjack.$reset()

      expect(blackjack.hand).toBeNull()
      expect(blackjack.bets).toEqual([])
      expect(blackjack.error).toBeNull()
      expect(blackjack.busy).toBe(false)
      expect(blackjack.playing).toBe(false)
      expect(blackjack.finished).toBe(false)
    })

    it('drops the pending idempotency keys', async () => {
      api.mockRejectedValueOnce(networkFailure())
      api.mockResolvedValueOnce({ hand: playingHand(), balance: 80 })

      await blackjack.deal('TWENTY')
      blackjack.$reset()
      await blackjack.deal('TWENTY')

      const [first, second] = keysSent()
      expect(second).not.toBe(first)
    })
  })
})
