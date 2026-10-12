import * as THREE from 'three'
import { pass, mrt, output, emissive } from 'three/tsl'
import { bloom } from 'three/addons/tsl/display/BloomNode.js'
import { fsr1 } from 'three/addons/tsl/display/FSR1Node.js'
import { DynamicLighting } from 'three/addons/lighting/DynamicLighting.js'
import Stats from 'three/addons/libs/stats.module.js'

import { buildSalon, materials, ROOM } from './salon'
import { addSalonLights } from './lights'
import { createBarmanProximity } from './barmanProximity'
import { createBlackjackTable } from './blackjackTable'
import { createSeatController } from './seatController'
import { createTableProximity } from './tableProximity'
import { prefersReducedMotion } from './reducedMotion'
import { furnishSalon } from './furnish'
import { addLetrero } from './letrero'
import { createWalkControls } from './walkControls'
import { addArchitecture } from './decor/architecture'
import { addDoor } from './decor/door'
import { addBotellas } from './decor/botellas'
import { addCocktailStation } from './decor/cocktailStation'
import { addRepisaAlta } from './decor/repisaAlta'
import { addHatDisplay } from './decor/hatDisplay'
import { addAshtrays } from './decor/ashtrays'
import { addFloorLamps } from './decor/floorLamps'
import { addStageSpots } from './decor/stageSpots'
import { addCurtains } from './decor/curtains'
import { addSmoke } from './decor/smoke'

const CAMERA_BOUNDS = {
  x: ROOM.width / 2 - 0.5,
  z: ROOM.depth / 2 - 0.5,
  yMin: 0.4,
  yMax: ROOM.height - 0.4,
}

function clampCameraToRoom(camera) {
  const p = camera.position
  p.x = THREE.MathUtils.clamp(p.x, -CAMERA_BOUNDS.x, CAMERA_BOUNDS.x)
  p.z = THREE.MathUtils.clamp(p.z, -CAMERA_BOUNDS.z, CAMERA_BOUNDS.z)
  p.y = THREE.MathUtils.clamp(p.y, CAMERA_BOUNDS.yMin, CAMERA_BOUNDS.yMax)
}

export async function createLounge(
  canvas,
  onProgress = () => {},
  onQualityBusy = () => {},
  signal,
  onNearBarman = () => {},
  onNearTable = () => {},
) {
  const t0 = performance.now()
  const tiempos = {}
  let tAnterior = t0
  const cronometra = (tramo) => {
    const ahora = performance.now()
    tiempos[tramo] = Math.round(ahora - tAnterior)
    tAnterior = ahora
  }

  const scene = new THREE.Scene()
  scene.background = new THREE.Color('#0b1514')
  scene.fog = new THREE.FogExp2('#0b1514', 0.022)

  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100)
  camera.layers.enable(1)
  camera.position.set(0, 1.7, 4.6)

  const renderer = new THREE.WebGPURenderer({ canvas, antialias: false })
  const quiereGpuMs = new URLSearchParams(window.location.search).has('gpums')
  if (import.meta.env.DEV && quiereGpuMs) {
    renderer.backend.trackTimestamp = true
  }
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFShadowMap
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 2.2
  renderer.lighting = new DynamicLighting({ maxPointLights: 40 })
  await renderer.init()
  let walk = null
  let panel = null
  const releaseEarly = () => {
    walk?.dispose()
    panel?.destroy()
    renderer.dispose()
    renderer.backend?.device?.destroy?.()
    return null
  }
  if (signal?.aborted) return releaseEarly()
  const isWebGPU = renderer.backend?.isWebGPUBackend === true
  const backendName = isWebGPU ? 'WebGPU' : 'WebGL2 (fallback)'
  console.log('[lounge] motor:', backendName)
  window.__loungeBackend = backendName

  const postProcessing = new THREE.RenderPipeline(renderer)
  const scenePass = pass(scene, camera, { samples: 1 })
  scenePass.setMRT(mrt({ output, emissive }))
  const scenePassColor = scenePass.getTextureNode('output')
  const bloomPass = bloom(scenePass.getTextureNode('emissive'), 0.2, 0.5, 0)
  bloomPass.resolutionScale = 0.5
  const nativeOutputNode = scenePassColor.add(bloomPass)
  postProcessing.outputNode = nativeOutputNode

  const FSR_SCALE = 0.66
  let fsrOutputNode = null

  const QUALITY = {
    alta: Math.min(window.devicePixelRatio, isWebGPU ? 1.4 : 1.5),
    media: 1.25,
    baja: 1,
  }
  const applyQuality = (level) => {
    renderer.setPixelRatio(QUALITY[level] ?? QUALITY.media)
    renderer.setSize(window.innerWidth, window.innerHeight)

    if (isWebGPU && level === 'baja') {
      scenePass.setResolutionScale(FSR_SCALE)
      fsrOutputNode ??= fsr1(scenePassColor, 0.2).add(bloomPass)
      postProcessing.outputNode = fsrOutputNode
    } else {
      scenePass.setResolutionScale(1)
      postProcessing.outputNode = nativeOutputNode
    }
    postProcessing.needsUpdate = true
    calidadActual = level
  }
  let calidadActual = null

  const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))

  let colaCalidad = Promise.resolve()
  const cambiaCalidad = async (level) => {
    if (level === calidadActual) return
    const cambiaGrafo = isWebGPU && (level === 'baja') !== (calidadActual === 'baja')
    if (!cambiaGrafo) {
      applyQuality(level)
      return
    }
    onQualityBusy(true)
    try {
      await nextFrame()
      await nextFrame()
      if (!alive) return
      applyQuality(level)
      await nextFrame()
      await nextFrame()
    } finally {
      onQualityBusy(false)
    }
  }
  const setQuality = (level) => {
    colaCalidad = colaCalidad.then(() => cambiaCalidad(level))
    return colaCalidad
  }
  setQuality(isWebGPU ? 'alta' : 'baja')

  const mountPanel = (smoke) => {
    if (!import.meta.env.DEV) return
    window.__lounge = {
      scene,
      camera,
      bloom: bloomPass,
      renderer,
      materials,
      setQuality,
      smoke,
      stageSpots,
    }
    import('./tuningPanel').then(({ createTuningPanel }) => {
      panel = createTuningPanel({
        scene,
        renderer,
        bloom: bloomPass,
        setQuality,
        smoke,
        stageSpots,
      })
    })
  }

  walk = createWalkControls(camera, canvas)
  camera.position.set(0, 1.7, 4.6)
  camera.lookAt(-3, 1.5, 0)

  const texturesSettled = new Promise((resolve) => {
    const manager = THREE.DefaultLoadingManager
    const previous = manager.onLoad
    manager.onLoad = () => {
      if (previous) previous()
      resolve()
    }
    manager.onProgress = (url, loaded, total) => {
      if (total > 0) onProgress((loaded / total) * 0.6)
    }
    setTimeout(resolve, 8000)
  })

  const sin = new Set((new URLSearchParams(window.location.search).get('sin') ?? '').split(','))

  buildSalon(scene)
  addSalonLights(scene)
  addArchitecture(scene)
  addDoor(scene)
  addHatDisplay(scene)
  addBotellas(scene)
  if (!sin.has('cocteleria')) addCocktailStation(scene)
  if (!sin.has('repisa')) addRepisaAlta(scene)
  if (!sin.has('lamparas')) addFloorLamps(scene)
  const stageSpots = sin.has('focos') ? null : addStageSpots(scene)
  if (!sin.has('cortinas')) addCurtains(scene)

  const updatables = []
  const blackjackTable = createBlackjackTable({
    scene,
    materials,
    updatables,
    reducedMotion: prefersReducedMotion,
  })
  const { tips } = sin.has('ceniceros') ? { tips: [] } : addAshtrays(scene, updatables)
  const smoke = sin.has('humo') || tips.length === 0 ? null : addSmoke(scene, tips)
  if (smoke) updatables.push(smoke.update)
  mountPanel(smoke)
  const ready = Promise.all([
    furnishSalon(scene, updatables).catch((error) =>
      console.error('[lounge] amueblado incompleto:', error),
    ),
    addLetrero(scene).catch((error) => console.error('[lounge] letrero:', error)),
  ])

  await Promise.all([ready, texturesSettled])
  if (signal?.aborted) return releaseEarly()
  cronometra('assets')

  scene.traverse((o) => {
    if (o.isMesh && !o.userData.isCard) o.receiveShadow = true
  })

  if (!isWebGPU) {
    renderer.shadowMap.enabled = false
    scene.traverse((o) => {
      if (o.isLight) o.castShadow = false
      if (o.userData.haz) o.visible = false
    })
  }
  onProgress(0.62)

  {
    const cubeTarget = new THREE.CubeRenderTarget(128, { type: THREE.HalfFloatType })
    const cubeCamera = new THREE.CubeCamera(0.1, 50, cubeTarget)
    cubeCamera.position.set(0, 1.6, 0)
    for (const face of cubeCamera.children) face.layers.enable(1)
    scene.add(cubeCamera)

    const hidden = []
    const dimmed = []
    try {
      scene.traverse((o) => {
        if (o.isLight && o.userData.kind === 'shelf') {
          dimmed.push([o, o.intensity])
          o.intensity = 0
        }
      })
      scene.traverse((o) => {
        const emissiveColor = o.material?.emissive
        const glows =
          o.isMesh &&
          emissiveColor &&
          emissiveColor.r + emissiveColor.g + emissiveColor.b > 0.1 &&
          o.material.emissiveIntensity > 0.3
        if (o.visible && (glows || o.userData.hideFromEnv)) {
          o.visible = false
          hidden.push(o)
        }
      })
      scene.overrideMaterial = new THREE.MeshStandardMaterial({
        color: '#3a2f28',
        roughness: 0.9,
      })
      cubeCamera.update(renderer, scene)
      scene.environment = cubeTarget.texture
      scene.environmentIntensity = 0.65
    } catch (error) {
      console.error('[lounge] captura de entorno fallida (seguimos sin reflejos):', error)
    } finally {
      scene.overrideMaterial = null
      for (const o of hidden) o.visible = true
      for (const [light, intensity] of dimmed) light.intensity = intensity
      scene.remove(cubeCamera)
    }
    console.log('[lounge] entorno capturado, emissives ocultados:', hidden.length)
    cronometra('reflejos')
    onProgress(0.68)

    renderer.shadowMap.autoUpdate = false
    renderer.shadowMap.needsUpdate = true
  }

  const culled = []
  scene.traverse((o) => {
    if (o.isMesh && o.frustumCulled) {
      o.frustumCulled = false
      culled.push(o)
    }
  })
  let reptar = 0.68
  const goteo = setInterval(() => {
    reptar = Math.min(reptar + 0.006, 0.77)
    onProgress(reptar)
  }, 400)
  try {
    await scenePass.compileAsync(renderer)
  } finally {
    clearInterval(goteo)
  }
  for (const o of culled) o.frustumCulled = true
  cronometra('compilacion')
  onProgress(0.78)
  if (signal?.aborted) return releaseEarly()

  const stats = import.meta.env.DEV ? new Stats() : null
  if (stats) document.body.appendChild(stats.dom)

  const onResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
  }
  window.addEventListener('resize', onResize)

  const timer = new THREE.Timer()
  const barmanProximity = createBarmanProximity(onNearBarman)
  const tableProximity = createTableProximity(onNearTable)
  const seat = createSeatController({
    camera,
    pose: blackjackTable.seatPose,
    reducedMotion: prefersReducedMotion,
  })

  let alive = true

  function tick() {
    if (!alive) return
    timer.update()
    const delta = timer.getDelta()
    for (const update of updatables) update(delta)
    seat.update(delta)
    walk.controls.enabled = !seat.isActive()
    if (!seat.isActive()) walk.update(delta)
    clampCameraToRoom(camera)
    barmanProximity.update(camera.position)
    tableProximity.update(camera.position)
    postProcessing.render()
    stats?.update()
    requestAnimationFrame(tick)
  }

  const dispose = () => {
    if (!alive) return
    alive = false
    window.removeEventListener('resize', onResize)
    window.removeEventListener('pagehide', dispose)
    walk.dispose()
    panel?.destroy()
    blackjackTable.dispose()
    stats?.dom.remove()
    renderer.dispose()
    renderer.backend?.device?.destroy?.()
  }
  window.addEventListener('pagehide', dispose)
  signal?.addEventListener('abort', dispose, { once: true })

  const yawInicial = camera.rotation.y
  const PASOS = 8
  const TOTAL_PASOS = PASOS * 2
  let pasoGlobal = 0
  for (let paso = 0; paso < PASOS; paso++) {
    camera.rotation.y = yawInicial + (paso / PASOS) * Math.PI * 2
    postProcessing.render()
    await nextFrame()
    if (!alive) return null
    pasoGlobal++
    onProgress(0.78 + (pasoGlobal / TOTAL_PASOS) * 0.22)
  }
  for (let paso = PASOS - 1; paso >= 0; paso--) {
    camera.rotation.y = yawInicial + (paso / PASOS) * Math.PI * 2
    postProcessing.render()
    await nextFrame()
    if (!alive) return null
    pasoGlobal++
    onProgress(0.78 + (pasoGlobal / TOTAL_PASOS) * 0.22)
  }
  camera.rotation.y = yawInicial
  postProcessing.render()
  blackjackTable.endWarmup()
  cronometra('barrida')
  tiempos.total = Math.round(performance.now() - t0)
  if (import.meta.env.DEV && renderer.backend?.trackTimestamp) {
    try {
      const gpuMs = await renderer.resolveTimestampsAsync('render')
      if (typeof gpuMs === 'number') tiempos.gpuFrameMs = Math.round(gpuMs * 10) / 10
    } catch (error) {
      console.warn('[lounge] resolución de timestamp GPU fallida (sin datos):', error)
    }
  }
  console.log('[lounge] arranque (ms):', JSON.stringify(tiempos))
  window.__loungeTiming = tiempos
  if (!alive) return null
  onProgress(1)
  tick()

  const releasePointer = () => walk.controls?.unlock()

  const sitDown = () => {
    walk.controls.enabled = false
    walk.releaseKeys()
    walk.controls.unlock()
    return seat.sitDown()
  }

  return {
    dispose,
    releasePointer,
    sitDown,
    standUp: seat.standUp,
    setHand: blackjackTable.setHand,
    getSeatState: seat.getState,
  }
}
