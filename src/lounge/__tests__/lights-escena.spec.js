import { beforeEach, describe, expect, it } from 'vitest'
import * as THREE from 'three'

import { addSalonLights } from '../lights'
import { LAMPS, ROOM, SCONCES, TABLE_SPOTS, WALL_WASHES } from '../salon'

const CAPA_SUELO = 1

function recogerLuces(scene) {
  const luces = []
  scene.traverse((objeto) => {
    if (objeto.isLight) luces.push(objeto)
  })
  return luces
}

function porKind(luces, kind) {
  return luces.filter((luz) => luz.userData.kind === kind)
}

function tocaElSuelo(luz) {
  return (luz.layers.mask & (1 << CAPA_SUELO)) !== 0
}

function buscarPorXZ(luces, x, z) {
  return luces.find((luz) => luz.position.x === x && luz.position.z === z)
}

describe('addSalonLights', () => {
  let scene
  let luces

  beforeEach(() => {
    scene = new THREE.Scene()

    addSalonLights(scene)
    luces = recogerLuces(scene)
  })

  describe('censo por userData.kind', () => {
    it('etiqueta cada luz de la escena con un kind reconocido', () => {
      const kindsValidos = [
        'fill',
        'lamp',
        'shelf',
        'tira',
        'candle',
        'accent',
        'escenario',
        'letrero',
        'pared',
      ]

      const kindsEncontrados = luces.map((luz) => luz.userData.kind)

      for (const kind of kindsEncontrados) {
        expect(kindsValidos).toContain(kind)
      }
    })

    it('reparte el número de luces por kind según el presupuesto de cada capa', () => {
      const lamparasSinSombra = LAMPS.filter((lampara) => !lampara.shadow).length
      const lamparasConSombra = LAMPS.filter((lampara) => lampara.shadow).length

      const porLamp = porKind(luces, 'lamp')

      expect(porKind(luces, 'fill')).toHaveLength(1)
      expect(porLamp).toHaveLength(LAMPS.length)
      expect(porLamp.filter((luz) => luz.isPointLight)).toHaveLength(lamparasSinSombra)
      expect(porLamp.filter((luz) => luz.isSpotLight)).toHaveLength(lamparasConSombra)
      expect(porKind(luces, 'shelf')).toHaveLength(3)
      expect(porKind(luces, 'tira')).toHaveLength(13)
      expect(porKind(luces, 'candle')).toHaveLength(TABLE_SPOTS.length)
      expect(porKind(luces, 'accent')).toHaveLength(SCONCES.length)
      expect(porKind(luces, 'escenario')).toHaveLength(2)
      expect(porKind(luces, 'letrero')).toHaveLength(1)
      expect(porKind(luces, 'pared')).toHaveLength(WALL_WASHES.length)
    })

    it('suma el total de luces de cada tipo three.js en la escena', () => {
      const puntualesEsperadas =
        LAMPS.filter((lampara) => !lampara.shadow).length +
        3 +
        13 +
        TABLE_SPOTS.length +
        SCONCES.length +
        WALL_WASHES.length +
        1 +
        1
      const focosEsperados = LAMPS.filter((lampara) => lampara.shadow).length + 1

      const puntuales = luces.filter((luz) => luz.isPointLight)
      const focos = luces.filter((luz) => luz.isSpotLight)
      const hemisfericas = luces.filter((luz) => luz.isHemisphereLight)

      expect(puntuales).toHaveLength(puntualesEsperadas)
      expect(focos).toHaveLength(focosEsperados)
      expect(hemisfericas).toHaveLength(1)
    })
  })

  describe('contrato userData.baseIntensity', () => {
    it('toda luz guarda en baseIntensity su intensidad inicial, para el panel de afinado', () => {

      for (const luz of luces) {
        expect(luz.userData.baseIntensity).toBe(luz.intensity)
      }
    })
  })

  describe('capas: qué luces tocan el suelo (capa 1)', () => {
    it('las velas de mesa no habilitan la capa del suelo', () => {
      const candles = porKind(luces, 'candle')

      for (const candle of candles) {
        expect(tocaElSuelo(candle)).toBe(false)
      }
    })

    it('la trasbarra (shelf) no habilita la capa del suelo', () => {
      const shelf = porKind(luces, 'shelf')

      for (const glow of shelf) {
        expect(tocaElSuelo(glow)).toBe(false)
      }
    })

    it('la tira de la barra no habilita la capa del suelo (nada de charcos en el parquet)', () => {
      const tira = porKind(luces, 'tira')

      for (const wash of tira) {
        expect(tocaElSuelo(wash)).toBe(false)
      }
    })

    it('el resto de kinds (fill, lamp, accent, escenario, letrero) tocan el suelo', () => {
      const otrasKinds = luces.filter(
        (luz) => !['candle', 'shelf', 'tira'].includes(luz.userData.kind),
      )

      for (const luz of otrasKinds) {
        expect(tocaElSuelo(luz)).toBe(true)
      }
    })
  })

  describe('luces con sombra: presupuesto y configuración', () => {
    it('solo 3 luces proyectan sombra, y las 3 son SpotLight', () => {
      const conSombra = luces.filter((luz) => luz.castShadow)

      expect(conSombra).toHaveLength(3)
      for (const luz of conSombra) {
        expect(luz.isSpotLight).toBe(true)
      }
    })

    it('las 3 luces con sombra usan mapa 1024x1024 y tienen bias configurado (no el 0 por defecto)', () => {
      const conSombra = luces.filter((luz) => luz.castShadow)

      for (const luz of conSombra) {
        expect(luz.shadow.mapSize.x).toBe(1024)
        expect(luz.shadow.mapSize.y).toBe(1024)
        expect(luz.shadow.bias).not.toBe(0)
      }
    })

    it('las lámparas con sombra (barra y blackjack) usan bias -0.005', () => {
      const lamparasConSombra = porKind(luces, 'lamp').filter((luz) => luz.isSpotLight)

      expect(lamparasConSombra).toHaveLength(LAMPS.filter((l) => l.shadow).length)
      for (const luz of lamparasConSombra) {
        expect(luz.shadow.bias).toBe(-0.005)
      }
    })

    it('el foco principal del escenario usa bias -0.0001', () => {
      const focoEscenario = porKind(luces, 'escenario').find((luz) => luz.isSpotLight)

      expect(focoEscenario).toBeDefined()
      expect(focoEscenario.shadow.bias).toBe(-0.0001)
    })
  })

  describe('lámparas colgantes (kind lamp)', () => {
    it('cada entrada de LAMPS genera su luz, en su posición y con su intensidad', () => {
      const porLamp = porKind(luces, 'lamp')

      for (const lampara of LAMPS) {
        const luz = buscarPorXZ(porLamp, lampara.x, lampara.z)

        expect(luz).toBeDefined()
        expect(luz.position.y).toBe(lampara.y - 0.02)
        expect(luz.intensity).toBe(lampara.intensity)
      }
    })

    it('las lámparas shadow:true son SpotLight que apuntan al suelo justo debajo', () => {
      const porLamp = porKind(luces, 'lamp')

      for (const lampara of LAMPS.filter((l) => l.shadow)) {
        const luz = buscarPorXZ(porLamp, lampara.x, lampara.z)

        expect(luz.isSpotLight).toBe(true)
        expect(luz.castShadow).toBe(true)
        expect(luz.target.position.x).toBe(lampara.x)
        expect(luz.target.position.y).toBe(0)
        expect(luz.target.position.z).toBe(lampara.z)
      }
    })

    it('las lámparas sin shadow son PointLight sin proyectar sombra', () => {
      const porLamp = porKind(luces, 'lamp')

      for (const lampara of LAMPS.filter((l) => !l.shadow)) {
        const luz = buscarPorXZ(porLamp, lampara.x, lampara.z)

        expect(luz.isPointLight).toBe(true)
        expect(luz.castShadow).toBe(false)
      }
    })
  })

  describe('tira de luz de la barra (kind tira)', () => {
    it('son 13 puntuales solapadas: paso de 0.5m dentro de un alcance de 1.8', () => {
      const tira = porKind(luces, 'tira')

      const posicionesZ = tira.map((luz) => luz.position.z).sort((a, b) => a - b)

      const pasoEsperado = Array.from({ length: 13 }, (_, i) => -3 + i * 0.5)
      expect(posicionesZ).toEqual(pasoEsperado)
      for (const luz of tira) {
        expect(luz.distance).toBe(1.8)
        expect(luz.decay).toBe(2)
        expect(luz.distance).toBeGreaterThan(0.5)
      }
    })

    it('todas bajo el vuelo de la tapa, bañando los paneles desde arriba', () => {
      const tira = porKind(luces, 'tira')

      for (const luz of tira) {
        expect(luz.position.x).toBe(-ROOM.width / 2 + 2.14)
        expect(luz.position.y).toBe(0.82)
      }
    })
  })

  describe('trasbarra retroiluminada (kind shelf)', () => {
    it('reparte 3 puntuales cortas por el panel de la trasbarra, sin tocar el suelo', () => {
      const shelf = porKind(luces, 'shelf')

      const posicionesZ = shelf.map((luz) => luz.position.z).sort((a, b) => a - b)

      expect(posicionesZ).toEqual([-2.15, -0.35, 1.45])
      for (const luz of shelf) {
        expect(luz.position.x).toBe(-ROOM.width / 2 + 0.32)
        expect(luz.position.y).toBe(1.62)
        expect(luz.distance).toBe(2.6)
      }
    })
  })

  describe('velas de mesa (kind candle)', () => {
    it('una vela por mesa, con alcance corto para no rozar el suelo', () => {
      const candles = porKind(luces, 'candle')
      expect(candles).toHaveLength(TABLE_SPOTS.length)

      for (const [x, z] of TABLE_SPOTS) {
        const candle = buscarPorXZ(candles, x - 0.09, z + 0.06)

        expect(candle).toBeDefined()
        expect(candle.position.y).toBe(0.98)
        expect(candle.distance).toBe(1.35)
        expect(candle.castShadow).toBe(false)
      }
    })
  })

  describe('apliques de pared (kind accent)', () => {
    it('un brillo por aplique, desplazado hacia el salón según su orientación', () => {
      const accents = porKind(luces, 'accent')
      expect(accents).toHaveLength(SCONCES.length)

      for (const { x, z, rotY } of SCONCES) {
        const posX = x + Math.sin(rotY) * 0.3
        const posZ = z + Math.cos(rotY) * 0.3
        const accent = buscarPorXZ(accents, posX, posZ)

        expect(accent).toBeDefined()
        expect(accent.position.y).toBe(2.4)
      }
    })
  })

  describe('escenario (kind escenario): candilejas + foco', () => {
    it('las candilejas son una PointLight tenue sobre la cortina, sin sombra', () => {
      const footlights = porKind(luces, 'escenario').find((luz) => luz.isPointLight)

      expect(footlights).toBeDefined()
      expect(footlights.position.x).toBe(3.2)
      expect(footlights.position.y).toBe(1.35)
      expect(footlights.position.z).toBe(-4.55)
      expect(footlights.castShadow).toBe(false)
    })

    it('el foco principal apunta a la tarima y sí proyecta sombra', () => {
      const spot = porKind(luces, 'escenario').find((luz) => luz.isSpotLight)

      expect(spot).toBeDefined()
      expect(spot.position.x).toBe(3.2)
      expect(spot.position.y).toBe(ROOM.height - 0.2)
      expect(spot.position.z).toBe(-1.4)
      expect(spot.target.position.x).toBe(3.2)
      expect(spot.target.position.y).toBe(0.4)
      expect(spot.target.position.z).toBe(-ROOM.depth / 2 + 1.35)
      expect(spot.castShadow).toBe(true)
    })
  })

  describe('letrero (kind letrero)', () => {
    it('el resplandor del letrero no proyecta sombra', () => {
      const letrero = porKind(luces, 'letrero')

      expect(letrero).toHaveLength(1)
      expect(letrero[0].position.x).toBe(-ROOM.width / 2 + 0.7)
      expect(letrero[0].position.y).toBe(2.85)
      expect(letrero[0].position.z).toBe(0)
      expect(letrero[0].castShadow).toBe(false)
    })
  })
})
