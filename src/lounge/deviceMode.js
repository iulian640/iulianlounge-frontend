// ¿Lounge 3D o salón 2D? En un móvil, WebGPU tira de batería y va a trompicones: se decide al montar
// y el canvas ni se crea (decisión del 3-jul: móvil = los mismos componentes Vue, sin 3D)
export const FLAT_MAX_WIDTH = 768

export function prefersFlatLounge(win = window) {
  if (typeof win.matchMedia !== 'function') return false
  // Táctil (dedo, no ratón) o pantalla estrecha: cualquiera de las dos basta
  return (
    win.matchMedia('(pointer: coarse)').matches || win.matchMedia(`(max-width: ${FLAT_MAX_WIDTH - 1}px)`).matches
  )
}
