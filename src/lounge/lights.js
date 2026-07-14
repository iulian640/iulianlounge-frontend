import * as THREE from 'three'

import { LAMPS, ROOM, SCONCES, TABLE_SPOTS } from './salon'

// Iluminación en capas (referencias de Pictures/speakeasyIdeas + práctica
// three.js): la penumbra rica no es menos luz, es más FUENTES y más rebote,
// con oscuridad en el aire entre ellas.
//  1. fill: HemisphereLight con gradiente cálido techo/suelo
//  2. key: las lámparas colgantes (charcos de luz, 2 con sombra)
//  3. acento: trasbarra retroiluminada, velas, candilejas, letrero
//  4. rebote falso: puntuales anchas y tenues a media altura

const WARM = '#ffa666'
const GOLD = '#e8cd8f'

// las luces se etiquetan por capa (userData.kind) para el panel de afinado;
// todas alcanzan el suelo (capa 1) SALVO velas (no deben reflejarse en la
// laca), trasbarra (el mostrador la bloquea en la realidad, pero sus
// puntuales no proyectan sombra — se lo prohibimos por capa) y la tira de
// la barra (dirección de arte: la luz cae por los paneles, nada de charcos
// en el parquet)
function tag(light, kind) {
  light.userData.kind = kind
  light.userData.baseIntensity = light.intensity
  if (kind !== 'candle' && kind !== 'shelf' && kind !== 'tira') light.layers.enable(1)
  return light
}

export function addSalonLights(scene) {
  // 1 — fill con gradiente (techo cálido, suelo ámbar oscuro); hace también
  // de rebote falso — las puntuales de rebote se retiraron porque el barniz
  // del suelo las reflejaba como un globo gigante
  scene.add(tag(new THREE.HemisphereLight('#4a3527', '#241610', 0.7), 'fill'))

  // 2 — una luz por lámpara colgante (posiciones compartidas con salon.js).
  // LECCIÓN v2 (2026-07-12, medida): una PointLight con sombra renderiza un
  // CUBO de 6 mapas y muestrearlos hundía los FPS (240→75 con 8 cubos). Las
  // lámparas que proyectan sombra son ahora SpotLight cono abajo = 1 mapa;
  // dentro del cono iluminan igual que la puntual, y hacia arriba ya
  // bloqueaba la pantalla de la lámpara.
  for (const { x, y, z, intensity, shadow } of LAMPS) {
    if (shadow) {
      const light = tag(new THREE.SpotLight(WARM, intensity, 12, 1.15, 0.55, 2), 'lamp')
      light.position.set(x, y - 0.02, z)
      light.target.position.set(x, 0, z)
      light.castShadow = true
      light.shadow.mapSize.set(1024, 1024)
      light.shadow.bias = -0.005
      scene.add(light, light.target)
    } else {
      const light = tag(new THREE.PointLight(WARM, intensity, 12, 2), 'lamp')
      light.position.set(x, y - 0.02, z)
      scene.add(light)
    }
  }

  // 3 — la trasbarra retroiluminada: FILA de puntuales cortas pegadas al
  // panel en vez de la RectAreaLight de antes. La RectArea era la única luz
  // de área de la escena y su código LTC (tablas + mates gordas) iba
  // desenrollado en TODOS los programas de shader — un mordisco fijo a los
  // ~14s de compilación del primer arranque, y 2 texturas menos del
  // presupuesto WebGL (16 por shader). Las puntuales van batcheadas por
  // DynamicLighting (coste cero en el código) y siguen sin tocar el suelo:
  // la etiqueta 'shelf' las deja fuera de la capa 1 (el mostrador las
  // bloquearía en la realidad, y las puntuales tampoco proyectan sombra)
  const SHELF_GLOWS = [-2.15, -0.35, 1.45] // reparto del panel de 5.4m
  for (const z of SHELF_GLOWS) {
    const glow = tag(new THREE.PointLight(WARM, 1.35, 2.6, 2), 'shelf') // mezcla 2026-07-13 (0.4)
    glow.position.set(-ROOM.width / 2 + 0.32, 1.62, z)
    scene.add(glow)
  }

  // 3 — la tira de luz de la barra (la cinta emissive tras su faldón la
  // pone salon.js): estas puntuales bañan los paneles DESDE ARRIBA y la luz
  // muere cayendo — dirección de arte: refleja de la barra hacia abajo, el
  // suelo ni se entera (kind 'tira' queda fuera de la capa 1). TRECE a paso
  // corto (0.5m) y algo separadas del panel: los focos individuales se
  // funden en una banda uniforme; batcheadas, el número casi no cuesta
  // alcance/altura/separación = mezcla de Iulian 2026-07-14 (panel 'Tira barra')
  for (let z = -3; z <= 3.01; z += 0.5) {
    const wash = tag(new THREE.PointLight('#ff9d5c', 0.34, 1.8, 2), 'tira')
    wash.position.set(-ROOM.width / 2 + 2.14, 0.82, z)
    scene.add(wash)
  }

  // 3 — una lucecita por vela de mesa: más naranja y más débil que las
  // lámparas. LECCIÓN v2: su sombra era un cubo de 6 mapas carísimo cuyo
  // único trabajo era que la mesa bloqueara la luz hacia el suelo — mismo
  // efecto gratis acortando el alcance (la luz muere antes de llegar al
  // suelo: vela a 0.98m, alcance 1.35 con decay 2 apenas roza los pies)
  for (const [x, z] of TABLE_SPOTS) {
    const candle = tag(new THREE.PointLight('#ff8438', 0.66, 1.35, 2), 'candle')
    candle.position.set(x - 0.09, 0.98, z + 0.06)
    scene.add(candle)
  }

  // 3 — el brillo de cada aplique de pared (estos SÍ bañan el suelo)
  for (const { x, z, rotY } of SCONCES) {
    const glow = tag(new THREE.PointLight(WARM, 3, 3.5, 2), 'accent')
    glow.position.set(x + Math.sin(rotY) * 0.3, 2.4, z + Math.cos(rotY) * 0.3)
    scene.add(glow)
  }

  // 3 — baño de candilejas sobre la cortina (rebalanceado a la mezcla de
  // exposición 2.2; con mando propio 'escenario' en el panel)
  // pegada a la cortina y elevada: baña el telón sin plantar un charco en
  // mitad de la tarima (a 30 cm de las tablas encendía cualquier superficie)
  const footlights = tag(new THREE.PointLight(GOLD, 1.2, 2.5, 2), 'escenario')
  footlights.position.set(3.2, 1.35, -4.55)
  scene.add(footlights)

  // resplandor del letrero sobre la pared oeste (sin sombra: resultó
  // inocente de la banda del suelo, y el presupuesto de sombras manda)
  const signGlow = tag(new THREE.PointLight(GOLD, 3.15, 6, 2), 'letrero') // mezcla 2026-07-13 (0.5)
  signGlow.position.set(-ROOM.width / 2 + 0.7, 2.85, 0)
  scene.add(signGlow)

  // foco del escenario
  const spot = tag(new THREE.SpotLight(GOLD, 18, 14, 0.5, 0.5, 2), 'escenario')
  spot.position.set(3.2, ROOM.height - 0.2, -1.4)
  spot.target.position.set(3.2, 0.4, -ROOM.depth / 2 + 1.35)
  spot.castShadow = true
  spot.shadow.mapSize.set(1024, 1024)
  spot.shadow.bias = -0.0001
  scene.add(spot)
  scene.add(spot.target)
}
