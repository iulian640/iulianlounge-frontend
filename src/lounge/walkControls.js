import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

// Paseo en primera persona: click para capturar el ratón, WASD para andar,
// Shift para apretar el paso, ESC para soltar. Es el precursor de la
// tercera persona (IUL-28), que traerá personaje y colisión con muebles.

const EYE_HEIGHT = 1.7;
const WALK_SPEED = 2.6;
const RUN_SPEED = 4.6;

export function createWalkControls(camera, canvas) {
  const controls = new PointerLockControls(camera, canvas);
  canvas.addEventListener('click', () => controls.lock());

  const keys = new Set();
  const onKeyDown = (event) => keys.add(event.code);
  const onKeyUp = (event) => keys.delete(event.code);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  function update(delta) {
    if (!controls.isLocked) return;

    const forward = (keys.has('KeyW') ? 1 : 0) - (keys.has('KeyS') ? 1 : 0);
    const sideways = (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0);
    const speed = keys.has('ShiftLeft') || keys.has('ShiftRight') ? RUN_SPEED : WALK_SPEED;

    if (forward) controls.moveForward(forward * speed * delta);
    if (sideways) controls.moveRight(sideways * speed * delta);

    camera.position.y = EYE_HEIGHT; // los pies en el suelo
  }

  // suelta los listeners de window y el pointer lock: sin esto, cada
  // remontaje del componente (HMR de Vite) dejaba un juego de listeners vivo
  function dispose() {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    controls.unlock();
    controls.dispose();
  }

  return { controls, update, dispose };
}
