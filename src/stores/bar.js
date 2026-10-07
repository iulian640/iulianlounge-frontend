import { ref } from 'vue'
import { defineStore } from 'pinia'

import { api } from '@/api/http'
import { newUuid } from '@/api/uuid'
import { useAuthStore } from '@/stores/auth'
import { useWalletStore } from '@/stores/wallet'

const TALK_TIMEOUT_MS = 12_000
const FALLBACK_LOCK_MS = 120_000
const RATE_LIMIT_LOCK_MS = 60_000
const MAX_CONVERSATION_LINES = 20
const SERVER_ERROR_STATUS = 500
const RATE_LIMIT_STATUS = 429
const BUSY_LINE = 'barman.busy'
const BARMAN_LINE_KEY = /^barman\.[a-z_]+(\.[a-z]+)?$/
const CHIP_OPTIONS = ['recommend', 'rank']
const RANK_CODES = ['nadie', 'habitual', 'confianza', 'socio']
const LOWEST_RANK_CODE = RANK_CODES[0]

function errorCode(failure) {
  return failure?.code ?? 'generic'
}

function isLine(line) {
  return typeof line === 'string' && BARMAN_LINE_KEY.test(line)
}

function rankCode(rank) {
  const code = String(rank ?? '').toLowerCase()
  return RANK_CODES.includes(code) ? code : LOWEST_RANK_CODE
}

function isInconclusive(failure) {
  return failure?.status === undefined || failure.status >= SERVER_ERROR_STATUS
}

export const useBarStore = defineStore('bar', () => {
  const drinks = ref([])
  const creditAvailable = ref(false)
  const conversation = ref([])
  const error = ref(null)
  const ordering = ref(false)
  const talking = ref(false)
  const talkLockedUntil = ref(0)
  const talkLocked = ref(false)
  const lastOrder = ref(null)

  let epoch = 0
  let lineId = 0
  let orderSerial = 0
  let pendingOrder = null
  let talkController = null
  let talkTimer = null
  let talkLockTimer = null

  function pushLine(line) {
    lineId += 1
    const next = [...conversation.value, { id: lineId, ...line }]
    conversation.value = next.slice(-MAX_CONVERSATION_LINES)
  }

  function pushBarmanKey(key, params) {
    if (!isLine(key)) return
    pushLine({ from: 'barman', key, ...(params ? { params } : {}) })
  }

  function syncAccount({ balance, rank }) {
    useWalletStore().balance = balance
    const auth = useAuthStore()
    if (auth.user) auth.user = { ...auth.user, rank }
  }

  async function load() {
    const startedAt = epoch
    try {
      const menu = await api('/bar')
      if (epoch !== startedAt) return
      drinks.value = menu.drinks
      creditAvailable.value = menu.creditAvailable
      syncAccount(menu)
      if (conversation.value.length === 0) pushBarmanKey(menu.line)
      error.value = null
    } catch (failure) {
      if (epoch !== startedAt) return
      error.value = errorCode(failure)
    }
  }

  function keyFor(drink) {
    if (pendingOrder?.drink !== drink) pendingOrder = { drink, key: newUuid() }
    return pendingOrder.key
  }

  async function order(drink) {
    if (ordering.value) return null
    const startedAt = epoch
    ordering.value = true
    error.value = null
    try {
      const served = await api('/bar/orders', {
        method: 'POST',
        body: { drink },
        headers: { 'Idempotency-Key': keyFor(drink) },
      })
      if (epoch !== startedAt) return null
      pendingOrder = null
      syncAccount(served)
      creditAvailable.value = served.creditAvailable
      orderSerial += 1
      lastOrder.value = { id: orderSerial, drink: served.drink, promoted: served.promoted }
      pushLine({ from: 'member', key: 'bar.menu.said', params: { drink: served.drink } })
      pushBarmanKey(served.line)
      return served
    } catch (failure) {
      if (epoch !== startedAt) return null
      if (!isInconclusive(failure)) pendingOrder = null
      error.value = errorCode(failure)
      return null
    } finally {
      if (epoch === startedAt) ordering.value = false
    }
  }

  async function askCredit() {
    if (ordering.value) return null
    const startedAt = epoch
    ordering.value = true
    error.value = null
    try {
      const credit = await api('/bar/house-credit', { method: 'POST' })
      if (epoch !== startedAt) return null
      syncAccount(credit)
      creditAvailable.value = false
      pushBarmanKey(credit.line)
      return credit
    } catch (failure) {
      if (epoch !== startedAt) return null
      error.value = errorCode(failure)
      return null
    } finally {
      if (epoch === startedAt) ordering.value = false
    }
  }

  function isTalkLocked(now = Date.now()) {
    return now < talkLockedUntil.value
  }

  function clearTalkLock() {
    clearTimeout(talkLockTimer)
    talkLockTimer = null
    talkLockedUntil.value = 0
    talkLocked.value = false
  }

  function lockTalk(milliseconds) {
    clearTimeout(talkLockTimer)
    talkLockedUntil.value = Date.now() + milliseconds
    talkLocked.value = true
    talkLockTimer = setTimeout(clearTalkLock, milliseconds)
  }

  function stopTalkTimer() {
    clearTimeout(talkTimer)
    talkTimer = null
  }

  function answerBusy(lockMilliseconds) {
    pushBarmanKey(BUSY_LINE)
    lockTalk(lockMilliseconds)
  }

  function handleReply(reply) {
    if (reply?.source === 'LLM' && typeof reply.text === 'string' && reply.text.trim() !== '') {
      pushLine({ from: 'barman', text: reply.text })
      return
    }
    pushBarmanKey(isLine(reply?.line) ? reply.line : BUSY_LINE)
    lockTalk(FALLBACK_LOCK_MS)
  }

  function handleTalkFailure(failure) {
    if (failure?.status === RATE_LIMIT_STATUS) return answerBusy(RATE_LIMIT_LOCK_MS)
    if (isInconclusive(failure)) return answerBusy(FALLBACK_LOCK_MS)
    error.value = errorCode(failure)
  }

  async function say(text, locale) {
    const message = typeof text === 'string' ? text.trim() : ''
    if (message === '' || talking.value || isTalkLocked()) return

    const startedAt = epoch
    const controller = new AbortController()
    talkController = controller
    talkTimer = setTimeout(() => controller.abort(), TALK_TIMEOUT_MS)
    talking.value = true
    error.value = null
    pushLine({ from: 'member', text: message })

    try {
      const reply = await api('/bar/talk', {
        method: 'POST',
        body: { text: message, ...(locale ? { locale } : {}) },
        signal: controller.signal,
      })
      if (epoch === startedAt) handleReply(reply)
    } catch (failure) {
      if (epoch === startedAt) handleTalkFailure(failure)
    } finally {
      if (epoch === startedAt) {
        stopTalkTimer()
        talkController = null
        talking.value = false
      }
    }
  }

  function ask(option) {
    if (!CHIP_OPTIONS.includes(option)) return
    pushLine({ from: 'member', key: `bar.talk.chips.${option}` })
    const params = option === 'rank' ? { rank: rankCode(useAuthStore().user?.rank) } : undefined
    pushBarmanKey(`barman.ask.${option}`, params)
  }

  function $reset() {
    epoch += 1
    talkController?.abort()
    talkController = null
    stopTalkTimer()
    pendingOrder = null
    drinks.value = []
    creditAvailable.value = false
    conversation.value = []
    error.value = null
    ordering.value = false
    talking.value = false
    clearTalkLock()
    lastOrder.value = null
  }

  return {
    drinks,
    creditAvailable,
    conversation,
    error,
    ordering,
    talking,
    talkLockedUntil,
    talkLocked,
    lastOrder,
    load,
    order,
    askCredit,
    say,
    ask,
    isTalkLocked,
    $reset,
  }
})
