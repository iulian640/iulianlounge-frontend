import { loadProp } from './models';
import { ROOM, TABLE_SPOTS } from './salon';

// Amueblado con assets low-poly (CC0/CC-BY — ver docs/CREDITS.md).
// Alturas en metros reales; loadProp normaliza la escala de cada GLB.

const KENNEY = '/models/kenney/';
const BAR_X = -ROOM.width / 2 + 1.1;
const BACKBAR_X = -ROOM.width / 2 + 0.35;

function tableWithChairs(x, z) {
  const pieces = [
    { url: KENNEY + 'tableCrossCloth.glb', opts: { height: 0.75 }, at: [x, 0, z] },
  ];
  for (let i = 0; i < 3; i++) {
    const angle = (i / 3) * Math.PI * 2 + 0.5;
    const chairX = x + Math.cos(angle) * 0.95;
    const chairZ = z + Math.sin(angle) * 0.95;
    // la silla mira al centro de la mesa
    const rotationY = Math.atan2(x - chairX, z - chairZ);
    pieces.push({
      url: KENNEY + 'chairCushion.glb',
      opts: { height: 0.85, rotationY },
      at: [chairX ,0, chairZ],
    });
  }
  return pieces;
}

function manifest() {
  const props = [];

  for (const [x, z] of TABLE_SPOTS) props.push(...tableWithChairs(x, z));

  // taburetes de barra
  for (let i = 0; i < 5; i++) {
    const z = -7 / 2 + 0.9 + i * ((7 - 1.8) / 4);
    props.push({
      url: KENNEY + 'stoolBar.glb',
      opts: { height: 0.75, rotationY: -Math.PI / 2 },
      at: [BAR_X + 0.85, 0, z],
    });
  }

  // rincón de sofás junto a la pared este
  props.push(
    { url: KENNEY + 'loungeSofaLong.glb', opts: { height: 0.75, rotationY: -Math.PI / 2 }, at: [7.0, 0, 3.4] },
    { url: KENNEY + 'rugRound.glb', opts: { footprint: 3 }, at: [5.9, 0.012, 3.4] },
    { url: KENNEY + 'tableCoffee.glb', opts: { height: 0.45 }, at: [5.8, 0, 3.4] },
    { url: KENNEY + 'lampRoundFloor.glb', opts: { height: 1.65 }, at: [7.1, 0, 2.1] },
  );

  // guardarropa junto a la entrada, radio en la trasbarra, plantas
  props.push(
    { url: KENNEY + 'coatRackStanding.glb', opts: { height: 1.7 }, at: [1.6, 0, 4.7] },
    { url: KENNEY + 'radio.glb', opts: { height: 0.3 }, at: [BACKBAR_X, 1.0, 3.1] },
    { url: KENNEY + 'pottedPlant.glb', opts: { height: 1.1 }, at: [-7.2, 0, 4.5] },
    { url: KENNEY + 'pottedPlant.glb', opts: { height: 1.1 }, at: [7.3, 0, -4.7] },
  );

  // el piano del escenario (Poly by Google, CC-BY — crédito en docs/CREDITS.md)
  props.push({
    url: '/models/piano.glb',
    opts: { height: 1.15, rotationY: 0.35 },
    at: [2.6, 0.4, -4.2],
  });

  return props;
}

export async function furnishSalon(scene) {
  const results = await Promise.allSettled(
    manifest().map(async ({ url, opts, at }) => {
      const prop = await loadProp(url, opts);
      prop.position.set(at[0], at[1], at[2]);
      scene.add(prop);
    }),
  );

  for (const result of results) {
    if (result.status === 'rejected') console.error('[furnish]', result.reason);
  }
}
