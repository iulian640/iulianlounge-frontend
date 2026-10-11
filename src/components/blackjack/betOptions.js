export const DEFAULT_BETS = [
  { code: 'TEN', chips: 10 },
  { code: 'TWENTY', chips: 20 },
  { code: 'FIFTY', chips: 50 },
]
export const DEFAULT_BET_CODE = 'TWENTY'
export const BUST_LIMIT = 21

const WINNING_OUTCOMES = new Set(['BLACKJACK', 'WIN'])

export function outcomeTone(outcome) {
  if (WINNING_OUTCOMES.has(outcome)) return 'won'
  return outcome === 'LOSE' ? 'lost' : 'tied'
}

export function totalLabel(t, total, hidden) {
  if (hidden) return t('blackjack.hiddenTotal', { total })
  if (total > BUST_LIMIT) return `${total} · ${t('blackjack.bust')}`
  return String(total)
}
