import { expect, test } from '@playwright/test'

import { balanceChip, newMember, register, signIn, signOut } from '../support/members'

const LOUNGE_READY = { timeout: 90_000 }

test('a stranger who opens the lounge is sent to the door', async ({ page }) => {
  await page.goto('/')

  await expect(page).toHaveURL(/\/acceso\?next=/)
  await expect(page.getByRole('heading', { name: "Iulian's" })).toBeVisible()
})

test('a new member registers, enters the lounge with the welcome bonus and signs out', async ({ page }) => {
  const member = newMember('desk')

  await register(page, member)

  await expect(page).toHaveURL('/')
  await expect(balanceChip(page, 100)).toBeVisible(LOUNGE_READY)
  await expect(page.getByText(member.username)).toBeVisible()
  await signOut(page)
})

test('a wrong password keeps the door shut and the right one opens it', async ({ page, request }) => {
  const member = newMember('desk')
  const registration = await request.post('/api/v1/auth/register', { data: { ...member, locale: 'es' } })
  expect(registration.ok()).toBe(true)

  await signIn(page, member.username, 'not-the-password')
  await expect(page.getByRole('alert')).toHaveText('Ese nombre y esa contraseña no abren esta puerta.')

  await signIn(page, member.username, member.password)
  await expect(page).toHaveURL('/')
  await expect(balanceChip(page, 100)).toBeVisible(LOUNGE_READY)
})

test('the balance chip opens the account book with the welcome bonus', async ({ page }) => {
  await register(page, newMember('desk'))

  await balanceChip(page, 100).click(LOUNGE_READY)

  await expect(page.locator('#libro-cuentas')).toBeVisible()
  await expect(page.locator('#libro-cuentas')).toContainText('100')
})
