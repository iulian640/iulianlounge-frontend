import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

const loader = new GLTFLoader()

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
