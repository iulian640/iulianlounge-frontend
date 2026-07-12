import * as THREE from 'three';
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
    lamparas: 1,
    trasbarra: 1,
    velas: 1,
    reflejos: 0.5,
    barraDifuminado: materials.barWood.clearcoatRoughness,
    barraBarniz: materials.barWood.clearcoat,
    sueloDifuminado: materials.woodFloor.clearcoatRoughness,
    sueloBarniz: materials.woodFloor.clearcoat,
    barraVeta: materials.barWood.anisotropy,
    sueloVeta: materials.woodFloor.anisotropy,
    verLuces: false,
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

  // la hora en el título delata pestañas rancias sirviendo código viejo
  const loadedAt = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  const gui = new GUI({ title: `Afinado Iulian's · ${loadedAt}` });
  gui.add(params, 'exposicion', 0.4, 2.2, 0.05).onChange((v) => {
    renderer.toneMappingExposure = v;
  });
  gui.add(params, 'bloomFuerza', 0, 0.5, 0.01).onChange((v) => {
    bloom.strength = v;
  });
  gui.add(params, 'relleno', 0, 2, 0.05).onChange(applyMultiplier('fill'));
  gui.add(params, 'lamparas', 0, 2, 0.05).onChange(applyMultiplier('lamp'));
  gui.add(params, 'velas', 0, 2, 0.05).onChange(applyMultiplier('candle'));
  gui.add(params, 'trasbarra', 0, 2, 0.05).onChange((v) => {
    for (const light of lightsByKind('shelf')) {
      light.intensity = light.userData.baseIntensity * v;
    }
    const backglow = scene.getObjectByName('backglow');
    if (backglow) backglow.material.emissiveIntensity = 0.45 * v;
  });
  gui.add(params, 'reflejos', 0, 2, 0.05).onChange((v) => {
    scene.environmentIntensity = v;
  });

  const materialsFolder = gui.addFolder('Materiales');
  materialsFolder.add(params, 'barraBarniz', 0, 1, 0.05).onChange((v) => {
    materials.barWood.clearcoat = v;
  });
  materialsFolder.add(params, 'barraDifuminado', 0, 0.8, 0.02).onChange((v) => {
    materials.barWood.clearcoatRoughness = v;
  });
  // los dos mandos del suelo gobiernan TODO su brillo: laca + capa base +
  // reflejo de entorno a la vez (antes solo tocaban la laca y apenas se notaba)
  materialsFolder.add(params, 'sueloBarniz', 0, 1, 0.05).onChange((v) => {
    materials.woodFloor.clearcoat = v;
    materials.woodFloor.envMapIntensity = 0.2 + v * 0.8;
  });
  materialsFolder.add(params, 'sueloDifuminado', 0, 1, 0.02).onChange((v) => {
    materials.woodFloor.clearcoatRoughness = v * 0.8;
    materials.woodFloor.roughness = 0.5 + v * 0.7; // >1 se recorta: mate total
  });
  materialsFolder.add(params, 'barraVeta', 0, 1, 0.05).onChange((v) => {
    materials.barWood.anisotropy = v;
  });
  materialsFolder.add(params, 'sueloVeta', 0, 1, 0.05).onChange((v) => {
    materials.woodFloor.anisotropy = v;
  });

  // marcadores de posición de cada luz, para saber QUÉ se está afinando
  let helpers = null;
  gui.add(params, 'verLuces').name('ver luces (debug)').onChange((on) => {
    if (on && !helpers) {
      helpers = [];
      scene.traverse((o) => {
        if (o.isPointLight) helpers.push(new THREE.PointLightHelper(o, 0.12));
        if (o.isSpotLight) helpers.push(new THREE.SpotLightHelper(o));
      });
      for (const h of helpers) scene.add(h);
    }
    if (helpers) for (const h of helpers) h.visible = on;
  });

  gui.add(params, 'volcarValores').name('▶ volcar valores a consola');

  return gui;
}
