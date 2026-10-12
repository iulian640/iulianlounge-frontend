import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as THREE from 'three'

const { gltfLoadMock, fontLoadAsyncMock } = vi.hoisted(() => ({
  gltfLoadMock: vi.fn(),
  fontLoadAsyncMock: vi.fn(),
}))

vi.mock('three/addons/loaders/GLTFLoader.js', () => ({
  GLTFLoader: class {
    load(url, onLoad, onProgress, onError) {
      gltfLoadMock(url, onLoad, onProgress, onError)
    }
  },
}))

vi.mock('three/addons/loaders/FontLoader.js', () => ({
  FontLoader: class {
    loadAsync(url) {
      return fontLoadAsyncMock(url)
    }
  },
  Font: class {},
}))

const { loadProp } = await import('../models')
const { furnishSalon } = await import('../furnish')
const { addLetrero } = await import('../letrero')
const { addSmoke } = await import('../decor/smoke')
const { ROOM, TABLE_SPOTS } = await import('../salon')
const { BLACKJACK_TABLE, CROUPIER, PLAYER_SEAT, SEATS } = await import('../blackjackLayout')

function makeBoxMesh({ name = 'wood', size = [1, 1, 1], position = [0, 0, 0] } = {}) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(...size),
    new THREE.MeshStandardMaterial({ color: '#ffffff', name }),
  )
  mesh.position.set(...position)
  return mesh
}

function makeGltfScene(meshes = [makeBoxMesh()]) {
  const scene = new THREE.Group()
  for (const mesh of meshes) scene.add(mesh)
  return scene
}

function resolveNextLoad({ meshes, animations = [] } = {}) {
  gltfLoadMock.mockImplementationOnce((url, onLoad) =>
    onLoad({ scene: makeGltfScene(meshes), animations }),
  )
}

function makeFakeFont() {
  return {
    generateShapes: (text, size = 1) => {
      const shape = new THREE.Shape()
      shape.moveTo(0, 0)
      shape.lineTo(size, 0)
      shape.lineTo(size, size)
      shape.lineTo(0, size)
      shape.closePath()
      return [shape]
    },
  }
}

beforeEach(() => {
  gltfLoadMock.mockReset()
  fontLoadAsyncMock.mockReset()
  gltfLoadMock.mockImplementation((url, onLoad) => {
    onLoad({ scene: makeGltfScene(), animations: [] })
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('loadProp', () => {
  it('normaliza la escala según la altura objetivo (bounding box en Y)', async () => {
    resolveNextLoad({ meshes: [makeBoxMesh({ size: [1, 2, 1] })] })

    const prop = await loadProp('silla.glb', { height: 4 })

    expect(prop.children[0].scale.x).toBeCloseTo(2)
    expect(prop.children[0].scale.y).toBeCloseTo(2)
  })

  it('normaliza la escala según el footprint (diámetro en planta) cuando no hay altura', async () => {
    resolveNextLoad({ meshes: [makeBoxMesh({ size: [2, 0.1, 4] })] })

    const prop = await loadProp('alfombra.glb', { footprint: 2 })

    expect(prop.children[0].scale.x).toBeCloseTo(0.5)
  })

  it('apoya el modelo en el suelo (y=0) y lo centra en x/z tras escalar', async () => {
    resolveNextLoad({ meshes: [makeBoxMesh({ size: [1, 1, 1], position: [5, 3, -2] })] })

    const prop = await loadProp('objeto.glb', { height: 1 })

    const bounds = new THREE.Box3().setFromObject(prop)
    expect(bounds.min.y).toBeCloseTo(0)
    const center = bounds.getCenter(new THREE.Vector3())
    expect(center.x).toBeCloseTo(0)
    expect(center.z).toBeCloseTo(0)
  })

  it('aplica rotationX ANTES de medir, envolviendo el modelo en un pivote propio', async () => {
    resolveNextLoad({ meshes: [makeBoxMesh({ size: [1, 1, 1] })] })

    const prop = await loadProp('tumbado.glb', { height: 1, rotationX: Math.PI / 2 })

    const pivot = prop.children[0]
    expect(pivot.rotation.x).toBeCloseTo(Math.PI / 2)
    expect(pivot.children).toHaveLength(1)
  })

  it('retinta el material citado por nombre con un color plano', async () => {
    resolveNextLoad({ meshes: [makeBoxMesh({ name: 'wood' })] })

    const prop = await loadProp('mueble.glb', { height: 1, recolor: { wood: '#3a2417' } })

    const mesh = prop.children[0].children[0]
    expect(mesh.material.color.getHexString()).toBe('3a2417')
  })

  it('retinta con propiedades extra (metalness, roughness) cuando la regla es un objeto', async () => {
    resolveNextLoad({ meshes: [makeBoxMesh({ name: 'metal' })] })

    const prop = await loadProp('barra.glb', {
      height: 1,
      recolor: { metal: { color: '#c9a45c', metalness: 1, roughness: 0.35 } },
    })

    const mesh = prop.children[0].children[0]
    expect(mesh.material.color.getHexString()).toBe('c9a45c')
    expect(mesh.material.metalness).toBe(1)
    expect(mesh.material.roughness).toBe(0.35)
  })

  it('no toca el material de las mallas sin regla de retintado para su nombre', async () => {
    resolveNextLoad({ meshes: [makeBoxMesh({ name: 'sin-regla', size: [1, 1, 1] })] })

    const prop = await loadProp('objeto.glb', { height: 1, recolor: { otraCosa: '#000000' } })

    const mesh = prop.children[0].children[0]
    expect(mesh.material.color.getHexString()).toBe('ffffff')
  })

  it('descarta mallas con geometría corrupta (NaN) sin que revienten el escalado', async () => {
    const goodMesh = makeBoxMesh({ size: [1, 3, 1] })
    const corruptGeometry = new THREE.BufferGeometry()
    corruptGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array([NaN, 0, 0, 0, 0, 0, 0, 0, 0]), 3),
    )
    const corruptMesh = new THREE.Mesh(corruptGeometry, new THREE.MeshStandardMaterial())
    resolveNextLoad({ meshes: [goodMesh, corruptMesh] })
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const prop = await loadProp('con-fallo.glb', { height: 6 })

    expect(prop.children[0].scale.y).toBeCloseTo(2)
    expect(warnSpy).toHaveBeenCalledTimes(1)
    expect(corruptMesh.parent).toBeNull()
  })

  it('marca castShadow y receiveShadow en las mallas válidas', async () => {
    const mesh = makeBoxMesh()
    resolveNextLoad({ meshes: [mesh] })

    await loadProp('objeto.glb', { height: 1 })

    expect(mesh.castShadow).toBe(true)
    expect(mesh.receiveShadow).toBe(true)
  })

  it('reproduce el clip de animación cuyo nombre coincide con el patrón indicado', async () => {
    const clipWorking = new THREE.AnimationClip('Working', 1, [])
    const clipIdle = new THREE.AnimationClip('Idle', 1, [])
    resolveNextLoad({ meshes: [makeBoxMesh()], animations: [clipWorking, clipIdle] })
    const clipActionSpy = vi.spyOn(THREE.AnimationMixer.prototype, 'clipAction')

    const prop = await loadProp('camarero.glb', { height: 1, animate: 'Idle' })

    expect(clipActionSpy).toHaveBeenCalledWith(clipIdle)
    expect(typeof prop.userData.update).toBe('function')
    expect(() => prop.userData.update(0.1)).not.toThrow()
  })

  it('si el patrón no coincide con ningún clip, usa el primero como resguardo', async () => {
    const clipA = new THREE.AnimationClip('Walk', 1, [])
    const clipB = new THREE.AnimationClip('Run', 1, [])
    resolveNextLoad({ meshes: [makeBoxMesh()], animations: [clipA, clipB] })
    const clipActionSpy = vi.spyOn(THREE.AnimationMixer.prototype, 'clipAction')

    await loadProp('extra.glb', { height: 1, animate: 'Idle' })

    expect(clipActionSpy).toHaveBeenCalledWith(clipA)
  })

  it('no marca userData.update si el modelo no trae ningún clip de animación', async () => {
    resolveNextLoad({ meshes: [makeBoxMesh()], animations: [] })

    const prop = await loadProp('estatico.glb', { height: 1, animate: 'Idle' })

    expect(prop.userData.update).toBeUndefined()
  })

  it('asigna al prop el nombre del archivo glb, sin ruta ni extensión', async () => {
    resolveNextLoad({ meshes: [makeBoxMesh()] })

    const prop = await loadProp('/models/hunt/grand-piano.glb', { height: 1 })

    expect(prop.name).toBe('grand-piano')
  })

  it('aplica rotationY al grupo final del prop', async () => {
    resolveNextLoad({ meshes: [makeBoxMesh()] })

    const prop = await loadProp('silla.glb', { height: 1, rotationY: 1.2 })

    expect(prop.rotation.y).toBeCloseTo(1.2)
  })

  it('propaga el error de carga como rechazo de la promesa, sin reventar el proceso', async () => {
    const boom = new Error('404 en el CDN')
    gltfLoadMock.mockImplementationOnce((url, onLoad, onProgress, onError) => onError(boom))

    await expect(loadProp('inexistente.glb', { height: 1 })).rejects.toBe(boom)
  })
})

describe('furnishSalon', () => {
  it('coloca tres butacas chesterfield alrededor de cada mesa del manifest, a 0.95 m de la mesa', async () => {
    const scene = new THREE.Scene()

    await furnishSalon(scene, [])

    const chesterfields = scene.children.filter((prop) => prop.name === 'chesterfield')
    expect(chesterfields).toHaveLength(TABLE_SPOTS.length * 3)
    for (const chair of chesterfields) {
      const distances = TABLE_SPOTS.map(([x, z]) =>
        Math.hypot(chair.position.x - x, chair.position.z - z),
      )
      expect(Math.min(...distances)).toBeCloseTo(0.95, 2)
    }
  })

  it('cada butaca mira a su mesa (el frente de chesterfield.glb es su +X, medido en el GLB)', async () => {
    const scene = new THREE.Scene()

    await furnishSalon(scene, [])

    const chesterfields = scene.children.filter((prop) => prop.name === 'chesterfield')
    for (const chair of chesterfields) {
      const [tableX, tableZ] = TABLE_SPOTS.reduce((best, spot) =>
        Math.hypot(chair.position.x - spot[0], chair.position.z - spot[1]) <
        Math.hypot(chair.position.x - best[0], chair.position.z - best[1])
          ? spot
          : best,
      )
      const toTable = new THREE.Vector2(tableX - chair.position.x, tableZ - chair.position.z).normalize()
      const front = new THREE.Vector2(Math.cos(chair.rotation.y), -Math.sin(chair.rotation.y))
      expect(front.dot(toTable)).toBeCloseTo(1, 3)
    }
  })

  it('los taburetes miran a la barra, con el respaldo hacia la sala', async () => {
    const scene = new THREE.Scene()

    await furnishSalon(scene, [])

    const stools = scene.children.filter((prop) => prop.name === 'barstool')
    expect(stools.length).toBeGreaterThan(0)
    for (const stool of stools) {
      const front = new THREE.Vector2(-Math.sin(stool.rotation.y), -Math.cos(stool.rotation.y))
      expect(front.dot(new THREE.Vector2(-1, 0))).toBeCloseTo(1, 3)
    }
  })

  it('places a croupier behind the blackjack table, facing the player seat', async () => {
    const scene = new THREE.Scene()

    await furnishSalon(scene, [])

    const croupier = scene.children.find((prop) => prop.name === 'croupier')
    expect(croupier).toBeDefined()
    expect(croupier.position.x).toBeCloseTo(CROUPIER.at[0], 6)
    expect(croupier.position.z).toBeCloseTo(CROUPIER.at[2], 6)
    expect(croupier.rotation.y).toBeCloseTo(CROUPIER.yaw, 6)
  })

  it('loads the croupier as a second barman.glb instance with another tint', async () => {
    const scene = new THREE.Scene()
    gltfLoadMock.mockClear()

    await furnishSalon(scene, [])

    const barmanLoads = gltfLoadMock.mock.calls.filter(([url]) => /barman\.glb/.test(url))
    expect(barmanLoads).toHaveLength(2)
  })

  it('places three blackjack seats from barstool.glb, the player one at the seat pose', async () => {
    const scene = new THREE.Scene()

    await furnishSalon(scene, [])

    const seats = scene.children.filter((prop) => prop.name === 'blackjack-seat')
    expect(seats).toHaveLength(SEATS.length)
    const playerSeat = seats.find(
      (seat) =>
        Math.abs(seat.position.x - PLAYER_SEAT.at[0]) < 1e-6 &&
        Math.abs(seat.position.z - PLAYER_SEAT.at[2]) < 1e-6,
    )
    expect(playerSeat).toBeDefined()
  })

  it('makes the blackjack seats face the table with their front on -Z', async () => {
    const scene = new THREE.Scene()

    await furnishSalon(scene, [])

    for (const seat of scene.children.filter((prop) => prop.name === 'blackjack-seat')) {
      const front = new THREE.Vector2(-Math.sin(seat.rotation.y), -Math.cos(seat.rotation.y))
      const toTable = new THREE.Vector2(
        BLACKJACK_TABLE.at[0] - seat.position.x,
        BLACKJACK_TABLE.at[2] - seat.position.z,
      ).normalize()
      expect(front.dot(toTable)).toBeCloseTo(1, 3)
    }
  })

  it('sitúa el guardarropa junto a la entrada, en la posición fija del manifest', async () => {
    const scene = new THREE.Scene()

    await furnishSalon(scene, [])

    const coatRack = scene.children.find((prop) => prop.name === 'coatRackStanding')
    expect(coatRack).toBeDefined()
    expect(coatRack.position.x).toBeCloseTo(1.6)
    expect(coatRack.position.y).toBeCloseTo(0)
    expect(coatRack.position.z).toBeCloseTo(4.7)
  })

  it('mantiene todas las posiciones del manifest dentro de los límites del salón (ROOM)', async () => {
    const scene = new THREE.Scene()

    await furnishSalon(scene, [])

    expect(scene.children.length).toBeGreaterThan(0)
    for (const prop of scene.children) {
      expect(Math.abs(prop.position.x)).toBeLessThanOrEqual(ROOM.width / 2)
      expect(Math.abs(prop.position.z)).toBeLessThanOrEqual(ROOM.depth / 2)
    }
  })

  it('hace girar los ventiladores de techo en cada frame de actualización', async () => {
    const scene = new THREE.Scene()
    const updatables = []
    await furnishSalon(scene, updatables)
    const fans = scene.children.filter((prop) => prop.name === 'ceiling-fan')
    expect(fans).toHaveLength(2)

    for (const update of updatables) update(1)

    for (const fan of fans) {
      expect(fan.children[0].rotation.y).toBeCloseTo(1.1)
    }
  })

  it('registers the barman and croupier animations (userData.update) as updatables', async () => {
    gltfLoadMock.mockImplementation((url, onLoad) => {
      const animado = /barman\.glb/.test(url)
      const animations = animado ? [new THREE.AnimationClip('Idle', 1, [])] : []
      onLoad({ scene: makeGltfScene(), animations })
    })
    const scene = new THREE.Scene()
    const updatables = []

    await furnishSalon(scene, updatables)

    expect(updatables).toHaveLength(4)
    for (const update of updatables) {
      expect(() => update(0.016)).not.toThrow()
    }
  })

  it('no revienta si una carga falla: registra el error y coloca el resto del manifest', async () => {
    const boom = new Error('red caída')
    gltfLoadMock.mockImplementation((url, onLoad, onProgress, onError) => {
      if (url.includes('gramophone')) {
        onError(boom)
        return
      }
      onLoad({ scene: makeGltfScene(), animations: [] })
    })
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const scene = new THREE.Scene()

    await expect(furnishSalon(scene, [])).resolves.toBeUndefined()
    expect(errorSpy).toHaveBeenCalledWith('[furnish]', boom)
    expect(scene.children.some((prop) => prop.name === 'gramophone')).toBe(false)
    expect(scene.children.length).toBeGreaterThan(0)
  })
})

describe('addLetrero', () => {
  it('monta el texto "IULIAN\'S" con el nombre que usa el panel de afinado para su brillo', async () => {
    fontLoadAsyncMock.mockResolvedValue(makeFakeFont())
    const scene = new THREE.Scene()

    await addLetrero(scene)

    const text = scene.children.find((o) => o.name === 'letrero-texto')
    expect(text).toBeDefined()
    expect(text.material.color.getHexString()).toBe('000000')
    expect(text.material.emissive.getHexString()).toBe('ffc887')
    expect(text.material.emissiveIntensity).toBeCloseTo(0.85)
  })

  it('coloca el letrero en la pared oeste, girado hacia la sala', async () => {
    fontLoadAsyncMock.mockResolvedValue(makeFakeFont())
    const scene = new THREE.Scene()

    await addLetrero(scene)

    const text = scene.children.find((o) => o.name === 'letrero-texto')
    expect(text.rotation.y).toBeCloseTo(Math.PI / 2)
    expect(text.position.x).toBeCloseTo(-ROOM.width / 2 + 0.18)
    expect(text.position.z).toBeCloseTo(0)
  })

  it('monta la marquesina de bombillas como InstancedMesh con emissive fijo a 2.2, ajeno al mando del texto', async () => {
    fontLoadAsyncMock.mockResolvedValue(makeFakeFont())
    const scene = new THREE.Scene()

    await addLetrero(scene)

    const text = scene.children.find((o) => o.name === 'letrero-texto')
    const bulbs = scene.children.find((o) => o.name === 'letrero-bombillas')
    expect(bulbs.isInstancedMesh).toBe(true)
    expect(bulbs.count).toBeGreaterThan(0)
    expect(bulbs.material.emissiveIntensity).toBe(2.2)
    expect(bulbs.castShadow).toBe(false)
    expect(bulbs.receiveShadow).toBe(false)

    text.material.emissiveIntensity = 0.1
    expect(bulbs.material.emissiveIntensity).toBe(2.2)
  })

  it('si la tipografía Limelight no está disponible, cae a la helvetiker de reserva sin romper el arranque', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    fontLoadAsyncMock
      .mockRejectedValueOnce(new Error('404 limelight'))
      .mockResolvedValueOnce(makeFakeFont())
    const scene = new THREE.Scene()

    await addLetrero(scene)

    expect(fontLoadAsyncMock).toHaveBeenNthCalledWith(1, '/fonts/limelight.typeface.json')
    expect(fontLoadAsyncMock).toHaveBeenNthCalledWith(2, '/fonts/helvetiker_bold.typeface.json')
    expect(warnSpy).toHaveBeenCalledTimes(1)
    expect(scene.children.find((o) => o.name === 'letrero-texto')).toBeDefined()
  })

  it('añade marco, panel trasero, texto y bombillas: las cuatro piezas del letrero', async () => {
    fontLoadAsyncMock.mockResolvedValue(makeFakeFont())
    const scene = new THREE.Scene()

    await addLetrero(scene)

    expect(scene.children).toHaveLength(4)
  })
})

describe('addSmoke', () => {
  it('crea una InstancedMesh con 110 volutas por punta de puro y la añade a la escena', () => {
    const scene = new THREE.Scene()
    const tips = [new THREE.Vector3(1, 0.9, 2), new THREE.Vector3(-1, 0.9, -2)]

    const smoke = addSmoke(scene, tips)

    expect(smoke.mesh.isInstancedMesh).toBe(true)
    expect(smoke.mesh.count).toBe(220)
    expect(scene.children).toContain(smoke.mesh)
  })

  it('queda fuera de la captura de entorno y del frustum culling (las posiciones viven en el shader)', () => {
    const scene = new THREE.Scene()
    const tips = [new THREE.Vector3(0, 0.9, 0)]

    const smoke = addSmoke(scene, tips)

    expect(smoke.mesh.userData.hideFromEnv).toBe(true)
    expect(smoke.mesh.frustumCulled).toBe(false)
    expect(smoke.mesh.renderOrder).toBe(10)
  })

  it('expone opacity y scaleMul como uniforms en vivo para que el panel de afinado los mueva', () => {
    const scene = new THREE.Scene()
    const tips = [new THREE.Vector3(0, 0.9, 0)]

    const smoke = addSmoke(scene, tips)

    expect(smoke.opacity.value).toBeCloseTo(0.005)
    expect(smoke.scaleMul.value).toBeCloseTo(2.5)

    smoke.opacity.value = 0.02
    expect(smoke.opacity.value).toBeCloseTo(0.02)
  })

  it('update(delta) no hace nada por frame: la animación la lleva el nodo time del shader', () => {
    const scene = new THREE.Scene()
    const smoke = addSmoke(scene, [new THREE.Vector3(0, 0.9, 0)])

    expect(smoke.update(0.016)).toBeUndefined()
  })

  it('con cero puntas de puro crea la InstancedMesh sin instancias, sin reventar', () => {
    const scene = new THREE.Scene()

    const smoke = addSmoke(scene, [])

    expect(smoke.mesh.count).toBe(0)
  })
})
