import * as THREE from 'three';

// El Salón en volúmenes placeholder (IUL-27).
// Escala tomada del croquis: la barra mide ~7 m. Nada de aquí es asset final.

export const ROOM = { width: 16, depth: 11, height: 3.6 };

// posiciones de las mesas — las consumen furnish.js (muebles) y las lámparas
export const TABLE_SPOTS = [
  [-1.5, 1.8],
  [1.2, -0.6],
  [-3.2, -1.6],
];

// apliques de pared: posición y hacia dónde miran (los consume lights.js)
export const SCONCES = [
  { x: 7.88, z: -1.3, rotY: -Math.PI / 2 }, // pared este
  { x: 7.88, z: 1.3, rotY: -Math.PI / 2 },
  { x: -1.5, z: 5.38, rotY: Math.PI }, // flancos de la puerta
  { x: 1.5, z: 5.38, rotY: Math.PI },
];

// posiciones de las lámparas — las consume también lights.js
export const LAMPS = [
  { x: -6.35, y: 2.45, z: -1.8, intensity: 18, shadow: true }, // barra
  { x: -6.35, y: 2.45, z: 1.8, intensity: 18 },
  ...TABLE_SPOTS.map(([x, z]) => ({ x, y: 2.1, z, intensity: 11 })),
  { x: 4.6, y: 2.25, z: 2.2, intensity: 12, shadow: true }, // blackjack
];

// texturas CC0 de Poly Haven (ver docs/CREDITS.md)
const textureLoader = new THREE.TextureLoader();

function woodTexture(url, repeatX, repeatY, isColor = true) {
  const texture = textureLoader.load(url);
  if (isColor) texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  return texture;
}

export const materials = {
  // parquet de espiga con laca (clearcoat): la madera sola apenas refleja
  // de frente por física; la capa de barniz sí, y es regulable
  woodFloor: new THREE.MeshPhysicalMaterial({
    color: '#8a7160',
    map: woodTexture('/textures/floor-parquet-diff.jpg', 8, 5.5),
    roughnessMap: woodTexture('/textures/floor-parquet-rough.jpg', 8, 5.5, false),
    roughness: 0.85,
    clearcoat: 0.5,
    clearcoatRoughness: 0.35,
    envMapIntensity: 0.7,
  }),
  // la tapa de la barra: madera noble lacada — clearcoat = el barniz,
  // clearcoatRoughness = el difuminado del reflejo
  barWood: new THREE.MeshPhysicalMaterial({
    color: '#a08874',
    map: woodTexture('/textures/bar-wood-diff.jpg', 1, 3.5),
    roughness: 0.6,
    clearcoat: 1,
    clearcoatRoughness: 0.2,
    envMapIntensity: 0.8,
  }),
  woodDark: new THREE.MeshStandardMaterial({ color: '#241811', roughness: 0.8 }),
  wall: new THREE.MeshStandardMaterial({ color: '#10201d', roughness: 0.95 }),
  ceiling: new THREE.MeshStandardMaterial({ color: '#0a1311', roughness: 1 }),
  felt: new THREE.MeshStandardMaterial({ color: '#172925', roughness: 1 }),
  brass: new THREE.MeshStandardMaterial({ color: '#c9a45c', metalness: 1, roughness: 0.5, envMapIntensity: 0.55 }),
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
    emissive: '#ffb46b',
    emissiveIntensity: 2.2,
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
  // mostrador adelantado: deja un pasillo de ~60 cm para el camarero
  const barX = -ROOM.width / 2 + 1.45;

  // mostrador con tapa de madera noble y vivo de latón en el canto
  salon.add(box(0.65, 1.05, barLength, materials.woodDark, barX, 0.525, 0));
  salon.add(box(0.75, 0.05, barLength + 0.1, materials.barWood, barX, 1.075, 0));
  salon.add(box(0.03, 0.03, barLength + 0.1, materials.brass, barX + 0.37, 1.075, 0));

  const backX = -ROOM.width / 2 + 0.35;
  salon.add(box(0.35, 1.0, barLength, materials.woodDark, backX, 0.5, 0));
  // repisas acortadas y desplazadas: el extremo sur de la trasbarra queda
  // libre en altura para el gramófono
  salon.add(box(0.28, 0.05, 5.5, materials.woodDark, backX, 1.55, -0.35));
  salon.add(box(0.28, 0.05, 5.5, materials.woodDark, backX, 2.05, -0.35));

  // panel retroiluminado tras las repisas (las botellas brillan desde detrás)
  const backglow = new THREE.Mesh(
    new THREE.BoxGeometry(0.03, 1.0, 5.4),
    new THREE.MeshStandardMaterial({
      color: '#c47a42',
      emissive: '#ff9d5c',
      emissiveIntensity: 0.45,
    }),
  );
  backglow.name = 'backglow';
  backglow.position.set(-ROOM.width / 2 + 0.12, 1.85, -0.35);
  salon.add(backglow);

  // botellas en la repisa baja — variantes de color, cero assets
  // (la repisa alta la ocupa el champán que coloca furnish.js)
  for (let i = 0; i < 12; i++) {
    const z = -2.8 + i * (4.9 / 11);
    const bottle = new THREE.MeshStandardMaterial({
      color: bottleColors[i % bottleColors.length],
      roughness: 0.15,
    });
    salon.add(cylinder(0.05, 0.3, bottle, backX, 1.55 + 0.175, z, 10));
  }
  // el letrero "IULIAN'S" con letras 3D lo monta letrero.js
}

function brassRim(radius, y) {
  const rim = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.015, 8, 48), materials.brass);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = y;
  rim.castShadow = true;
  return rim;
}

function buildTables(salon) {
  // mesa de blackjack con canto de latón
  const bj = new THREE.Group();
  bj.add(cylinder(0.95, 0.07, materials.felt, 0, 0.785, 0));
  bj.add(brassRim(0.95, 0.79));
  bj.add(cylinder(0.16, 0.75, materials.woodDark, 0, 0.375, 0));
  bj.add(cylinder(0.45, 0.04, materials.woodDark, 0, 0.02, 0));
  bj.position.set(4.6, 0, 2.2);
  bj.name = 'mesa-blackjack';
  salon.add(bj);

  // mesitas de cóctel (Ø64, como en las referencias: la butaca manda sobre
  // la mesa) de madera oscura con canto de latón y vela
  for (const [x, z] of TABLE_SPOTS) {
    const table = new THREE.Group();
    table.add(cylinder(0.32, 0.05, materials.woodDark, 0, 0.745, 0));
    table.add(brassRim(0.32, 0.75));
    table.add(cylinder(0.06, 0.72, materials.woodDark, 0, 0.36, 0));
    table.add(cylinder(0.2, 0.04, materials.woodDark, 0, 0.02, 0));

    const candle = cylinder(0.028, 0.09, materials.bulb, -0.09, 0.815, 0.06, 10);
    candle.castShadow = false;
    table.add(candle);

    table.position.set(x, 0, z);
    salon.add(table);
  }
}

function buildSconces(salon) {
  // apliques procedurales de latón (el modelo cazado traía geometría corrupta)
  for (const { x, z, rotY } of SCONCES) {
    const sconce = new THREE.Group();

    const plate = box(0.05, 0.24, 0.09, materials.brass, 0, 0, 0.025);
    sconce.add(plate);

    const arm = box(0.04, 0.04, 0.16, materials.brass, 0, 0.06, 0.12);
    sconce.add(arm);

    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.03, 0.09, 12), materials.brass);
    cup.position.set(0, 0.09, 0.2);
    cup.castShadow = true;
    sconce.add(cup);

    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 8), materials.bulb);
    bulb.position.set(0, 0.16, 0.2);
    sconce.add(bulb);

    sconce.position.set(x, 2.2, z);
    sconce.rotation.y = rotY;
    salon.add(sconce);
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
  buildSconces(salon);
  buildStage(salon);

  scene.add(salon);
  return salon;
}
