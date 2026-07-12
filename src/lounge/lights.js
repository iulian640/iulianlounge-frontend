import * as THREE from 'three';

import { ROOM } from './salon';

// La atmósfera la hace la luz, no el polycount (CONCEPT.md):
// ambiente casi apagado + fuentes puntuales cálidas (~2800 K) con origen.

const WARM = '#ffb46b';
const GOLD = '#e8cd8f';

function lamp(x, y, z, intensity, distance, castShadow = false) {
  const light = new THREE.PointLight(WARM, intensity, distance, 2);
  light.position.set(x, y, z);
  if (castShadow) {
    light.castShadow = true;
    light.shadow.mapSize.set(1024, 1024);
    light.shadow.bias = -0.005;
  }
  return light;
}

export function addSalonLights(scene) {
  // relleno mínimo para que lo no iluminado no sea negro absoluto
  scene.add(new THREE.AmbientLight('#22302c', 0.35));

  // la barra: dos lámparas sobre el mostrador
  scene.add(lamp(-6.0, 2.7, -1.8, 14, 8, true));
  scene.add(lamp(-6.0, 2.7, 1.8, 14, 8));

  // resplandor del letrero sobre la pared oeste
  scene.add(lamp(-7.0, 2.9, 0, 4, 5));

  // una lámpara baja sobre cada mesa
  scene.add(lamp(-1.5, 2.2, 1.8, 7, 6));
  scene.add(lamp(1.2, 2.2, -0.6, 7, 6));
  scene.add(lamp(-3.2, 2.2, -1.6, 7, 6));
  scene.add(lamp(4.6, 2.4, 2.2, 10, 7, true));

  // foco del escenario
  const spot = new THREE.SpotLight(GOLD, 25, 12, 0.48, 0.5, 2);
  spot.position.set(3.2, ROOM.height - 0.2, -1.6);
  spot.target.position.set(3.2, 0.4, -ROOM.depth / 2 + 1.35);
  spot.castShadow = true;
  spot.shadow.mapSize.set(1024, 1024);
  spot.shadow.bias = -0.0001;
  scene.add(spot);
  scene.add(spot.target);
}
