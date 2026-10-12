import * as THREE from 'three'

const vidrio = (color, brillo = 0.15, roughness = 0.08) => {
  const mat = new THREE.MeshStandardMaterial({ color, roughness })
  mat.emissive.set(color)
  mat.emissiveIntensity = brillo
  mat.userData.brilloBase = brillo
  return mat
}
const mate = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.6 })

const V = {
  negro: vidrio('#26221a', 0.05),
  ambar: vidrio('#a35a14', 0.22),
  ambarOscuro: vidrio('#6b3410', 0.18),
  verde: vidrio('#44583a', 0.1),
  verdeClaro: vidrio('#8f8d52', 0.14),
  verdeBotella: vidrio('#2f4630', 0.08),
  claro: vidrio('#e8e2cc', 0.15, 0.05),
  azul: vidrio('#3d5a78', 0.1),
  burdeos: vidrio('#5c2634', 0.1),
}

export function setBrilloBotellas(mult) {
  for (const mat of Object.values(V)) {
    mat.emissiveIntensity = mat.userData.brilloBase * mult
  }
}
const E = {
  crema: mate('#e6dcc0'),
  negra: mate('#15130f'),
  cobre: mate('#7a3c14'),
}
const T = {
  negro: mate('#111111'),
  dorado: new THREE.MeshStandardMaterial({ color: '#c9a45c', metalness: 1, roughness: 0.45 }),
  verde: mate('#1e2e1a'),
  crema: mate('#d8cfae'),
}

function cuerpoRedondo(radio, hCuerpo, hTotal, material) {
  const cuello = radio * 0.32
  const puntos = [
    new THREE.Vector2(0.001, 0),
    new THREE.Vector2(radio, 0.004),
    new THREE.Vector2(radio, hCuerpo),
    new THREE.Vector2(radio * 0.62, hCuerpo + (hTotal - hCuerpo) * 0.45),
    new THREE.Vector2(cuello, hCuerpo + (hTotal - hCuerpo) * 0.72),
    new THREE.Vector2(cuello, hTotal - 0.012),
    new THREE.Vector2(cuello + 0.004, hTotal - 0.008),
    new THREE.Vector2(cuello + 0.004, hTotal),
  ]
  const mesh = new THREE.Mesh(new THREE.LatheGeometry(puntos, 14), material)
  mesh.castShadow = true
  return { mesh, cuello }
}

function cuerpoPanzudo(radio, hCuerpo, hTotal, material) {
  const cuello = radio * 0.28
  const puntos = [
    new THREE.Vector2(0.001, 0),
    new THREE.Vector2(radio * 0.72, 0.004),
    new THREE.Vector2(radio, hCuerpo * 0.42),
    new THREE.Vector2(radio * 0.82, hCuerpo),
    new THREE.Vector2(cuello, hCuerpo + (hTotal - hCuerpo) * 0.55),
    new THREE.Vector2(cuello, hTotal - 0.01),
    new THREE.Vector2(cuello + 0.004, hTotal),
  ]
  const mesh = new THREE.Mesh(new THREE.LatheGeometry(puntos, 14), material)
  mesh.castShadow = true
  return { mesh, cuello }
}

function cuerpoCuadrado(lado, hCuerpo, hTotal, material) {
  const grupo = new THREE.Group()
  const cuerpo = new THREE.Mesh(new THREE.BoxGeometry(lado, hCuerpo, lado), material)
  cuerpo.position.y = hCuerpo / 2
  cuerpo.castShadow = true
  grupo.add(cuerpo)

  const cuello = lado * 0.24
  const hHombro = (hTotal - hCuerpo) * 0.5
  const hombro = new THREE.Mesh(
    new THREE.CylinderGeometry(cuello, lado * 0.68, hHombro, 4),
    material,
  )
  hombro.rotation.y = Math.PI / 4
  hombro.position.y = hCuerpo + hHombro / 2
  grupo.add(hombro)

  const tubo = new THREE.Mesh(
    new THREE.CylinderGeometry(cuello, cuello, hTotal - hCuerpo - hHombro, 10),
    material,
  )
  tubo.position.y = hCuerpo + hHombro + (hTotal - hCuerpo - hHombro) / 2
  grupo.add(tubo)
  return { grupo, cuello }
}

export const CARTA = [
  {
    nombre: 'jack-daniels',
    forma: 'cuadrada',
    lado: 0.075,
    hCuerpo: 0.2,
    hTotal: 0.3,
    vidrio: V.negro,
    etiqueta: E.crema,
    etiquetaY: 0.11,
    tapon: T.negro,
  },
  {
    nombre: 'johnnie-walker',
    forma: 'cuadrada',
    lado: 0.07,
    hCuerpo: 0.19,
    hTotal: 0.31,
    vidrio: V.ambar,
    etiqueta: E.crema,
    etiquetaY: 0.1,
    tapon: T.dorado,
  },
  {
    nombre: 'cointreau',
    forma: 'cuadrada',
    lado: 0.08,
    hCuerpo: 0.13,
    hTotal: 0.22,
    vidrio: V.ambar,
    etiqueta: E.cobre,
    etiquetaY: 0.075,
    tapon: T.dorado,
  },
  {
    nombre: 'gordons',
    forma: 'redonda',
    radio: 0.038,
    hCuerpo: 0.2,
    hTotal: 0.3,
    vidrio: V.verde,
    etiqueta: E.crema,
    etiquetaY: 0.12,
    tapon: T.verde,
  },
  {
    nombre: 'campari',
    forma: 'redonda',
    radio: 0.04,
    hCuerpo: 0.17,
    hTotal: 0.28,
    vidrio: V.burdeos,
    etiqueta: E.crema,
    etiquetaY: 0.1,
    tapon: T.crema,
  },
  {
    nombre: 'chartreuse',
    forma: 'redonda',
    radio: 0.033,
    hCuerpo: 0.23,
    hTotal: 0.37,
    vidrio: V.verdeClaro,
    etiqueta: E.crema,
    etiquetaY: 0.14,
    tapon: T.verde,
  },
  {
    nombre: 'bacardi',
    forma: 'redonda',
    radio: 0.04,
    hCuerpo: 0.19,
    hTotal: 0.29,
    vidrio: V.claro,
    etiqueta: E.negra,
    etiquetaY: 0.11,
    tapon: T.negro,
  },
  {
    nombre: 'hennessy',
    forma: 'redonda',
    radio: 0.046,
    hCuerpo: 0.15,
    hTotal: 0.26,
    vidrio: V.ambarOscuro,
    etiqueta: E.crema,
    etiquetaY: 0.085,
    tapon: T.negro,
  },
  {
    nombre: 'pernod',
    forma: 'redonda',
    radio: 0.035,
    hCuerpo: 0.22,
    hTotal: 0.34,
    vidrio: V.verdeClaro,
    etiqueta: E.crema,
    etiquetaY: 0.13,
    tapon: T.crema,
  },
  {
    nombre: 'jameson',
    forma: 'redonda',
    radio: 0.039,
    hCuerpo: 0.21,
    hTotal: 0.32,
    vidrio: V.verdeBotella,
    etiqueta: E.crema,
    etiquetaY: 0.12,
    tapon: T.negro,
  },
  {
    nombre: 'courvoisier',
    forma: 'panzuda',
    radio: 0.052,
    hCuerpo: 0.12,
    hTotal: 0.23,
    vidrio: V.ambarOscuro,
    etiqueta: E.cobre,
    etiquetaY: 0.055,
    tapon: T.dorado,
  },
  {
    nombre: 'benedictine',
    forma: 'panzuda',
    radio: 0.048,
    hCuerpo: 0.14,
    hTotal: 0.27,
    vidrio: V.verdeBotella,
    etiqueta: E.crema,
    etiquetaY: 0.065,
    tapon: T.negro,
  },
  {
    nombre: 'bols-curacao',
    forma: 'redonda',
    radio: 0.036,
    hCuerpo: 0.21,
    hTotal: 0.33,
    vidrio: V.azul,
    etiqueta: E.crema,
    etiquetaY: 0.12,
    tapon: T.negro,
  },
  {
    nombre: 'martini-rossi',
    forma: 'redonda',
    radio: 0.032,
    hCuerpo: 0.24,
    hTotal: 0.36,
    vidrio: V.verde,
    etiqueta: E.crema,
    etiquetaY: 0.14,
    tapon: T.crema,
  },
  {
    nombre: 'dubonnet',
    forma: 'redonda',
    radio: 0.04,
    hCuerpo: 0.18,
    hTotal: 0.27,
    vidrio: V.burdeos,
    etiqueta: E.crema,
    etiquetaY: 0.1,
    tapon: T.negro,
  },
]

export function botella(receta) {
  const grupo = new THREE.Group()
  grupo.name = receta.nombre

  let cuelloR
  if (receta.forma === 'cuadrada') {
    const { grupo: cuerpo, cuello } = cuerpoCuadrado(
      receta.lado,
      receta.hCuerpo,
      receta.hTotal,
      receta.vidrio,
    )
    grupo.add(cuerpo)
    cuelloR = cuello
    const etiqueta = new THREE.Mesh(
      new THREE.BoxGeometry(0.004, receta.hCuerpo * 0.52, receta.lado * 0.72),
      receta.etiqueta,
    )
    etiqueta.position.set(receta.lado / 2, receta.etiquetaY, 0)
    grupo.add(etiqueta)
  } else {
    const forma = receta.forma === 'panzuda' ? cuerpoPanzudo : cuerpoRedondo
    const { mesh, cuello } = forma(receta.radio, receta.hCuerpo, receta.hTotal, receta.vidrio)
    grupo.add(mesh)
    cuelloR = cuello
    const etiqueta = new THREE.Mesh(
      new THREE.CylinderGeometry(
        receta.radio + 0.002,
        receta.radio + 0.002,
        receta.hCuerpo * 0.42,
        14,
      ),
      receta.etiqueta,
    )
    etiqueta.position.y = receta.etiquetaY
    grupo.add(etiqueta)
  }

  const tapon = new THREE.Mesh(
    new THREE.CylinderGeometry(cuelloR + 0.005, cuelloR + 0.005, 0.02, 10),
    receta.tapon,
  )
  tapon.position.y = receta.hTotal + 0.006
  grupo.add(tapon)
  return grupo
}

export function addBotellas(scene) {
  const grupo = new THREE.Group()
  grupo.name = 'botellas-reales'
  const backX = -8 + 0.35

  const prototipos = new Map()
  const botellaDe = (marca) => {
    if (!prototipos.has(marca)) prototipos.set(marca, botella(CARTA[marca]))
    return prototipos.get(marca).clone()
  }

  const anchura = (receta) => (receta.forma === 'cuadrada' ? receta.lado : receta.radio * 2)

  const sitios = []
  let z = -3.02
  let i = 0
  while (z < 2.3) {
    const marca = (i * 7) % CARTA.length
    const receta = CARTA[marca]
    const w = anchura(receta)
    sitios.push({ marca, zBotella: z + w / 2, n: i })
    z += w + 0.025 + ((i * 3) % 2) * 0.015
    i++
  }
  for (const { marca, zBotella, n } of sitios.slice(3, -3)) {
    const b = botellaDe(marca)
    b.position.set(backX + (((n * 13) % 5) - 2) * 0.008, 1.575, zBotella)
    b.rotation.y = (((n * 37) % 11) - 5) * 0.09
    grupo.add(b)
  }

  scene.add(grupo)
  return grupo
}
