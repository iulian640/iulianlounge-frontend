import { beforeEach, describe, expect, it } from 'vitest'
import * as THREE from 'three'

import { addSalonLights } from '../lights'
import { LAMPS, ROOM, SCONCES, TABLE_SPOTS } from '../salon'

// capa del suelo (ver lights.js: tag() la habilita en toda luz salvo
// las etiquetadas 'candle' y 'shelf')
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
    // Arrange
    scene = new THREE.Scene()

    // Act
    addSalonLights(scene)
    luces = recogerLuces(scene)
  })

  describe('censo por userData.kind', () => {
    it('etiqueta cada luz de la escena con un kind reconocido', () => {
      // Arrange
      const kindsValidos = [
        'fill',
        'lamp',
        'shelf',
        'tira',
        'candle',
        'accent',
        'escenario',
        'letrero',
      ]

      // Act
      const kindsEncontrados = luces.map((luz) => luz.userData.kind)

      // Assert
      for (const kind of kindsEncontrados) {
        expect(kindsValidos).toContain(kind)
      }
    })

    it('reparte el número de luces por kind según el presupuesto de cada capa', () => {
      // Arrange
      const lamparasSinSombra = LAMPS.filter((lampara) => !lampara.shadow).length
      const lamparasConSombra = LAMPS.filter((lampara) => lampara.shadow).length

      // Act
      const porLamp = porKind(luces, 'lamp')

      // Assert
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
    })

    it('suma el total de luces de cada tipo three.js en la escena', () => {
      // Arrange: mismo presupuesto que el test anterior, agregado por tipo
      const puntualesEsperadas =
        LAMPS.filter((lampara) => !lampara.shadow).length + // lámparas colgantes sin sombra
        3 + // trasbarra (shelf)
        13 + // tira de la barra (bajo el vuelo de la tapa)
        TABLE_SPOTS.length + // velas de mesa
        SCONCES.length + // apliques de pared
        1 + // candilejas del escenario
        1 // letrero
      const focosEsperados = LAMPS.filter((lampara) => lampara.shadow).length + 1 // lámparas con sombra + foco de escenario

      // Act
      const puntuales = luces.filter((luz) => luz.isPointLight)
      const focos = luces.filter((luz) => luz.isSpotLight)
      const hemisfericas = luces.filter((luz) => luz.isHemisphereLight)

      // Assert
      expect(puntuales).toHaveLength(puntualesEsperadas)
      expect(focos).toHaveLength(focosEsperados)
      expect(hemisfericas).toHaveLength(1)
    })
  })

  describe('contrato userData.baseIntensity', () => {
    it('toda luz guarda en baseIntensity su intensidad inicial, para el panel de afinado', () => {
      // Arrange: las luces ya están montadas en el beforeEach

      // Act & Assert
      for (const luz of luces) {
        expect(luz.userData.baseIntensity).toBe(luz.intensity)
      }
    })
  })

  describe('capas: qué luces tocan el suelo (capa 1)', () => {
    it('las velas de mesa no habilitan la capa del suelo', () => {
      // Arrange
      const candles = porKind(luces, 'candle')

      // Act & Assert
      for (const candle of candles) {
        expect(tocaElSuelo(candle)).toBe(false)
      }
    })

    it('la trasbarra (shelf) no habilita la capa del suelo', () => {
      // Arrange
      const shelf = porKind(luces, 'shelf')

      // Act & Assert
      for (const glow of shelf) {
        expect(tocaElSuelo(glow)).toBe(false)
      }
    })

    it('la tira de la barra no habilita la capa del suelo (nada de charcos en el parquet)', () => {
      // Arrange
      const tira = porKind(luces, 'tira')

      // Act & Assert: dirección de arte — la luz cae por los paneles, el
      // suelo ni se entera
      for (const wash of tira) {
        expect(tocaElSuelo(wash)).toBe(false)
      }
    })

    it('el resto de kinds (fill, lamp, accent, escenario, letrero) tocan el suelo', () => {
      // Arrange
      const otrasKinds = luces.filter(
        (luz) => !['candle', 'shelf', 'tira'].includes(luz.userData.kind),
      )

      // Act & Assert
      for (const luz of otrasKinds) {
        expect(tocaElSuelo(luz)).toBe(true)
      }
    })
  })

  describe('luces con sombra: presupuesto y configuración', () => {
    it('solo 3 luces proyectan sombra, y las 3 son SpotLight', () => {
      // Arrange & Act
      const conSombra = luces.filter((luz) => luz.castShadow)

      // Assert
      expect(conSombra).toHaveLength(3)
      for (const luz of conSombra) {
        expect(luz.isSpotLight).toBe(true)
      }
    })

    it('las 3 luces con sombra usan mapa 1024x1024 y tienen bias configurado (no el 0 por defecto)', () => {
      // Arrange
      const conSombra = luces.filter((luz) => luz.castShadow)

      // Act & Assert
      for (const luz of conSombra) {
        expect(luz.shadow.mapSize.x).toBe(1024)
        expect(luz.shadow.mapSize.y).toBe(1024)
        expect(luz.shadow.bias).not.toBe(0)
      }
    })

    it('las lámparas con sombra (barra y blackjack) usan bias -0.005', () => {
      // Arrange
      const lamparasConSombra = porKind(luces, 'lamp').filter((luz) => luz.isSpotLight)

      // Act & Assert
      expect(lamparasConSombra).toHaveLength(LAMPS.filter((l) => l.shadow).length)
      for (const luz of lamparasConSombra) {
        expect(luz.shadow.bias).toBe(-0.005)
      }
    })

    it('el foco principal del escenario usa bias -0.0001', () => {
      // Arrange
      const focoEscenario = porKind(luces, 'escenario').find((luz) => luz.isSpotLight)

      // Act & Assert
      expect(focoEscenario).toBeDefined()
      expect(focoEscenario.shadow.bias).toBe(-0.0001)
    })
  })

  describe('lámparas colgantes (kind lamp)', () => {
    it('cada entrada de LAMPS genera su luz, en su posición y con su intensidad', () => {
      // Arrange
      const porLamp = porKind(luces, 'lamp')

      for (const lampara of LAMPS) {
        // Act
        const luz = buscarPorXZ(porLamp, lampara.x, lampara.z)

        // Assert
        expect(luz).toBeDefined()
        expect(luz.position.y).toBe(lampara.y - 0.02)
        expect(luz.intensity).toBe(lampara.intensity)
      }
    })

    it('las lámparas shadow:true son SpotLight que apuntan al suelo justo debajo', () => {
      // Arrange
      const porLamp = porKind(luces, 'lamp')

      for (const lampara of LAMPS.filter((l) => l.shadow)) {
        // Act
        const luz = buscarPorXZ(porLamp, lampara.x, lampara.z)

        // Assert
        expect(luz.isSpotLight).toBe(true)
        expect(luz.castShadow).toBe(true)
        expect(luz.target.position.x).toBe(lampara.x)
        expect(luz.target.position.y).toBe(0)
        expect(luz.target.position.z).toBe(lampara.z)
      }
    })

    it('las lámparas sin shadow son PointLight sin proyectar sombra', () => {
      // Arrange
      const porLamp = porKind(luces, 'lamp')

      for (const lampara of LAMPS.filter((l) => !l.shadow)) {
        // Act
        const luz = buscarPorXZ(porLamp, lampara.x, lampara.z)

        // Assert
        expect(luz.isPointLight).toBe(true)
        expect(luz.castShadow).toBe(false)
      }
    })
  })

  describe('tira de luz de la barra (kind tira)', () => {
    it('son 13 puntuales solapadas: paso de 0.5m dentro de un alcance de 1.8', () => {
      // Arrange
      const tira = porKind(luces, 'tira')

      // Act
      const posicionesZ = tira.map((luz) => luz.position.z).sort((a, b) => a - b)

      // Assert
      const pasoEsperado = Array.from({ length: 13 }, (_, i) => -3 + i * 0.5)
      expect(posicionesZ).toEqual(pasoEsperado)
      for (const luz of tira) {
        expect(luz.distance).toBe(1.8)
        expect(luz.decay).toBe(2)
        expect(luz.distance).toBeGreaterThan(0.5) // alcance > paso: por eso se solapan
      }
    })

    it('todas bajo el vuelo de la tapa, bañando los paneles desde arriba', () => {
      // Arrange
      const tira = porKind(luces, 'tira')

      // Act & Assert: la luz nace en la barra y cae — dirección de arte
      for (const luz of tira) {
        expect(luz.position.x).toBe(-ROOM.width / 2 + 2.14)
        expect(luz.position.y).toBe(0.82)
      }
    })
  })

  describe('trasbarra retroiluminada (kind shelf)', () => {
    it('reparte 3 puntuales cortas por el panel de la trasbarra, sin tocar el suelo', () => {
      // Arrange
      const shelf = porKind(luces, 'shelf')

      // Act
      const posicionesZ = shelf.map((luz) => luz.position.z).sort((a, b) => a - b)

      // Assert
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
      // Arrange
      const candles = porKind(luces, 'candle')
      expect(candles).toHaveLength(TABLE_SPOTS.length)

      for (const [x, z] of TABLE_SPOTS) {
        // Act
        const candle = buscarPorXZ(candles, x - 0.09, z + 0.06)

        // Assert
        expect(candle).toBeDefined()
        expect(candle.position.y).toBe(0.98)
        expect(candle.distance).toBe(1.35)
        expect(candle.castShadow).toBe(false)
      }
    })
  })

  describe('apliques de pared (kind accent)', () => {
    it('un brillo por aplique, desplazado hacia el salón según su orientación', () => {
      // Arrange
      const accents = porKind(luces, 'accent')
      expect(accents).toHaveLength(SCONCES.length)

      for (const { x, z, rotY } of SCONCES) {
        // Act
        const posX = x + Math.sin(rotY) * 0.3
        const posZ = z + Math.cos(rotY) * 0.3
        const accent = buscarPorXZ(accents, posX, posZ)

        // Assert
        expect(accent).toBeDefined()
        expect(accent.position.y).toBe(2.4)
      }
    })
  })

  describe('escenario (kind escenario): candilejas + foco', () => {
    it('las candilejas son una PointLight tenue sobre la cortina, sin sombra', () => {
      // Arrange & Act
      const footlights = porKind(luces, 'escenario').find((luz) => luz.isPointLight)

      // Assert
      expect(footlights).toBeDefined()
      expect(footlights.position.x).toBe(3.2)
      expect(footlights.position.y).toBe(1.35)
      expect(footlights.position.z).toBe(-4.55)
      expect(footlights.castShadow).toBe(false)
    })

    it('el foco principal apunta a la tarima y sí proyecta sombra', () => {
      // Arrange & Act
      const spot = porKind(luces, 'escenario').find((luz) => luz.isSpotLight)

      // Assert
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
      // Arrange & Act
      const letrero = porKind(luces, 'letrero')

      // Assert
      expect(letrero).toHaveLength(1)
      expect(letrero[0].position.x).toBe(-ROOM.width / 2 + 0.7)
      expect(letrero[0].position.y).toBe(2.85)
      expect(letrero[0].position.z).toBe(0)
      expect(letrero[0].castShadow).toBe(false)
    })
  })
})
