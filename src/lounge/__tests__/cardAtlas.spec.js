import * as THREE from 'three'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { ATLAS_COLUMNS, ATLAS_ROWS, cardUvRect, cellOf, createCardAtlasTexture } from '../cardAtlas'
import {
  ATLAS_HEIGHT,
  ATLAS_WIDTH,
  CELL_HEIGHT,
  CELL_WIDTH,
  FACE_ORDER,
  SUIT_ORDER,
  UV_INSET_PX,
  allCells,
} from '../cardAtlasLayout'
import { drawBack, drawCardAtlas, drawFace, isRedSuit } from '../cardArt'
import { createRecordingContext, stubCanvasContext } from './canvasStub'

function allCards() {
  const cards = []
  for (const suit of SUIT_ORDER) {
    for (const face of FACE_ORDER) cards.push({ face, suit })
  }
  return cards
}

describe('card atlas layout', () => {
  it('has one cell for each of the 52 cards plus a row for the back', () => {
    expect(ATLAS_COLUMNS).toBe(13)
    expect(ATLAS_ROWS).toBe(5)
    expect(allCells()).toHaveLength(52)
    expect(ATLAS_WIDTH).toBe(ATLAS_COLUMNS * CELL_WIDTH)
    expect(ATLAS_HEIGHT).toBe(ATLAS_ROWS * CELL_HEIGHT)
  })

  it('puts the face in the column and the suit in the row', () => {
    expect(cellOf({ face: 'ACE', suit: 'CLUBS' })).toEqual({ column: 0, row: 0 })
    expect(cellOf({ face: 'KING', suit: 'SPADES' })).toEqual({ column: 12, row: 3 })
    expect(cellOf({ face: 'TEN', suit: 'HEARTS' })).toEqual({ column: 9, row: 2 })
  })

  it('puts the back in the extra row', () => {
    expect(cellOf('back')).toEqual({ column: 0, row: 4 })
  })

  it('returns no cell for an unknown card', () => {
    expect(cellOf({ face: 'JOKER', suit: 'HEARTS' })).toBeNull()
    expect(cellOf({ face: 'ACE', suit: 'STARS' })).toBeNull()
    expect(cellOf(undefined)).toBeNull()
  })
})

describe('cardUvRect', () => {
  it('keeps every rect inside the texture with u0 < u1 and v0 < v1', () => {
    for (const card of [...allCards(), 'back']) {
      const rect = cardUvRect(card)

      expect(rect.u0).toBeGreaterThanOrEqual(0)
      expect(rect.u1).toBeLessThanOrEqual(1)
      expect(rect.v0).toBeGreaterThanOrEqual(0)
      expect(rect.v1).toBeLessThanOrEqual(1)
      expect(rect.u0).toBeLessThan(rect.u1)
      expect(rect.v0).toBeLessThan(rect.v1)
    }
  })

  it('gives the 53 images 53 different rects', () => {
    const keys = new Set([...allCards(), 'back'].map((card) => JSON.stringify(cardUvRect(card))))

    expect(keys.size).toBe(53)
  })

  it('never overlaps two rects', () => {
    const rects = [...allCards(), 'back'].map(cardUvRect)

    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        const separated =
          rects[i].u1 <= rects[j].u0 ||
          rects[j].u1 <= rects[i].u0 ||
          rects[i].v1 <= rects[j].v0 ||
          rects[j].v1 <= rects[i].v0
        expect(separated).toBe(true)
      }
    }
  })

  it('maps the ace of clubs to the top-left corner, inset by the margin', () => {
    const rect = cardUvRect({ face: 'ACE', suit: 'CLUBS' })

    expect(rect.u0).toBeCloseTo(UV_INSET_PX / ATLAS_WIDTH, 10)
    expect(rect.v1).toBeCloseTo(1 - UV_INSET_PX / ATLAS_HEIGHT, 10)
  })

  it('maps the back to the bottom-left cell', () => {
    const rect = cardUvRect('back')

    expect(rect.u0).toBeCloseTo(UV_INSET_PX / ATLAS_WIDTH, 10)
    expect(rect.v0).toBeCloseTo(UV_INSET_PX / ATLAS_HEIGHT, 10)
    expect(rect.u1).toBeCloseTo((CELL_WIDTH - UV_INSET_PX) / ATLAS_WIDTH, 10)
    expect(rect.v1).toBeCloseTo((CELL_HEIGHT - UV_INSET_PX) / ATLAS_HEIGHT, 10)
  })

  it('moves one column to the right for the next face', () => {
    const ace = cardUvRect({ face: 'ACE', suit: 'HEARTS' })
    const two = cardUvRect({ face: 'TWO', suit: 'HEARTS' })

    expect(two.u0 - ace.u0).toBeCloseTo(CELL_WIDTH / ATLAS_WIDTH, 10)
    expect(two.v0).toBeCloseTo(ace.v0, 10)
  })

  it('moves one row down, so a lower v, for the next suit', () => {
    const clubs = cardUvRect({ face: 'FIVE', suit: 'CLUBS' })
    const diamonds = cardUvRect({ face: 'FIVE', suit: 'DIAMONDS' })

    expect(clubs.v0 - diamonds.v0).toBeCloseTo(CELL_HEIGHT / ATLAS_HEIGHT, 10)
  })

  it('falls back to the back for an unknown card', () => {
    expect(cardUvRect({ face: 'JOKER', suit: 'HEARTS' })).toEqual(cardUvRect('back'))
  })

  it('keeps the card aspect ratio of the cell', () => {
    const rect = cardUvRect({ face: 'QUEEN', suit: 'SPADES' })

    const width = (rect.u1 - rect.u0) * ATLAS_WIDTH
    const height = (rect.v1 - rect.v0) * ATLAS_HEIGHT
    expect(width).toBeCloseTo(CELL_WIDTH - 2 * UV_INSET_PX, 8)
    expect(height).toBeCloseTo(CELL_HEIGHT - 2 * UV_INSET_PX, 8)
  })
})

describe('card art', () => {
  it('knows which suits are red', () => {
    expect(isRedSuit('HEARTS')).toBe(true)
    expect(isRedSuit('DIAMONDS')).toBe(true)
    expect(isRedSuit('CLUBS')).toBe(false)
    expect(isRedSuit('SPADES')).toBe(false)
  })

  it('paints the whole atlas: one background plus 52 faces and the back', () => {
    const ctx = createRecordingContext()

    drawCardAtlas(ctx)

    const fills = ctx.calls.filter(([name]) => name === 'fillRect')
    expect(fills).toHaveLength(1 + 52 + 1)
    expect(fills[0].slice(1)).toEqual([0, 0, ATLAS_WIDTH, ATLAS_HEIGHT])
  })

  it('writes the rank of every face twice, in two opposite corners', () => {
    const ctx = createRecordingContext()

    drawCardAtlas(ctx)

    const texts = ctx.calls.filter(([name]) => name === 'fillText').map(([, text]) => text)
    expect(texts.filter((text) => text === 'K')).toHaveLength(4 * 3)
    expect(texts.filter((text) => text === '10')).toHaveLength(4 * 2)
    expect(texts.filter((text) => text === 'A')).toHaveLength(4 * 2)
  })

  it('paints hearts and diamonds in red and clubs and spades in dark ink', () => {
    const fillColors = (suit) => {
      const colors = new Set()
      const ctx = new Proxy(createRecordingContext(), {
        set(target, property, value) {
          if (property === 'fillStyle') colors.add(value)
          target[property] = value
          return true
        },
      })
      drawFace(ctx, 0, 0, 'FIVE', suit)
      return colors
    }

    expect(fillColors('HEARTS').has('#a3202c')).toBe(true)
    expect(fillColors('DIAMONDS').has('#a3202c')).toBe(true)
    expect(fillColors('CLUBS').has('#a3202c')).toBe(false)
    expect(fillColors('SPADES').has('#a3202c')).toBe(false)
  })

  it('draws pips for number cards and a framed letter for court cards', () => {
    const number = createRecordingContext()
    const court = createRecordingContext()

    drawFace(number, 0, 0, 'SEVEN', 'CLUBS')
    drawFace(court, 0, 0, 'JACK', 'CLUBS')

    expect(number.calls.filter(([name]) => name === 'strokeRect')).toHaveLength(1)
    expect(court.calls.filter(([name]) => name === 'strokeRect')).toHaveLength(3)
    expect(court.calls.filter(([name]) => name === 'fillText').map(([, text]) => text)).toContain(
      'J',
    )
  })

  it('draws every suit shape', () => {
    for (const suit of SUIT_ORDER) {
      const ctx = createRecordingContext()

      drawFace(ctx, 0, 0, 'ACE', suit)

      expect(ctx.calls.some(([name]) => name === 'fill')).toBe(true)
    }
  })

  it('draws the back with a clipped lattice', () => {
    const ctx = createRecordingContext()

    drawBack(ctx, 0, 0)

    const names = ctx.calls.map(([name]) => name)
    expect(names).toContain('clip')
    expect(names).toContain('stroke')
  })
})

describe('createCardAtlasTexture', () => {
  let stub

  beforeEach(() => {
    stub = stubCanvasContext()
  })

  afterEach(() => {
    stub.spy.mockRestore()
  })

  it('returns a canvas texture with the atlas size, in sRGB', () => {
    const canvas = document.createElement('canvas')

    const texture = createCardAtlasTexture(canvas)

    expect(texture).toBeInstanceOf(THREE.CanvasTexture)
    expect(canvas.width).toBe(ATLAS_WIDTH)
    expect(canvas.height).toBe(ATLAS_HEIGHT)
    expect(texture.colorSpace).toBe(THREE.SRGBColorSpace)
  })

  it('paints the atlas once into the canvas', () => {
    createCardAtlasTexture(document.createElement('canvas'))

    expect(stub.contexts).toHaveLength(1)
    expect(stub.contexts[0].calls.filter(([name]) => name === 'fillRect')).toHaveLength(54)
  })

  it('creates its own canvas when none is given', () => {
    const texture = createCardAtlasTexture()

    expect(texture.image.width).toBe(ATLAS_WIDTH)
  })

  it('survives a platform without a 2D context', () => {
    stub.spy.mockImplementation(() => null)

    const texture = createCardAtlasTexture(document.createElement('canvas'))

    expect(texture).toBeInstanceOf(THREE.CanvasTexture)
  })
})
