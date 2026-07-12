import * as THREE from 'three';

import { LAMPS, ROOM, SCONCES } from './salon';

// La atmósfera la hace la luz, no el polycount (CONCEPT.md):
// ambiente casi apagado + fuentes puntuales cálidas (~2800 K) con origen.

const WARM = '#ffb46b';
const GOLD = '#e8cd8f';

export function addSalonLights(scene) {
  // relleno mínimo para que lo no iluminado no sea negro absoluto
  scene.add(new THREE.AmbientLight('#2a332e', 0.55));

  // una PointLight por lámpara colgante (posiciones compartidas con salon.js);
  // la luz cuelga justo bajo el borde de la pantalla para que el cono caiga hacia abajo
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

  // el brillo de cada aplique de pared
  for (const { x, z, rotY } of SCONCES) {
    const glow = new THREE.PointLight(WARM, 3, 3.5, 2);
    glow.position.set(x + Math.sin(rotY) * 0.3, 2.4, z + Math.cos(rotY) * 0.3);
    scene.add(glow);
  }

  // resplandor del letrero sobre la pared oeste
  const signGlow = new THREE.PointLight(GOLD, 6, 6, 2);
  signGlow.position.set(-ROOM.width / 2 + 0.7, 2.85, 0);
  scene.add(signGlow);

  // foco del escenario
  const spot = new THREE.SpotLight(GOLD, 70, 14, 0.5, 0.5, 2);
  spot.position.set(3.2, ROOM.height - 0.2, -1.4);
  spot.target.position.set(3.2, 0.4, -ROOM.depth / 2 + 1.35);
  spot.castShadow = true;
  spot.shadow.mapSize.set(1024, 1024);
  spot.shadow.bias = -0.0001;
  scene.add(spot);
  scene.add(spot.target);
}
