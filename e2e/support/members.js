import { expect } from '@playwright/test'

export const PASSWORD = 'e2e-password-1'

export function newMember(prefix) {
  const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
  return { username: `${prefix}_${id}`, email: `${prefix}_${id}@e2e.test`, password: PASSWORD }
}

function modeButton(page, name) {
  return page.getByRole('group', { name: 'Entrar o hacerse socio' }).getByRole('button', { name, exact: true })
}

export async function register(page, member) {
  await page.goto('/acceso')
  await modeButton(page, 'Hacerse socio').click()
  await page.getByLabel('Nombre').fill(member.username)
  await page.getByLabel('Email').fill(member.email)
  await page.getByLabel('Contraseña').fill(member.password)
  await page.getByRole('button', { name: 'Hacerme socio', exact: true }).click()
}

export async function signIn(page, username, password) {
  await page.goto('/acceso')
  await modeButton(page, 'Entrar').click()
  await page.getByLabel('Nombre').fill(username)
  await page.getByLabel('Contraseña').fill(password)
  await page.locator('form').getByRole('button', { name: 'Entrar', exact: true }).click()
}

export function balanceChip(page, amount) {
  return page.getByRole('button', { name: `Saldo: ${amount} chikilicuatres` })
}

export async function signOut(page) {
  await page.getByRole('button', { name: 'Salir' }).click()
  await expect(page).toHaveURL(/\/acceso$/)
}
