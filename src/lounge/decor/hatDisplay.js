import * as THREE from 'three';

import { NICHE, ROOM, materials } from '../salon';

// Expositor de sombreros EMPOTRADO (referencia: Pictures/speakeasyIdeas,
// vitrina de fedoras con baldas cálidas). Vive dentro del nicho que
// buildShell() abre en la pared norte (NICHE en salon.js) — el mueble se
// hunde en el muro y solo asoma el marco. Germen visual de la tienda.
// Receta de luz = la de la trasbarra: tiras EMISSIVE escondidas bajo cada
// balda (entran al bloom MRT y se ocultan solas en la captura de entorno)
// + una puntual SIN SOMBRA por balda, de alcance corto. Cero sombras nuevas.

const CABINET = {
  width: NICHE.width - 0.06,
  height: NICHE.height - 0.04,
  depth: 0.36,
};
const SHELF_THICKNESS = 0.04;
// suelo de cada nivel, desde la base del mueble (compacto: 4 baldas juntas)
const LEVELS = [0.08, 0.62, 1.16, 1.74];

const WARM = '#ffb46b';

// paleta de fieltros: marfil, marrones, burdeos apagado y "negro" cálido
const FELT_COLORS = ['#e6d9bd', '#6b5137', '#3d2b20', '#7d4038', '#26201c'];
const LEATHER_COLORS = ['#4a3423', '#5c4630', '#3a2c22', '#57332b', '#2e2620'];

function feltMaterial(color) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.95 });
}

// fedora por revolución: ala con leve vuelo, copa entallada, remate redondeado
function makeFedora(color, scale = 1) {
  const hat = new THREE.Group();
  const points = [
    new THREE.Vector2(0.17, 0.0), // borde del ala
    new THREE.Vector2(0.165, 0.012), // vuelo del ala
    new THREE.Vector2(0.1, 0.01),
    new THREE.Vector2(0.095, 0.02), // arranque de la copa
    new THREE.Vector2(0.085, 0.09),
    new THREE.Vector2(0.06, 0.115), // entalle superior
    new THREE.Vector2(0.0, 0.125), // remate
  ];
  const body = new THREE.Mesh(new THREE.LatheGeometry(points, 28), feltMaterial(color));
  body.castShadow = true;
  hat.add(body);

  // cinta oscura al pie de la copa
  const band = new THREE.Mesh(
    new THREE.CylinderGeometry(0.098, 0.098, 0.028, 28, 1, true),
    new THREE.MeshStandardMaterial({ color: '#1a1512', roughness: 0.8 }),
  );
  band.position.y = 0.032;
  hat.add(band);

  hat.scale.setScalar(scale);
  return hat;
}

// azar CONGELADO (LCG con semilla fija): el desorden es siempre el mismo en
// cada carga — parece vivido, no recolocado a cada visita
let seed = 7;
function rand() {
  seed = (seed * 16807) % 2147483647;
  return seed / 2147483647;
}

// pila o hilera de libros de cuero, con el desorden de un mueble usado:
// lomos desalineados, algún libro vencido sobre el resto de la hilera
function makeBooks({ count, upright, tones }) {
  const group = new THREE.Group();
  let offset = 0;
  for (let i = 0; i < count; i++) {
    const tone = tones[i % tones.length];
    const material = new THREE.MeshStandardMaterial({ color: tone, roughness: 0.85 });
    if (upright) {
      const height = 0.2 + (i % 3) * 0.02;
      const book = new THREE.Mesh(new THREE.BoxGeometry(0.035, height, 0.15), material);
      const isLast = i === count - 1;
      if (isLast) {
        // el último se vence contra la hilera, como recién consultado
        book.rotation.z = 0.28;
        book.position.set(offset + 0.025, height / 2 - 0.004, 0);
      } else {
        book.position.set(offset, height / 2, (rand() - 0.5) * 0.02); // lomos desalineados
      }
      book.castShadow = true;
      group.add(book);
      offset += 0.04;
    } else {
      const width = 0.19 - (i % 2) * 0.02;
      const book = new THREE.Mesh(new THREE.BoxGeometry(width, 0.035, 0.14), material);
      book.position.set((rand() - 0.5) * 0.03, 0.0175 + i * 0.035, (rand() - 0.5) * 0.02);
      book.rotation.y = (rand() - 0.5) * 0.18; // pila girada, no de escuadra
      book.castShadow = true;
      group.add(book);
    }
  }
  return group;
}

// velo de polvo asentado: puntitos pálidos dispersos en una CanvasTexture
// que se posa sobre cada balda (alphaMap: solo se ven las motas)
function makeDustTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, 256, 128);
  for (let i = 0; i < 260; i++) {
    const brightness = 40 + Math.floor(rand() * 90);
    ctx.fillStyle = `rgb(${brightness},${brightness},${brightness})`;
    const radius = rand() < 0.9 ? 0.6 : 1.4; // casi todo motas, alguna pelusa
    ctx.beginPath();
    ctx.arc(rand() * 256, rand() * 128, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

// licorera de cristal con licor ámbar y tapón
function makeDecanter() {
  const group = new THREE.Group();
  const glass = new THREE.MeshPhysicalMaterial({
    color: '#a8552f',
    roughness: 0.05,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.1,
    envMapIntensity: 1.2,
  });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.058, 0.16, 10), glass);
  body.position.y = 0.08;
  body.castShadow = true;
  group.add(body);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.024, 0.07, 10), glass);
  neck.position.y = 0.19;
  group.add(neck);
  const stopper = new THREE.Mesh(new THREE.SphereGeometry(0.024, 10, 8), glass);
  stopper.position.y = 0.24;
  group.add(stopper);
  return group;
}

function box(width, height, depth, material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function addHatDisplay(scene) {
  const display = new THREE.Group();
  display.name = 'expositor-sombreros';
  const { width, height, depth } = CABINET;

  // caja del mueble: laterales, techo, base y trasera — todo dentro del nicho
  const side = () => box(0.05, height, depth, materials.woodTrim);
  const left = side();
  left.position.set(-width / 2 + 0.025, height / 2, 0);
  const right = side();
  right.position.set(width / 2 - 0.025, height / 2, 0);
  const top = box(width, 0.07, depth, materials.woodTrim);
  top.position.set(0, height - 0.035, 0);
  const base = box(width, LEVELS[0], depth, materials.woodTrim);
  base.position.set(0, LEVELS[0] / 2, 0);
  const back = box(width - 0.08, height, 0.02, materials.woodDark);
  back.position.set(0, height / 2, -depth / 2 + 0.02);
  display.add(left, right, top, base, back);

  // marco exterior: cuatro molduras que asoman del muro y tapan la junta
  // nicho-pared (lo único del mueble que sobresale hacia el salón)
  const trimDepth = 0.05;
  const trimZ = depth / 2 + trimDepth / 2 - 0.01;
  const trimTop = box(width + 0.24, 0.12, trimDepth, materials.woodTrim);
  trimTop.position.set(0, height + 0.04, trimZ);
  const trimBottom = box(width + 0.24, 0.12, trimDepth, materials.woodTrim);
  trimBottom.position.set(0, -0.04, trimZ);
  const trimLeft = box(0.12, height + 0.2, trimDepth, materials.woodTrim);
  trimLeft.position.set(-(width / 2 + 0.06), height / 2, trimZ);
  const trimRight = box(0.12, height + 0.2, trimDepth, materials.woodTrim);
  trimRight.position.set(width / 2 + 0.06, height / 2, trimZ);
  display.add(trimTop, trimBottom, trimLeft, trimRight);

  // material de las tiras de luz escondidas (entra al bloom, fuera del env)
  const stripMaterial = new THREE.MeshStandardMaterial({
    color: '#000000',
    emissive: WARM,
    emissiveIntensity: 2.2,
  });

  for (const [level, y] of LEVELS.entries()) {
    // balda (la del nivel 0 es la base, ya puesta)
    if (level > 0) {
      const shelf = box(width - 0.1, SHELF_THICKNESS, depth - 0.05, materials.woodTrim);
      shelf.position.set(0, y - SHELF_THICKNESS / 2, 0);
      display.add(shelf);
    }
    const ceilingY = level < LEVELS.length - 1 ? LEVELS[level + 1] - SHELF_THICKNESS : height - 0.07;

    // faldón: listón que cuelga del canto delantero de la balda de arriba y
    // OCULTA la tira de luz a la vista — el resplandor se queda dentro,
    // lavando el fondo y el género (iluminación de cornisa de toda la vida)
    const pelmet = box(width - 0.1, 0.06, 0.016, materials.woodTrim);
    pelmet.position.set(0, ceilingY - 0.03, depth / 2 - 0.055);
    display.add(pelmet);

    // tira emissive retranqueada tras el faldón, pegada al techo del nivel
    const strip = new THREE.Mesh(new THREE.BoxGeometry(width - 0.14, 0.012, 0.012), stripMaterial);
    strip.position.set(0, ceilingY - 0.012, depth / 2 - 0.13);
    strip.userData.hideFromEnv = true;
    display.add(strip);

    // luz real del nivel: puntual corta SIN sombra, también tras el faldón
    const glow = new THREE.PointLight(WARM, 0.9, 0.85, 2);
    glow.position.set(0, ceilingY - 0.05, depth / 2 - 0.16);
    glow.userData.kind = 'vitrina';
    display.add(glow);

    // velo de polvo sobre la balda (solo motas, vía alphaMap)
    const dust = new THREE.Mesh(
      new THREE.PlaneGeometry(width - 0.12, depth - 0.08),
      new THREE.MeshStandardMaterial({
        color: '#d9d0bd',
        alphaMap: makeDustTexture(),
        transparent: true,
        opacity: 0.22,
        roughness: 1,
        depthWrite: false,
      }),
    );
    dust.rotation.x = -Math.PI / 2;
    dust.position.set(0, y + 0.003, 0);
    display.add(dust);
  }

  // cristal de la vitrina: una luna tras el marco, con un punto de bruma
  // (roughness) para que se note vivida — refleja el club vía envMap
  const glass = new THREE.Mesh(
    new THREE.BoxGeometry(width - 0.02, height - 0.06, 0.006),
    new THREE.MeshPhysicalMaterial({
      color: '#dfe4da',
      transparent: true,
      opacity: 0.09,
      roughness: 0.16,
      metalness: 0,
      envMapIntensity: 1.3,
      depthWrite: false,
    }),
  );
  glass.position.set(0, height / 2, depth / 2 - 0.004);
  glass.userData.hideFromEnv = true;
  display.add(glass);

  // ── el género, nivel a nivel — composición compacta de la referencia ─────
  const place = (object, level, x, z = 0, rotationY = 0) => {
    object.position.x += x;
    object.position.y += LEVELS[level];
    object.position.z += z;
    object.rotation.y = rotationY;
    display.add(object);
    return object;
  };

  // nivel 3 (arriba): libros a los lados, fedora marfil en el centro
  place(makeBooks({ count: 6, upright: true, tones: LEATHER_COLORS }), 3, -0.78, -0.04);
  place(makeFedora(FELT_COLORS[0], 1.05), 3, 0.03, -0.01, 0.2);
  place(makeBooks({ count: 5, upright: true, tones: [...LEATHER_COLORS].reverse() }), 3, 0.56, -0.04);

  // nivel 2: pila tumbada + fedora oscura + hilera vertical
  place(makeBooks({ count: 4, upright: false, tones: LEATHER_COLORS }), 2, -0.64, -0.02);
  place(makeFedora(FELT_COLORS[4], 1.0), 2, -0.04, 0, 0.3);
  place(makeBooks({ count: 4, upright: true, tones: LEATHER_COLORS }), 2, 0.46, -0.04);

  // nivel 1: tres fedoras, el escaparate principal
  place(makeFedora(FELT_COLORS[2], 0.92), 1, -0.58, -0.02, -0.35);
  place(makeFedora(FELT_COLORS[0], 1.08), 1, -0.02, 0.01, -0.12);
  place(makeFedora(FELT_COLORS[1], 0.92), 1, 0.58, 0.02, 0.35);

  // nivel 0 (abajo): fedora sobre libros + licorera + fedora burdeos
  place(makeBooks({ count: 3, upright: false, tones: LEATHER_COLORS }), 0, -0.56, 0);
  place(makeFedora(FELT_COLORS[1], 0.9), 0, -0.56, 0, 0.4).position.y += 0.105;
  place(makeDecanter(), 0, 0.06, -0.03);
  place(makeBooks({ count: 3, upright: false, tones: [...LEATHER_COLORS].reverse() }), 0, 0.54, 0);
  place(makeFedora(FELT_COLORS[3], 0.9), 0, 0.54, 0, -0.4).position.y += 0.105;

  // dentro del nicho: el frente del mueble queda al ras de la cara interior
  // del muro norte (el muro mide 0.2 de grosor; el fondo del mueble se hunde
  // más allá de la cara exterior — ahí fuera no hay nada que ver)
  const wallInnerZ = -ROOM.depth / 2 + 0.1;
  display.position.set(NICHE.x, NICHE.bottom, wallInnerZ - depth / 2 + 0.01);
  scene.add(display);
  return display;
}
