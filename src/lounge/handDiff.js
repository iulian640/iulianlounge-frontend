import { TIMING } from './cardTween'

export const HOLE_INDEX = 1

export const EMPTY_HAND_STATE = Object.freeze({
  handId: null,
  playerCount: 0,
  dealerCount: 0,
  holeRevealed: false,
})

function dealerSlotsWanted(dealerCards) {
  return dealerCards.length === 0 ? 0 : Math.max(dealerCards.length, HOLE_INDEX + 1)
}

function openingDeals(playerCards, dealerCards, start) {
  const sequence = []
  if (playerCards.length > 0) sequence.push(['player', 0, playerCards[0]])
  if (dealerCards.length > 0) sequence.push(['dealer', 0, dealerCards[0]])
  if (playerCards.length > 1) sequence.push(['player', 1, playerCards[1]])
  if (dealerCards.length > 0) sequence.push(['dealer', HOLE_INDEX, null])

  const deals = sequence.map(([owner, index, card], position) => ({
    type: 'deal',
    owner,
    index,
    card,
    delay: start + position * TIMING.dealStep,
  }))
  return { deals, delay: start + deals.length * TIMING.dealStep }
}

export function diffHand(state, hand) {
  if (!hand) {
    const actions = state.handId === null ? [] : [{ type: 'clear' }]
    return { state: EMPTY_HAND_STATE, actions }
  }

  const playerCards = hand.playerCards ?? []
  const dealerCards = hand.dealerCards ?? []
  const isNew = hand.id !== state.handId
  const hadPrevious = isNew && state.handId !== null
  const actions = hadPrevious ? [{ type: 'clear' }] : []
  const start = hadPrevious ? TIMING.clearDelay : 0

  let playerCount = isNew ? 0 : state.playerCount
  let dealerCount = isNew ? 0 : state.dealerCount
  let holeRevealed = isNew ? false : state.holeRevealed
  let delay = start
  let lastLanding = 0

  if (isNew) {
    const opening = openingDeals(playerCards, dealerCards, start)
    for (const deal of opening.deals) {
      actions.push(deal)
      lastLanding = deal.delay + TIMING.dealDuration
    }
    delay = opening.delay
    playerCount = Math.min(2, playerCards.length)
    dealerCount = dealerCards.length > 0 ? HOLE_INDEX + 1 : 0
  }

  for (let index = playerCount; index < playerCards.length; index++) {
    actions.push({ type: 'deal', owner: 'player', index, card: playerCards[index], delay })
    lastLanding = delay + TIMING.dealDuration
    delay += TIMING.dealStep
  }
  playerCount = Math.max(playerCount, playerCards.length)

  const canReveal = !holeRevealed && dealerCards.length > HOLE_INDEX && dealerCount > HOLE_INDEX
  if (canReveal) {
    const revealAt = lastLanding + TIMING.revealPause
    actions.push({
      type: 'reveal',
      index: HOLE_INDEX,
      card: dealerCards[HOLE_INDEX],
      delay: revealAt,
    })
    holeRevealed = true
    delay = revealAt + TIMING.flipDuration
  }

  const firstExtra = Math.max(dealerCount, HOLE_INDEX + 1)
  for (let index = firstExtra; index < dealerCards.length; index++) {
    actions.push({ type: 'deal', owner: 'dealer', index, card: dealerCards[index], delay })
    delay += TIMING.dealStep
  }
  dealerCount = Math.max(dealerCount, dealerSlotsWanted(dealerCards))

  return {
    state: { handId: hand.id, playerCount, dealerCount, holeRevealed },
    actions,
  }
}
