import * as THREE from 'three';
import { pass, mrt, output, emissive } from 'three/tsl';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import Stats from 'three/addons/libs/stats.module.js';

import { buildSalon, materials, ROOM } from './salon';
import { addSalonLights } from './lights';
import { furnishSalon } from './furnish';
import { addLetrero } from './letrero';
import { createWalkControls } from './walkControls';

// Motor WebGPU (rama feature/webgpu): 'three' está aliasado a 'three/webgpu'
// en vite.config.js — con fallback automático a WebGL2 si el navegador no
// soporta WebGPU. El bloom es SELECTIVO por MRT: solo el canal emissive
// (letrero, velas, bombillas) recibe halo — las superficies iluminadas jamás.

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

export async function createLounge(canvas) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#0b1514');
  scene.fog = new THREE.FogExp2('#0b1514', 0.022); // el humo del club

  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.layers.enable(1); // el suelo vive en la capa 1 (velas sin reflejo)
  camera.position.set(0, 1.7, 4.6);

  const renderer = new THREE.WebGPURenderer({ canvas, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 2.2; // mezcla final de Iulian (2026-07-12)
  await renderer.init();
  // qué motor corre DE VERDAD: WebGPUBackend, o WebGLBackend si el navegador
  // no soporta WebGPU (Brave lo trae desactivado por defecto)
  const backendName = renderer.backend?.isWebGPUBackend ? 'WebGPU' : 'WebGL2 (fallback)';
  console.log('[lounge] motor:', backendName);
  window.__loungeBackend = backendName;

  // bloom selectivo por MRT: la escena escribe color y emissive por separado,
  // el halo se calcula SOLO sobre el emissive — se acabó pelear con umbrales
  const postProcessing = new THREE.RenderPipeline(renderer);
  const scenePass = pass(scene, camera);
  scenePass.setMRT(mrt({ output, emissive }));
  const scenePassColor = scenePass.getTextureNode('output');
  const bloomPass = bloom(scenePass.getTextureNode('emissive'), 0.25, 0.5, 0);
  postProcessing.outputNode = scenePassColor.add(bloomPass);

  if (import.meta.env.DEV) {
    // mandos de depuración en consola + panel de afinado del director de arte
    window.__lounge = { scene, camera, bloom: bloomPass, renderer, materials };
    import('./tuningPanel').then(({ createTuningPanel }) =>
      createTuningPanel({ scene, renderer, bloom: bloomPass }),
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
  // se captura un cubemap desde el centro de la sala y se usa como envMap —
  // la barra, el suelo y las copas reflejan el PROPIO local
  const texturesSettled = new Promise((resolve) => {
    const manager = THREE.DefaultLoadingManager;
    const previous = manager.onLoad;
    manager.onLoad = () => {
      if (previous) previous();
      resolve();
    };
    setTimeout(resolve, 3000); // red de seguridad si todo cargó antes de engancharnos
  });

  Promise.all([ready, texturesSettled]).then(async () => {
    const cubeTarget = new THREE.CubeRenderTarget(256, { type: THREE.HalfFloatType });
    const cubeCamera = new THREE.CubeCamera(0.1, 50, cubeTarget);
    cubeCamera.position.set(0, 1.6, 0);
    for (const face of cubeCamera.children) face.layers.enable(1); // que vea el suelo
    scene.add(cubeCamera);

    // los emissives (bombillas, letrero, trasbarra) se ocultan SOLO durante
    // la captura: si entran en el cubemap, la laca del suelo los unta como
    // globos gigantes con paralaje falso
    const hidden = [];
    const dimmed = [];
    try {
      // la trasbarra se apaga durante la captura: su pared encendida en el
      // cubemap acaba reflejada en el suelo delante de la barra, donde el
      // mostrador debería taparla (los envMaps no conocen la oclusión)
      scene.traverse((o) => {
        if (o.isLight && o.userData.kind === 'shelf') {
          dimmed.push([o, o.intensity]);
          o.intensity = 0;
        }
      });
      scene.traverse((o) => {
        // solo lo que de verdad brilla: emissive de COLOR no-negro con
        // intensidad real (emissiveIntensity vale 1 por defecto en TODO
        // material aunque el emissive sea negro), más lo marcado hideFromEnv
        // (los faroles: sus pantallas iluminadas de cerca salen como discos)
        const emissiveColor = o.material?.emissive;
        const glows =
          o.isMesh &&
          emissiveColor &&
          emissiveColor.r + emissiveColor.g + emissiveColor.b > 0.1 &&
          o.material.emissiveIntensity > 0.3;
        if (o.visible && (glows || o.userData.hideFromEnv)) {
          o.visible = false;
          hidden.push(o);
        }
      });
      cubeCamera.update(renderer, scene);
      scene.environment = cubeTarget.texture;
      scene.environmentIntensity = 0.65; // mezcla final de Iulian
    } catch (error) {
      console.error('[lounge] captura de entorno fallida (seguimos sin reflejos):', error);
    } finally {
      for (const o of hidden) o.visible = true;
      for (const [light, intensity] of dimmed) light.intensity = intensity;
      scene.remove(cubeCamera);
    }
    console.log('[lounge] entorno capturado, emissives ocultados:', hidden.length);

    // la escena es estática: congelar los mapas de sombra tras la carga
    // ahorra su recálculo en cada frame
    renderer.shadowMap.autoUpdate = false;
    renderer.shadowMap.needsUpdate = true;
  });

  const stats = new Stats();
  document.body.appendChild(stats.dom);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  const timer = new THREE.Timer();

  function tick() {
    timer.update();
    const delta = timer.getDelta();
    for (const update of updatables) update(delta);
    walk.update(delta);
    clampCameraToRoom(camera);
    postProcessing.render();
    stats.update();
    requestAnimationFrame(tick);
  }
  tick();
}
