import * as THREE from 'three'

import { BARMAN_AT } from './barmanProximity'
import { CROUPIER, SEATS } from './blackjackLayout'
import { loadProp } from './models'
import { ROOM, TABLE_SPOTS } from './salon'

const KENNEY = '/models/kenney/'
const HUNT = '/models/hunt/'
const BAR_X = -ROOM.width / 2 + 1.45
const STAGE_Y = 0.4

const CLUB = {
  wood: '#3a2417',
  woodDark: '#241811',
  carpet: { color: '#5a2830', roughness: 0.75 },
  carpetDarker: '#3a1c22',
  metal: { color: '#c9a45c', metalness: 1, roughness: 0.35 },
  metalMedium: { color: '#8a6a33', metalness: 1, roughness: 0.45 },
  lamp: { color: '#e8cd8f', emissive: '#ffb46b', emissiveIntensity: 0.35 },
}

const CROUPIER_TINT = '#6b4a52'
const SEAT_HEIGHT = 0.78

const GLASS = {
  color: '#dfe8e2',
  transparent: true,
  opacity: 0.35,
  roughness: 0.1,
}

function chesterfieldsAround(x, z) {
  const pieces = []
  for (let i = 0; i < 3; i++) {
    const angle = (i / 3) * Math.PI * 2 + 0.5
    const chairX = x + Math.cos(angle) * 0.95
    const chairZ = z + Math.sin(angle) * 0.95
    const rotationY = Math.atan2(-(z - chairZ), x - chairX)
    pieces.push({
      url: HUNT + 'chesterfield.glb',
      opts: { height: 1.0, rotationY, recolor: { F44336: { color: '#5a2830', roughness: 0.7 } } },
      at: [chairX, 0, chairZ],
    })
  }
  return pieces
}

function manifest() {
  const props = []

  for (const [x, z] of TABLE_SPOTS) props.push(...chesterfieldsAround(x, z))

  for (const [x, z] of TABLE_SPOTS) {
    props.push({
      url: HUNT + 'cognac-glass.glb',
      opts: { height: 0.11, recolor: { 'Solid_-_25%.037': GLASS } },
      at: [x + 0.12, 0.77, z - 0.07],
    })
  }

  for (let i = 0; i < 5; i++) {
    const z = -7 / 2 + 0.9 + i * ((7 - 1.8) / 4)
    props.push({
      url: HUNT + 'barstool.glb',
      opts: { height: 1.15, rotationY: Math.PI / 2, recolor: { _crayfishdiffuse: '#3a2417' } },
      at: [BAR_X + 0.85, 0, z],
    })
  }

  props.push(
    {
      url: HUNT + 'cocktail-glass.glb',
      opts: { height: 0.16, recolor: { 'Solid_-_25%.036': GLASS } },
      at: [BAR_X, 1.09, 0.4],
    },
    {
      url: HUNT + 'cocktail-glass.glb',
      opts: { height: 0.16, recolor: { 'Solid_-_25%.036': GLASS } },
      at: [BAR_X + 0.12, 1.09, 1.5],
    },
    {
      url: HUNT + 'cognac-glass.glb',
      opts: { height: 0.12, recolor: { 'Solid_-_25%.037': GLASS } },
      at: [BAR_X - 0.1, 1.09, -0.8],
    },
  )

  props.push({
    url: HUNT + 'gramophone.glb',
    opts: { height: 0.55, rotationY: Math.PI / 2 },
    at: [BAR_X, 1.1, 2.95],
  })

  props.push({
    url: KENNEY + 'coatRackStanding.glb',
    opts: { height: 1.7, recolor: CLUB },
    at: [1.6, 0, 4.7],
  })

  props.push(
    {
      url: HUNT + 'ceiling-fan.glb',
      opts: { footprint: 1.5, recolor: { mat19: '#3a2417' } },
      at: [0.5, ROOM.height - 0.55, -2.6],
      fan: true,
    },
    {
      url: HUNT + 'ceiling-fan.glb',
      opts: { footprint: 1.5, recolor: { mat19: '#3a2417' } },
      at: [-4.2, ROOM.height - 0.55, 1.2],
      fan: true,
    },
  )

  props.push(
    {
      url: HUNT + 'grand-piano.glb',
      opts: {
        height: 1.0,
        rotationY: -0.4,
        recolor: {
          FFEB3B: { color: '#c9a45c', metalness: 1, roughness: 0.4 },
          DD9944: { color: '#8a6a33', metalness: 1, roughness: 0.45 },
        },
      },
      at: [2.9, STAGE_Y, -4.3],
    },
    {
      url: HUNT + 'saxophone.glb',
      opts: {
        height: 0.7,
        rotationY: 0.9,
        recolor: { FFEB3B: { color: '#c9a45c', metalness: 1, roughness: 0.35 } },
      },
      at: [4.15, STAGE_Y, -4.05],
    },
    {
      url: HUNT + 'bass-violin.glb',
      opts: { height: 1.75, rotationY: -0.5 },
      at: [4.6, STAGE_Y, -4.45],
    },
  )

  props.push({
    url: HUNT + 'barman.glb',
    opts: {
      height: 1.78,
      rotationY: Math.PI / 2,
      animate: 'Idle',
      recolor: { Texture: '#585862' },
    },
    at: BARMAN_AT,
  })

  props.push({
    name: 'croupier',
    url: HUNT + 'barman.glb',
    opts: {
      height: 1.78,
      rotationY: CROUPIER.yaw,
      animate: 'Idle',
      recolor: { Texture: CROUPIER_TINT },
    },
    at: CROUPIER.at,
  })

  for (const seat of SEATS) {
    props.push({
      name: 'blackjack-seat',
      url: HUNT + 'barstool.glb',
      opts: {
        height: SEAT_HEIGHT,
        rotationY: seat.yaw,
        recolor: { _crayfishdiffuse: '#3a2417' },
      },
      at: seat.at,
    })
  }

  return props
}

export async function furnishSalon(scene, updatables) {
  const results = await Promise.allSettled(
    manifest().map(async ({ name, url, opts, at, fan, lightAt }) => {
      const prop = await loadProp(url, opts)
      if (name) prop.name = name
      prop.position.set(at[0], at[1], at[2])
      scene.add(prop)

      if (prop.userData.update) updatables.push(prop.userData.update)
      if (fan) {
        const model = prop.children[0]
        updatables.push((delta) => {
          model.rotation.y += delta * 1.1
        })
      }
      if (lightAt) {
        const glow = new THREE.PointLight('#ffb46b', 3, 3.5, 2)
        glow.position.set(lightAt[0], lightAt[1], lightAt[2])
        scene.add(glow)
      }
    }),
  )

  for (const result of results) {
    if (result.status === 'rejected') console.error('[furnish]', result.reason)
  }
}
