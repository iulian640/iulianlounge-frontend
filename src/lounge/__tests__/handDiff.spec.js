import { describe, expect, it } from 'vitest'

import { TIMING } from '../cardTween'
import { EMPTY_HAND_STATE, HOLE_INDEX, diffHand } from '../handDiff'

const ACE = { face: 'ACE', suit: 'SPADES' }
const KING = { face: 'KING', suit: 'HEARTS' }
const FIVE = { face: 'FIVE', suit: 'CLUBS' }
const NINE = { face: 'NINE', suit: 'DIAMONDS' }
const SEVEN = { face: 'SEVEN', suit: 'CLUBS' }

function hand(overrides = {}) {
  return {
    id: 'h1',
    status: 'PLAYER_TURN',
    playerCards: [FIVE, NINE],
    dealerCards: [KING],
    ...overrides,
  }
}

function summary(actions) {
  return actions.map((action) =>
    action.type === 'clear'
      ? 'clear'
      : `${action.type}:${action.owner ?? 'dealer'}:${action.index}`,
  )
}

describe('diffHand with no hand', () => {
  it('does nothing on an empty table', () => {
    const { state, actions } = diffHand(EMPTY_HAND_STATE, null)

    expect(actions).toEqual([])
    expect(state).toBe(EMPTY_HAND_STATE)
  })

  it('clears the table when a hand disappears', () => {
    const first = diffHand(EMPTY_HAND_STATE, hand())

    const { state, actions } = diffHand(first.state, null)

    expect(actions).toEqual([{ type: 'clear' }])
    expect(state).toBe(EMPTY_HAND_STATE)
  })
})

describe('diffHand with a new hand', () => {
  it('deals player, dealer, player and a face-down hole card, in that order', () => {
    const { actions } = diffHand(EMPTY_HAND_STATE, hand())

    expect(summary(actions)).toEqual([
      'deal:player:0',
      'deal:dealer:0',
      'deal:player:1',
      `deal:dealer:${HOLE_INDEX}`,
    ])
  })

  it('deals the up card face up and the hole card face down', () => {
    const { actions } = diffHand(EMPTY_HAND_STATE, hand())

    expect(actions[1].card).toEqual(KING)
    expect(actions[3].card).toBeNull()
  })

  it('spaces the opening deals by the deal step, starting now', () => {
    const { actions } = diffHand(EMPTY_HAND_STATE, hand())

    expect(actions.map((action) => action.delay)).toEqual([
      0,
      TIMING.dealStep,
      2 * TIMING.dealStep,
      3 * TIMING.dealStep,
    ])
  })

  it('records the counts, with the hole slot counted for the dealer', () => {
    const { state } = diffHand(EMPTY_HAND_STATE, hand())

    expect(state).toEqual({ handId: 'h1', playerCount: 2, dealerCount: 2, holeRevealed: false })
  })

  it('clears the old cards and waits before dealing when another hand was on the table', () => {
    const first = diffHand(EMPTY_HAND_STATE, hand())

    const { actions } = diffHand(first.state, hand({ id: 'h2' }))

    expect(actions[0]).toEqual({ type: 'clear' })
    expect(actions[1].delay).toBe(TIMING.clearDelay)
    expect(summary(actions).slice(1)).toHaveLength(4)
  })

  it('does not clear anything for the first hand of the session', () => {
    const { actions } = diffHand(EMPTY_HAND_STATE, hand())

    expect(actions.some((action) => action.type === 'clear')).toBe(false)
  })

  it('deals the extra player cards of a hand that is resumed mid-game after the opening', () => {
    const { actions, state } = diffHand(
      EMPTY_HAND_STATE,
      hand({ playerCards: [FIVE, NINE, SEVEN] }),
    )

    expect(summary(actions).at(-1)).toBe('deal:player:2')
    expect(actions.at(-1).delay).toBe(4 * TIMING.dealStep)
    expect(state.playerCount).toBe(3)
  })

  it('reveals the hole card after it lands when the hand arrives already finished', () => {
    const natural = hand({
      status: 'FINISHED',
      playerCards: [ACE, KING],
      dealerCards: [FIVE, NINE],
    })

    const { actions, state } = diffHand(EMPTY_HAND_STATE, natural)

    const reveal = actions.at(-1)
    const holeDeal = actions[3]
    expect(reveal).toMatchObject({ type: 'reveal', index: HOLE_INDEX, card: NINE })
    expect(reveal.delay).toBe(holeDeal.delay + TIMING.dealDuration + TIMING.revealPause)
    expect(state.holeRevealed).toBe(true)
  })

  it('deals nothing for a hand without cards', () => {
    const { actions, state } = diffHand(
      EMPTY_HAND_STATE,
      hand({ playerCards: [], dealerCards: [] }),
    )

    expect(actions).toEqual([])
    expect(state).toMatchObject({ playerCount: 0, dealerCount: 0 })
  })

  it('tolerates missing card lists', () => {
    const { actions } = diffHand(EMPTY_HAND_STATE, { id: 'h1', status: 'PLAYER_TURN' })

    expect(actions).toEqual([])
  })
})

describe('diffHand with the same hand', () => {
  function opened() {
    return diffHand(EMPTY_HAND_STATE, hand()).state
  }

  it('does nothing when nothing changed', () => {
    expect(diffHand(opened(), hand()).actions).toEqual([])
  })

  it('deals only the new player card, right away', () => {
    const { actions, state } = diffHand(opened(), hand({ playerCards: [FIVE, NINE, SEVEN] }))

    expect(actions).toEqual([{ type: 'deal', owner: 'player', index: 2, card: SEVEN, delay: 0 }])
    expect(state.playerCount).toBe(3)
  })

  it('deals several new cards one after another', () => {
    const { actions } = diffHand(opened(), hand({ playerCards: [FIVE, NINE, SEVEN, ACE] }))

    expect(actions.map((action) => action.delay)).toEqual([0, TIMING.dealStep])
  })

  it('reveals the hole card soon after a stand', () => {
    const { actions, state } = diffHand(
      opened(),
      hand({ status: 'FINISHED', dealerCards: [KING, SEVEN] }),
    )

    expect(actions).toEqual([
      { type: 'reveal', index: HOLE_INDEX, card: SEVEN, delay: TIMING.revealPause },
    ])
    expect(state.holeRevealed).toBe(true)
  })

  it('waits for a hit card to land before revealing when the player busts', () => {
    const { actions } = diffHand(
      opened(),
      hand({
        status: 'FINISHED',
        playerCards: [FIVE, NINE, KING],
        dealerCards: [KING, SEVEN],
      }),
    )

    expect(summary(actions)).toEqual(['deal:player:2', `reveal:dealer:${HOLE_INDEX}`])
    expect(actions[1].delay).toBe(TIMING.dealDuration + TIMING.revealPause)
  })

  it('deals the dealer draws after the flip, one step apart', () => {
    const { actions } = diffHand(
      opened(),
      hand({ status: 'FINISHED', dealerCards: [KING, FIVE, SEVEN, ACE] }),
    )

    const reveal = actions[0]
    expect(summary(actions)).toEqual([
      `reveal:dealer:${HOLE_INDEX}`,
      'deal:dealer:2',
      'deal:dealer:3',
    ])
    expect(actions[1].delay).toBe(reveal.delay + TIMING.flipDuration)
    expect(actions[2].delay).toBe(actions[1].delay + TIMING.dealStep)
  })

  it('reveals only once', () => {
    const finished = hand({ status: 'FINISHED', dealerCards: [KING, SEVEN] })
    const first = diffHand(opened(), finished)

    expect(diffHand(first.state, finished).actions).toEqual([])
  })

  it('keeps counting dealer slots after the draws', () => {
    const { state } = diffHand(
      opened(),
      hand({ status: 'FINISHED', dealerCards: [KING, FIVE, SEVEN] }),
    )

    expect(state.dealerCount).toBe(3)
  })
})
