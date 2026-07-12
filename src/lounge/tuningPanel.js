import GUI from 'three/addons/libs/lil-gui.module.min.js';

import { materials } from './salon';

// Panel de afinado de luz (solo DEV): el director de arte ajusta en SU
// pantalla y vuelca los valores por consola para dejarlos fijos en código.

export function createTuningPanel({ scene, renderer, bloom }) {
  const lightsByKind = (kind) => {
    const found = [];
    scene.traverse((o) => {
      if (o.isLight && o.userData.kind === kind) found.push(o);
    });
    return found;
  };

  const params = {
    exposicion: renderer.toneMappingExposure,
    bloomFuerza: bloom.strength,
    relleno: 1,
    rebote: 1,
    lamparas: 1,
    trasbarra: 1,
    velas: 1,
    reflejos: 0.3,
    barraRugosidad: materials.barWood.roughness,
    barraReflejo: materials.barWood.envMapIntensity,
    sueloRugosidad: materials.woodFloor.roughness,
    sueloReflejo: materials.woodFloor.envMapIntensity,
    volcarValores() {
      const dump = { ...params };
      delete dump.volcarValores;
      console.log('[afinado] pásale esto a Claude:', JSON.stringify(dump, null, 2));
    },
  };

  const applyMultiplier = (kind) => (value) => {
    for (const light of lightsByKind(kind)) {
      light.intensity = light.userData.baseIntensity * value;
    }
  };

  const gui = new GUI({ title: "Afinado Iulian's" });
  gui.add(params, 'exposicion', 0.4, 2.2, 0.05).onChange((v) => {
    renderer.toneMappingExposure = v;
  });
  gui.add(params, 'bloomFuerza', 0, 0.5, 0.01).onChange((v) => {
    bloom.strength = v;
  });
  gui.add(params, 'relleno', 0, 2, 0.05).onChange(applyMultiplier('fill'));
  gui.add(params, 'rebote', 0, 2, 0.05).onChange(applyMultiplier('bounce'));
  gui.add(params, 'lamparas', 0, 2, 0.05).onChange(applyMultiplier('lamp'));
  gui.add(params, 'velas', 0, 2, 0.05).onChange(applyMultiplier('candle'));
  gui.add(params, 'trasbarra', 0, 2, 0.05).onChange((v) => {
    for (const light of lightsByKind('shelf')) {
      light.intensity = light.userData.baseIntensity * v;
    }
    const backglow = scene.getObjectByName('backglow');
    if (backglow) backglow.material.emissiveIntensity = 0.45 * v;
  });
  gui.add(params, 'reflejos', 0, 1, 0.05).onChange((v) => {
    scene.environmentIntensity = v;
  });

  const materialsFolder = gui.addFolder('Materiales');
  materialsFolder.add(params, 'barraRugosidad', 0.1, 1, 0.05).onChange((v) => {
    materials.barWood.roughness = v;
  });
  materialsFolder.add(params, 'barraReflejo', 0, 1.5, 0.05).onChange((v) => {
    materials.barWood.envMapIntensity = v;
  });
  materialsFolder.add(params, 'sueloRugosidad', 0.2, 1, 0.05).onChange((v) => {
    materials.woodFloor.roughness = v;
  });
  materialsFolder.add(params, 'sueloReflejo', 0, 1.5, 0.05).onChange((v) => {
    materials.woodFloor.envMapIntensity = v;
  });

  gui.add(params, 'volcarValores').name('▶ volcar valores a consola');

  return gui;
}
