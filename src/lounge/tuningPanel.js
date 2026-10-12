import GUI from 'three/addons/libs/lil-gui.module.min.js'

import { cristal } from './decor/repisaAlta'

export function createTuningPanel({ renderer, setQuality }) {
  const params = {
    calidad: renderer.backend?.isWebGPUBackend ? 'alta' : 'baja',
    brillo: renderer.toneMappingExposure,
    vasosTono: `#${cristal.color.getHexString()}`,
    vasosOpacidad: cristal.opacity,
    vasosPulido: cristal.roughness,
    vasosReflejo: cristal.clearcoatRoughness,
    volcarValores() {
      const dump = { ...params }
      delete dump.volcarValores
      console.log('[tuning] values:', JSON.stringify(dump, null, 2))
    },
  }

  const loadedAt = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  const backend = window.__loungeBackend || '?'
  const gui = new GUI({ title: `Afinado · ${loadedAt} · ${backend}` })
  gui.add(params, 'calidad', ['alta', 'media', 'baja']).onChange((v) => {
    if (setQuality) setQuality(v)
  })
  gui.add(params, 'brillo', 0.4, 3, 0.05).onChange((v) => {
    renderer.toneMappingExposure = v
  })

  const aplicarVasos = () => {
    cristal.color.set(params.vasosTono)
    cristal.opacity = params.vasosOpacidad
    cristal.roughness = params.vasosPulido
    cristal.clearcoatRoughness = params.vasosReflejo
  }
  const vasosFolder = gui.addFolder('Vasos')
  vasosFolder.addColor(params, 'vasosTono').name('tono').onChange(aplicarVasos)
  vasosFolder.add(params, 'vasosOpacidad', 0.05, 0.8, 0.01).name('opacidad').onChange(aplicarVasos)
  vasosFolder.add(params, 'vasosPulido', 0.02, 0.4, 0.01).name('pulido').onChange(aplicarVasos)
  vasosFolder
    .add(params, 'vasosReflejo', 0.03, 0.5, 0.01)
    .name('difuminado reflejo')
    .onChange(aplicarVasos)

  gui.add(params, 'volcarValores').name('▶ volcar valores a consola')

  return gui
}
