import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { useBarStore } from '../bar'
import { useAuthStore } from '../auth'
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
const TALK_TIMEOUT_MS = 12_000
const FALLBACK_LOCK_MS = 120_000
const RATE_LIMIT_LOCK_MS = 60_000

const MENU = {
  drinks: [
    { code: 'BATHTUB_GIN', price: 5 },
    { code: 'FRENCH_75', price: 40 },
  ],
  balance: 100,
  rank: 'NADIE',
  creditAvailable: false,
  line: 'barman.greeting.nadie',
}

function served(overrides = {}) {
  return {
    drink: 'FRENCH_75',
    price: 40,
    balance: 60,
    rank: 'HABITUAL',
    promoted: true,
    creditAvailable: false,
    line: 'barman.promotion.habitual',
    ...overrides,
  }
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

function lines(bar) {
  return bar.conversation.map(({ from, key, text }) => ({ from, ...(key ? { key } : { text }) }))
}

describe('useBarStore', () => {
  let bar
  let wallet
  let auth

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    bar = useBarStore()
    wallet = useWalletStore()
    auth = useAuthStore()
    auth.user = { username: 'cursaito', rank: 'NADIE' }
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('load', () => {
    it('reads the menu, the credit flag and syncs balance and rank', async () => {
      api.mockResolvedValueOnce({ ...MENU, rank: 'HABITUAL', balance: 60, creditAvailable: true })

      await bar.load()

      expect(api).toHaveBeenCalledWith('/bar')
      expect(bar.drinks).toEqual(MENU.drinks)
      expect(bar.creditAvailable).toBe(true)
      expect(wallet.balance).toBe(60)
      expect(auth.user.rank).toBe('HABITUAL')
    })

    it('opens the conversation with the greeting line as a key, once', async () => {
      api.mockResolvedValue(MENU)

      await bar.load()
      await bar.load()

      expect(lines(bar)).toEqual([{ from: 'barman', key: 'barman.greeting.nadie' }])
    })

    it('keeps the error code when the menu cannot be loaded', async () => {
      api.mockRejectedValueOnce(rejection(404, 'wallet.not_found'))

      await bar.load()

      expect(bar.error).toBe('wallet.not_found')
      expect(bar.drinks).toEqual([])
    })

    it('uses the generic error for a failure without a code', async () => {
      api.mockRejectedValueOnce(networkFailure())

      await bar.load()

      expect(bar.error).toBe('generic')
    })

    it('ignores a menu that arrives after the reset', async () => {
      const pending = deferred()
      api.mockReturnValueOnce(pending.promise)

      const loading = bar.load()
      bar.$reset()
      pending.resolve(MENU)
      await loading

      expect(bar.drinks).toEqual([])
      expect(wallet.balance).toBeNull()
      expect(bar.conversation).toEqual([])
    })

    it('drops a greeting key that does not look like a barman line', async () => {
      api.mockResolvedValueOnce({ ...MENU, line: '<img src=x onerror=alert(1)>' })

      await bar.load()

      expect(bar.conversation).toEqual([])
    })
  })

  describe('order', () => {
    it('posts the drink with an Idempotency-Key UUID header', async () => {
      api.mockResolvedValueOnce(served())

      await bar.order('FRENCH_75')

      const [path, options] = api.mock.calls[0]
      expect(path).toBe('/bar/orders')
      expect(options.method).toBe('POST')
      expect(options.body).toEqual({ drink: 'FRENCH_75' })
      expect(options.headers['Idempotency-Key']).toMatch(UUID)
    })

    it('updates the wallet balance, the member rank and the credit flag', async () => {
      api.mockResolvedValueOnce(served({ creditAvailable: true }))

      const result = await bar.order('FRENCH_75')

      expect(result).toMatchObject({ drink: 'FRENCH_75', promoted: true })
      expect(wallet.balance).toBe(60)
      expect(auth.user.rank).toBe('HABITUAL')
      expect(auth.user.username).toBe('cursaito')
      expect(bar.creditAvailable).toBe(true)
    })

    it('does not mutate the previous user object', async () => {
      const before = auth.user
      api.mockResolvedValueOnce(served())

      await bar.order('FRENCH_75')

      expect(before.rank).toBe('NADIE')
      expect(auth.user).not.toBe(before)
    })

    it('adds what the member asked for and the barman line to the conversation', async () => {
      api.mockResolvedValueOnce(served())

      await bar.order('FRENCH_75')

      expect(bar.conversation[0]).toMatchObject({ from: 'member', key: 'bar.menu.said', params: { drink: 'FRENCH_75' } })
      expect(bar.conversation[1]).toMatchObject({ from: 'barman', key: 'barman.promotion.habitual' })
    })

    it('records the last served drink so the scene can show it', async () => {
      api.mockResolvedValueOnce(served({ promoted: false }))
      api.mockResolvedValueOnce(served({ promoted: false }))

      await bar.order('FRENCH_75')
      const first = bar.lastOrder
      await bar.order('FRENCH_75')

      expect(first).toMatchObject({ drink: 'FRENCH_75', promoted: false })
      expect(bar.lastOrder.id).toBeGreaterThan(first.id)
    })

    it('reuses the same key when the retry follows a network failure', async () => {
      api.mockRejectedValueOnce(networkFailure())
      api.mockResolvedValueOnce(served())

      await bar.order('FRENCH_75')
      expect(bar.error).toBe('generic')
      await bar.order('FRENCH_75')

      const [first, second] = api.mock.calls.map(([, options]) => options.headers['Idempotency-Key'])
      expect(second).toBe(first)
      expect(bar.error).toBeNull()
    })

    it('reuses the same key after a gateway error, since the order may have gone through', async () => {
      api.mockRejectedValueOnce(rejection(502, 'request.rejected'))
      api.mockResolvedValueOnce(served())

      await bar.order('FRENCH_75')
      await bar.order('FRENCH_75')

      const [first, second] = api.mock.calls.map(([, options]) => options.headers['Idempotency-Key'])
      expect(second).toBe(first)
    })

    it('uses a new key after a definitive answer from the server', async () => {
      api.mockRejectedValueOnce(rejection(422, 'wallet.insufficient_funds'))
      api.mockResolvedValueOnce(served())

      await bar.order('FRENCH_75')
      expect(bar.error).toBe('wallet.insufficient_funds')
      await bar.order('FRENCH_75')

      const [first, second] = api.mock.calls.map(([, options]) => options.headers['Idempotency-Key'])
      expect(second).not.toBe(first)
    })

    it('uses a new key after a success', async () => {
      api.mockResolvedValue(served())

      await bar.order('FRENCH_75')
      await bar.order('FRENCH_75')

      const [first, second] = api.mock.calls.map(([, options]) => options.headers['Idempotency-Key'])
      expect(second).not.toBe(first)
    })

    it('uses a new key for a different drink after a network failure', async () => {
      api.mockRejectedValueOnce(networkFailure())
      api.mockResolvedValueOnce(served({ drink: 'BATHTUB_GIN' }))

      await bar.order('FRENCH_75')
      await bar.order('BATHTUB_GIN')

      const [first, second] = api.mock.calls.map(([, options]) => options.headers['Idempotency-Key'])
      expect(second).not.toBe(first)
    })

    it('ignores a second order while one is in flight', async () => {
      const pending = deferred()
      api.mockReturnValueOnce(pending.promise)

      const first = bar.order('FRENCH_75')
      const second = await bar.order('BATHTUB_GIN')
      expect(bar.ordering).toBe(true)
      pending.resolve(served())
      await first

      expect(second).toBeNull()
      expect(api).toHaveBeenCalledTimes(1)
      expect(bar.ordering).toBe(false)
    })

    it('keeps the balance as it was when the order is rejected', async () => {
      wallet.balance = 3
      api.mockRejectedValueOnce(rejection(422, 'wallet.insufficient_funds'))

      const result = await bar.order('FRENCH_75')

      expect(result).toBeNull()
      expect(wallet.balance).toBe(3)
      expect(bar.ordering).toBe(false)
      expect(bar.conversation).toEqual([])
    })

    it('ignores an order that completes after the reset', async () => {
      const pending = deferred()
      api.mockReturnValueOnce(pending.promise)
      wallet.balance = 100

      const ordering = bar.order('FRENCH_75')
      bar.$reset()
      pending.resolve(served())
      await ordering

      expect(wallet.balance).toBe(100)
      expect(bar.conversation).toEqual([])
      expect(bar.lastOrder).toBeNull()
    })
  })

  describe('askCredit', () => {
    const credit = { amount: 50, balance: 50, rank: 'HABITUAL', line: 'barman.house_credit' }

    it('posts to house-credit and updates balance, rank and the line', async () => {
      bar.creditAvailable = true
      api.mockResolvedValueOnce(credit)

      const result = await bar.askCredit()

      expect(api).toHaveBeenCalledWith('/bar/house-credit', { method: 'POST' })
      expect(result).toEqual(credit)
      expect(wallet.balance).toBe(50)
      expect(auth.user.rank).toBe('HABITUAL')
      expect(bar.creditAvailable).toBe(false)
      expect(lines(bar)).toEqual([{ from: 'barman', key: 'barman.house_credit' }])
    })

    it('keeps the error code when the house says no', async () => {
      api.mockRejectedValueOnce(rejection(409, 'bar.credit_used_today'))

      const result = await bar.askCredit()

      expect(result).toBeNull()
      expect(bar.error).toBe('bar.credit_used_today')
      expect(bar.creditAvailable).toBe(false)
    })

    it('does not run while an order is in flight', async () => {
      const pending = deferred()
      api.mockReturnValueOnce(pending.promise)

      const ordering = bar.order('FRENCH_75')
      const result = await bar.askCredit()
      pending.resolve(served())
      await ordering

      expect(result).toBeNull()
      expect(api).toHaveBeenCalledTimes(1)
    })

    it('clears a previous error when it succeeds', async () => {
      bar.error = 'wallet.insufficient_funds'
      api.mockResolvedValueOnce(credit)

      await bar.askCredit()

      expect(bar.error).toBeNull()
    })
  })

  describe('say', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-10-08T21:00:00Z'))
    })

    it('posts the text with the locale and adds both sides of the chat', async () => {
      api.mockResolvedValueOnce({ source: 'LLM', text: 'Un Gin Rickey, fresco y ligero.', line: null })

      await bar.say('  ¿Qué me pongo?  ', 'es')

      const [path, options] = api.mock.calls[0]
      expect(path).toBe('/bar/talk')
      expect(options.method).toBe('POST')
      expect(options.body).toEqual({ text: '¿Qué me pongo?', locale: 'es' })
      expect(options.signal).toBeInstanceOf(AbortSignal)
      expect(lines(bar)).toEqual([
        { from: 'member', text: '¿Qué me pongo?' },
        { from: 'barman', text: 'Un Gin Rickey, fresco y ligero.' },
      ])
      expect(bar.talking).toBe(false)
    })

    it('keeps LLM text as plain text without turning it into a key', async () => {
      api.mockResolvedValueOnce({ source: 'LLM', text: '<b>{hola}</b> @:currency.name | x', line: null })

      await bar.say('hola', 'es')

      const reply = bar.conversation.at(-1)
      expect(reply.text).toBe('<b>{hola}</b> @:currency.name | x')
      expect(reply.key).toBeUndefined()
    })

    it('omits the locale when none is given', async () => {
      api.mockResolvedValueOnce({ source: 'LLM', text: 'Buenas.', line: null })

      await bar.say('hola')

      expect('locale' in api.mock.calls[0][1].body).toBe(false)
    })

    it('ignores empty or blank text without calling the server', async () => {
      await bar.say('', 'es')
      await bar.say('   \n ', 'es')

      expect(api).not.toHaveBeenCalled()
      expect(bar.conversation).toEqual([])
    })

    it('allows one request in flight at a time', async () => {
      const pending = deferred()
      api.mockReturnValueOnce(pending.promise)

      const first = bar.say('uno', 'es')
      expect(bar.talking).toBe(true)
      await bar.say('dos', 'es')
      pending.resolve({ source: 'LLM', text: 'Hola.', line: null })
      await first

      expect(api).toHaveBeenCalledTimes(1)
      expect(lines(bar)).toEqual([
        { from: 'member', text: 'uno' },
        { from: 'barman', text: 'Hola.' },
      ])
    })

    it('shows the busy line and locks the text input for 2 minutes after a FALLBACK reply', async () => {
      api.mockResolvedValueOnce({ source: 'FALLBACK', text: null, line: 'barman.busy' })

      await bar.say('hola', 'es')

      expect(bar.conversation.at(-1)).toMatchObject({ from: 'barman', key: 'barman.busy' })
      expect(bar.talkLockedUntil).toBe(Date.now() + FALLBACK_LOCK_MS)
      expect(bar.isTalkLocked()).toBe(true)
    })

    it('refuses to talk while locked and talks again when the lock ends', async () => {
      api.mockResolvedValueOnce({ source: 'FALLBACK', text: null, line: 'barman.busy' })
      await bar.say('hola', 'es')
      api.mockResolvedValueOnce({ source: 'LLM', text: 'Ya estoy.', line: null })

      await bar.say('sigues ahí?', 'es')
      expect(api).toHaveBeenCalledTimes(1)

      vi.advanceTimersByTime(FALLBACK_LOCK_MS)
      expect(bar.isTalkLocked()).toBe(false)
      await bar.say('sigues ahí?', 'es')

      expect(api).toHaveBeenCalledTimes(2)
      expect(bar.conversation.at(-1).text).toBe('Ya estoy.')
    })

    it('keeps the chips and the menu usable while the text input is locked', async () => {
      api.mockResolvedValueOnce({ source: 'FALLBACK', text: null, line: 'barman.busy' })
      await bar.say('hola', 'es')
      api.mockResolvedValueOnce(served())

      bar.ask('recommend')
      await bar.order('FRENCH_75')

      expect(bar.isTalkLocked()).toBe(true)
      expect(bar.conversation.some((entry) => entry.key === 'barman.ask.recommend')).toBe(true)
      expect(bar.conversation.some((entry) => entry.key === 'barman.promotion.habitual')).toBe(true)
    })

    it('falls back to the busy line for a FALLBACK reply with an unknown line', async () => {
      api.mockResolvedValueOnce({ source: 'FALLBACK', text: null, line: 'whatever {x}' })

      await bar.say('hola', 'es')

      expect(bar.conversation.at(-1).key).toBe('barman.busy')
    })

    it('treats an LLM reply with no text as a fallback', async () => {
      api.mockResolvedValueOnce({ source: 'LLM', text: '   ', line: null })

      await bar.say('hola', 'es')

      expect(bar.conversation.at(-1).key).toBe('barman.busy')
      expect(bar.isTalkLocked()).toBe(true)
    })

    it('shows the busy line and locks for 2 minutes on a network failure', async () => {
      api.mockRejectedValueOnce(networkFailure())

      await bar.say('hola', 'es')

      expect(bar.conversation.at(-1).key).toBe('barman.busy')
      expect(bar.talkLockedUntil).toBe(Date.now() + FALLBACK_LOCK_MS)
    })

    it('shows the busy line and locks for 2 minutes on a 5xx', async () => {
      api.mockRejectedValueOnce(rejection(503, 'request.rejected'))

      await bar.say('hola', 'es')

      expect(bar.conversation.at(-1).key).toBe('barman.busy')
      expect(bar.talkLockedUntil).toBe(Date.now() + FALLBACK_LOCK_MS)
    })

    it('shows the busy line and locks for only 1 minute on a 429', async () => {
      api.mockRejectedValueOnce(rejection(429, 'bar.too_many_requests'))

      await bar.say('hola', 'es')

      expect(bar.conversation.at(-1).key).toBe('barman.busy')
      expect(bar.talkLockedUntil).toBe(Date.now() + RATE_LIMIT_LOCK_MS)
    })

    it('keeps the error code for other client errors without locking', async () => {
      api.mockRejectedValueOnce(rejection(400, 'validation.failed'))

      await bar.say('hola', 'es')

      expect(bar.error).toBe('validation.failed')
      expect(bar.isTalkLocked()).toBe(false)
    })

    it('aborts after 12 seconds and answers with the busy line', async () => {
      api.mockImplementationOnce(
        (path, { signal }) =>
          new Promise((resolve, reject) => {
            signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
          }),
      )

      const talking = bar.say('hola', 'es')
      vi.advanceTimersByTime(TALK_TIMEOUT_MS - 1)
      expect(bar.talking).toBe(true)
      vi.advanceTimersByTime(1)
      await talking

      expect(api.mock.calls[0][1].signal.aborted).toBe(true)
      expect(bar.conversation.at(-1).key).toBe('barman.busy')
      expect(bar.talkLockedUntil).toBe(Date.now() + FALLBACK_LOCK_MS)
      expect(bar.talking).toBe(false)
    })

    it('does not leave the timeout timer running after an answer', async () => {
      api.mockResolvedValueOnce({ source: 'LLM', text: 'Hola.', line: null })

      await bar.say('hola', 'es')

      expect(vi.getTimerCount()).toBe(0)
    })

    it('discards an answer that arrives after the reset', async () => {
      const pending = deferred()
      api.mockReturnValueOnce(pending.promise)

      const talking = bar.say('hola', 'es')
      bar.$reset()
      pending.resolve({ source: 'LLM', text: 'Tarde.', line: null })
      await talking

      expect(bar.conversation).toEqual([])
      expect(bar.talking).toBe(false)
    })

    it('discards a failure that arrives after the reset without locking the next session', async () => {
      const pending = deferred()
      api.mockReturnValueOnce(pending.promise)

      const talking = bar.say('hola', 'es')
      bar.$reset()
      pending.reject(networkFailure())
      await talking

      expect(bar.conversation).toEqual([])
      expect(bar.talkLockedUntil).toBe(0)
    })

    it('aborts the request in flight on reset', async () => {
      api.mockReturnValueOnce(new Promise(() => {}))

      bar.say('hola', 'es')
      const { signal } = api.mock.calls[0][1]
      bar.$reset()

      expect(signal.aborted).toBe(true)
      expect(vi.getTimerCount()).toBe(0)
    })

    it('keeps at most 20 lines, dropping the oldest', async () => {
      api.mockResolvedValue({ source: 'LLM', text: 'ok', line: null })

      for (let n = 0; n < 12; n += 1) await bar.say(`mensaje ${n}`, 'es')

      expect(bar.conversation).toHaveLength(20)
      expect(bar.conversation[0].text).toBe('mensaje 2')
      expect(bar.conversation.at(-2).text).toBe('mensaje 11')
    })
  })

  describe('ask', () => {
    it('answers the recommendation chip locally with the member line first', () => {
      bar.ask('recommend')

      expect(api).not.toHaveBeenCalled()
      expect(lines(bar)).toEqual([
        { from: 'member', key: 'bar.talk.chips.recommend' },
        { from: 'barman', key: 'barman.ask.recommend' },
      ])
    })

    it('answers the rank chip with the current rank code as a parameter', () => {
      auth.user = { username: 'cursaito', rank: 'CONFIANZA' }

      bar.ask('rank')

      expect(bar.conversation.at(-1)).toMatchObject({
        from: 'barman',
        key: 'barman.ask.rank',
        params: { rank: 'confianza' },
      })
    })

    it('falls back to the lowest rank when the profile has none', () => {
      auth.user = null

      bar.ask('rank')

      expect(bar.conversation.at(-1).params).toEqual({ rank: 'nadie' })
    })

    it('ignores an option it does not know', () => {
      bar.ask('anything')

      expect(bar.conversation).toEqual([])
    })
  })

  describe('$reset', () => {
    it('forgets everything', async () => {
      api.mockResolvedValueOnce(MENU)
      await bar.load()
      api.mockRejectedValueOnce(rejection(422, 'wallet.insufficient_funds'))
      await bar.order('FRENCH_75')
      bar.talkLockedUntil = 123

      bar.$reset()

      expect(bar.drinks).toEqual([])
      expect(bar.conversation).toEqual([])
      expect(bar.error).toBeNull()
      expect(bar.creditAvailable).toBe(false)
      expect(bar.ordering).toBe(false)
      expect(bar.talking).toBe(false)
      expect(bar.talkLockedUntil).toBe(0)
      expect(bar.lastOrder).toBeNull()
    })

    it('forgets the pending idempotency key', async () => {
      api.mockRejectedValueOnce(networkFailure())
      api.mockResolvedValueOnce(served())
      await bar.order('FRENCH_75')

      bar.$reset()
      await bar.order('FRENCH_75')

      const [first, second] = api.mock.calls.map(([, options]) => options.headers['Idempotency-Key'])
      expect(second).not.toBe(first)
    })
  })
})
