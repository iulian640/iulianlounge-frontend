import * as THREE from 'three';

import { materials } from '../salon';

// CENICEROS DEL CLUB (referencias de Iulian, 2026-07-13). Tres piezas
// procedurales — el humo del club ya no es niebla dispersa: nace de las
// brasas de los puros ENCENDIDOS (decor/smoke.js recibe las puntas como
// emisores).
//
//  1. "La mano" (peltre, mesa de blackjack): plato con una muñeca central
//     que sostiene un abanico de naipes. Puro encendido.
//  2. Peltre con canto perlado (mesita de cóctel): plato hondo clásico con
//     un puro APAGADO a medias — no emite humo.
//  3. Cristal tallado (tapa de la barra): cenicero cuadrado de cristal con
//     costillas prismáticas y canto ancho, de la segunda referencia suya.
//     Puro encendido cruzado en la esquina.
//
// La brasa es emissive (bloom selectivo por MRT: le sale halo solo a ella)
// y LATE con un parpadeo determinista — un updatable por puro encendido.

// peltre: metal gris apagado, más sucio que el latón de la casa
const pewter = new THREE.MeshStandardMaterial({
  color: '#8f9296',
  metalness: 1,
  roughness: 0.45,
  envMapIntensity: 0.45,
});

// cristal tallado: transparente de verdad, el brillo lo ponen la laca y los
// reflejos de entorno (misma familia que la licorera de la vitrina)
const crystal = new THREE.MeshPhysicalMaterial({
  color: '#e6efec',
  roughness: 0.04,
  metalness: 0,
  transparent: true,
  opacity: 0.32,
  depthWrite: false, // vidrio: que no tape lo que hay detrás en el z-buffer
  clearcoat: 1,
  clearcoatRoughness: 0.06,
  envMapIntensity: 1.4,
});

const cigarWrap = new THREE.MeshStandardMaterial({ color: '#3f2a1a', roughness: 0.85 });
const cigarAsh = new THREE.MeshStandardMaterial({ color: '#b3ada1', roughness: 1 });
const cigarChar = new THREE.MeshStandardMaterial({ color: '#241812', roughness: 1 });

// dónde vive cada cenicero: superficie (mesa/barra) + hacia dónde apunta el
// puro (rotY) + si el puro está encendido (lit → brasa + emisor de humo).
// Alturas = las tapas reales: tapete blackjack 0.82, mesita 0.77, barra 1.10.
// OJO mesita: la copa de coñac vive en (+0.12, −0.07) y la vela en
// (−0.09, +0.06) relativos al centro — el cenicero va al hueco libre
const PLACEMENTS = [
  { style: 'mano', at: [4.15, 0.82, 2.62], rotY: -0.5, lit: true }, // blackjack, junto al borde
  { style: 'perlado', at: [1.15, 0.77, -0.42], rotY: 2.6, lit: false }, // mesita central
  { style: 'cristal', at: [-6.55, 1.1, -1.35], rotY: 1.2, lit: true }, // barra, bajo la lámpara norte
];

function dish(radius, material) {
  // plato de cenicero por revolución: fondo plano, pared que sube y un
  // canto ancho con labio — el perfil de las fotos de peltre
  const profile = [
    new THREE.Vector2(0.004, 0.006),
    new THREE.Vector2(radius * 0.45, 0.006),
    new THREE.Vector2(radius * 0.68, 0.014),
    new THREE.Vector2(radius * 0.88, 0.034),
    new THREE.Vector2(radius, 0.03),
    new THREE.Vector2(radius * 0.97, 0.002),
    new THREE.Vector2(radius * 0.5, 0),
  ];
  const mesh = new THREE.Mesh(new THREE.LatheGeometry(profile, 40), material);
  mesh.material.side = THREE.DoubleSide; // el interior del plato se ve
  mesh.castShadow = true;
  return mesh;
}

function beadedRim(radius) {
  // canto perlado del cenicero vintage: un aro fino sobre el labio
  const rim = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.93, 0.0035, 6, 40), pewter);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.036;
  return rim;
}

function cardFan() {
  // el abanico de naipes de peltre sobre la muñeca: 11 cartas finas
  // desplegadas en arco, con un pelín de giro y separación para que no
  // se fundan en una sola placa
  const fan = new THREE.Group();
  const cardGeometry = new THREE.BoxGeometry(0.03, 0.046, 0.0016);
  for (let i = 0; i < 11; i++) {
    const t = i / 10; // 0..1 a lo largo del arco
    const angle = THREE.MathUtils.lerp(-1.15, 1.15, t); // ±66°
    const card = new THREE.Mesh(cardGeometry, pewter);
    // cada carta pivota desde la base del abanico (donde las sujeta la mano)
    card.position.set(Math.sin(angle) * 0.026, Math.cos(angle) * 0.026 + 0.008, i * 0.0011);
    card.rotation.z = -angle;
    card.castShadow = true;
    fan.add(card);
  }
  return fan;
}

function handPedestal() {
  // la muñeca central que sostiene el abanico: columna por revolución
  // (base acampanada + muñeca) con la pulsera de la foto
  const profile = [
    new THREE.Vector2(0.002, 0),
    new THREE.Vector2(0.055, 0),
    new THREE.Vector2(0.045, 0.012),
    new THREE.Vector2(0.02, 0.03),
    new THREE.Vector2(0.014, 0.055),
    new THREE.Vector2(0.017, 0.085),
    new THREE.Vector2(0.012, 0.1),
    new THREE.Vector2(0.002, 0.102),
  ];
  const pedestal = new THREE.Group();
  const column = new THREE.Mesh(new THREE.LatheGeometry(profile, 24), pewter);
  column.castShadow = true;
  pedestal.add(column);

  const bracelet = new THREE.Mesh(new THREE.TorusGeometry(0.019, 0.004, 6, 20), pewter);
  bracelet.rotation.x = Math.PI / 2;
  bracelet.position.y = 0.045;
  pedestal.add(bracelet);

  const fan = cardFan();
  fan.position.y = 0.1;
  pedestal.add(fan);
  return pedestal;
}

// cenicero cuadrado de cristal tallado (la referencia de la barra):
// base + paredes con costillas prismáticas, canto ancho plano, esquinas en
// bloque y un montoncito de ceniza en el pozo
const CRYSTAL_SIZE = 0.15;

function crystalAshtray() {
  const half = CRYSTAL_SIZE / 2;
  const ashtray = new THREE.Group();

  const base = new THREE.Mesh(new THREE.BoxGeometry(CRYSTAL_SIZE, 0.007, CRYSTAL_SIZE), crystal);
  base.position.y = 0.0035;
  ashtray.add(base);

  // paredes, costillas y canto: cuatro lados girados 90° cada vez
  const wallGeometry = new THREE.BoxGeometry(CRYSTAL_SIZE - 0.02, 0.03, 0.008);
  const ribGeometry = new THREE.BoxGeometry(0.006, 0.024, 0.005);
  const rimGeometry = new THREE.BoxGeometry(CRYSTAL_SIZE + 0.016, 0.005, 0.018);
  for (let side = 0; side < 4; side++) {
    const frame = new THREE.Group();
    frame.rotation.y = (side * Math.PI) / 2;

    const wall = new THREE.Mesh(wallGeometry, crystal);
    wall.position.set(0, 0.021, half - 0.006);
    frame.add(wall);

    // las costillas talladas que dan el destello prismático de la foto
    for (let i = 0; i < 11; i++) {
      const rib = new THREE.Mesh(ribGeometry, crystal);
      rib.position.set((i - 5) * 0.0115, 0.019, half - 0.0005);
      frame.add(rib);
    }

    const rim = new THREE.Mesh(rimGeometry, crystal);
    rim.position.set(0, 0.0385, half - 0.008);
    frame.add(rim);

    // esquina en bloque (tallado escalonado de la referencia)
    const corner = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.036, 0.016), crystal);
    corner.position.set(half - 0.006, 0.019, half - 0.006);
    frame.add(corner);

    ashtray.add(frame);
  }

  return ashtray;
}

// puro tumbado a lo largo de +X, con la punta en +X. Si está encendido lleva
// un tramo corto de ceniza y la brasa ROJA en la punta (visible de lado);
// apagado es más corto (fumado a medias) y remata en carbón frío.
const CIGAR_LENGTH = 0.105;
const CIGAR_RADIUS = 0.0075;

function cigar(lit) {
  const group = new THREE.Group();
  const along = new THREE.Object3D(); // cilindros nacen en Y: se tumban aquí
  along.rotation.z = -Math.PI / 2;
  group.add(along);

  const length = lit ? CIGAR_LENGTH : CIGAR_LENGTH * 0.75;

  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(CIGAR_RADIUS, CIGAR_RADIUS * 0.94, length * 0.86, 10),
    cigarWrap,
  );
  body.position.y = -length * 0.07;
  body.castShadow = true;
  along.add(body);

  // vitola de latón cerca de la boquilla
  const band = new THREE.Mesh(
    new THREE.CylinderGeometry(CIGAR_RADIUS * 1.06, CIGAR_RADIUS * 1.06, 0.008, 10),
    materials.brass,
  );
  band.position.y = -length * 0.32;
  along.add(band);

  if (!lit) {
    // remate de carbón frío: se apagó y ahí se quedó
    const char = new THREE.Mesh(
      new THREE.CylinderGeometry(CIGAR_RADIUS * 0.9, CIGAR_RADIUS, length * 0.1, 10),
      cigarChar,
    );
    char.position.y = length * 0.41;
    along.add(char);
    return { group, ember: null };
  }

  // tramo CORTO de ceniza gris y la brasa: un anillo con cuerpo (0.006 de
  // largo) para que el rojo se vea también de perfil, no solo de frente
  const ash = new THREE.Mesh(
    new THREE.CylinderGeometry(CIGAR_RADIUS * 0.96, CIGAR_RADIUS, length * 0.09, 10),
    cigarAsh,
  );
  ash.position.y = length * 0.39;
  along.add(ash);

  const ember = new THREE.Mesh(
    new THREE.CylinderGeometry(CIGAR_RADIUS * 0.88, CIGAR_RADIUS * 0.96, 0.006, 10),
    new THREE.MeshStandardMaterial({
      color: '#30100a',
      emissive: '#ff2d0f',
      emissiveIntensity: 2.2,
      roughness: 1,
    }),
  );
  ember.position.y = length * 0.465;
  ember.castShadow = false;
  along.add(ember);

  return { group, ember };
}

function buildAshtray(style) {
  const ashtray = new THREE.Group();
  if (style === 'mano') {
    ashtray.add(dish(0.085, pewter));
    ashtray.add(handPedestal());
  } else if (style === 'perlado') {
    ashtray.add(dish(0.055, pewter));
    ashtray.add(beadedRim(0.055));
  } else {
    ashtray.add(crystalAshtray());
  }
  return ashtray;
}

// el puro descansa en el canto con la punta asomando sobre el plato
function restCigar(ashtray, style, lit) {
  const { group, ember } = cigar(lit);
  if (style === 'mano') {
    // cruzado sobre el canto como una cuerda (no apunta al centro: la
    // muñeca vive ahí y el puro se clavaba en ella) — apoya en el aro del
    // canto por dos puntos y los extremos asoman un pelín
    group.position.set(0.055, 0.043, 0.03);
    group.rotation.y = -2.07; // tangente al aro del canto
    group.rotation.z = -0.05;
  } else if (style === 'perlado') {
    // apagado, dejado caer: la boquilla apoyada en el canto y el carbón
    // hundido en el pozo
    group.position.set(0.02, 0.026, 0.008);
    group.rotation.y = Math.PI;
    group.rotation.z = -0.35; // cae hacia dentro
  } else {
    // cristal: cruzado en diagonal sobre la esquina, como en la foto
    group.position.set(0.062, 0.046, 0.062);
    group.rotation.y = (Math.PI * 3) / 4; // la brasa apunta al centro del pozo
    group.rotation.z = -0.06;
  }
  ashtray.add(group);
  return ember;
}

/**
 * Coloca los ceniceros con sus puros.
 * @param {THREE.Scene} scene
 * @param {Array<(delta: number) => void>} updatables - recibe el latido de las brasas.
 * @returns {{tips: THREE.Vector3[]}} puntas de los puros ENCENDIDOS en mundo
 *   (los emisores del humo de decor/smoke.js).
 */
export function addAshtrays(scene, updatables) {
  const tips = [];
  const embers = [];

  for (const { style, at, rotY, lit } of PLACEMENTS) {
    const ashtray = buildAshtray(style);
    ashtray.position.set(at[0], at[1], at[2]);
    ashtray.rotation.y = rotY;
    ashtray.name = `cenicero-${style}`;
    // fuera de la captura de entorno: piezas pequeñas que no se aprecian
    // en el reflejo del suelo, y cada material visible en el cubemap
    // compila una segunda variante de pipeline (presupuesto de arranque)
    ashtray.userData.hideFromEnv = true;
    scene.add(ashtray);

    const ember = restCigar(ashtray, style, lit);
    if (!ember) continue; // puro apagado: ni brasa ni humo

    embers.push(ember);
    // punta del puro en mundo: de ahí nace la voluta de humo
    ashtray.updateWorldMatrix(true, true);
    tips.push(ember.getWorldPosition(new THREE.Vector3()));
  }

  // latido de las brasas: cada una con su fase, como caladas lentas —
  // determinista (senos), nada de Math.random por frame
  let t = 0;
  updatables.push((delta) => {
    t += delta;
    for (let i = 0; i < embers.length; i++) {
      const phase = t * 0.7 + i * 2.1;
      const slow = Math.sin(phase) * 0.5 + 0.5; // calada lenta 0..1
      const flicker = Math.sin(phase * 7.3) * Math.sin(phase * 3.1) * 0.18;
      embers[i].material.emissiveIntensity = 1.8 + slow * 1.3 + flicker;
    }
  });

  return { tips };
}
