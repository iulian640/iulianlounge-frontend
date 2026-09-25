import { describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import { LOST_ROUTE, safeNext } from '../safeNext'

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/', name: 'loungeview', component: {} },
    { path: '/acceso', name: 'acceso', component: {} },
    { path: '/:pathMatch(.*)*', name: LOST_ROUTE, redirect: '/' },
  ],
})

describe('safeNext', () => {
  it('deja volver a una ruta propia que existe', () => {
    expect(safeNext('/acceso', router)).toBe('/acceso')
  })

  it.each(['//evil.example', '/\\evil.example', 'https://evil.example', 'evil'])(
    'rechaza %s y manda al inicio',
    (next) => {
      expect(safeNext(next, router)).toBe('/')
    },
  )

  it('una ruta inventada tampoco vale', () => {
    expect(safeNext('/no-existe', router)).toBe('/')
  })

  it('sin next, al inicio', () => {
    expect(safeNext(undefined, router)).toBe('/')
  })
})
