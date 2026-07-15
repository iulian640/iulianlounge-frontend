import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

const loader = new GLTFLoader()

// Carga un GLB y lo normaliza: cada asset viene en unidades distintas, así
// que se escala a una medida objetivo en metros y se apoya centrado en y=0.
// - height: altura objetivo (muebles, personajes)
// - footprint: diámetro objetivo en planta (piezas planas: alfombras)
// - recolor: viste el asset con la paleta del club, por nombre de material
//   ({ wood: '#3a2417', metal: { color: '#c9a45c', metalness: 1 } })
// - hide: nombres de material cuyas mallas se DESCARTAN (partes del GLB que
//   no queremos: los vinilos del gramófono) — se quitan antes de medir para
//   que no cuenten en la normalización de escala
// - rotationX: corrige modelos tumbados en otro eje (se aplica ANTES de medir)
// - animate: regex del clip a reproducir ('Idle', 'Working'); deja la función
//   de avance en prop.userData.update(dt)
export function loadProp(
  url,
  { height, footprint, rotationY = 0, rotationX = 0, recolor = {}, hide = [], animate } = {},
) {
  return new Promise((resolve, reject) => {
    loader.load(
      url,
      (gltf) => {
        const model = gltf.scene
        const corrupt = []
        const hidden = []
        model.traverse((child) => {
          if (child.isMesh) {
            // desinfectante: una malla con NaN envenena el pase de bloom
            // y deja el frame entero en negro (nos pasó con sconce.glb)
            const positions = child.geometry?.attributes?.position?.array
            if (positions && !positions.every(Number.isFinite)) {
              corrupt.push(child)
              return
            }
            if (hide.includes(child.material?.name)) {
              hidden.push(child)
              return
            }
            child.castShadow = true
            child.receiveShadow = true
            const rule = recolor[child.material?.name]
            if (rule) {
              const { color, ...rest } = typeof rule === 'string' ? { color: rule } : rule
              if (color) child.material.color.set(color)
              Object.assign(child.material, rest)
            }
          }
        })
        for (const mesh of corrupt) {
          console.warn('[models] malla con geometría corrupta descartada en', url)
          mesh.removeFromParent()
        }
        for (const mesh of hidden) mesh.removeFromParent()

        // OJO GLTF: los nodos pueden traer matriz cocinada (matrixAutoUpdate
        // false) e ignorar rotation directa — se rota siempre vía un pivote nuestro
        let target = model
        if (rotationX) {
          const pivot = new THREE.Group()
          pivot.add(model)
          pivot.rotation.x = rotationX
          target = pivot
        }

        const bounds = new THREE.Box3().setFromObject(target)
        const size = bounds.getSize(new THREE.Vector3())
        const scale = footprint ? footprint / Math.max(size.x, size.z) : height / size.y
        target.scale.setScalar(scale)

        const scaled = new THREE.Box3().setFromObject(target)
        const center = scaled.getCenter(new THREE.Vector3())
        target.position.x -= center.x
        target.position.z -= center.z
        target.position.y -= scaled.min.y

        const prop = new THREE.Group()
        prop.name = url.split('/').pop().replace('.glb', '')
        prop.add(target)
        prop.rotation.y = rotationY

        if (animate && gltf.animations.length > 0) {
          const pattern = new RegExp(animate, 'i')
          const clip = gltf.animations.find((a) => pattern.test(a.name)) ?? gltf.animations[0]
          const mixer = new THREE.AnimationMixer(model)
          mixer.clipAction(clip).play()
          prop.userData.update = (delta) => mixer.update(delta)
        }

        resolve(prop)
      },
      undefined,
      reject,
    )
  })
}
