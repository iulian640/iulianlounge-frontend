import * as THREE from 'three';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';

import { ROOM } from './salon';

// El letrero "IULIAN'S" — letras 3D emissive sobre la barra, candidato a
// bloom (CONCEPT.md: marquesina cálida, nada de neón atómico).
// TODO: convertir Limelight a typeface.json y sustituir la helvetiker.

export async function addLetrero(scene) {
  const font = await new FontLoader().loadAsync('/fonts/helvetiker_bold.typeface.json');

  const geometry = new TextGeometry("IULIAN'S", {
    font,
    size: 0.38,
    depth: 0.06,
    curveSegments: 5,
  });
  geometry.computeBoundingBox();
  const width = geometry.boundingBox.max.x - geometry.boundingBox.min.x;
  geometry.center(); // el origen de TextGeometry no está centrado

  const text = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({
      color: '#ffd9a0',
      emissive: '#ffc887',
      emissiveIntensity: 1.7,
    }),
  );
  text.name = 'letrero-texto'; // el panel de afinado regula su brillo
  // pared oeste, sobre la trasbarra, mirando a la sala, centrado en su marco
  text.rotation.y = Math.PI / 2;
  text.position.set(-ROOM.width / 2 + 0.18, 2.81, 0);

  const backboard = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.8, width + 0.6),
    new THREE.MeshStandardMaterial({ color: '#0a1311', roughness: 0.9 }),
  );
  backboard.position.set(-ROOM.width / 2 + 0.13, 2.81, 0);

  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.86, width + 0.66),
    new THREE.MeshStandardMaterial({ color: '#c9a45c', metalness: 1, roughness: 0.4 }),
  );
  frame.position.set(-ROOM.width / 2 + 0.11, 2.81, 0);

  scene.add(frame, backboard, text);
}
