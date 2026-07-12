import * as THREE from 'three';

// El Salón en volúmenes placeholder (IUL-27).
// Escala tomada del croquis: la barra mide ~7 m. Nada de aquí es asset final.

export const ROOM = { width: 16, depth: 11, height: 3.6 };

// posiciones de las lámparas — las consume también lights.js
export const LAMPS = [
  { x: -6.0, y: 2.45, z: -1.8, intensity: 26, shadow: true }, // barra
  { x: -6.0, y: 2.45, z: 1.8, intensity: 26 },
  { x: -1.5, y: 2.1, z: 1.8, intensity: 16 }, // mesas
  { x: 1.2, y: 2.1, z: -0.6, intensity: 16 },
  { x: -3.2, y: 2.1, z: -1.6, intensity: 16 },
  { x: 4.6, y: 2.25, z: 2.2, intensity: 22, shadow: true }, // blackjack
];

const materials = {
  woodFloor: new THREE.MeshStandardMaterial({ color: '#3b2a1d', roughness: 0.85 }),
  woodDark: new THREE.MeshStandardMaterial({ color: '#241811', roughness: 0.8 }),
  wall: new THREE.MeshStandardMaterial({ color: '#10201d', roughness: 0.95 }),
  ceiling: new THREE.MeshStandardMaterial({ color: '#0a1311', roughness: 1 }),
  felt: new THREE.MeshStandardMaterial({ color: '#172925', roughness: 1 }),
  brass: new THREE.MeshStandardMaterial({ color: '#c9a45c', metalness: 1, roughness: 0.35 }),
  velvet: new THREE.MeshStandardMaterial({ color: '#3d1b20', roughness: 1 }),
  leather: new THREE.MeshStandardMaterial({ color: '#4a2c1e', roughness: 0.7 }),
  shade: new THREE.MeshStandardMaterial({
    color: '#1c2a26',
    roughness: 0.6,
    emissive: '#ffb46b',
    emissiveIntensity: 0.15,
  }),
  bulb: new THREE.MeshStandardMaterial({
    color: '#ffd9a0',
    emissive: '#ffd9a0',
    emissiveIntensity: 3,
  }),
  marquee: new THREE.MeshStandardMaterial({
    color: '#ffd9a0',
    emissive: '#ffc887',
    emissiveIntensity: 1.4,
  }),
};

const bottleColors = ['#5a6b3a', '#7a4a24', '#3d5a52', '#8a6a33', '#4a3040'];

function box(width, height, depth, material, x, y, z) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function cylinder(radius, height, material, x, y, z, radialSegments = 24) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, height, radialSegments),
    material,
  );
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function stool(x, z, seatY = 0.75) {
  const group = new THREE.Group();
  group.add(cylinder(0.16, seatY - 0.06, materials.woodDark, 0, (seatY - 0.06) / 2, 0, 12));
  group.add(cylinder(0.23, 0.09, materials.leather, 0, seatY - 0.045, 0));
  group.position.set(x, 0, z);
  return group;
}

function buildShell(salon) {
  const { width: w, depth: d, height: h } = ROOM;
  const t = 0.2; // grosor de muros

  const floor = box(w, t, d, materials.woodFloor, 0, -t / 2, 0);
  floor.castShadow = false;
  salon.add(floor);

  const ceiling = box(w, t, d, materials.ceiling, 0, h + t / 2, 0);
  ceiling.castShadow = false;
  salon.add(ceiling);

  salon.add(box(w, h, t, materials.wall, 0, h / 2, -d / 2)); // norte
  salon.add(box(t, h, d, materials.wall, -w / 2, h / 2, 0)); // oeste (la barra)
  salon.add(box(t, h, d, materials.wall, w / 2, h / 2, 0)); // este

  // sur con hueco de entrada (la puerta escondida)
  const doorWidth = 1.4;
  const doorHeight = 2.2;
  const sideWidth = (w - doorWidth) / 2;
  salon.add(box(sideWidth, h, t, materials.wall, -(doorWidth + sideWidth) / 2, h / 2, d / 2));
  salon.add(box(sideWidth, h, t, materials.wall, (doorWidth + sideWidth) / 2, h / 2, d / 2));
  salon.add(box(doorWidth, h - doorHeight, t, materials.wall, 0, doorHeight + (h - doorHeight) / 2, d / 2));

  // zócalo de madera con remate de latón (paredes norte y este)
  salon.add(box(w - 0.4, 0.9, 0.06, materials.woodDark, 0, 0.45, -d / 2 + 0.13));
  salon.add(box(w - 0.4, 0.03, 0.07, materials.brass, 0, 0.92, -d / 2 + 0.13));
  salon.add(box(0.06, 0.9, d - 0.4, materials.woodDark, w / 2 - 0.13, 0.45, 0));
  salon.add(box(0.07, 0.03, d - 0.4, materials.brass, w / 2 - 0.13, 0.92, 0));

  // cuadros con marco de latón en la pared este
  for (const z of [-2.6, 0, 2.6]) {
    salon.add(box(0.05, 1.0, 0.75, materials.brass, w / 2 - 0.14, 1.9, z));
    salon.add(box(0.06, 0.88, 0.63, materials.velvet, w / 2 - 0.15, 1.9, z));
  }
}

function buildBar(salon) {
  const barLength = 7;
  const barX = -ROOM.width / 2 + 1.1;

  // mostrador con tapa de latón y trasbarra con estanterías
  salon.add(box(0.65, 1.05, barLength, materials.woodDark, barX, 0.525, 0));
  salon.add(box(0.75, 0.04, barLength + 0.1, materials.brass, barX, 1.07, 0));

  const backX = -ROOM.width / 2 + 0.35;
  salon.add(box(0.35, 1.0, barLength, materials.woodDark, backX, 0.5, 0));
  for (const shelfY of [1.55, 2.05]) {
    salon.add(box(0.28, 0.05, barLength - 0.8, materials.woodDark, backX, shelfY, 0));

    // botellas — variantes de color, cero assets (mitigación del riesgo nº 2)
    for (let i = 0; i < 12; i++) {
      const z = -(barLength - 1.4) / 2 + i * ((barLength - 1.4) / 11);
      const bottle = new THREE.MeshStandardMaterial({
        color: bottleColors[i % bottleColors.length],
        roughness: 0.15,
      });
      salon.add(cylinder(0.05, 0.3, bottle, backX, shelfY + 0.175, z, 10));
    }
  }

  // letrero "Iulian's" — placeholder emissive, candidato a bloom (CONCEPT.md)
  const sign = box(0.08, 0.5, 2.6, materials.marquee, -ROOM.width / 2 + 0.15, 2.85, 0);
  sign.castShadow = false;
  sign.name = 'letrero';
  salon.add(sign);

  // taburetes de barra
  for (let i = 0; i < 5; i++) {
    const z = -barLength / 2 + 0.9 + i * ((barLength - 1.8) / 4);
    salon.add(stool(barX + 0.78, z, 0.78));
  }
}

function buildTables(salon) {
  // mesa de blackjack (semicírculo aproximado con un cilindro en blockout)
  const bj = new THREE.Group();
  bj.add(cylinder(1.15, 0.08, materials.felt, 0, 0.78, 0));
  bj.add(cylinder(0.18, 0.74, materials.woodDark, 0, 0.37, 0));
  bj.position.set(4.6, 0, 2.2);
  bj.name = 'mesa-blackjack';
  salon.add(bj);

  // mesas redondas con taburetes
  const spots = [
    [-1.5, 1.8],
    [1.2, -0.6],
    [-3.2, -1.6],
  ];
  for (const [x, z] of spots) {
    const table = new THREE.Group();
    table.add(cylinder(0.5, 0.05, materials.woodDark, 0, 0.75, 0));
    table.add(cylinder(0.09, 0.73, materials.woodDark, 0, 0.365, 0));
    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 2;
      table.add(stool(Math.cos(angle) * 0.85, Math.sin(angle) * 0.85, 0.5));
    }
    table.position.set(x, 0, z);
    salon.add(table);
  }
}

function buildLampFixtures(salon) {
  // la luz necesita origen visible: cable + pantalla + bombilla por lámpara
  for (const { x, y, z } of LAMPS) {
    const fixture = new THREE.Group();

    const cordHeight = ROOM.height - (y + 0.3);
    fixture.add(cylinder(0.012, cordHeight, materials.woodDark, 0, y + 0.3 + cordHeight / 2, 0, 6));

    const shade = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.34, 0.26, 20, 1, true),
      materials.shade,
    );
    shade.material.side = THREE.DoubleSide;
    shade.position.set(0, y + 0.18, 0);
    shade.castShadow = true;
    fixture.add(shade);

    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8), materials.bulb);
    bulb.position.set(0, y + 0.05, 0);
    fixture.add(bulb);

    fixture.position.set(x, 0, z);
    salon.add(fixture);
  }
}

function buildStage(salon) {
  const stage = new THREE.Group();
  stage.add(box(3.6, 0.4, 2.4, materials.woodDark, 0, 0.2, 0));
  stage.add(box(3.6, 0.04, 2.4, materials.brass, 0, 0.42, 0));

  // candilejas art déco al borde del escenario
  for (let i = 0; i < 5; i++) {
    const x = -1.5 + i * 0.75;
    const footlight = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), materials.bulb);
    footlight.position.set(x, 0.47, 1.12);
    stage.add(footlight);
  }

  // cortina de terciopelo al fondo
  stage.add(box(3.9, ROOM.height - 0.5, 0.12, materials.velvet, 0, (ROOM.height - 0.5) / 2 + 0.4, -1.15));

  stage.position.set(3.2, 0, -ROOM.depth / 2 + 1.35);
  stage.name = 'escenario';
  salon.add(stage);
}

export function buildSalon(scene) {
  const salon = new THREE.Group();
  salon.name = 'el-salon';

  buildShell(salon);
  buildBar(salon);
  buildTables(salon);
  buildLampFixtures(salon);
  buildStage(salon);

  scene.add(salon);
  return salon;
}
