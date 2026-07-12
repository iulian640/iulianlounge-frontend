import * as THREE from 'three';

import { LAMPS, ROOM, SCONCES, TABLE_SPOTS } from './salon';

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

export function addSalonLights(scene) {
  // 1 — fill con gradiente (techo cálido, suelo ámbar oscuro)
  scene.add(new THREE.HemisphereLight('#4a3527', '#241610', 0.55));

  // 4 — rebote falso: dos puntuales anchas, tenues, sin sombra, a media altura
  const bounceA = new THREE.PointLight(EMBER, 3, 16, 2);
  bounceA.position.set(-2, 1.1, 0.5);
  scene.add(bounceA);
  const bounceB = new THREE.PointLight(EMBER, 2.5, 14, 2);
  bounceB.position.set(4, 1.1, 0);
  scene.add(bounceB);

  // 2 — una PointLight por lámpara colgante (posiciones compartidas con salon.js)
  for (const { x, y, z, intensity, shadow } of LAMPS) {
    const light = new THREE.PointLight(WARM, intensity, 12, 2);
    light.position.set(x, y - 0.02, z);
    if (shadow) {
      light.castShadow = true;
      light.shadow.mapSize.set(1024, 1024);
      light.shadow.bias = -0.005;
    }
    scene.add(light);
  }

  // 3 — la trasbarra retroiluminada (el truco de las referencias: las
  // botellas brillan porque la luz viene de DETRÁS)
  const shelfGlowA = new THREE.PointLight(WARM, 5, 4, 2);
  shelfGlowA.position.set(-ROOM.width / 2 + 0.55, 1.85, -1.6);
  scene.add(shelfGlowA);
  const shelfGlowB = new THREE.PointLight(WARM, 5, 4, 2);
  shelfGlowB.position.set(-ROOM.width / 2 + 0.55, 1.85, 1.2);
  scene.add(shelfGlowB);

  // 3 — una lucecita por vela de mesa (les da cara a las butacas)
  for (const [x, z] of TABLE_SPOTS) {
    const candle = new THREE.PointLight('#ff9d5c', 1.6, 2.8, 2);
    candle.position.set(x - 0.09, 1.0, z + 0.06);
    scene.add(candle);
  }

  // 3 — el brillo de cada aplique de pared
  for (const { x, z, rotY } of SCONCES) {
    const glow = new THREE.PointLight(WARM, 3, 3.5, 2);
    glow.position.set(x + Math.sin(rotY) * 0.3, 2.4, z + Math.cos(rotY) * 0.3);
    scene.add(glow);
  }

  // 3 — baño de candilejas sobre la cortina
  const footlights = new THREE.PointLight(GOLD, 3, 3.5, 2);
  footlights.position.set(3.2, 0.7, -3.2);
  scene.add(footlights);

  // resplandor del letrero sobre la pared oeste
  const signGlow = new THREE.PointLight(GOLD, 6, 6, 2);
  signGlow.position.set(-ROOM.width / 2 + 0.7, 2.85, 0);
  scene.add(signGlow);

  // foco del escenario
  const spot = new THREE.SpotLight(GOLD, 50, 14, 0.5, 0.5, 2);
  spot.position.set(3.2, ROOM.height - 0.2, -1.4);
  spot.target.position.set(3.2, 0.4, -ROOM.depth / 2 + 1.35);
  spot.castShadow = true;
  spot.shadow.mapSize.set(1024, 1024);
  spot.shadow.bias = -0.0001;
  scene.add(spot);
  scene.add(spot.target);
}
