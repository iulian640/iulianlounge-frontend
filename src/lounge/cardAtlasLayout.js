export const FACE_ORDER = Object.freeze([
  'ACE',
  'TWO',
  'THREE',
  'FOUR',
  'FIVE',
  'SIX',
  'SEVEN',
  'EIGHT',
  'NINE',
  'TEN',
  'JACK',
  'QUEEN',
  'KING',
])

export const SUIT_ORDER = Object.freeze(['CLUBS', 'DIAMONDS', 'HEARTS', 'SPADES'])

export const ATLAS_COLUMNS = FACE_ORDER.length
export const ATLAS_ROWS = SUIT_ORDER.length + 1
export const CELL_WIDTH = 144
export const CELL_HEIGHT = 200
export const ATLAS_WIDTH = ATLAS_COLUMNS * CELL_WIDTH
export const ATLAS_HEIGHT = ATLAS_ROWS * CELL_HEIGHT
export const UV_INSET_PX = 2

export const BACK_CELL = Object.freeze({ column: 0, row: SUIT_ORDER.length })

export function cellOf(card) {
  if (card === 'back') return BACK_CELL
  const column = FACE_ORDER.indexOf(card?.face)
  const row = SUIT_ORDER.indexOf(card?.suit)
  if (column < 0 || row < 0) return null
  return { column, row }
}

export function cellRect(cell, inset = UV_INSET_PX) {
  const left = cell.column * CELL_WIDTH + inset
  const right = (cell.column + 1) * CELL_WIDTH - inset
  const top = cell.row * CELL_HEIGHT + inset
  const bottom = (cell.row + 1) * CELL_HEIGHT - inset
  return {
    u0: left / ATLAS_WIDTH,
    u1: right / ATLAS_WIDTH,
    v0: 1 - bottom / ATLAS_HEIGHT,
    v1: 1 - top / ATLAS_HEIGHT,
  }
}

export function cardUvRect(card) {
  return cellRect(cellOf(card) ?? BACK_CELL)
}

export function allCells() {
  const cells = []
  for (let row = 0; row < SUIT_ORDER.length; row++) {
    for (let column = 0; column < FACE_ORDER.length; column++) {
      cells.push({ column, row, face: FACE_ORDER[column], suit: SUIT_ORDER[row] })
    }
  }
  return cells
}
