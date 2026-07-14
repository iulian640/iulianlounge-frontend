import * as THREE from 'three'
import { pass, mrt, output, emissive } from 'three/tsl'
import { bloom } from 'three/addons/tsl/display/BloomNode.js'
import { DynamicLighting } from 'three/addons/lighting/DynamicLighting.js'
import Stats from 'three/addons/libs/stats.module.js'

import { buildSalon, materials, ROOM } from './salon'
import { addSalonLights } from './lights'
import { furnishSalon } from './furnish'
import { addLetrero } from './letrero'
import { createWalkControls } from './walkControls'
import { addArchitecture } from './decor/architecture'
import { addDoor } from './decor/door'
import { addHatDisplay } from './decor/hatDisplay'
import { addAshtrays } from './decor/ashtrays'
import { addFloorLamps } from './decor/floorLamps'
import { addStageSpots } from './decor/stageSpots'
import { addCurtains } from './decor/curtains'
import { addSmoke } from './decor/smoke'

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
}

function clampCameraToRoom(camera) {
  const p = camera.position
  p.x = THREE.MathUtils.clamp(p.x, -CAMERA_BOUNDS.x, CAMERA_BOUNDS.x)
  p.z = THREE.MathUtils.clamp(p.z, -CAMERA_BOUNDS.z, CAMERA_BOUNDS.z)
  p.y = THREE.MathUtils.clamp(p.y, CAMERA_BOUNDS.yMin, CAMERA_BOUNDS.yMax)
}

// onProgress recibe 0..1 y alimenta la barra del telón. Tramos honestos:
// 0→0.6 descarga de assets (LoadingManager), 0.6→0.68 captura de reflejos,
// 0.68→0.78 compilación asíncrona de pipelines, 0.78→1 barrida de calentamiento
export async function createLounge(canvas, onProgress = () => {}) {
  // cronómetro de tramos del arranque: se imprime al final y queda en
  // window.__loungeTiming — sirve para comparar la máquina real con el
  // banco headless sin depender de capturas ni de DevTools
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
  scene.fog = new THREE.FogExp2('#0b1514', 0.022) // el humo del club

  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100)
  camera.layers.enable(1) // el suelo vive en la capa 1 (velas sin reflejo)
  camera.position.set(0, 1.7, 4.6)

  // antialias del canvas apagado: el render pasa por el pipeline de
  // postproceso (offscreen), el MSAA del canvas solo costaría sin verse
  const renderer = new THREE.WebGPURenderer({ canvas, antialias: false })
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFShadowMap
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 2.2 // mezcla final de Iulian (2026-07-12)
  // luces por lotes (arrays de uniforms + bucle en el shader) en vez de
  // desenrolladas: con 26 luces, cada una engordaba el shader de TODOS los
  // materiales (99 programas, ~50KB de WGSL cada uno = el grueso del coste de
  // compilación del arranque). Solo las 3 de sombra siguen por la vía
  // individual — la imagen no cambia, solo el tamaño del código
  renderer.lighting = new DynamicLighting({ maxPointLights: 40 }) // 35 en escena (ley 5)
  await renderer.init()
  // qué motor corre DE VERDAD: WebGPUBackend, o WebGLBackend si el navegador
  // no soporta WebGPU (Brave lo trae desactivado por defecto)
  const isWebGPU = renderer.backend?.isWebGPUBackend === true
  const backendName = isWebGPU ? 'WebGPU' : 'WebGL2 (fallback)'
  console.log('[lounge] motor:', backendName)
  window.__loungeBackend = backendName

  // bloom selectivo por MRT: la escena escribe color y emissive por separado,
  // el halo se calcula SOLO sobre el emissive — se acabó pelear con umbrales.
  // samples: 1 = sin MSAA en el MRT (carísimo en doble target); el suavizado
  // perceptible lo aporta la resolución de render de 'calidad'
  const postProcessing = new THREE.RenderPipeline(renderer)
  const scenePass = pass(scene, camera, { samples: 1 })
  scenePass.setMRT(mrt({ output, emissive }))
  const scenePassColor = scenePass.getTextureNode('output')
  const bloomPass = bloom(scenePass.getTextureNode('emissive'), 0.2, 0.5, 0) // mezcla Iulian 2026-07-13
  bloomPass.resolutionScale = 0.5 // el halo no necesita resolución completa
  postProcessing.outputNode = scenePassColor.add(bloomPass)

  // presets de calidad = resolución real de render (el mayor coste de todos).
  // En el respaldo WebGL2 hasta el tope de 'alta' baja a 1.5: a DPR 2 real el
  // fallback se hundía a 16fps (medido) — que el selector no ofrezca trampas
  const QUALITY = {
    alta: Math.min(window.devicePixelRatio, isWebGPU ? 2 : 1.5),
    media: 1.25,
    baja: 1,
  }
  const setQuality = (level) => {
    renderer.setPixelRatio(QUALITY[level] ?? QUALITY.media)
    renderer.setSize(window.innerWidth, window.innerHeight)
  }
  // por defecto según el motor REAL: con WebGPU a tope (decisión de Iulian:
  // 120fps sobrados); en el respaldo WebGL2 (Firefox sin WebGPU, visitas por
  // http de LAN — contexto no seguro) la resolución ×2 hundía los FPS →
  // resolución nativa. El selector del panel sigue mandando
  setQuality(isWebGPU ? 'alta' : 'baja')

  let panel = null // instancia lil-gui, para destruirla en dispose()
  const mountPanel = (smoke) => {
    if (!import.meta.env.DEV) return
    // mandos de depuración en consola + panel de afinado del director de arte
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

  // paseo en primera persona (precursor de la tercera persona de IUL-28)
  const walk = createWalkControls(camera, canvas)
  camera.position.set(0, 1.7, 4.6)
  camera.lookAt(-3, 1.5, 0) // al entrar, la mirada cae hacia la barra

  // el gancho al LoadingManager se instala ANTES de disparar ninguna carga:
  // así onLoad no puede habérsenos escapado y el timeout es solo red de seguridad
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
    setTimeout(resolve, 8000) // red de seguridad si alguna carga se queda colgada
  })

  // bisección de arranque: ?sin=cortinas,focos,lamparas,ceniceros,humo
  // apaga piezas de decor para cazar cuellos de botella de carga (DEV)
  const sin = new Set((new URLSearchParams(window.location.search).get('sin') ?? '').split(','))

  buildSalon(scene)
  addSalonLights(scene)
  // piezas rescatadas del lote (2026-07-13), de una en una con OK de Iulian:
  // arquitectura (cornisa/pilastras/zócalo/arco) y puerta con mirilla —
  // geometría pura, cero luces
  addArchitecture(scene)
  addDoor(scene)
  // expositor de fedoras retroiluminado (referencia speakeasyIdeas de Iulian;
  // germen visual de la tienda del club) — luz por tiras emissive + puntuales
  // cortas sin sombra, cero sombras nuevas
  addHatDisplay(scene)
  // lámparas de pie victorianas (pantalla roja + flecos) en las esquinas
  // del lado de la barra, y focos de trípode flanqueando el escenario —
  // todo con luces sin sombra (el presupuesto de sombras manda)
  if (!sin.has('lamparas')) addFloorLamps(scene)
  const stageSpots = sin.has('focos') ? null : addStageSpots(scene)
  // telón de fondo + patas recogidas + cenefa (sustituyen a la cortina
  // plana que ponía salon.js)
  if (!sin.has('cortinas')) addCurtains(scene)

  // animaciones activas (camarero, banda, ventiladores)
  const updatables = []
  // ceniceros con puros encendidos (brasas que laten) y sus volutas de humo:
  // las puntas de los puros son los emisores. Antes de la captura de entorno
  // para que el hideFromEnv del humo valga (no se hornea en el suelo)
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

  // ORDEN DE ARRANQUE (todo detrás del telón de carga, la vista espera esta
  // promesa): amueblar → capturar reflejos → UNA compilación asíncrona de los
  // pipelines del pass MRT ya con envMap → congelar sombras → barrida →
  // frame de estreno.
  //
  // scenePass.compileAsync(renderer) fija el render target y el MRT del pass
  // antes de compilar, así las claves de caché coinciden con el render real
  // (renderer.compileAsync(scene, camera) a pelo compilaba el render directo
  // a canvas, que nunca se usa — trabajo tirado). Por debajo Dawn usa
  // createRenderPipelineAsync: compila en su pool de hilos SIN congelar el
  // hilo principal (el congelón síncrono medía ~23s en headless).
  //
  // La captura va PRIMERO: compilar el pass sin envMap y recompilarlo con él
  // eran dos tandas completas — la primera se invalidaba entera al poner
  // scene.environment (trabajo tirado, medido ~11s en headless)
  await Promise.all([ready, texturesSettled])
  cronometra('assets')

  // dieta del respaldo WebGL2 (Firefox sin WebGPU, visitas por http de LAN):
  // ahí no hay compilación asíncrona ni va sobrado de GPU. Medido en banco:
  // muestrear las 3 sombras PCF en cada fragmento hundía los FPS (35→60 sin
  // ellas) y los conos de niebla castigan por overdraw (-35% de carga sin
  // ellos). Se aplica ANTES de compilar para que los programas ya nazcan
  // sin el código de sombras. La vía WebGPU no se toca
  if (!isWebGPU) {
    renderer.shadowMap.enabled = false
    scene.traverse((o) => {
      if (o.isLight) o.castShadow = false
      if (o.userData.haz) o.visible = false
    })
  }
  onProgress(0.62)

  {
    const cubeTarget = new THREE.CubeRenderTarget(256, { type: THREE.HalfFloatType })
    const cubeCamera = new THREE.CubeCamera(0.1, 50, cubeTarget)
    cubeCamera.position.set(0, 1.6, 0)
    for (const face of cubeCamera.children) face.layers.enable(1) // que vea el suelo
    scene.add(cubeCamera)

    // los emissives (bombillas, letrero, trasbarra) se ocultan SOLO durante
    // la captura: si entran en el cubemap, la laca del suelo los unta como
    // globos gigantes con paralaje falso
    const hidden = []
    const dimmed = []
    try {
      // la trasbarra se apaga durante la captura: su pared encendida en el
      // cubemap acaba reflejada en el suelo delante de la barra, donde el
      // mostrador debería taparla (los envMaps no conocen la oclusión)
      scene.traverse((o) => {
        if (o.isLight && o.userData.kind === 'shelf') {
          dimmed.push([o, o.intensity])
          o.intensity = 0
        }
      })
      scene.traverse((o) => {
        // solo lo que de verdad brilla: emissive de COLOR no-negro con
        // intensidad real (emissiveIntensity vale 1 por defecto en TODO
        // material aunque el emissive sea negro), más lo marcado hideFromEnv
        // (los faroles: sus pantallas iluminadas de cerca salen como discos)
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
      cubeCamera.update(renderer, scene)
      scene.environment = cubeTarget.texture
      scene.environmentIntensity = 0.65 // mezcla final de Iulian
    } catch (error) {
      console.error('[lounge] captura de entorno fallida (seguimos sin reflejos):', error)
    } finally {
      for (const o of hidden) o.visible = true
      for (const [light, intensity] of dimmed) light.intensity = intensity
      scene.remove(cubeCamera)
    }
    console.log('[lounge] entorno capturado, emissives ocultados:', hidden.length)
    cronometra('reflejos')
    onProgress(0.68)

    // la escena es estática: congelar los mapas de sombra tras la carga
    // ahorra su recálculo en cada frame
    renderer.shadowMap.autoUpdate = false
    renderer.shadowMap.needsUpdate = true
  }

  // la ÚNICA compilación del pass MRT, ya con envMap puesto. El frustum
  // culling fuera mientras compila: si no, solo compila lo que mira la cámara
  // y cada giro del jugador estrena pipelines nuevos (el atasco reaparecía
  // repartido por la barrida)
  const culled = []
  scene.traverse((o) => {
    if (o.isMesh && o.frustumCulled) {
      o.frustumCulled = false
      culled.push(o)
    }
  })
  // la compilación no da señal de avance, pero el hilo principal queda libre
  // (Dawn compila en sus hilos): la barra repta hacia el 77% mientras tanto
  // para que el tramo largo no parezca colgado
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

  const stats = new Stats()
  document.body.appendChild(stats.dom)

  const onResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
  }
  window.addEventListener('resize', onResize)

  const timer = new THREE.Timer()

  // interruptor de vida: dispose() lo apaga y el bucle muere en el siguiente
  // frame. Sin esto, cada remontaje del componente (HMR de Vite al guardar
  // un fichero) apilaba un lounge entero corriendo invisible — bucle de
  // render, listeners y escena en GPU incluidos.
  let alive = true

  function tick() {
    if (!alive) return
    timer.update()
    const delta = timer.getDelta()
    for (const update of updatables) update(delta)
    walk.update(delta)
    clampCameraToRoom(camera)
    postProcessing.render()
    stats.update()
    requestAnimationFrame(tick)
  }

  const dispose = () => {
    if (!alive) return // idempotente: unmount y pagehide pueden llegar los dos
    alive = false
    window.removeEventListener('resize', onResize)
    window.removeEventListener('pagehide', dispose)
    walk.dispose()
    panel?.destroy()
    stats.dom.remove()
    renderer.dispose()
    // renderer.dispose() NO destruye el GPUDevice: sin esto, cada remontaje
    // (HMR) deja un device entero vivo en el proceso GPU del navegador — que
    // es compartido y sobrevive a las recargas — y los arranques se van
    // volviendo cada vez más lentos (síntoma cazado 2026-07-13)
    renderer.backend?.device?.destroy?.()
  }
  // la recarga (F5) no pasa por onUnmounted de Vue: pagehide es la única
  // señal que llega antes de morir la página — soltamos el device ahí también
  window.addEventListener('pagehide', dispose)

  // calentón ANTES de levantar el telón: barrida de orientaciones para que
  // el primer giro del jugador no encuentre NADA sin preparar. Los pipelines
  // ya están compilados (compileAsync de arriba), pero queda trabajo perezoso
  // por objeto que se estrena en el primer draw real de cada orientación
  // (bind groups, buffers de uniforms). Cada orientación en su PROPIO frame
  // (rAF entre medias): el trabajo vive en el proceso GPU de Chrome y
  // encadenar renders en una sola tarea no le deja rematar
  // 8 orientaciones bastan: la cámara ve ~91° en horizontal (fov 60 a 16:9),
  // a 45° por paso todo queda visto con solape — eran 12 cuando la barrida
  // también compilaba pipelines; ya solo estrena bind groups y buffers
  const yawInicial = camera.rotation.y
  const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))
  const PASOS = 8
  for (let paso = 0; paso < PASOS; paso++) {
    camera.rotation.y = yawInicial + (paso / PASOS) * Math.PI * 2
    postProcessing.render()
    await nextFrame()
    onProgress(0.78 + ((paso + 1) / PASOS) * 0.22)
  }
  camera.rotation.y = yawInicial
  postProcessing.render() // frame de estreno con la mirada de entrada
  cronometra('barrida')
  tiempos.total = Math.round(performance.now() - t0)
  console.log('[lounge] arranque (ms):', JSON.stringify(tiempos))
  window.__loungeTiming = tiempos
  onProgress(1)
  tick()

  return { dispose }
}
