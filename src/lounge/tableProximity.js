import { BLACKJACK_TABLE } from './blackjackLayout'
import { createProximity } from './proximity'

const ENTER_RADIUS = 2.5
const EXIT_RADIUS = 2.9

export function createTableProximity(onChange) {
  return createProximity(
    { at: BLACKJACK_TABLE.at, enterRadius: ENTER_RADIUS, exitRadius: EXIT_RADIUS },
    onChange,
  )
}
