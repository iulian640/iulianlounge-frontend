import * as THREE from 'three';

// El Salón en volúmenes placeholder (IUL-27).
// Escala tomada del croquis: la barra mide ~7 m. Nada de aquí es asset final.

export const ROOM = { width: 16, depth: 11, height: 3.6 };

const materials = {
  woodFloor: new THREE.MeshStandardMaterial({ color: '#3b2a1d', roughness: 0.85 }),
  woodDark: new THREE.MeshStandardMaterial({ color: '#241811', roughness: 0.8 }),
  wall: new THREE.MeshStandardMaterial({ color: '#10201d', roughness: 0.95 }),
  ceiling: new THREE.MeshStandardMaterial({ color: '#0a1311', roughness: 1 }),
  felt: new THREE.MeshStandardMaterial({ color: '#172925', roughness: 1 }),
  brass: new THREE.MeshStandardMaterial({ color: '#c9a45c', metalness: 1, roughness: 0.35 }),
  velvet: new THREE.MeshStandardMaterial({ color: '#3d1b20', roughness: 1 }),
  leather: new THREE.MeshStandardMaterial({ color: '#4a2c1e', roughness: 0.7 }),
  marquee: new THREE.MeshStandardMaterial({
    color: '#e8cd8f',
    emissive: '#e8cd8f',
    emissiveIntensity: 2.2,
  }),
};

function box(width, height, depth, material, x, y, z) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function cylinder(radius, height, material, x, y, z) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 24), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
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
}

function buildBar(salon) {
  const barLength = 7;
  const barX = -ROOM.width / 2 + 1.1;

  // mostrador con tapa de latón y trasbarra con estanterías
  salon.add(box(0.65, 1.05, barLength, materials.woodDark, barX, 0.525, 0));
  salon.add(box(0.75, 0.04, barLength + 0.1, materials.brass, barX, 1.07, 0));

  const backX = -ROOM.width / 2 + 0.35;
  salon.add(box(0.35, 1.0, barLength, materials.woodDark, backX, 0.5, 0));
  for (const shelfY of [1.6, 2.1, 2.6]) {
    salon.add(box(0.28, 0.05, barLength - 0.8, materials.woodDark, backX, shelfY, 0));
  }

  // letrero "Iulian's" — placeholder emissive, candidato a bloom (CONCEPT.md)
  const sign = box(0.1, 0.7, 3.2, materials.marquee, -ROOM.width / 2 + 0.16, 2.95, 0);
  sign.castShadow = false;
  sign.name = 'letrero';
  salon.add(sign);

  // taburetes de barra
  for (let i = 0; i < 5; i++) {
    const z = -barLength / 2 + 0.9 + i * ((barLength - 1.8) / 4);
    salon.add(cylinder(0.22, 0.75, materials.leather, barX + 0.75, 0.375, z));
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
      table.add(cylinder(0.19, 0.5, materials.leather, Math.cos(angle) * 0.85, 0.25, Math.sin(angle) * 0.85));
    }
    table.position.set(x, 0, z);
    salon.add(table);
  }
}

function buildStage(salon) {
  const stage = new THREE.Group();
  stage.add(box(3.6, 0.4, 2.4, materials.woodDark, 0, 0.2, 0));
  stage.add(box(3.6, 0.04, 2.4, materials.brass, 0, 0.42, 0));

  // cortina de terciopelo al fondo
  const curtain = box(3.9, ROOM.height - 0.5, 0.12, materials.velvet, 0, (ROOM.height - 0.5) / 2 + 0.4, -1.15);
  stage.add(curtain);

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
  buildStage(salon);

  scene.add(salon);
  return salon;
}
