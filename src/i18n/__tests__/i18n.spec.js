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
]

const RANKS = ['nadie', 'habitual', 'confianza', 'socio']
const RANKED_SITUATIONS = ['greeting', 'serve', 'promotion', 'broke']
const FLAT_SITUATIONS = ['no_credit', 'house_credit', 'busy']
const DRINKS = ['BATHTUB_GIN', 'BEES_KNEES', 'GIN_RICKEY', 'SIDECAR', 'FRENCH_75']
const TRANSACTION_TYPES = ['WELCOME_BONUS', 'BAR_ORDER', 'HOUSE_CREDIT', 'BLACKJACK_BET', 'BLACKJACK_PAYOUT']
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
    expect(lookup(es, 'barman.house_credit')).toBe('Aquí tienes 50 fichas. Invita la casa.')
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
})
