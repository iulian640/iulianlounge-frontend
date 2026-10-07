import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { api } from '@/api/http'
import { newUuid } from '@/api/uuid'
import { useWalletStore } from '@/stores/wallet'

const SERVER_ERROR_STATUS = 500
const PLAYER_TURN = 'PLAYER_TURN'
const FINISHED = 'FINISHED'
const RESYNC_CODES = new Set([
  'blackjack.hand_in_progress',
  'blackjack.hand_finished',
  'blackjack.hand_not_found',
  'wallet.conflict',
])

function errorCode(failure) {
  return failure?.code ?? 'generic'
}

function isInconclusive(failure) {
  return failure?.status === undefined || failure.status >= SERVER_ERROR_STATUS
}

export const useBlackjackStore = defineStore('blackjack', () => {
  const hand = ref(null)
  const bets = ref([])
  const error = ref(null)
  const busy = ref(false)

  const playing = computed(() => hand.value?.status === PLAYER_TURN)
  const finished = computed(() => hand.value?.status === FINISHED)

  let epoch = 0
  const pendingKeys = new Map()

  function applyBalance(balance) {
    useWalletStore().balance = balance
  }

  function applyTable(table) {
    pendingKeys.clear()
    hand.value = table.hand
    bets.value = table.bets
    applyBalance(table.balance)
  }

  function applyHand(result) {
    pendingKeys.clear()
    hand.value = result.hand
    applyBalance(result.balance)
  }

  async function resync(startedAt) {
    try {
      const table = await api('/blackjack')
      if (epoch === startedAt) applyTable(table)
    } catch {
      return
    }
  }

  async function run(request, { apply, recover = true, onSuccess, onFailure }) {
    if (busy.value) return null
    const startedAt = epoch
    busy.value = true
    error.value = null
    try {
      const result = await request()
      if (epoch !== startedAt) return null
      onSuccess?.()
      apply(result)
      return result
    } catch (failure) {
      if (epoch !== startedAt) return null
      onFailure?.(failure)
      error.value = errorCode(failure)
      if (recover && RESYNC_CODES.has(error.value)) await resync(startedAt)
      return null
    } finally {
      if (epoch === startedAt) busy.value = false
    }
  }

  function keyFor(bet) {
    if (!pendingKeys.has(bet)) pendingKeys.set(bet, newUuid())
    return pendingKeys.get(bet)
  }

  async function load() {
    await run(() => api('/blackjack'), { apply: applyTable, recover: false })
  }

  function deal(bet) {
    if (playing.value) return Promise.resolve(null)
    return run(
      () =>
        api('/blackjack/hands', {
          method: 'POST',
          body: { bet },
          headers: { 'Idempotency-Key': keyFor(bet) },
        }),
      {
        apply: applyHand,
        onSuccess: () => pendingKeys.delete(bet),
        onFailure: (failure) => {
          if (!isInconclusive(failure)) pendingKeys.delete(bet)
        },
      },
    )
  }

  function act(action) {
    if (!playing.value) return Promise.resolve(null)
    return run(() => api(`/blackjack/hands/${hand.value.id}/${action}`, { method: 'POST' }), {
      apply: applyHand,
    })
  }

  function hit() {
    return act('hit')
  }

  function stand() {
    return act('stand')
  }

  function $reset() {
    epoch += 1
    pendingKeys.clear()
    hand.value = null
    bets.value = []
    error.value = null
    busy.value = false
  }

  return { hand, bets, error, busy, playing, finished, load, deal, hit, stand, $reset }
})
