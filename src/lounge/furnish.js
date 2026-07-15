import * as THREE from 'three'

import { loadProp } from './models'
import { ROOM, TABLE_SPOTS } from './salon'

// Amueblado con assets low-poly CC0/CC-BY (autores y licencias: docs/CREDITS.md).
// Alturas en metros reales; loadProp normaliza la escala y retinta materiales
// a la paleta del club (madera oscura, latón, cuero burdeos).

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

const GLASS = {
  color: '#dfe8e2',
  transparent: true,
  opacity: 0.35,
  roughness: 0.1,
}

function chesterfieldsAround(x, z) {
  // proporciones de las referencias: butaca alta (1 m) sobre mesita de cóctel
  const pieces = []
  for (let i = 0; i < 3; i++) {
    const angle = (i / 3) * Math.PI * 2 + 0.5
    const chairX = x + Math.cos(angle) * 0.95
    const chairZ = z + Math.sin(angle) * 0.95
    const rotationY = Math.atan2(x - chairX, z - chairZ) // mirando a la mesa
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

  // butacas chesterfield alrededor de las mesas (la mesa la pone salon.js)
  for (const [x, z] of TABLE_SPOTS) props.push(...chesterfieldsAround(x, z))

  // una copa de coñac en cada mesa
  for (const [x, z] of TABLE_SPOTS) {
    props.push({
      url: HUNT + 'cognac-glass.glb',
      opts: { height: 0.11, recolor: { 'Solid_-_25%.037': GLASS } },
      at: [x + 0.12, 0.77, z - 0.07],
    })
  }

  // taburetes de barra (asiento negro; las patas claras se tiñen a nogal)
  for (let i = 0; i < 5; i++) {
    const z = -7 / 2 + 0.9 + i * ((7 - 1.8) / 4)
    props.push({
      url: HUNT + 'barstool.glb',
      opts: { height: 0.78, recolor: { _crayfishdiffuse: '#3a2417' } },
      at: [BAR_X + 0.85, 0, z],
    })
  }

  // el mostrador: cristalería (la caja registradora del hunt resultó ser un
  // modelo defectuoso — solo traía la bandeja; descartada)
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

  // (el champán de la repisa alta se retiró 2026-07-14: esa balda pasó a
  // cajas de puros y cristalería — decor/repisaAlta.js; el alcohol vive
  // todo en la repisa baja)

  // gramófono de trompa en la TAPA de la barra, extremo sur, haciendo
  // esquina con la caja de puros abierta (z=2.35, cocktailStation) —
  // movido de la encimera de la trasbarra a petición de Iulian
  props.push({
    url: HUNT + 'gramophone.glb',
    opts: { height: 0.55, rotationY: Math.PI / 2 },
    at: [BAR_X, 1.1, 2.95],
  })

  // guardarropa junto a la entrada
  props.push({
    url: KENNEY + 'coatRackStanding.glb',
    opts: { height: 1.7, recolor: CLUB },
    at: [1.6, 0, 4.7],
  })

  // (la alfombra del hunt se descartó: el GLB traía la matriz cocinada en
  // vertical y ni con pivote se dejaba tumbar — vetada por Iulian)

  // (los apliques de pared son procedurales en salon.js — el sconce.glb del
  // hunt traía geometría corrupta que reventaba el bloom)

  // ventiladores de techo perezosos
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

  // (la lámpara de pie GLB se retiró 2026-07-13: la sustituyen las
  // victorianas procedurales de decor/floorLamps.js)

  // el escenario: piano de cola, saxo, contrabajo
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

  // la banda (Quaternius, en idle hasta que haya animaciones de tocar)
  const musicianRecolor = {
    Shirt: '#d9cfc0', // camisa marfil
    UnderShirt: '#5a2830', // chaleco burdeos
    Pants: '#1c1c22',
    Detail: '#8a6a33',
  }
  props.push(
    {
      url: HUNT + 'musician.glb',
      opts: { height: 1.72, rotationY: Math.PI + 0.4, animate: 'Idle', recolor: musicianRecolor },
      at: [2.55, STAGE_Y, -3.55],
    },
    {
      url: HUNT + 'musician.glb',
      opts: { height: 1.72, rotationY: Math.PI - 0.5, animate: 'Idle', recolor: musicianRecolor },
      at: [4.35, STAGE_Y, -3.85],
    },
  )

  // el camarero, en su pasillo detrás de la barra (Idle: el clip Working de
  // Quaternius es de picar piedra agachado, nada que ver con secar vasos)
  props.push({
    url: HUNT + 'barman.glb',
    opts: {
      height: 1.78,
      rotationY: Math.PI / 2,
      animate: 'Idle',
      recolor: { Texture: '#585862' },
    },
    at: [-7.15, 0, 0.4],
  })

  return props
}

export async function furnishSalon(scene, updatables) {
  const results = await Promise.allSettled(
    manifest().map(async ({ url, opts, at, fan, lightAt }) => {
      const prop = await loadProp(url, opts)
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
        // lucecita cálida pegada a la lámpara
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
