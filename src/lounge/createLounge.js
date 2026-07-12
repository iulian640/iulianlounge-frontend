import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import Stats from 'three/addons/libs/stats.module.js';

import { buildSalon, ROOM } from './salon';
import { addSalonLights } from './lights';
import { furnishSalon } from './furnish';

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

  // cámara libre para inspeccionar el blockout; la sustituye la tercera
  // persona en IUL-28
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 1.2, 0);
  controls.enableDamping = true;
  controls.minPolarAngle = 0.85; // no subir por encima de las lámparas
  controls.maxPolarAngle = Math.PI / 2 + 0.05;
  controls.minDistance = 1;
  controls.maxDistance = 6;
  controls.update();

  buildSalon(scene);
  addSalonLights(scene);
  furnishSalon(scene).catch((error) => console.error('[lounge] amueblado incompleto:', error));

  const stats = new Stats();
  document.body.appendChild(stats.dom);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  function tick() {
    controls.update();
    clampCameraToRoom(camera);
    renderer.render(scene, camera);
    stats.update();
    requestAnimationFrame(tick);
  }
  tick();
}
