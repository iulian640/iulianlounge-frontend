const RANKS = {
  ACE: 'A',
  TWO: '2',
  THREE: '3',
  FOUR: '4',
  FIVE: '5',
  SIX: '6',
  SEVEN: '7',
  EIGHT: '8',
  NINE: '9',
  TEN: '10',
  JACK: 'J',
  QUEEN: 'Q',
  KING: 'K',
}

const SUIT_SYMBOLS = {
  CLUBS: '♣',
  DIAMONDS: '♦',
  HEARTS: '♥',
  SPADES: '♠',
}

const RED_SUITS = new Set(['DIAMONDS', 'HEARTS'])

export function rankOf(face) {
  return RANKS[face] ?? ''
}

export function symbolOf(suit) {
  return SUIT_SYMBOLS[suit] ?? ''
}

export function isRedSuit(suit) {
  return RED_SUITS.has(suit)
}
