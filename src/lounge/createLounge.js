import * as THREE from 'three';
import Stats from 'three/addons/libs/stats.module.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import { buildSalon, ROOM } from './salon';
import { addSalonLights } from './lights';
import { furnishSalon } from './furnish';
import { addLetrero } from './letrero';
import { createWalkControls } from './walkControls';

// jaula de la cámara: margen respecto a muros, suelo y techo para que la
// órbita nunca atraviese la sala (la tercera persona de IUL-28 traerá su
// propia colisión)
const CAMERA_BOUNDS = {
  x: ROOM.width / 2 - 0.5,
  z: ROOM.depth / 2 - 0.5,
  yMin: 0.4,
  yMax: ROOM.height - 0.4,
};

function clampCameraToRoom(camera) {
  const p = camera.position;
  p.x = THREE.MathUtils.clamp(p.x, -CAMERA_BOUNDS.x, CAMERA_BOUNDS.x);
  p.z = THREE.MathUtils.clamp(p.z, -CAMERA_BOUNDS.z, CAMERA_BOUNDS.z);
  p.y = THREE.MathUtils.clamp(p.y, CAMERA_BOUNDS.yMin, CAMERA_BOUNDS.yMax);
}

export function createLounge(canvas) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#0b1514');
  scene.fog = new THREE.FogExp2('#0b1514', 0.022); // el humo del club

  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 1.7, 4.6);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.26;

  // bloom sutil: solo lo emissive (letrero, bombillas, velas) gana halo —
  // "un único glow lo convierte en pieza de arte; diez lo convierten en feria"
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.15,
    0.4,
    1.3,
  );
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  if (import.meta.env.DEV) {
    // mandos de depuración en consola: __lounge.bloom.strength = ...
    window.__lounge = { scene, camera, bloom, renderer };
  }

  // paseo en primera persona (precursor de la tercera persona de IUL-28)
  const walk = createWalkControls(camera, canvas);
  camera.position.set(0, 1.7, 4.6);
  camera.lookAt(-3, 1.5, 0); // al entrar, la mirada cae hacia la barra

  buildSalon(scene);
  addSalonLights(scene);

  // animaciones activas (camarero, banda, ventiladores)
  const updatables = [];
  furnishSalon(scene, updatables).catch((error) => console.error('[lounge] amueblado incompleto:', error));
  addLetrero(scene).catch((error) => console.error('[lounge] letrero:', error));

  const stats = new Stats();
  document.body.appendChild(stats.dom);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
  });

  const clock = new THREE.Clock();

  function tick() {
    const delta = clock.getDelta();
    for (const update of updatables) update(delta);
    walk.update(delta);
    clampCameraToRoom(camera);
    composer.render();
    stats.update();
    requestAnimationFrame(tick);
  }
  tick();
}
