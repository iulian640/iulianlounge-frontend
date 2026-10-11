import * as THREE from 'three'

import { drawCardAtlas } from './cardArt'
import { ATLAS_HEIGHT, ATLAS_WIDTH } from './cardAtlasLayout'

export {
  ATLAS_COLUMNS,
  ATLAS_ROWS,
  BACK_CELL,
  cardUvRect,
  cellOf,
  cellRect,
} from './cardAtlasLayout'

const ANISOTROPY = 4

export function createCardAtlasTexture(canvas = document.createElement('canvas')) {
  canvas.width = ATLAS_WIDTH
  canvas.height = ATLAS_HEIGHT
  const ctx = canvas.getContext('2d')
  if (ctx) drawCardAtlas(ctx)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = ANISOTROPY
  return texture
}
