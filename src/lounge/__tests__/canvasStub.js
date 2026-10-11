import { vi } from 'vitest'

export function createRecordingContext() {
  const calls = []
  const values = {}
  const context = new Proxy(values, {
    get(target, property) {
      if (property === 'calls') return calls
      if (property in target) return target[property]
      return (...args) => {
        calls.push([property, ...args])
      }
    },
    set(target, property, value) {
      target[property] = value
      return true
    },
  })
  return context
}

export function stubCanvasContext() {
  const contexts = []
  const spy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation((type) => {
    if (type !== '2d') return null
    const context = createRecordingContext()
    contexts.push(context)
    return context
  })
  return { spy, contexts }
}
