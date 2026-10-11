import * as THREE from 'three'
import { describe, expect, it } from 'vitest'

import { CARD, SHOE } from '../blackjackLayout'
import { cardUvRect } from '../cardAtlasLayout'
import {
  createCardGeometry,
  createCardMaterial,
  createDeckGeometry,
  flagAsCard,
  setFrontFace,
} from '../cardMesh'

const BACK = cardUvRect('back')
const ACE = cardUvRect({ face: 'ACE', suit: 'SPADES' })

function uvQuad(geometry, offset) {
  return Array.from(geometry.attributes.uv.array.slice(offset, offset + 8))
}

describe('createCardMaterial', () => {
  it('is a standard material with the atlas as its map', () => {
    const texture = new THREE.Texture()

    const material = createCardMaterial(texture)

    expect(material).toBeInstanceOf(THREE.MeshStandardMaterial)
    expect(material.map).toBe(texture)
  })

  it('stays single sided, opaque and without extra maps so it compiles to one program', () => {
    const material = createCardMaterial(new THREE.Texture())

    expect(material.side).toBe(THREE.FrontSide)
    expect(material.transparent).toBe(false)
    expect(material.alphaMap).toBeNull()
    expect(material.normalMap).toBeNull()
    expect(material.roughnessMap).toBeNull()
  })
})

describe('createCardGeometry', () => {
  it('has two quads: eight vertices and four triangles', () => {
    const geometry = createCardGeometry(ACE, BACK)

    expect(geometry.attributes.position.count).toBe(8)
    expect(geometry.index.count).toBe(12)
  })

  it('has the scaled card size', () => {
    const geometry = createCardGeometry(ACE, BACK)
    geometry.computeBoundingBox()

    const size = geometry.boundingBox.getSize(new THREE.Vector3())
    expect(size.x).toBeCloseTo(CARD.width, 6)
    expect(size.y).toBeCloseTo(CARD.height, 6)
    expect(size.z).toBe(0)
  })

  it('faces the two quads in opposite directions', () => {
    const geometry = createCardGeometry(ACE, BACK)
    const normals = geometry.attributes.normal

    expect(normals.getZ(0)).toBe(1)
    expect(normals.getZ(3)).toBe(1)
    expect(normals.getZ(4)).toBe(-1)
    expect(normals.getZ(7)).toBe(-1)
  })

  it('winds the front counter-clockwise seen from +Z and the back counter-clockwise seen from -Z', () => {
    const geometry = createCardGeometry(ACE, BACK)
    const position = geometry.attributes.position
    const index = geometry.index.array

    for (let triangle = 0; triangle < 4; triangle++) {
      const [a, b, c] = [0, 1, 2].map((i) => {
        const vertex = index[triangle * 3 + i]
        return new THREE.Vector3().fromBufferAttribute(position, vertex)
      })
      const normal = new THREE.Vector3()
        .subVectors(b, a)
        .cross(new THREE.Vector3().subVectors(c, a))
      expect(Math.sign(normal.z)).toBe(triangle < 2 ? 1 : -1)
    }
  })

  it('maps the front quad to the card rect and the back quad to the back rect', () => {
    const geometry = createCardGeometry(ACE, BACK)

    expect(uvQuad(geometry, 0)).toEqual(
      [ACE.u0, ACE.v0, ACE.u1, ACE.v0, ACE.u1, ACE.v1, ACE.u0, ACE.v1].map(Math.fround),
    )
    expect(uvQuad(geometry, 8)).toEqual(
      [BACK.u1, BACK.v0, BACK.u0, BACK.v0, BACK.u0, BACK.v1, BACK.u1, BACK.v1].map(Math.fround),
    )
  })

  it('mirrors the back horizontally so the pattern is not flipped when seen from behind', () => {
    const geometry = createCardGeometry(ACE, BACK)
    const uv = geometry.attributes.uv
    const position = geometry.attributes.position

    const leftVertexOfBack = position.getX(4) < position.getX(5) ? 4 : 5
    const rightVertexOfBack = leftVertexOfBack === 4 ? 5 : 4
    expect(uv.getX(leftVertexOfBack)).toBeGreaterThan(uv.getX(rightVertexOfBack))
  })

  it('changes only the front when the face changes, and flags the buffer for upload', () => {
    const geometry = createCardGeometry(BACK, BACK)
    const version = geometry.attributes.uv.version
    const backBefore = uvQuad(geometry, 8)

    setFrontFace(geometry, ACE)

    expect(uvQuad(geometry, 0)[0]).toBeCloseTo(ACE.u0, 6)
    expect(uvQuad(geometry, 8)).toEqual(backBefore)
    expect(geometry.attributes.uv.version).toBeGreaterThan(version)
  })
})

describe('createDeckGeometry', () => {
  it('has the shoe deck size', () => {
    const geometry = createDeckGeometry(BACK)
    geometry.computeBoundingBox()

    const size = geometry.boundingBox.getSize(new THREE.Vector3())
    expect(size.x).toBeCloseTo(SHOE.deckWidth, 6)
    expect(size.y).toBeCloseTo(SHOE.deckHeight, 6)
    expect(size.z).toBeCloseTo(SHOE.deckDepth, 6)
  })

  it('shows the back pattern on every face, inside the back rect', () => {
    const geometry = createDeckGeometry(BACK)
    const uv = geometry.attributes.uv

    for (let i = 0; i < uv.count; i++) {
      expect(uv.getX(i)).toBeGreaterThanOrEqual(BACK.u0)
      expect(uv.getX(i)).toBeLessThanOrEqual(BACK.u1)
      expect(uv.getY(i)).toBeGreaterThanOrEqual(BACK.v0)
      expect(uv.getY(i)).toBeLessThanOrEqual(BACK.v1)
    }
  })

  it('shares the vertex layout and index type with the card geometry so both use one pipeline', () => {
    const deck = createDeckGeometry(BACK)
    const card = createCardGeometry(ACE, BACK)

    expect(Object.keys(deck.attributes).sort()).toEqual(Object.keys(card.attributes).sort())
    for (const name of Object.keys(card.attributes)) {
      expect(deck.attributes[name].itemSize).toBe(card.attributes[name].itemSize)
      expect(deck.attributes[name].array.constructor).toBe(card.attributes[name].array.constructor)
    }
    expect(deck.index.array.constructor).toBe(card.index.array.constructor)
  })
})

describe('flagAsCard', () => {
  it('keeps the mesh out of shadows and out of the environment capture', () => {
    const mesh = new THREE.Mesh(new THREE.BufferGeometry(), createCardMaterial(new THREE.Texture()))
    mesh.castShadow = true
    mesh.receiveShadow = true

    const flagged = flagAsCard(mesh)

    expect(flagged).toBe(mesh)
    expect(mesh.castShadow).toBe(false)
    expect(mesh.receiveShadow).toBe(false)
    expect(mesh.userData.hideFromEnv).toBe(true)
    expect(mesh.userData.isCard).toBe(true)
  })
})
