export const LOST_ROUTE = 'perdido'

export function safeNext(next, router) {
  if (typeof next !== 'string' || !/^\/(?![/\\])/.test(next)) return '/'
  const target = router.resolve(next)
  return target.matched.length === 0 || target.matched.some((record) => record.name === LOST_ROUTE) ? '/' : next
}
