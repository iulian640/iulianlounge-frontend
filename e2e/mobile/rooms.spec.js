import { expect, test } from '@playwright/test'

import { newMember, register } from '../support/members'

const DRAG_STEPS = 12
const FRAME_MS = 16
const LOOK_AT_TABLE_MS = 1200

async function swipe(page, distance) {
  const cdp = await page.context().newCDPSession(page)
  const box = await page.locator('.rooms').boundingBox()
  const y = Math.round(box.y + box.height / 2)
  const start = Math.round(box.x + box.width / 2 - distance / 2)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: start, y }] })
  for (let step = 1; step <= DRAG_STEPS; step++) {
    const x = Math.round(start + (distance * step) / DRAG_STEPS)
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] })
    await page.waitForTimeout(FRAME_MS)
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await cdp.detach()
}

test('a finger swipe moves between the bar and the card table', async ({ page }) => {
  await register(page, newMember('swipe'))
  const barTab = page.getByRole('tab', { name: 'La barra' })
  const tableTab = page.getByRole('tab', { name: 'La mesa' })
  await expect(barTab).toHaveAttribute('aria-selected', 'true')

  await swipe(page, -300)

  await expect(tableTab).toHaveAttribute('aria-selected', 'true')
  await expect(page.locator('#room-cards')).not.toHaveAttribute('inert')
  await expect(page.getByRole('button', { name: /Repartir/ })).toBeVisible()
  await page.waitForTimeout(LOOK_AT_TABLE_MS)

  await swipe(page, 300)

  await expect(barTab).toHaveAttribute('aria-selected', 'true')
  await expect(page.locator('#room-bar')).not.toHaveAttribute('inert')
})
