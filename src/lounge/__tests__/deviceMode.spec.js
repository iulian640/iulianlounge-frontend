import { describe, expect, it } from 'vitest'

import { prefersFlatLounge } from '../deviceMode'

// Una ventana falsa que responde a las media queries que le digamos
function ventana(queriesQueCumple) {
  return { matchMedia: (query) => ({ matches: queriesQueCumple.includes(query) }) }
}

describe('prefersFlatLounge', () => {
  it('un ordenador con ratón y pantalla ancha va al lounge 3D', () => {
    expect(prefersFlatLounge(ventana([]))).toBe(false)
  })

  it('una pantalla táctil va al salón 2D aunque sea ancha (tablet)', () => {
    expect(prefersFlatLounge(ventana(['(pointer: coarse)']))).toBe(true)
  })

  it('una ventana estrecha va al salón 2D aunque tenga ratón', () => {
    expect(prefersFlatLounge(ventana(['(max-width: 767px)']))).toBe(true)
  })

  it('sin matchMedia (entorno raro) se queda con el 3D', () => {
    expect(prefersFlatLounge({})).toBe(false)
  })
})
