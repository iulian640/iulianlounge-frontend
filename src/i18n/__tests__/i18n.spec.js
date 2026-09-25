import { describe, expect, it } from 'vitest'

import en from '../en.json'
import es from '../es.json'

// Copia congelada de los códigos que devuelve el backend (enum ErrorCode + claves de validación del
// GlobalExceptionHandler). Si el backend añade uno, este test recuerda traducirlo (ADR-06)
const BACKEND_CODES = [
  'auth.required',
  'auth.invalid_credentials',
  'auth.invalid_token',
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
]

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
