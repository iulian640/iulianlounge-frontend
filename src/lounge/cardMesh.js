import * as THREE from 'three'

import { CARD, SHOE } from './blackjackLayout'

const FRONT_UV_VALUES = 8
const DECK_UV_MARGIN = 0.18

export function createCardMaterial(texture) {
  return new THREE.MeshStandardMaterial({
    map: texture,
    color: '#d6cfbd',
    roughness: 0.6,
    metalness: 0,
  })
}

export function createCardGeometry(frontRect, backRect) {
  const halfWidth = CARD.width / 2
  const halfHeight = CARD.height / 2
  const corners = [
    [-halfWidth, -halfHeight],
    [halfWidth, -halfHeight],
    [halfWidth, halfHeight],
    [-halfWidth, halfHeight],
  ]
  const positions = []
  const normals = []
  for (const [x, y] of corners) {
    positions.push(x, y, 0)
    normals.push(0, 0, 1)
  }
  for (const [x, y] of corners) {
    positions.push(x, y, 0)
    normals.push(0, 0, -1)
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
  geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(16), 2))
  geometry.setIndex([0, 1, 2, 0, 2, 3, 4, 6, 5, 4, 7, 6])
  setFrontFace(geometry, frontRect)
  setBackFace(geometry, backRect)
  return geometry
}

export function setFrontFace(geometry, rect) {
  const uv = geometry.attributes.uv
  const values = [rect.u0, rect.v0, rect.u1, rect.v0, rect.u1, rect.v1, rect.u0, rect.v1]
  for (let i = 0; i < FRONT_UV_VALUES; i++) uv.array[i] = values[i]
  uv.needsUpdate = true
}

function setBackFace(geometry, rect) {
  const uv = geometry.attributes.uv
  const values = [rect.u1, rect.v0, rect.u0, rect.v0, rect.u0, rect.v1, rect.u1, rect.v1]
  for (let i = 0; i < FRONT_UV_VALUES; i++) uv.array[FRONT_UV_VALUES + i] = values[i]
  uv.needsUpdate = true
}

export function createDeckGeometry(backRect) {
  const geometry = new THREE.BoxGeometry(SHOE.deckWidth, SHOE.deckHeight, SHOE.deckDepth)
  const uv = geometry.attributes.uv
  const uSpan = backRect.u1 - backRect.u0
  const vSpan = backRect.v1 - backRect.v0
  for (let i = 0; i < uv.count; i++) {
    const u = backRect.u0 + uSpan * (DECK_UV_MARGIN + uv.getX(i) * (1 - 2 * DECK_UV_MARGIN))
    const v = backRect.v0 + vSpan * (DECK_UV_MARGIN + uv.getY(i) * (1 - 2 * DECK_UV_MARGIN))
    uv.setXY(i, u, v)
  }
  uv.needsUpdate = true
  return geometry
}

export function flagAsCard(mesh) {
  mesh.castShadow = false
  mesh.receiveShadow = false
  mesh.userData.hideFromEnv = true
  mesh.userData.isCard = true
  return mesh
}
