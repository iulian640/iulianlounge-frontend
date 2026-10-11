import {
  ATLAS_HEIGHT,
  ATLAS_WIDTH,
  BACK_CELL,
  CELL_HEIGHT,
  CELL_WIDTH,
  allCells,
} from './cardAtlasLayout'

const IVORY = '#efe5cd'
const EDGE = '#b9a981'
const RED = '#a3202c'
const INK = '#16181b'
const GREEN = '#0f3b2e'
const GREEN_DEEP = '#0a2a21'
const BRASS = '#c9a45c'
const SERIF = "Georgia, 'Times New Roman', serif"

const RANK_LABELS = {
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

const OUTER = [
  [-1, -1],
  [1, -1],
  [-1, 1],
  [1, 1],
]
const SIDES = [
  [-1, -1],
  [1, -1],
  [-1, -1 / 3],
  [1, -1 / 3],
  [-1, 1 / 3],
  [1, 1 / 3],
  [-1, 1],
  [1, 1],
]
const SIX = [
  [-1, -1],
  [1, -1],
  [-1, 0],
  [1, 0],
  [-1, 1],
  [1, 1],
]

const PIP_LAYOUTS = {
  ACE: [[0, 0]],
  TWO: [
    [0, -1],
    [0, 1],
  ],
  THREE: [
    [0, -1],
    [0, 0],
    [0, 1],
  ],
  FOUR: OUTER,
  FIVE: [...OUTER, [0, 0]],
  SIX,
  SEVEN: [...SIX, [0, -0.5]],
  EIGHT: [...SIX, [0, -0.5], [0, 0.5]],
  NINE: [...SIDES, [0, 0]],
  TEN: [...SIDES, [0, -2 / 3], [0, 2 / 3]],
}

const COURT_FACES = new Set(['JACK', 'QUEEN', 'KING'])
const PIP_HALF_WIDTH = CELL_WIDTH * 0.2
const PIP_HALF_HEIGHT = CELL_HEIGHT * 0.32
const PIP_SIZE = 38
const ACE_SIZE = 86

export function isRedSuit(suit) {
  return suit === 'DIAMONDS' || suit === 'HEARTS'
}

function suitColor(suit) {
  return isRedSuit(suit) ? RED : INK
}

function drawHeart(ctx, cx, cy, size) {
  ctx.beginPath()
  ctx.moveTo(cx, cy + 0.5 * size)
  ctx.bezierCurveTo(
    cx - 0.62 * size,
    cy + 0.08 * size,
    cx - 0.5 * size,
    cy - 0.52 * size,
    cx,
    cy - 0.2 * size,
  )
  ctx.bezierCurveTo(
    cx + 0.5 * size,
    cy - 0.52 * size,
    cx + 0.62 * size,
    cy + 0.08 * size,
    cx,
    cy + 0.5 * size,
  )
  ctx.closePath()
  ctx.fill()
}

function drawDiamond(ctx, cx, cy, size) {
  ctx.beginPath()
  ctx.moveTo(cx, cy - 0.5 * size)
  ctx.lineTo(cx + 0.34 * size, cy)
  ctx.lineTo(cx, cy + 0.5 * size)
  ctx.lineTo(cx - 0.34 * size, cy)
  ctx.closePath()
  ctx.fill()
}

function drawSpade(ctx, cx, cy, size) {
  ctx.beginPath()
  ctx.moveTo(cx, cy - 0.5 * size)
  ctx.bezierCurveTo(
    cx - 0.62 * size,
    cy - 0.02 * size,
    cx - 0.5 * size,
    cy + 0.42 * size,
    cx,
    cy + 0.2 * size,
  )
  ctx.bezierCurveTo(
    cx + 0.5 * size,
    cy + 0.42 * size,
    cx + 0.62 * size,
    cy - 0.02 * size,
    cx,
    cy - 0.5 * size,
  )
  ctx.closePath()
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(cx, cy + 0.08 * size)
  ctx.lineTo(cx - 0.2 * size, cy + 0.5 * size)
  ctx.lineTo(cx + 0.2 * size, cy + 0.5 * size)
  ctx.closePath()
  ctx.fill()
}

function drawClub(ctx, cx, cy, size) {
  const radius = 0.2 * size
  const circles = [
    [cx, cy - 0.2 * size],
    [cx - 0.22 * size, cy + 0.1 * size],
    [cx + 0.22 * size, cy + 0.1 * size],
  ]
  for (const [x, y] of circles) {
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.beginPath()
  ctx.moveTo(cx, cy)
  ctx.lineTo(cx - 0.18 * size, cy + 0.5 * size)
  ctx.lineTo(cx + 0.18 * size, cy + 0.5 * size)
  ctx.closePath()
  ctx.fill()
}

const SUIT_PAINTERS = {
  CLUBS: drawClub,
  DIAMONDS: drawDiamond,
  HEARTS: drawHeart,
  SPADES: drawSpade,
}

export function drawSuit(ctx, suit, cx, cy, size) {
  ctx.fillStyle = suitColor(suit)
  SUIT_PAINTERS[suit](ctx, cx, cy, size)
}

function withRotation(ctx, cx, cy, angle, paint) {
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(angle)
  ctx.translate(-cx, -cy)
  paint()
  ctx.restore()
}

function drawCornerIndex(ctx, ox, oy, face, suit) {
  const label = RANK_LABELS[face]
  ctx.fillStyle = suitColor(suit)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `bold ${label.length > 1 ? 24 : 30}px ${SERIF}`
  ctx.fillText(label, ox + 20, oy + 25)
  drawSuit(ctx, suit, ox + 20, oy + 52, 20)
}

function drawPips(ctx, ox, oy, face, suit) {
  const centreX = ox + CELL_WIDTH / 2
  const centreY = oy + CELL_HEIGHT / 2
  for (const [gridX, gridY] of PIP_LAYOUTS[face]) {
    const x = centreX + gridX * PIP_HALF_WIDTH
    const y = centreY + gridY * PIP_HALF_HEIGHT
    const size = face === 'ACE' ? ACE_SIZE : PIP_SIZE
    if (gridY > 0) withRotation(ctx, x, y, Math.PI, () => drawSuit(ctx, suit, x, y, size))
    else drawSuit(ctx, suit, x, y, size)
  }
}

function drawCourt(ctx, ox, oy, face, suit) {
  const centreX = ox + CELL_WIDTH / 2
  const centreY = oy + CELL_HEIGHT / 2
  ctx.strokeStyle = suitColor(suit)
  ctx.lineWidth = 3
  ctx.strokeRect(ox + 32, oy + 36, CELL_WIDTH - 64, CELL_HEIGHT - 72)
  ctx.lineWidth = 1
  ctx.strokeRect(ox + 37, oy + 41, CELL_WIDTH - 74, CELL_HEIGHT - 82)
  ctx.fillStyle = suitColor(suit)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `bold 78px ${SERIF}`
  ctx.fillText(RANK_LABELS[face], centreX, centreY)
  drawSuit(ctx, suit, centreX, oy + 62, 26)
  withRotation(ctx, centreX, oy + CELL_HEIGHT - 62, Math.PI, () =>
    drawSuit(ctx, suit, centreX, oy + CELL_HEIGHT - 62, 26),
  )
}

export function drawFace(ctx, ox, oy, face, suit) {
  ctx.fillStyle = IVORY
  ctx.fillRect(ox, oy, CELL_WIDTH, CELL_HEIGHT)
  ctx.strokeStyle = EDGE
  ctx.lineWidth = 2
  ctx.strokeRect(ox + 4, oy + 4, CELL_WIDTH - 8, CELL_HEIGHT - 8)

  drawCornerIndex(ctx, ox, oy, face, suit)
  withRotation(ctx, ox + CELL_WIDTH / 2, oy + CELL_HEIGHT / 2, Math.PI, () =>
    drawCornerIndex(ctx, ox, oy, face, suit),
  )

  if (COURT_FACES.has(face)) drawCourt(ctx, ox, oy, face, suit)
  else drawPips(ctx, ox, oy, face, suit)
}

function drawLattice(ctx, ox, oy) {
  const left = ox + 18
  const top = oy + 18
  const width = CELL_WIDTH - 36
  const height = CELL_HEIGHT - 36
  ctx.save()
  ctx.beginPath()
  ctx.rect(left, top, width, height)
  ctx.clip()
  ctx.strokeStyle = BRASS
  ctx.globalAlpha = 0.55
  ctx.lineWidth = 1.2
  const step = 18
  ctx.beginPath()
  for (let offset = -height; offset <= width; offset += step) {
    ctx.moveTo(left + offset, top)
    ctx.lineTo(left + offset + height, top + height)
    ctx.moveTo(left + offset + height, top)
    ctx.lineTo(left + offset, top + height)
  }
  ctx.stroke()
  ctx.restore()
}

export function drawBack(ctx, ox, oy) {
  ctx.fillStyle = GREEN
  ctx.fillRect(ox, oy, CELL_WIDTH, CELL_HEIGHT)
  ctx.strokeStyle = BRASS
  ctx.lineWidth = 4
  ctx.strokeRect(ox + 8, oy + 8, CELL_WIDTH - 16, CELL_HEIGHT - 16)
  ctx.lineWidth = 1.2
  ctx.strokeRect(ox + 14, oy + 14, CELL_WIDTH - 28, CELL_HEIGHT - 28)
  drawLattice(ctx, ox, oy)

  const centreX = ox + CELL_WIDTH / 2
  const centreY = oy + CELL_HEIGHT / 2
  ctx.fillStyle = GREEN_DEEP
  ctx.strokeStyle = BRASS
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(centreX, centreY - 46)
  ctx.lineTo(centreX + 32, centreY)
  ctx.lineTo(centreX, centreY + 46)
  ctx.lineTo(centreX - 32, centreY)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(centreX, centreY, 14, 0, Math.PI * 2)
  ctx.fillStyle = BRASS
  ctx.fill()
}

export function drawCardAtlas(ctx) {
  ctx.fillStyle = GREEN_DEEP
  ctx.fillRect(0, 0, ATLAS_WIDTH, ATLAS_HEIGHT)
  for (const { column, row, face, suit } of allCells()) {
    drawFace(ctx, column * CELL_WIDTH, row * CELL_HEIGHT, face, suit)
  }
  drawBack(ctx, BACK_CELL.column * CELL_WIDTH, BACK_CELL.row * CELL_HEIGHT)
}
