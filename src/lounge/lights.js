import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';

import { LAMPS, ROOM, SCONCES, TABLE_SPOTS } from './salon';

RectAreaLightUniformsLib.init();

// Iluminación en capas (referencias de Pictures/speakeasyIdeas + práctica
// three.js): la penumbra rica no es menos luz, es más FUENTES y más rebote,
// con oscuridad en el aire entre ellas.
//  1. fill: HemisphereLight con gradiente cálido techo/suelo
//  2. key: las lámparas colgantes (charcos de luz, 2 con sombra)
//  3. acento: trasbarra retroiluminada, velas, candilejas, letrero
//  4. rebote falso: puntuales anchas y tenues a media altura

const WARM = '#ffa666';
const GOLD = '#e8cd8f';
const EMBER = '#c47a42';

// las luces se etiquetan por capa (userData.kind) para el panel de afinado;
// todas alcanzan el suelo (capa 1) SALVO las velas — así una vela ilumina
// su alrededor sin dejar reflejo en la laca
function tag(light, kind) {
  light.userData.kind = kind;
  light.userData.baseIntensity = light.intensity;
  if (kind !== 'candle') light.layers.enable(1);
  return light;
}

export function addSalonLights(scene) {
  // 1 — fill con gradiente (techo cálido, suelo ámbar oscuro); hace también
  // de rebote falso — las puntuales de rebote se retiraron porque el barniz
  // del suelo las reflejaba como un globo gigante
  scene.add(tag(new THREE.HemisphereLight('#4a3527', '#241610', 0.7), 'fill'));

  // 2 — una PointLight por lámpara colgante (posiciones compartidas con salon.js)
  for (const { x, y, z, intensity, shadow } of LAMPS) {
    const light = tag(new THREE.PointLight(WARM, intensity, 12, 2), 'lamp');
    light.position.set(x, y - 0.02, z);
    if (shadow) {
      light.castShadow = true;
      light.shadow.mapSize.set(1024, 1024);
      light.shadow.bias = -0.005;
    }
    scene.add(light);
  }

  // 3 — la trasbarra retroiluminada con luz de ÁREA (RectAreaLight): un
  // panel luminoso de verdad tras las botellas, no puntuales fingiendo
  const shelfLight = tag(new THREE.RectAreaLight(WARM, 4, 5.4, 1.0), 'shelf');
  shelfLight.position.set(-ROOM.width / 2 + 0.18, 1.85, -0.35);
  shelfLight.lookAt(0, 1.4, -0.35);
  scene.add(shelfLight);

  // 3 — una lucecita por vela de mesa: más naranja y más débil que las
  // lámparas, corto alcance, y CON sombra — la mesa debe bloquear su luz
  // hacia el suelo (los mapas de sombra se congelan tras la carga, así que
  // estas sombras extra salen casi gratis)
  for (const [x, z] of TABLE_SPOTS) {
    const candle = tag(new THREE.PointLight('#ff8438', 1.1, 2.0, 2), 'candle');
    candle.position.set(x - 0.09, 0.98, z + 0.06);
    candle.castShadow = true;
    candle.shadow.mapSize.set(512, 512);
    candle.shadow.bias = -0.01;
    scene.add(candle);
  }

  // 3 — el brillo de cada aplique de pared
  for (const { x, z, rotY } of SCONCES) {
    const glow = new THREE.PointLight(WARM, 3, 3.5, 2);
    glow.position.set(x + Math.sin(rotY) * 0.3, 2.4, z + Math.cos(rotY) * 0.3);
    scene.add(glow);
  }

  // 3 — baño de candilejas sobre la cortina
  const footlights = tag(new THREE.PointLight(GOLD, 3, 3.5, 2), 'accent');
  footlights.position.set(3.2, 0.7, -3.2);
  scene.add(footlights);

  // resplandor del letrero sobre la pared oeste
  const signGlow = tag(new THREE.PointLight(GOLD, 6, 6, 2), 'accent');
  signGlow.position.set(-ROOM.width / 2 + 0.7, 2.85, 0);
  scene.add(signGlow);

  // foco del escenario
  const spot = tag(new THREE.SpotLight(GOLD, 50, 14, 0.5, 0.5, 2), 'accent');
  spot.position.set(3.2, ROOM.height - 0.2, -1.4);
  spot.target.position.set(3.2, 0.4, -ROOM.depth / 2 + 1.35);
  spot.castShadow = true;
  spot.shadow.mapSize.set(1024, 1024);
  spot.shadow.bias = -0.0001;
  scene.add(spot);
  scene.add(spot.target);
}
