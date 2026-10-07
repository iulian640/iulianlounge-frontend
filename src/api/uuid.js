const HEX_BYTE_COUNT = 16
const UUID_GROUP_ENDS = new Set([4, 6, 8, 10])

export function newUuid() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()

  const bytes = crypto.getRandomValues(new Uint8Array(HEX_BYTE_COUNT))
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80

  let uuid = ''
  bytes.forEach((byte, index) => {
    if (UUID_GROUP_ENDS.has(index)) uuid += '-'
    uuid += byte.toString(16).padStart(2, '0')
  })
  return uuid
}
