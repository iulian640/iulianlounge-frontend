import * as THREE from 'three';

import { ROOM, materials } from '../salon';

// Puerta de entrada con mirilla — IUL-27 P1. El hueco lo deja buildShell()
// en salon.js: doorWidth 1.4, doorHeight 2.2, centrado en x=0, pared sur
// (z = ROOM.depth / 2). Aquí solo se rellena el hueco con la hoja.
// Cerrada, no interactiva — la interacción (santo y seña) llega con IUL-28.

const DOOR_WIDTH = 1.4;
const DOOR_HEIGHT = 2.2;
const WALL_THICKNESS = 0.2;

const LEAF_THICKNESS = 0.06;
const FRAME_DEPTH = 0.09;

// mirilla a la altura de los ojos (referencia ~1.65 m de pie)
const PEEPHOLE_Y = 1.65;

function slab(width, height, depth, material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function stud(radius, height, material) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 12), material);
  mesh.rotation.x = Math.PI / 2;
  mesh.castShadow = true;
  return mesh;
}

// marco de latón embutido en el hueco del muro
function buildFrame() {
  const frame = new THREE.Group();
  const jambWidth = 0.08;

  frame.add(slab(jambWidth, DOOR_HEIGHT + jambWidth, FRAME_DEPTH, materials.brass)
    .translateX(-(DOOR_WIDTH + jambWidth) / 2));
  frame.add(slab(jambWidth, DOOR_HEIGHT + jambWidth, FRAME_DEPTH, materials.brass)
    .translateX((DOOR_WIDTH + jambWidth) / 2));
  frame.add(slab(DOOR_WIDTH + jambWidth * 2, jambWidth, FRAME_DEPTH, materials.brass)
    .translateY(DOOR_HEIGHT / 2 + jambWidth / 2));

  return frame;
}

// hoja maciza con entrepaños hundidos (dos paneles superiores, uno largo abajo)
function buildLeaf() {
  const leaf = new THREE.Group();

  leaf.add(slab(DOOR_WIDTH - 0.08, DOOR_HEIGHT - 0.08, LEAF_THICKNESS, materials.woodTrim));

  const panelInset = 0.05;
  const panelMat = materials.woodTrim;
  const panelDepth = LEAF_THICKNESS + 0.02;

  // panel inferior, largo
  const lowerPanel = slab(DOOR_WIDTH - 0.08 - panelInset * 2, 0.95, 0.015, panelMat);
  lowerPanel.position.set(0, -(DOOR_HEIGHT - 0.08) / 2 + 0.55, panelDepth / 2 - LEAF_THICKNESS / 2);
  leaf.add(lowerPanel);

  // dos paneles superiores, a ambos lados del eje de la mirilla
  for (const side of [-1, 1]) {
    const upperPanel = slab(
      (DOOR_WIDTH - 0.08 - panelInset * 3) / 2,
      0.85,
      0.015,
      panelMat,
    );
    upperPanel.position.set(
      side * ((DOOR_WIDTH - 0.08 - panelInset * 3) / 4 + panelInset * 0.75),
      (DOOR_HEIGHT - 0.08) / 2 - 0.55,
      panelDepth / 2 - LEAF_THICKNESS / 2,
    );
    leaf.add(upperPanel);
  }

  // remaches de latón repartidos por el perímetro de la hoja
  const rivetPositions = [];
  const halfW = DOOR_WIDTH / 2 - 0.1;
  const halfH = (DOOR_HEIGHT - 0.08) / 2 - 0.1;
  for (const x of [-halfW, halfW]) {
    for (let i = 0; i < 4; i++) {
      const y = -halfH + i * ((halfH * 2) / 3);
      rivetPositions.push([x, y]);
    }
  }
  for (const [x, y] of rivetPositions) {
    const rivet = stud(0.014, 0.012, materials.brass);
    rivet.position.set(x, y, LEAF_THICKNESS / 2 + 0.006);
    leaf.add(rivet);
  }

  return leaf;
}

// mirilla de speakeasy clásica: ventanilla RECTANGULAR horizontal con marco
// de latón y trampilla de madera cerrada al ras (la versión anterior — aro
// + trampilla aparcada al lado — se leía como una "C" al revés)
function buildPeephole() {
  const group = new THREE.Group();
  group.position.set(0, PEEPHOLE_Y - DOOR_HEIGHT / 2, LEAF_THICKNESS / 2);

  const openingWidth = 0.24;
  const openingHeight = 0.09;
  const frameBar = 0.022;

  // marco: cuatro barras de latón alrededor del hueco
  const top = slab(openingWidth + frameBar * 2, frameBar, 0.02, materials.brass);
  top.position.set(0, openingHeight / 2 + frameBar / 2, 0.004);
  const bottom = top.clone();
  bottom.position.y = -(openingHeight / 2 + frameBar / 2);
  const left = slab(frameBar, openingHeight, 0.02, materials.brass);
  left.position.set(-(openingWidth / 2 + frameBar / 2), 0, 0.004);
  const right = left.clone();
  right.position.x = openingWidth / 2 + frameBar / 2;
  group.add(top, bottom, left, right);

  // trampilla de madera cerrada, al ras del marco, ligeramente hundida
  const shutter = slab(openingWidth, openingHeight, 0.014, materials.woodTrim);
  shutter.position.z = -0.002;
  group.add(shutter);

  // pomito de latón centrado para deslizarla
  const pull = stud(0.011, 0.022, materials.brass);
  pull.position.set(0, 0, 0.012);
  group.add(pull);

  return group;
}

// tirador y bisagras de latón
function buildHardware() {
  const group = new THREE.Group();

  const handleX = DOOR_WIDTH / 2 - 0.16;

  const backplate = slab(0.05, 0.24, 0.012, materials.brass);
  backplate.position.set(handleX, -0.15, LEAF_THICKNESS / 2 + 0.006);
  group.add(backplate);

  const grip = stud(0.014, 0.16, materials.brass);
  grip.rotation.z = Math.PI / 2;
  grip.rotation.x = 0;
  grip.position.set(handleX, -0.15, LEAF_THICKNESS / 2 + 0.03);
  group.add(grip);

  // tres bisagras en el canto izquierdo (visibles desde dentro del salón)
  for (const y of [-0.75, 0, 0.75]) {
    const hinge = slab(0.03, 0.16, 0.02, materials.brass);
    hinge.position.set(-(DOOR_WIDTH / 2 - 0.02), y, LEAF_THICKNESS / 2 + 0.01);
    group.add(hinge);
  }

  return group;
}

/**
 * Monta la puerta de entrada (hoja + marco + mirilla + herrajes) en el
 * hueco de la pared sur y la añade a la escena. Cerrada, sin luces nuevas.
 * @param {THREE.Scene} scene
 * @returns {THREE.Group}
 */
export function addDoor(scene) {
  const door = new THREE.Group();
  door.name = 'puerta-entrada';

  door.add(buildFrame());
  door.add(buildLeaf());
  door.add(buildPeephole());
  door.add(buildHardware());

  // el hueco está centrado en x=0, pared sur (z = ROOM.depth / 2); la hoja
  // se apoya al ras del hueco, ligeramente retranqueada dentro del muro.
  // GIRADA 180°: los detalles (entrepaños, mirilla, herrajes) se montan en
  // la cara +Z del grupo, y sin el giro miraban hacia FUERA del salón —
  // desde dentro se veía una tabla lisa (cazado por Iulian, 2026-07-13)
  door.rotation.y = Math.PI;
  door.position.set(0, DOOR_HEIGHT / 2, ROOM.depth / 2 - WALL_THICKNESS / 2 - LEAF_THICKNESS / 2 - 0.005);

  scene.add(door);
  return door;
}

export const DOOR_DIMENSIONS = { width: DOOR_WIDTH, height: DOOR_HEIGHT };

