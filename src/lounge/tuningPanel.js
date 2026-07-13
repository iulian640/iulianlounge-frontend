import * as THREE from 'three';
import GUI from 'three/addons/libs/lil-gui.module.min.js';

import { materials } from './salon';

// Panel de afinado de luz (solo DEV): el director de arte ajusta en SU
// pantalla y vuelca los valores por consola para dejarlos fijos en código.

export function createTuningPanel({ scene, renderer, bloom, setQuality, smoke, stageSpots }) {
  const lightsByKind = (kind) => {
    const found = [];
    scene.traverse((o) => {
      if (o.isLight && o.userData.kind === kind) found.push(o);
    });
    return found;
  };

  const params = {
    calidad: 'alta',
    exposicion: renderer.toneMappingExposure,
    bloomFuerza: bloom.strength.value,
    relleno: 1,
    lamparas: 1,
    lamparasPie: 1,
    trasbarra: 1,
    velas: 1,
    letrero: 1,
    escenario: 1,
    reflejos: 0.65,
    barraDifuminado: 1,
    barraBarniz: materials.barWood.clearcoat,
    sueloDifuminado: 0.4,
    sueloBarniz: materials.woodFloor.clearcoat,
    barraVeta: materials.barWood.anisotropy,
    sueloVeta: materials.woodFloor.anisotropy,
    focoIntensidad: 1,
    focoAnchura: 1,
    focoHaz: stageSpots ? stageSpots.beamMaterial.opacity : 0,
    focoLente: stageSpots ? stageSpots.lensMaterial.emissiveIntensity : 0,
    humoOpacidad: smoke ? smoke.opacity.value : 0,
    humoTamano: smoke ? smoke.scaleMul.value : 1,
    humoSoplos: smoke ? smoke.mesh.count : 0,
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
  const backend = window.__loungeBackend || '?';
  const gui = new GUI({ title: `Afinado · ${loadedAt} · ${backend}` });
  gui.add(params, 'calidad', ['alta', 'media', 'baja']).onChange((v) => {
    if (setQuality) setQuality(v);
  });
  gui.add(params, 'exposicion', 0.4, 2.2, 0.05).onChange((v) => {
    renderer.toneMappingExposure = v;
  });
  gui.add(params, 'bloomFuerza', 0, 1, 0.01).onChange((v) => {
    bloom.strength.value = v; // BloomNode (WebGPU): uniformes con .value
  });
  gui.add(params, 'relleno', 0, 2, 0.05).onChange(applyMultiplier('fill'));
  gui.add(params, 'lamparas', 0, 2, 0.05).onChange(applyMultiplier('lamp'));
  gui.add(params, 'lamparasPie', 0, 2, 0.05).name('lámparas pie').onChange(applyMultiplier('pie'));
  gui.add(params, 'velas', 0, 2, 0.05).onChange(applyMultiplier('candle'));
  gui.add(params, 'trasbarra', 0, 2, 0.05).onChange((v) => {
    for (const light of lightsByKind('shelf')) {
      light.intensity = light.userData.baseIntensity * v;
    }
    const backglow = scene.getObjectByName('backglow');
    if (backglow) backglow.material.emissiveIntensity = 0.18 * v; // base = mezcla 2026-07-13 (trasbarra 0.4)
  });
  gui.add(params, 'letrero', 0, 2, 0.05).onChange((v) => {
    // las letras y su baño de luz sobre la pared, a la vez
    applyMultiplier('letrero')(v);
    const texto = scene.getObjectByName('letrero-texto');
    if (texto) texto.material.emissiveIntensity = 0.85 * v; // base = mezcla 2026-07-13 (letrero 0.5)
  });
  gui.add(params, 'escenario', 0, 2, 0.05).onChange(applyMultiplier('escenario'));
  gui.add(params, 'reflejos', 0, 2, 0.05).onChange((v) => {
    scene.environmentIntensity = v;
  });

  // "difuminado" = desenfoque REAL del reflejo de las luces: gobierna la
  // rugosidad de la capa base Y de la laca A LA VEZ (a 0, espejo de agua;
  // a 1, la luz se esparce en un charco suave). Misma semántica en barra y suelo.
  const blur = (material) => (v) => {
    material.roughness = 0.35 + v * 0.65;
    material.clearcoatRoughness = v * 0.8;
  };

  const materialsFolder = gui.addFolder('Materiales');
  materialsFolder.add(params, 'barraBarniz', 0, 1, 0.05).onChange((v) => {
    materials.barWood.clearcoat = v;
  });
  materialsFolder.add(params, 'barraDifuminado', 0, 1, 0.02).onChange(blur(materials.barWood));
  materialsFolder.add(params, 'sueloBarniz', 0, 1, 0.05).onChange((v) => {
    materials.woodFloor.clearcoat = v;
  });
  materialsFolder.add(params, 'sueloDifuminado', 0, 1, 0.02).onChange(blur(materials.woodFloor));
  materialsFolder.add(params, 'barraVeta', 0, 1, 0.05).onChange((v) => {
    materials.barWood.anisotropy = v;
  });
  materialsFolder.add(params, 'sueloVeta', 0, 1, 0.05).onChange((v) => {
    materials.woodFloor.anisotropy = v;
  });

  if (stageSpots) {
    // los focos de trípode del escenario: luz, haz de niebla y lente
    const focoFolder = gui.addFolder('Focos');
    focoFolder.add(params, 'focoIntensidad', 0, 2, 0.05).name('intensidad').onChange(applyMultiplier('foco'));
    focoFolder.add(params, 'focoAnchura', 0.5, 2.5, 0.05).name('anchura').onChange((v) => {
      stageSpots.setWidth(v);
    });
    focoFolder.add(params, 'focoHaz', 0, 0.15, 0.005).name('haz').onChange((v) => {
      stageSpots.beamMaterial.opacity = v;
    });
    focoFolder.add(params, 'focoLente', 0, 4, 0.1).name('lente').onChange((v) => {
      stageSpots.lensMaterial.emissiveIntensity = v;
    });
  }

  if (smoke) {
    // las volutas de los puros: opacidad (uniform, en vivo) y nº de sprites
    // (mesh.count recorta instancias sin recrear nada; el reparto de origen
    // es round-robin, así que recortar adelgaza TODAS las volutas por igual)
    const humoFolder = gui.addFolder('Humo');
    humoFolder.add(params, 'humoOpacidad', 0, 0.2, 0.005).name('opacidad').onChange((v) => {
      smoke.opacity.value = v;
    });
    humoFolder.add(params, 'humoTamano', 0.5, 5, 0.05).name('tamaño').onChange((v) => {
      smoke.scaleMul.value = v;
    });
    humoFolder
      .add(params, 'humoSoplos', 0, smoke.mesh.count, 15)
      .name('sprites')
      .onChange((v) => {
        smoke.mesh.count = v;
      });
  }

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
