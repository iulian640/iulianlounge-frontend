import { beforeEach, describe, expect, it } from 'vitest'

import en from '../en.json'
import es from '../es.json'
import i18n from '@/i18n'

const BACKEND_CODES = [
  'auth.required',
  'auth.invalid_credentials',
  'auth.invalid_token',
  'auth.too_many_requests',
  'user.username_taken',
  'user.email_taken',
  'user.already_exists',
  'data.conflict',
  'validation.failed',
  'validation.invalid',
  'validation.not_blank',
  'validation.size',
  'validation.pattern',
  'validation.email',
  'validation.max_utf8_bytes',
  'request.rejected',
  'internal.error',
  'wallet.not_found',
  'wallet.insufficient_funds',
  'wallet.conflict',
  'wallet.idempotency_mismatch',
  'bar.credit_not_needed',
  'bar.credit_used_today',
  'bar.too_many_requests',
  'blackjack.hand_in_progress',
  'blackjack.hand_not_found',
  'blackjack.hand_finished',
  'blackjack.too_many_requests',
]

const RANKS = ['nadie', 'habitual', 'confianza', 'socio']
const RANKED_SITUATIONS = ['greeting', 'serve', 'promotion', 'broke']
const FLAT_SITUATIONS = ['no_credit', 'house_credit', 'busy']
const DRINKS = ['BATHTUB_GIN', 'BEES_KNEES', 'GIN_RICKEY', 'SIDECAR', 'FRENCH_75']
const TRANSACTION_TYPES = ['WELCOME_BONUS', 'BAR_ORDER', 'HOUSE_CREDIT', 'BLACKJACK_BET', 'BLACKJACK_PAYOUT']
const FACES = ['ACE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN', 'JACK', 'QUEEN', 'KING']
const SUITS = ['CLUBS', 'DIAMONDS', 'HEARTS', 'SPADES']
const OUTCOMES = ['BLACKJACK', 'WIN', 'PUSH', 'LOSE']
const BLACKJACK_TEXTS = [
  'title',
  'dealer',
  'you',
  'bet',
  'chooseBet',
  'deal',
  'dealing',
  'hit',
  'stand',
  'again',
  'bust',
  'hiddenTotal',
  'payout',
  'prompt.key',
  'prompt.action',
  'standUpHint',
  'corner.label',
  'corner.title',
  'cards.hidden',
  'cards.name',
]
const VOSEO = /\b(vos|tenés|querés|podés|sos|mirá|pedí|decime|dame bola|che)\b/i

function keys(tree, prefix = '') {
  return Object.entries(tree).flatMap(([key, value]) =>
    typeof value === 'object' ? keys(value, `${prefix}${key}.`) : [`${prefix}${key}`],
  )
}

function lookup(tree, dotted) {
  return dotted.split('.').reduce((node, key) => node?.[key], tree)
}

describe('diccionarios', () => {
  it('ES y EN tienen exactamente las mismas claves', () => {
    expect(keys(en).sort()).toEqual(keys(es).sort())
  })

  it.each(BACKEND_CODES)('el código %s tiene traducción en los dos idiomas', (code) => {
    expect(typeof lookup(es, `errors.${code}`)).toBe('string')
    expect(typeof lookup(en, `errors.${code}`)).toBe('string')
  })
})

describe('bar dictionaries', () => {
  beforeEach(() => {
    i18n.global.locale.value = 'es'
  })

  it.each(RANKS)('rank %s has a display name in both languages', (rank) => {
    expect(typeof lookup(es, `rank.${rank}`)).toBe('string')
    expect(typeof lookup(en, `rank.${rank}`)).toBe('string')
  })

  it('uses the decided display names for the ranks', () => {
    expect(RANKS.map((rank) => lookup(es, `rank.${rank}`))).toEqual(['Recién llegado', 'Cliente', 'Habitual', 'Socio'])
    expect(RANKS.map((rank) => lookup(en, `rank.${rank}`))).toEqual(['Newcomer', 'Customer', 'Regular', 'Member'])
  })

  it.each(RANKED_SITUATIONS.flatMap((situation) => RANKS.map((rank) => `barman.${situation}.${rank}`)))(
    'the barman line %s exists in both languages',
    (key) => {
      expect(lookup(es, key)).toEqual(expect.any(String))
      expect(lookup(en, key)).toEqual(expect.any(String))
    },
  )

  it.each(FLAT_SITUATIONS.map((situation) => `barman.${situation}`))(
    'the barman line %s exists in both languages',
    (key) => {
      expect(lookup(es, key)).toEqual(expect.any(String))
      expect(lookup(en, key)).toEqual(expect.any(String))
    },
  )

  it('every serve line differs from the greeting of the same rank', () => {
    for (const rank of RANKS) {
      expect(lookup(es, `barman.serve.${rank}`)).not.toBe(lookup(es, `barman.greeting.${rank}`))
      expect(lookup(en, `barman.serve.${rank}`)).not.toBe(lookup(en, `barman.greeting.${rank}`))
    }
  })

  it('keeps the catalogue wording decided in ADR-10', () => {
    expect(lookup(es, 'barman.greeting.nadie')).toBe('Buenas. ¿Qué te pongo?')
    expect(lookup(en, 'barman.greeting.nadie')).toBe('Evening. What can I get you?')
    expect(lookup(es, 'barman.promotion.habitual')).toBe('Aquí tienes. Ya eres cliente de la casa.')
    expect(lookup(es, 'barman.house_credit')).toBe('Aquí tienes 50 monedas. Invita la casa.')
    expect(lookup(en, 'barman.no_credit')).toBe('I already treated you today. More tomorrow.')
  })

  it('interpolates the rank in the barman answer about ranks, in both languages', () => {
    i18n.global.locale.value = 'es'
    expect(i18n.global.t('barman.ask.rank', { rank: 'Habitual' })).toBe(
      'Cuanto más pidas, más te conozco. Ahora eres Habitual.',
    )
    i18n.global.locale.value = 'en'
    expect(i18n.global.t('barman.ask.rank', { rank: 'Regular' })).toBe(
      'The more you order, the better I know you. Right now you\'re a Regular.',
    )
  })

  it('answers the recommendation question with the fixed line', () => {
    expect(lookup(es, 'barman.ask.recommend')).toBe('Si es tu primera vez, un Bee\'s Knees. Suave, con miel.')
    expect(lookup(en, 'barman.ask.recommend')).toBe('First time? Try a Bee\'s Knees. Smooth, with honey.')
  })

  it.each(DRINKS)('drink %s has a name in both languages', (drink) => {
    expect(typeof lookup(es, `bar.drinks.${drink}`)).toBe('string')
    expect(typeof lookup(en, `bar.drinks.${drink}`)).toBe('string')
  })

  it.each(TRANSACTION_TYPES)('ledger type %s has a label in both languages', (type) => {
    expect(typeof lookup(es, `wallet.types.${type}`)).toBe('string')
    expect(typeof lookup(en, `wallet.types.${type}`)).toBe('string')
  })

  it.each(['placeholder', 'send', 'thinking', 'resting', 'privacy', 'privacyLink'])(
    'the talk text %s exists in both languages',
    (key) => {
      expect(typeof lookup(es, `bar.talk.${key}`)).toBe('string')
      expect(typeof lookup(en, `bar.talk.${key}`)).toBe('string')
    },
  )

  it('keeps the privacy notice ready for a link and mentions Anthropic and the USA', () => {
    expect(lookup(es, 'bar.talk.privacy')).toContain('{link}')
    expect(lookup(en, 'bar.talk.privacy')).toContain('{link}')
    expect(lookup(es, 'bar.talk.privacy')).toContain('Anthropic')
    expect(lookup(en, 'bar.talk.privacy')).toContain('Anthropic')
  })

  it('words what the member said when ordering a drink', () => {
    i18n.global.locale.value = 'es'
    expect(i18n.global.t('bar.menu.said', { drink: 'French 75' })).toBe('Un French 75.')
    i18n.global.locale.value = 'en'
    expect(i18n.global.t('bar.menu.said', { drink: 'French 75' })).toBe('A French 75.')
  })

  it.each(['recommend', 'rank'])('the chip %s has a label in both languages', (chip) => {
    expect(typeof lookup(es, `bar.talk.chips.${chip}`)).toBe('string')
    expect(typeof lookup(en, `bar.talk.chips.${chip}`)).toBe('string')
  })

  it('never uses voseo in the Spanish texts', () => {
    const texts = keys(es).map((key) => lookup(es, key))
    expect(texts.filter((text) => VOSEO.test(text))).toEqual([])
  })

  it('renders every barman line without a missing-key fallback', () => {
    for (const locale of ['es', 'en']) {
      i18n.global.locale.value = locale
      const lines = keys(locale === 'es' ? es : en).filter((key) => key.startsWith('barman.'))
      for (const key of lines) {
        expect(i18n.global.t(key, { rank: 'x' })).not.toBe(key)
      }
    }
  })

  it.each(['controller', 'contact', 'data', 'purpose', 'processor', 'storage', 'rights'])(
    'the privacy section %s has a title in both languages',
    (section) => {
      expect(typeof lookup(es, `privacy.sections.${section}.title`)).toBe('string')
      expect(typeof lookup(en, `privacy.sections.${section}.title`)).toBe('string')
    },
  )

  it('names the controller, Anthropic and the issue contact in the privacy text', () => {
    for (const tree of [es, en]) {
      expect(lookup(tree, 'privacy.sections.controller.body')).toContain('Iulian Timofei')
      expect(lookup(tree, 'privacy.sections.processor.body')).toContain('Anthropic')
      expect(lookup(tree, 'privacy.sections.contact.body')).toContain('GitHub')
    }
  })

  it('does not promise anything soon on the mobile corners', () => {
    expect(lookup(es, 'salon.soon')).toBeUndefined()
    expect(lookup(en, 'salon.soon')).toBeUndefined()
  })
})

describe('blackjack dictionaries', () => {
  beforeEach(() => {
    i18n.global.locale.value = 'es'
  })

  it.each(BLACKJACK_TEXTS)('the text blackjack.%s exists in both languages', (key) => {
    expect(typeof lookup(es, `blackjack.${key}`)).toBe('string')
    expect(typeof lookup(en, `blackjack.${key}`)).toBe('string')
  })

  it.each(OUTCOMES)('the outcome %s has a label in both languages', (outcome) => {
    expect(typeof lookup(es, `blackjack.outcome.${outcome}`)).toBe('string')
    expect(typeof lookup(en, `blackjack.outcome.${outcome}`)).toBe('string')
  })

  it('keeps the outcome wording decided in the mockups', () => {
    expect(OUTCOMES.map((outcome) => lookup(es, `blackjack.outcome.${outcome}`))).toEqual([
      '¡Blackjack!',
      'Ganas',
      'Empate',
      'Pierdes',
    ])
  })

  it('keeps the table wording decided in the mockups', () => {
    expect(lookup(es, 'blackjack.dealer')).toBe('La banca')
    expect(lookup(es, 'blackjack.you')).toBe('Tú')
    expect(lookup(es, 'blackjack.hit')).toBe('Pedir carta')
    expect(lookup(es, 'blackjack.stand')).toBe('Plantarse')
    expect(lookup(es, 'blackjack.again')).toBe('Otra mano')
    expect(lookup(es, 'blackjack.bust')).toBe('se pasa')
    expect(lookup(es, 'blackjack.prompt.action')).toBe('Sentarse a la mesa')
    expect(lookup(es, 'blackjack.standUpHint')).toBe('Esc para levantarte')
    expect(lookup(es, 'blackjack.corner.label')).toBe('Cartas')
    expect(lookup(es, 'blackjack.corner.title')).toBe('Blackjack')
  })

  it('interpolates the chips in the deal button and the payout, in both languages', () => {
    expect(i18n.global.t('blackjack.deal', { chips: 20 })).toBe('Repartir · 20 ¢')
    expect(i18n.global.t('blackjack.payout', { amount: 40 })).toBe('+40 ¢')
    i18n.global.locale.value = 'en'
    expect(i18n.global.t('blackjack.deal', { chips: 20 })).toContain('20')
    expect(i18n.global.t('blackjack.payout', { amount: 40 })).toContain('40')
  })

  it.each(FACES)('the face %s has a name in both languages', (face) => {
    expect(typeof lookup(es, `blackjack.cards.face.${face}`)).toBe('string')
    expect(typeof lookup(en, `blackjack.cards.face.${face}`)).toBe('string')
  })

  it.each(SUITS)('the suit %s has a name in both languages', (suit) => {
    expect(typeof lookup(es, `blackjack.cards.suit.${suit}`)).toBe('string')
    expect(typeof lookup(en, `blackjack.cards.suit.${suit}`)).toBe('string')
  })

  it('builds an accessible card name in both languages', () => {
    const face = i18n.global.t('blackjack.cards.face.QUEEN')
    const suit = i18n.global.t('blackjack.cards.suit.HEARTS')
    expect(i18n.global.t('blackjack.cards.name', { face, suit })).toBe('reina de corazones')
    i18n.global.locale.value = 'en'
    const faceEn = i18n.global.t('blackjack.cards.face.QUEEN')
    const suitEn = i18n.global.t('blackjack.cards.suit.HEARTS')
    expect(i18n.global.t('blackjack.cards.name', { face: faceEn, suit: suitEn })).toBe('queen of hearts')
  })

  it('names every card of the deck with a distinct text', () => {
    const names = FACES.flatMap((face) =>
      SUITS.map((suit) =>
        i18n.global.t('blackjack.cards.name', {
          face: i18n.global.t(`blackjack.cards.face.${face}`),
          suit: i18n.global.t(`blackjack.cards.suit.${suit}`),
        }),
      ),
    )
    expect(new Set(names).size).toBe(FACES.length * SUITS.length)
  })
})
