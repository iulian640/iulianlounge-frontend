import * as THREE from 'three'

// BOTELLAS DE VERDAD EN LA TRASBARRA (2026-07-14): marcas reales de la era
// de la ley seca, cada una con su silueta reconocible, modeladas en
// procedural (lathe para las redondas, cajas para las cuadradas) y colocadas
// a contraluz del panel retroiluminado — sustituyen a los cilindros
// genéricos que ponía salon.js. Sin texto en las etiquetas: a esta escala la
// marca se lee por la forma, el vidrio y la banda de color.
//
// Leyes de rendimiento: materiales compartidos MeshStandard sin mapas (un
// único programa de shader para todas), cero luces nuevas.

// vidrios y bandas compartidos: pocas instancias, muchas botellas
const vidrio = (color, roughness = 0.15) => new THREE.MeshStandardMaterial({ color, roughness })
const mate = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.6 })

const V = {
  negro: vidrio('#191914'),
  ambar: vidrio('#7a4a1e'),
  ambarOscuro: vidrio('#2e1a10'),
  verde: vidrio('#2d4a2a'),
  verdeClaro: vidrio('#55683a'),
  verdeBotella: vidrio('#243a24'),
  rojo: vidrio('#7a1520'),
  claro: vidrio('#cfc9b4', 0.08),
}
const E = {
  crema: mate('#e6dcc0'),
  negra: mate('#15130f'),
  roja: mate('#8e2028'),
  cobre: mate('#7a3c14'),
}
const T = {
  negro: mate('#111111'),
  dorado: new THREE.MeshStandardMaterial({ color: '#c9a45c', metalness: 1, roughness: 0.45 }),
  verde: mate('#1e2e1a'),
  crema: mate('#d8cfae'),
}

// silueta redonda por revolución: cuerpo recto, hombro curvo, cuello y labio
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

// silueta cuadrada (Jack Daniel's, Johnnie Walker, Cointreau): caja con
// hombro piramidal y cuello corto
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
  hombro.rotation.y = Math.PI / 4 // el cono de 4 caras casa con la caja
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

// el catálogo: forma, medidas y colores de cada marca (era ley seca)
const CARTA = [
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
    vidrio: V.rojo,
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
]

function botella(receta) {
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
    // etiqueta: parche plano en la cara que mira al salón
    const etiqueta = new THREE.Mesh(
      new THREE.BoxGeometry(0.004, receta.hCuerpo * 0.52, receta.lado * 0.72),
      receta.etiqueta,
    )
    etiqueta.position.set(receta.lado / 2, receta.etiquetaY, 0)
    grupo.add(etiqueta)
  } else {
    const { mesh, cuello } = cuerpoRedondo(
      receta.radio,
      receta.hCuerpo,
      receta.hTotal,
      receta.vidrio,
    )
    grupo.add(mesh)
    cuelloR = cuello
    // etiqueta: banda que abraza el cuerpo
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

/**
 * Puebla la repisa baja de la trasbarra con las botellas de marca, a
 * contraluz del panel. Geometría compartida con salon.js: repisa a y=1.55
 * (tapa de 0.05 → las bases apoyan en 1.575), x del mueble backX y el hueco
 * sur libre para el gramófono.
 */
export function addBotellas(scene) {
  const grupo = new THREE.Group()
  grupo.name = 'botellas-reales'
  const backX = -8 + 0.35 // = -ROOM.width/2 + 0.35, la trasbarra de salon.js

  // 12 sitios: las 10 marcas + un par de repetidas, como en una barra real;
  // giro y descuadre fijos por sitio (vivido pero determinista, sin random)
  const SITIOS = [...CARTA, CARTA[0], CARTA[3]]
  for (let i = 0; i < SITIOS.length; i++) {
    const b = botella(SITIOS[i])
    const z = -2.85 + i * (5.1 / (SITIOS.length - 1))
    b.position.set(backX + (i % 3 === 1 ? 0.03 : -0.02), 1.575, z)
    b.rotation.y = ((i * 37) % 9) * 0.12 - 0.5 // etiquetas casi al frente, sin formar
    grupo.add(b)
  }
  scene.add(grupo)
  return grupo
}
