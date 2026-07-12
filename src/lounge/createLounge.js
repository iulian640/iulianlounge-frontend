import * as THREE from 'three';
import Stats from 'three/addons/libs/stats.module.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import { buildSalon, materials, ROOM } from './salon';
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
  camera.layers.enable(1); // el suelo vive en la capa 1 (velas sin reflejo)
  camera.position.set(0, 1.7, 4.6);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.3;

  // bloom sutil: solo lo emissive (letrero, bombillas, velas) gana halo —
  // "un único glow lo convierte en pieza de arte; diez lo convierten en feria"
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.1,
    0.5,
    1.4,
  );
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  if (import.meta.env.DEV) {
    // mandos de depuración en consola + panel de afinado del director de arte
    window.__lounge = { scene, camera, bloom, renderer, materials };
    import('./tuningPanel').then(({ createTuningPanel }) =>
      createTuningPanel({ scene, renderer, bloom }),
    );
  }

  // paseo en primera persona (precursor de la tercera persona de IUL-28)
  const walk = createWalkControls(camera, canvas);
  camera.position.set(0, 1.7, 4.6);
  camera.lookAt(-3, 1.5, 0); // al entrar, la mirada cae hacia la barra

  buildSalon(scene);
  addSalonLights(scene);

  // animaciones activas (camarero, banda, ventiladores)
  const updatables = [];
  const ready = Promise.all([
    furnishSalon(scene, updatables).catch((error) => console.error('[lounge] amueblado incompleto:', error)),
    addLetrero(scene).catch((error) => console.error('[lounge] letrero:', error)),
  ]);

  // reflejos de entorno: con el club ya amueblado Y las texturas cargadas,
  // se captura un cubemap desde el centro de la sala y se usa como envMap
  // PBR — la barra, el suelo y las copas reflejan el PROPIO local
  const texturesSettled = new Promise((resolve) => {
    const manager = THREE.DefaultLoadingManager;
    const previous = manager.onLoad;
    manager.onLoad = () => {
      if (previous) previous();
      resolve();
    };
    setTimeout(resolve, 3000); // red de seguridad si todo cargó antes de engancharnos
  });

  Promise.all([ready, texturesSettled]).then(() => {
    const cubeTarget = new THREE.WebGLCubeRenderTarget(256, { type: THREE.HalfFloatType });
    const cubeCamera = new THREE.CubeCamera(0.1, 50, cubeTarget);
    cubeCamera.position.set(0, 1.6, 0);
    for (const face of cubeCamera.children) face.layers.enable(1); // que vea el suelo
    scene.add(cubeCamera);

    // los emissives (bombillas, letrero, trasbarra) se ocultan SOLO durante
    // la captura: si entran en el cubemap, la laca del suelo los unta como
    // globos gigantes con paralaje falso
    const hidden = [];
    try {
      scene.traverse((o) => {
        // solo lo que de verdad brilla: emissive de COLOR no-negro con
        // intensidad real (ojo: emissiveIntensity vale 1 por defecto en TODO
        // material aunque el emissive sea negro — filtrar solo por intensidad
        // oculta la sala entera y el PMREM de una escena vacía sale corrupto),
        // más lo marcado hideFromEnv (los faroles: sus pantallas iluminadas
        // de cerca salen como discos gigantes en la laca)
        const emissive = o.material?.emissive;
        const glows =
          o.isMesh &&
          emissive &&
          emissive.r + emissive.g + emissive.b > 0.1 &&
          o.material.emissiveIntensity > 0.3;
        if (o.visible && (glows || o.userData.hideFromEnv)) {
          o.visible = false;
          hidden.push(o);
        }
      });
      cubeCamera.update(renderer, scene);
    } catch (error) {
      console.error('[lounge] captura de entorno fallida:', error);
    } finally {
      for (const o of hidden) o.visible = true;
      scene.remove(cubeCamera);
    }
    console.log('[lounge] entorno capturado, emissives ocultados:', hidden.length);

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromCubemap(cubeTarget.texture).texture;
    scene.environmentIntensity = 0.5;
    pmrem.dispose();

    // la escena es estática: congelar los mapas de sombra tras la carga
    // ahorra su recálculo en cada frame (las sombras de los personajes en
    // idle quedan fijas — imperceptible y muy barato)
    renderer.shadowMap.autoUpdate = false;
    renderer.shadowMap.needsUpdate = true;
  });

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
