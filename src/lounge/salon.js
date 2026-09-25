import * as THREE from 'three'

// El Salón en volúmenes placeholder (IUL-27).
// Escala tomada del croquis: la barra mide ~7 m. Nada de aquí es asset final.

export const ROOM = { width: 16, depth: 11, height: 3.6 }

// posiciones de las mesas — las consumen furnish.js (muebles) y las lámparas
export const TABLE_SPOTS = [
  [-1.5, 1.8],
  [1.2, -0.6],
  [-3.2, -1.6],
]

// apliques de pared: posición y hacia dónde miran (los consume lights.js)
export const SCONCES = [
  { x: 7.88, z: -1.3, rotY: -Math.PI / 2 }, // pared este
  { x: 7.88, z: 1.3, rotY: -Math.PI / 2 },
  { x: -1.5, z: 5.38, rotY: Math.PI }, // flancos de la puerta
  { x: 1.5, z: 5.38, rotY: Math.PI },
]

// baños de pared: luz tenue arriba de la pared este, entre cada aplique y su esquina. Que el perímetro
// no sea negro plano sin comerse el contraste de las mesas (la consume lights.js, kind 'pared')
export const WALL_WASHES = [
  { x: 7.6, y: 2.95, z: -3.05 },
  { x: 7.6, y: 2.95, z: 3.05 },
]

// posiciones de las lámparas — las consume también lights.js
// (intensidades = mezcla final de Iulian: lámparas al 25%, la luz la ponen
// la trasbarra, el letrero y las velas)
// nicho del expositor de sombreros en la pared norte (lo consume
// decor/hatDisplay; buildShell abre el hueco a su medida)
export const NICHE = { x: -4.2, width: 1.96, bottom: 0.32, height: 2.3 }

export const LAMPS = [
  { x: -6.35, y: 2.45, z: -1.8, intensity: 2.75, shadow: true }, // barra
  { x: -6.35, y: 2.45, z: 1.8, intensity: 2.75 },
  ...TABLE_SPOTS.map(([x, z]) => ({ x, y: 2.1, z, intensity: 2.75 })),
  { x: 4.6, y: 2.25, z: 2.2, intensity: 3, shadow: true }, // blackjack
]

// texturas CC0 de Poly Haven (ver docs/CREDITS.md)
const textureLoader = new THREE.TextureLoader()

function woodTexture(url, repeatX, repeatY, isColor = true) {
  const texture = textureLoader.load(url)
  if (isColor) texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(repeatX, repeatY)
  return texture
}

// OJO envMapIntensity: en el renderer WebGPU solo se aplica si el material
// lleva .envMap PROPIO; con scene.environment (nuestro caso) manda
// scene.environmentIntensity — el mando 'reflejos' del panel — para TODOS
// los materiales (verificado en three 0.185, MaterialProperties.js:21-24).
// Los envMapIntensity que había repartidos por aquí eran inertes: fuera.
export const materials = {
  // parquet de espiga con laca (clearcoat): la madera sola apenas refleja
  // de frente por física; la capa de barniz sí, y es regulable. El relieve
  // (normalMap TAMBIÉN en la laca, con los dos relieves altos) rompe el
  // reflejo por la veta — sin él parece agua, no suelo. Mezcla de Iulian de
  // la pasada de brillos (2026-07-14, panel 'Suelo'): barniz a tope con
  // difuminado medio (0.33) — reflejos presentes pero no espejo — sobre
  // base semi-mate (0.67) con media veta
  woodFloor: new THREE.MeshPhysicalMaterial({
    color: '#837063',
    map: woodTexture('/textures/floor-parquet-diff.jpg', 8, 5.5),
    roughness: 0.67,
    normalMap: woodTexture('/textures/floor-parquet-normal.jpg', 8, 5.5, false),
    normalScale: new THREE.Vector2(2, 2),
    clearcoat: 1,
    clearcoatRoughness: 0.33,
    clearcoatNormalMap: woodTexture('/textures/floor-parquet-normal.jpg', 8, 5.5, false),
    clearcoatNormalScale: new THREE.Vector2(1.6, 1.6),
    anisotropy: 0.5,
    anisotropyRotation: Math.PI / 4,
  }),
  // la tapa y la carpintería del mostrador: madera clara lacada — mezcla
  // FINAL de Iulian (pasada de brillos 2026-07-14): base mate (roughness 1,
  // el carácter no lo pone la madera) y todo el reflejo en la laca casi
  // espejo (clearcoatRoughness 0.03) rota por el relieve de la propia laca
  // a tope (clearcoatNormalScale 2) — brillos definidos que ondulan con la
  // veta, sin el velo lechoso del clearcoat rugoso de antes. El clearcoat
  // es acromático en three (F0 fijo 0.04, no se tinta): su rugosidad era el
  // mando anti-plástico. Sin anisotropía (los reflejos estirados a lo largo
  // del mostrador no gustaron — y de paso el shader se ahorra el lóbulo
  // aniso) y sin mapa de rugosidad (con la base mate no aporta)
  barWood: new THREE.MeshPhysicalMaterial({
    color: '#c2b4ad',
    map: woodTexture('/textures/bar-wood-diff.jpg', 1, 3.5),
    roughness: 1,
    normalMap: woodTexture('/textures/bar-wood-normal.jpg', 1, 3.5, false),
    normalScale: new THREE.Vector2(1, 1),
    clearcoat: 1,
    clearcoatRoughness: 0.03,
    clearcoatNormalMap: woodTexture('/textures/bar-wood-normal.jpg', 1, 3.5, false),
    clearcoatNormalScale: new THREE.Vector2(2, 2),
  }),
  woodDark: new THREE.MeshStandardMaterial({ color: '#241811', roughness: 0.8 }),
  // madera noble CON VETA para la carpintería que se mira de cerca (puerta,
  // cornisa, pilastras, zócalo): la misma textura de la barra teñida oscura
  // — el color multiplica al mapa, por eso es más claro que woodDark.
  // Physical desde la pasada de brillos 2026-07-14 con la mezcla de Iulian
  // (panel 'Paredes (madera)'): base mate con laca satinada (0.55/0.8) y
  // relieves a tope. Sigue siendo UN programa, pero de los gordos: si la
  // compilación del arranque crece, este es el primer sospechoso (ley 12)
  woodTrim: new THREE.MeshPhysicalMaterial({
    color: '#47392e',
    map: woodTexture('/textures/bar-wood-diff.jpg', 1.2, 1.2),
    normalMap: woodTexture('/textures/bar-wood-normal.jpg', 1.2, 1.2, false),
    normalScale: new THREE.Vector2(2, 2),
    roughness: 1,
    clearcoat: 0.55,
    clearcoatRoughness: 0.8,
    clearcoatNormalMap: woodTexture('/textures/bar-wood-normal.jpg', 1.2, 1.2, false),
    clearcoatNormalScale: new THREE.Vector2(2, 2),
  }),
  wall: new THREE.MeshStandardMaterial({ color: '#10201d', roughness: 0.95 }),
  ceiling: new THREE.MeshStandardMaterial({ color: '#0a1311', roughness: 1 }),
  felt: new THREE.MeshStandardMaterial({ color: '#172925', roughness: 1 }),
  brass: new THREE.MeshStandardMaterial({
    color: '#c9a45c',
    metalness: 1,
    roughness: 0.5,
  }),
  velvet: new THREE.MeshStandardMaterial({ color: '#3d1b20', roughness: 1 }),
  leather: new THREE.MeshStandardMaterial({ color: '#4a2c1e', roughness: 0.7 }),
  // tablas de madera del escenario — MATE como el suelo: sin reflejos
  // definidos, la luz se esparce en charco suave. Standard, no Physical: la
  // anisotropía 0.3 era imperceptible en madera mate y el Physical+aniso
  // formaba él solo un programa de shader de los gordos (coste fijo en la
  // compilación del arranque)
  stageWood: new THREE.MeshStandardMaterial({
    color: '#96826c',
    map: woodTexture('/textures/bar-wood-diff.jpg', 2.2, 1.5),
    normalMap: woodTexture('/textures/bar-wood-normal.jpg', 2.2, 1.5, false),
    normalScale: new THREE.Vector2(0.7, 0.7),
    roughness: 1,
  }),
  shade: new THREE.MeshStandardMaterial({
    color: '#1c2a26',
    roughness: 0.6,
    emissive: '#ffb46b',
    emissiveIntensity: 0.15,
  }),
  bulb: new THREE.MeshStandardMaterial({
    color: '#ffd9a0',
    emissive: '#ffb46b',
    emissiveIntensity: 2.2,
  }),
  marquee: new THREE.MeshStandardMaterial({
    color: '#ffd9a0',
    emissive: '#ffc887',
    emissiveIntensity: 1.4,
  }),
}

// la carpintería del frente del mostrador: clon de la caoba de la tapa
// (mismo programa de shader, cero nuevos) con su propia mezcla — mezcla de
// Iulian 2026-07-14: laca satinada (barniz 0.3, difuminado 0.8) para que la
// tira de luz se funda en un lavado suave por los paneles en vez de clavar
// puntos calientes como en la laca espejo de la tapa, y relieve a tope
materials.barFront = materials.barWood.clone()
materials.barFront.color.set('#655c58')
materials.barFront.clearcoat = 0.3
materials.barFront.clearcoatRoughness = 0.8
materials.barFront.clearcoatNormalScale.setScalar(2)
materials.barFront.normalScale.setScalar(2)

// el armazón del mostrador tras la carpintería: la misma mezcla satinada
// del frente, mucho más oscura para que paneles y pilastras destaquen
materials.barCabinet = materials.barFront.clone()
materials.barCabinet.color.set('#322c29')

// la tira de luz del pie de la barra: cinta emissive escondida tras el
// faldón — desde el salón solo se ve la línea de luz que escapa. El charco
// del parquet lo ponen sus puntuales (lights.js, kind 'tira'); el mando
// 'tira barra' del panel regula ambas a la vez. Sin mapas: comparte programa
// con bulb/marquee (ley 6)
materials.tiraBarra = new THREE.MeshStandardMaterial({
  color: '#1a0f08',
  emissive: '#ff9d5c',
  emissiveIntensity: 1.2,
})

function box(width, height, depth, material, x, y, z) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material)
  mesh.position.set(x, y, z)
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}

function cylinder(radius, height, material, x, y, z, radialSegments = 24) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, height, radialSegments),
    material,
  )
  mesh.position.set(x, y, z)
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}

function buildShell(salon) {
  const { width: w, depth: d, height: h } = ROOM
  const t = 0.2 // grosor de muros

  const floor = box(w, t, d, materials.woodFloor, 0, -t / 2, 0)
  floor.castShadow = false
  // el suelo vive SOLO en la capa 1: las velas (capa 0) no lo tocan — ni
  // iluminación ni reflejos; el resto de luces habilitan la capa 1
  floor.layers.set(1)
  salon.add(floor)

  const ceiling = box(w, t, d, materials.ceiling, 0, h + t / 2, 0)
  ceiling.castShadow = false
  salon.add(ceiling)

  // norte con hueco para el expositor de sombreros empotrado (decor/hatDisplay):
  // cuatro segmentos alrededor del nicho, misma técnica que la puerta sur
  const nicheLeft = NICHE.x - NICHE.width / 2
  const nicheRight = NICHE.x + NICHE.width / 2
  const nicheTop = NICHE.bottom + NICHE.height
  salon.add(box(nicheLeft + w / 2, h, t, materials.wall, (nicheLeft - w / 2) / 2, h / 2, -d / 2))
  salon.add(box(w / 2 - nicheRight, h, t, materials.wall, (nicheRight + w / 2) / 2, h / 2, -d / 2))
  salon.add(box(NICHE.width, NICHE.bottom, t, materials.wall, NICHE.x, NICHE.bottom / 2, -d / 2))
  salon.add(
    box(
      NICHE.width,
      h - nicheTop,
      t,
      materials.wall,
      NICHE.x,
      nicheTop + (h - nicheTop) / 2,
      -d / 2,
    ),
  )
  salon.add(box(t, h, d, materials.wall, -w / 2, h / 2, 0)) // oeste (la barra)
  salon.add(box(t, h, d, materials.wall, w / 2, h / 2, 0)) // este

  // sur con hueco de entrada (la puerta escondida)
  const doorWidth = 1.4
  const doorHeight = 2.2
  const sideWidth = (w - doorWidth) / 2
  salon.add(box(sideWidth, h, t, materials.wall, -(doorWidth + sideWidth) / 2, h / 2, d / 2))
  salon.add(box(sideWidth, h, t, materials.wall, (doorWidth + sideWidth) / 2, h / 2, d / 2))
  salon.add(
    box(doorWidth, h - doorHeight, t, materials.wall, 0, doorHeight + (h - doorHeight) / 2, d / 2),
  )

  // zócalo de madera CON VETA (woodTrim, como el del sur/oeste que monta
  // decor/architecture — antes iba en woodDark plano y desentonaba) y
  // remate de latón; en la norte va partido en dos tramos para respetar el
  // nicho del expositor. Los extremos se empotran 2 cm en el muro vecino
  // para que las esquinas queden selladas, sin huecos
  const skirtLeftWidth = nicheLeft - (-w / 2 + 0.08)
  const skirtLeftX = -w / 2 + 0.08 + skirtLeftWidth / 2
  const skirtRightWidth = w / 2 - 0.08 - nicheRight
  const skirtRightX = nicheRight + skirtRightWidth / 2
  salon.add(box(skirtLeftWidth, 0.9, 0.06, materials.woodTrim, skirtLeftX, 0.45, -d / 2 + 0.13))
  salon.add(box(skirtLeftWidth, 0.03, 0.07, materials.brass, skirtLeftX, 0.92, -d / 2 + 0.13))
  salon.add(box(skirtRightWidth, 0.9, 0.06, materials.woodTrim, skirtRightX, 0.45, -d / 2 + 0.13))
  salon.add(box(skirtRightWidth, 0.03, 0.07, materials.brass, skirtRightX, 0.92, -d / 2 + 0.13))
  salon.add(box(0.06, 0.9, d - 0.16, materials.woodTrim, w / 2 - 0.13, 0.45, 0))
  salon.add(box(0.07, 0.03, d - 0.16, materials.brass, w / 2 - 0.13, 0.92, 0))

  // cuadros con marco de latón en la pared este
  for (const z of [-2.6, 0, 2.6]) {
    salon.add(box(0.05, 1.0, 0.75, materials.brass, w / 2 - 0.14, 1.9, z))
    salon.add(box(0.06, 0.88, 0.63, materials.velvet, w / 2 - 0.15, 1.9, z))
  }
}

function buildBar(salon) {
  const barLength = 7
  // mostrador adelantado: deja un pasillo de ~60 cm para el camarero
  const barX = -ROOM.width / 2 + 1.45

  // mostrador con tapa de madera noble y vivo de latón en el canto
  salon.add(box(0.65, 1.05, barLength, materials.barCabinet, barX, 0.525, 0))
  salon.add(box(0.75, 0.05, barLength + 0.1, materials.barWood, barX, 1.075, 0))
  salon.add(box(0.03, 0.03, barLength + 0.1, materials.brass, barX + 0.37, 1.075, 0))

  const backX = -ROOM.width / 2 + 0.35
  // el mueble de la trasbarra: la misma familia lacada del mostrador (en
  // woodDark plano parecía un bloque sin hacer) — armazón satinado oscuro,
  // encimera de trabajo con la caoba de la tapa y su vivo de latón. La
  // estación de coctelería vive encima (decor/cocktailStation.js)
  salon.add(box(0.35, 1.0, barLength, materials.barCabinet, backX, 0.5, 0))
  salon.add(box(0.42, 0.03, barLength, materials.barWood, backX, 1.015, 0))
  salon.add(box(0.02, 0.02, barLength, materials.brass, backX + 0.2, 1.02, 0))
  // repisas acortadas y desplazadas: el extremo sur de la trasbarra queda
  // libre en altura para el gramófono; en el tono del frente del mostrador
  salon.add(box(0.28, 0.05, 5.5, materials.barFront, backX, 1.55, -0.35))
  salon.add(box(0.28, 0.05, 5.5, materials.barFront, backX, 2.05, -0.35))

  // panel retroiluminado tras las repisas (las botellas brillan desde detrás)
  const backglow = new THREE.Mesh(
    new THREE.BoxGeometry(0.03, 1.0, 5.4),
    new THREE.MeshStandardMaterial({
      color: '#c47a42',
      emissive: '#ff9d5c',
      emissiveIntensity: 0.18, // mezcla 2026-07-13 (trasbarra 0.4)
    }),
  )
  backglow.name = 'backglow'
  backglow.position.set(-ROOM.width / 2 + 0.12, 1.85, -0.35)
  salon.add(backglow)

  // la repisa baja la puebla decor/botellas.js con botellas de marca reales
  // (la repisa alta es cristalería sin alcohol: decor/repisaAlta.js)
  // el letrero "IULIAN'S" con letras 3D lo monta letrero.js

  buildBarPaneling(salon, barX, barLength)
}

// El frente del mostrador (referencia speakeasyIdeas: el mueble de bar con
// paneles enmarcados): zócalo oscuro, siete pilastras con basa y capitel
// partiendo el frente en seis tramos, cada tramo con su panel realzado en
// dos escalones, y un riel corrido bajo el vuelo de la tapa. Los extremos
// llevan su propio panel. Toda la carpintería en barWood (la caoba lacada
// de la tapa, extendida al frente en la pasada de brillos 2026-07-14)
// sobre el armazón oscuro — materiales ya existentes, cero programas de
// shader nuevos.
function buildBarPaneling(salon, barX, barLength) {
  const FRONT = barX + 0.325 // el plano de la cara que mira al salón

  // caja en relieve sobre el frente: nace 1 cm dentro del armazón para que
  // ninguna cara quede coplanar (z-fighting)
  const relief = (proud, height, length, y, z, material = materials.barFront) =>
    box(proud + 0.01, height, length, material, FRONT + (proud - 0.01) / 2, y, z)

  // zócalo oscuro a ras de suelo y riel alto bajo el vuelo de la tapa
  salon.add(relief(0.045, 0.14, barLength + 0.02, 0.07, 0, materials.woodDark))
  salon.add(relief(0.035, 0.09, barLength + 0.02, 0.985, 0))

  // el paso que comparten pilastras y paneles
  const PITCH = 1.14

  // tira de luz BAJO EL VUELO DE LA TAPA (dirección de arte de Iulian,
  // 2026-07-14: la luz nace en la barra y cae por los paneles — el suelo ni
  // se entera, sus puntuales van excluidas de la capa 1 en lights.js). La
  // cinta emissive va retranqueada sobre el riel y un FALDÓN colgado del
  // vuelo la tapa por delante: la fuente no se ve directamente desde
  // ninguna altura de ojo razonable, solo escapa la luz por la ranura
  const cinta = box(0.02, 0.018, barLength, materials.tiraBarra, FRONT + 0.02, 1.039, 0)
  cinta.castShadow = false
  salon.add(cinta)
  const faldon = box(0.015, 0.048, barLength + 0.02, materials.woodDark, FRONT + 0.0425, 1.026, 0)
  faldon.castShadow = false // solo esconde la cinta: sin sombras duras extra
  salon.add(faldon)

  // siete pilastras con basa y capitel, como las de las paredes
  for (let i = 0; i < 7; i++) {
    const z = -3.42 + i * PITCH
    salon.add(relief(0.05, 0.8, 0.16, 0.54, z)) // fuste
    salon.add(relief(0.06, 0.12, 0.2, 0.2, z)) // basa
    salon.add(relief(0.06, 0.08, 0.2, 0.9, z)) // capitel
  }

  // panel enmarcado en cada tramo: marco de listón + tablero realzado en dos
  // escalones (el perfil clásico de la referencia)
  for (let i = 0; i < 6; i++) {
    const z = -2.85 + i * PITCH
    salon.add(relief(0.03, 0.055, 0.86, 0.8225, z)) // listón superior
    salon.add(relief(0.03, 0.055, 0.86, 0.2575, z)) // listón inferior
    salon.add(relief(0.03, 0.51, 0.055, 0.54, z - 0.4025)) // montante
    salon.add(relief(0.03, 0.51, 0.055, 0.54, z + 0.4025))
    salon.add(relief(0.035, 0.46, 0.7, 0.54, z)) // primer escalón
    salon.add(relief(0.05, 0.32, 0.56, 0.54, z)) // tablero central

    // detalles de latón del panel (el latón de la casa: cero materiales
    // nuevos, cero luces): un filete fino recorriendo el tablero central
    // sobre el primer escalón — eco del vivo de la tapa — y una roseta
    // en cada esquina del marco, como la tachuela de una chesterfield
    const filete = (height, length, dy, dz) => {
      const strip = box(0.014, height, length, materials.brass, FRONT + 0.042, 0.54 + dy, z + dz)
      strip.castShadow = false // demasiado fino para sombra: solo ruido
      return strip
    }
    salon.add(filete(0.012, 0.64, 0.194, 0))
    salon.add(filete(0.012, 0.64, -0.194, 0))
    salon.add(filete(0.376, 0.012, 0, 0.314))
    salon.add(filete(0.376, 0.012, 0, -0.314))
    for (const dy of [-0.2825, 0.2825]) {
      for (const dz of [-0.4025, 0.4025]) {
        const roseta = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 8), materials.brass)
        roseta.scale.x = 0.5 // media cúpula asomando del marco
        roseta.position.set(FRONT + 0.03, 0.54 + dy, z + dz)
        roseta.castShadow = false
        salon.add(roseta)
      }
    }
  }

  // los extremos del mostrador: zócalo, riel y un panel enmarcado pequeño
  for (const side of [-1, 1]) {
    const zFace = side * (barLength / 2)
    const cap = (proud, width, height, y, x = barX, material = materials.barFront) =>
      box(width, height, proud + 0.01, material, x, y, zFace + side * ((proud - 0.01) / 2))

    salon.add(cap(0.045, 0.67, 0.14, 0.07, barX, materials.woodDark))
    salon.add(cap(0.035, 0.67, 0.09, 0.985))
    salon.add(cap(0.03, 0.5, 0.055, 0.8225))
    salon.add(cap(0.03, 0.5, 0.055, 0.2575))
    salon.add(cap(0.03, 0.055, 0.51, 0.54, barX - 0.2225))
    salon.add(cap(0.03, 0.055, 0.51, 0.54, barX + 0.2225))
    salon.add(cap(0.035, 0.36, 0.46, 0.54))
    salon.add(cap(0.05, 0.24, 0.32, 0.54))

    // los mismos detalles de latón que el frente: filete alrededor del
    // tablero y roseta en cada esquina del marco
    const zFilete = zFace + side * 0.042
    const fileteLateral = (width, height, dx, dy) => {
      const strip = box(width, height, 0.014, materials.brass, barX + dx, 0.54 + dy, zFilete)
      strip.castShadow = false
      return strip
    }
    salon.add(fileteLateral(0.32, 0.012, 0, 0.194))
    salon.add(fileteLateral(0.32, 0.012, 0, -0.194))
    salon.add(fileteLateral(0.012, 0.376, 0.154, 0))
    salon.add(fileteLateral(0.012, 0.376, -0.154, 0))
    for (const dy of [-0.2825, 0.2825]) {
      for (const dx of [-0.2225, 0.2225]) {
        const roseta = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 8), materials.brass)
        roseta.scale.z = 0.5 // media cúpula asomando del marco
        roseta.position.set(barX + dx, 0.54 + dy, zFace + side * 0.03)
        roseta.castShadow = false
        salon.add(roseta)
      }
    }
  }
}

function brassRim(radius, y) {
  const rim = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.015, 8, 48), materials.brass)
  rim.rotation.x = Math.PI / 2
  rim.position.y = y
  rim.castShadow = true
  return rim
}

function buildTables(salon) {
  // mesa de blackjack con canto de latón
  const bj = new THREE.Group()
  bj.add(cylinder(0.95, 0.07, materials.felt, 0, 0.785, 0))
  bj.add(brassRim(0.95, 0.79))
  bj.add(cylinder(0.16, 0.75, materials.woodDark, 0, 0.375, 0))
  bj.add(cylinder(0.45, 0.04, materials.woodDark, 0, 0.02, 0))
  bj.position.set(4.6, 0, 2.2)
  bj.name = 'mesa-blackjack'
  salon.add(bj)

  // mesitas de cóctel (Ø64, como en las referencias: la butaca manda sobre
  // la mesa) de madera oscura con canto de latón y vela
  for (const [x, z] of TABLE_SPOTS) {
    const table = new THREE.Group()
    table.add(cylinder(0.32, 0.05, materials.woodDark, 0, 0.745, 0))
    table.add(brassRim(0.32, 0.75))
    table.add(cylinder(0.06, 0.72, materials.woodDark, 0, 0.36, 0))
    table.add(cylinder(0.2, 0.04, materials.woodDark, 0, 0.02, 0))

    const candle = cylinder(0.028, 0.09, materials.bulb, -0.09, 0.815, 0.06, 10)
    candle.castShadow = false
    table.add(candle)

    table.position.set(x, 0, z)
    salon.add(table)
  }
}

function buildSconces(salon) {
  // apliques procedurales de latón (el modelo cazado traía geometría corrupta)
  for (const { x, z, rotY } of SCONCES) {
    const sconce = new THREE.Group()

    const plate = box(0.05, 0.24, 0.09, materials.brass, 0, 0, 0.025)
    sconce.add(plate)

    const arm = box(0.04, 0.04, 0.16, materials.brass, 0, 0.06, 0.12)
    sconce.add(arm)

    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.03, 0.09, 12), materials.brass)
    cup.position.set(0, 0.09, 0.2)
    cup.castShadow = true
    sconce.add(cup)

    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 8), materials.bulb)
    bulb.position.set(0, 0.16, 0.2)
    sconce.add(bulb)

    sconce.position.set(x, 2.2, z)
    sconce.rotation.y = rotY
    salon.add(sconce)
  }
}

function buildLampFixtures(salon) {
  // la luz necesita origen visible: cable + pantalla + bombilla por lámpara
  for (const { x, y, z } of LAMPS) {
    const fixture = new THREE.Group()
    // fuera de la captura de entorno: la pantalla iluminada, vista de cerca
    // por el cubemap, se proyecta en la laca como un disco gigante
    fixture.userData.hideFromEnv = true

    const cordHeight = ROOM.height - (y + 0.3)
    fixture.add(cylinder(0.012, cordHeight, materials.woodDark, 0, y + 0.3 + cordHeight / 2, 0, 6))

    const shade = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.34, 0.26, 20, 1, true),
      materials.shade,
    )
    shade.material.side = THREE.DoubleSide
    shade.position.set(0, y + 0.18, 0)
    shade.castShadow = true
    fixture.add(shade)

    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8), materials.bulb)
    bulb.position.set(0, y + 0.05, 0)
    fixture.add(bulb)

    fixture.position.set(x, 0, z)
    salon.add(fixture)
  }
}

function buildStage(salon) {
  const stage = new THREE.Group()
  stage.add(box(3.6, 0.4, 2.4, materials.stageWood, 0, 0.2, 0))
  stage.add(box(3.62, 0.03, 2.42, materials.brass, 0, 0.415, 0))

  // candilejas art déco al borde del escenario
  for (let i = 0; i < 5; i++) {
    const x = -1.5 + i * 0.75
    const footlight = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), materials.bulb)
    footlight.position.set(x, 0.47, 1.12)
    stage.add(footlight)
  }

  // (la cortina plana de terciopelo se retiró 2026-07-13: el telón con
  // pliegues, patas y cenefa lo monta decor/curtains.js)

  stage.position.set(3.2, 0, -ROOM.depth / 2 + 1.35)
  stage.name = 'escenario'
  salon.add(stage)
}

export function buildSalon(scene) {
  const salon = new THREE.Group()
  salon.name = 'el-salon'

  buildShell(salon)
  buildBar(salon)
  buildTables(salon)
  buildLampFixtures(salon)
  buildSconces(salon)
  buildStage(salon)

  scene.add(salon)
  return salon
}
