import * as THREE from 'three';
import Stats from 'three/addons/libs/stats.module.js'

export function createLounge(canvas) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#0b1514');

  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 1.7, 4);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const stats = new Stats();
  document.body.appendChild(stats.dom);

  function tick() {
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
    stats.update();
  }
  tick()
}
