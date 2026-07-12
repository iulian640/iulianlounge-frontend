import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const loader = new GLTFLoader();

// Carga un GLB y lo normaliza: cada asset viene en unidades distintas, así
// que se escala a una medida objetivo en metros y se apoya centrado en y=0.
// - height: altura objetivo (muebles, personajes)
// - footprint: diámetro objetivo en planta (piezas planas: alfombras)
// - recolor: viste el asset con la paleta del club, por nombre de material
//   ({ wood: '#3a2417', metal: { color: '#c9a45c', metalness: 1 } })
export function loadProp(url, { height, footprint, rotationY = 0, recolor = {} } = {}) {
  return new Promise((resolve, reject) => {
    loader.load(
      url,
      (gltf) => {
        const model = gltf.scene;
        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            const rule = recolor[child.material?.name];
            if (rule) {
              const { color, ...rest } = typeof rule === 'string' ? { color: rule } : rule;
              if (color) child.material.color.set(color);
              Object.assign(child.material, rest);
            }
          }
        });

        const bounds = new THREE.Box3().setFromObject(model);
        const size = bounds.getSize(new THREE.Vector3());
        const scale = footprint ? footprint / Math.max(size.x, size.z) : height / size.y;
        model.scale.setScalar(scale);

        const scaled = new THREE.Box3().setFromObject(model);
        const center = scaled.getCenter(new THREE.Vector3());
        model.position.x -= center.x;
        model.position.z -= center.z;
        model.position.y -= scaled.min.y;

        const prop = new THREE.Group();
        prop.add(model);
        prop.rotation.y = rotationY;
        resolve(prop);
      },
      undefined,
      reject,
    );
  });
}
