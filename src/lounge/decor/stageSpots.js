import * as THREE from 'three';

import { materials } from '../salon';

// BARRA DE FOCOS DEL ESCENARIO (referencia de Iulian 2026-07-13: proscenio
// cuajado de luces cálidas con haces cayendo sobre la tarima; primero fue
// arco, él lo pasó a barra recta — los focos de trípode quedaron vetados).
//
// Una barra recta de madera oscura COLGADA DEL TECHO por varillas de latón
// cruza la boca del escenario; bajo ella, nueve foquitos con bombilla
// (emissive → cada uno con su halo vía bloom selectivo, como las bombillas
// de la referencia). Cuatro de ellos proyectan luz DE VERDAD (SpotLight sin
// sombra, presupuesto manda) con su haz de niebla translúcido cayendo en
// abanico sobre la tarima.
//
// Mandos del panel (carpeta Focos): intensidad (kind 'foco'), anchura
// (setWidth: escala haces + ángulo de las luces), haz (opacidad de los
// conos), lente (brillo de las nueve lentes).

const canMaterial = new THREE.MeshStandardMaterial({
  color: '#6f5528', // latón envejecido, más apagado que el de la casa
  metalness: 1,
  roughness: 0.5,
});
const lensMaterial = new THREE.MeshStandardMaterial({
  color: '#3a2f1c',
  emissive: '#ffdba0',
  emissiveIntensity: 1.6,
  roughness: 0.4,
});
const beamMaterial = new THREE.MeshStandardMaterial({
  color: '#fff3d8',
  transparent: true,
  opacity: 0.035,
  depthWrite: false,
  side: THREE.DoubleSide,
  roughness: 1,
});

// la barra de focos: recta, horizontal, colgada sobre la boca del escenario
// (el escenario vive en x 1.4–5.0, z −5.35…−2.95, tarima a 0.43)
const BAR_Y = 3.05;
const BAR_Z = -3.0;
const BAR_FROM = 1.5; // extremos en x
const BAR_TO = 4.9;
const FIXTURES = 9;
const LIT = new Set([1, 3, 5, 7]); // cuáles proyectan luz y haz de verdad

function barPoint(t) {
  // t = 0..1 a lo largo de la barra
  return new THREE.Vector3(THREE.MathUtils.lerp(BAR_FROM, BAR_TO, t), BAR_Y, BAR_Z);
}

function buildBar(scene) {
  // la barra de madera oscura con remates de latón
  const length = BAR_TO - BAR_FROM + 0.16;
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, length, 10), materials.woodDark);
  bar.rotation.z = Math.PI / 2; // tumbada a lo largo de x
  bar.position.set((BAR_FROM + BAR_TO) / 2, BAR_Y, BAR_Z);
  bar.castShadow = true;
  scene.add(bar);

  for (const side of [0, 1]) {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), canMaterial);
    cap.position.copy(barPoint(side));
    scene.add(cap);
  }

  // las varillas que la cuelgan del techo, en latón fino
  for (const t of [0.12, 0.5, 0.88]) {
    const anchor = barPoint(t);
    const drop = 3.6 - BAR_Y; // hasta el techo
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, drop, 6), materials.brass);
    rod.position.set(anchor.x, BAR_Y + drop / 2, anchor.z);
    scene.add(rod);
  }
}

function buildFixture(t) {
  // foquito de latón mirando a +Z (lookAt lo apunta): cañón corto, culata
  // y lente encendida
  const fixture = new THREE.Group();

  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.14, 14), canMaterial);
  body.rotation.x = Math.PI / 2;
  body.castShadow = true;
  fixture.add(body);

  const back = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 8), canMaterial);
  back.position.z = -0.07;
  back.scale.z = 0.5;
  fixture.add(back);

  // bombilla esférica asomando del cañón: brilla en todas direcciones,
  // como las bolas encendidas del arco de la referencia (desde el público
  // una lente plana no se veía)
  const lens = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 10), lensMaterial);
  lens.position.z = 0.075;
  lens.castShadow = false;
  lens.userData.hideFromEnv = true;
  fixture.add(lens);

  // colgado bajo la barra
  fixture.position.copy(barPoint(t));
  fixture.position.y -= 0.1;
  return fixture;
}

/**
 * Cuelga el arco de focos sobre la boca del escenario.
 * @param {THREE.Scene} scene
 * @returns mandos para el panel: beamMaterial, lensMaterial y setWidth().
 */
export function addStageSpots(scene) {
  buildBar(scene);

  const beams = [];
  const lights = [];

  for (let i = 0; i < FIXTURES; i++) {
    const t = i / (FIXTURES - 1); // 0..1 a lo largo de la barra
    const fixture = buildFixture(t);
    scene.add(fixture);

    // cada foco apunta en abanico a su franja de la tarima
    const aim = new THREE.Vector3(3.2 + (fixture.position.x - 3.2) * 0.5, 0.45, -4.25);
    fixture.updateWorldMatrix(true, false);
    fixture.lookAt(aim);

    if (!LIT.has(i)) continue;

    // los que proyectan de verdad: haz de niebla + SpotLight sin sombra
    const distance = fixture.position.distanceTo(aim);
    const beamGeometry = new THREE.ConeGeometry(0.5, distance, 18, 1, true);
    beamGeometry.rotateX(-Math.PI / 2); // ápice a −Z…
    beamGeometry.translate(0, 0, distance / 2 + 0.07); // …pegado a la lente
    const beam = new THREE.Mesh(beamGeometry, beamMaterial);
    beam.renderOrder = 9; // translúcido: después de lo opaco, antes del humo
    beam.userData.hideFromEnv = true;
    fixture.add(beam);
    beams.push(beam);

    const light = new THREE.SpotLight('#ffd9a0', 6, 10, 0.32, 0.5, 2);
    light.position.copy(fixture.position);
    light.target.position.copy(aim);
    light.userData.kind = 'foco';
    light.userData.baseIntensity = 6;
    scene.add(light);
    scene.add(light.target);
    lights.push(light);
  }

  return {
    beamMaterial,
    lensMaterial,
    // anchura: escala los conos en sus ejes transversales (el ápice, en el
    // origen local, no se mueve) y abre el ángulo de las luces a juego
    setWidth(v) {
      for (const beam of beams) beam.scale.set(v, v, 1);
      for (const light of lights) light.angle = 0.32 * v;
    },
  };
}
