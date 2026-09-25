// ¿A dónde volver después de entrar? Solo a una ruta propia y que exista: nada de "//otra-web.com"
// ni "/\otra-web.com" (que el navegador podría tomar por otro dominio) ni rutas inventadas
export const LOST_ROUTE = 'perdido'

export function safeNext(next, router) {
  if (typeof next !== 'string' || !/^\/(?![/\\])/.test(next)) return '/'
  const target = router.resolve(next)
  return target.matched.length === 0 || target.matched.some((record) => record.name === LOST_ROUTE) ? '/' : next
}
