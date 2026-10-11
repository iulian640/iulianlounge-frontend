import { expect, test } from '@playwright/test'

import { balanceChip, newMember, register, signOut } from '../support/members'

async function openBar(page) {
  await page.getByRole('button', { name: 'Subir la carta' }).click()
  await expect(page.getByRole('tab', { name: 'La carta' })).toHaveAttribute('aria-selected', 'true')
}

async function sheetTab(page, name) {
  await page.getByRole('tab', { name, exact: true }).click()
}

async function order(page, drink) {
  await page.getByRole('button', { name: `Pedir ${drink}`, exact: true }).click()
}

test('the phone gets the drawn salon instead of the 3D lounge', async ({ page }) => {
  await register(page, newMember('mob'))

  await expect(page.getByRole('heading', { name: "IULIAN'S" })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'La barra' })).toHaveAttribute('aria-selected', 'true')
  await expect(balanceChip(page, 100)).toBeVisible()
  await expect(page.locator('canvas')).toHaveCount(0)
})

test('a new member drinks the welcome bonus down to zero and the house stands a round', async ({ page }) => {
  await register(page, newMember('mob'))
  await expect(balanceChip(page, 100)).toBeVisible()
  await openBar(page)

  await order(page, 'French 75')
  await expect(balanceChip(page, 60)).toBeVisible()
  await expect(page.getByRole('img', { name: 'Una copa servida en la barra' })).toBeVisible()

  await order(page, 'French 75')
  await expect(balanceChip(page, 20)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Pedir French 75', exact: true })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Pedir Sidecar', exact: true })).toBeDisabled()

  await order(page, "Bee's Knees")
  await expect(balanceChip(page, 10)).toBeVisible()
  await order(page, "Bee's Knees")
  await expect(balanceChip(page, 0)).toBeVisible()

  const credit = page.getByRole('button', { name: 'Aceptar la invitación · +50 ¢' })
  await credit.click()
  await expect(balanceChip(page, 50)).toBeVisible()
  await expect(credit).toBeHidden()
})

test('the barman tells the rank, and one French 75 is enough to move up', async ({ page }) => {
  await register(page, newMember('mob'))
  await openBar(page)
  const conversation = page.getByRole('log')
  const askRank = page.getByRole('button', { name: '¿Cómo subo de rango?' })

  await sheetTab(page, 'Charlar')
  await askRank.click()
  await expect(conversation.locator('.bubble').last()).toHaveText(/Ahora eres Recién llegado\./)

  await sheetTab(page, 'La carta')
  await order(page, 'French 75')
  await expect(balanceChip(page, 60)).toBeVisible()
  await sheetTab(page, 'Charlar')
  await askRank.click()
  await expect(conversation.locator('.bubble').last()).toHaveText(/Ahora eres Cliente\./)
})

test('the member walks to the table and plays a whole hand', async ({ page }) => {
  await register(page, newMember('mob'))
  await expect(balanceChip(page, 100)).toBeVisible()

  await page.getByRole('tab', { name: 'La mesa' }).click()
  await page.getByRole('button', { name: /Repartir/ }).click()

  await expect(balanceChip(page, 100)).toBeHidden()
  const stand = page.getByRole('button', { name: 'Plantarse' })
  if (await stand.isVisible()) await stand.click()
  await expect(page.getByRole('button', { name: 'Otra mano' })).toBeVisible()
})

test('signing out from the phone closes the salon', async ({ page }) => {
  await register(page, newMember('mob'))
  await expect(balanceChip(page, 100)).toBeVisible()

  await signOut(page)

  await page.goto('/')
  await expect(page).toHaveURL(/\/acceso\?next=/)
})
