import { expect, test } from '@playwright/test'

/*
 * Full shopping workflows. They need a running server backed by a THROWAWAY
 * database loaded with sample data:
 *   npm run seed -- --reset && E2E_WITH_DB=1 npm run test:e2e
 * They place real orders (stock decreases), so never point them at production.
 */
test.skip(!process.env.E2E_WITH_DB, 'Set E2E_WITH_DB=1 with a seeded throwaway database')
test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'DB workflows run once, on desktop Chromium')
})

test('guest browses, applies a coupon and checks out', async ({ page }) => {
  await page.goto('/products?category=bars')
  await expect(page.getByRole('heading', { level: 1, name: 'Bars' })).toBeVisible()

  await page.getByRole('link', { name: 'Madagascar 72% Bar' }).first().click()
  await expect(page.getByRole('heading', { level: 1, name: 'Madagascar 72% Bar' })).toBeVisible()
  await page.getByRole('button', { name: 'Increase quantity' }).click()
  await page.getByRole('button', { name: /Add to bag/ }).click()
  await expect(page.getByRole('status')).toContainText('Added to your bag')

  await page.getByRole('link', { name: /^Bag/ }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Your bag' })).toBeVisible()
  const summary = page.getByRole('complementary', { name: 'Order summary' })
  await expect(summary).toContainText('$22.00') // 2 × $11.00
  await expect(summary).toContainText('$7.00') // flat shipping

  await page.getByLabel('Gift card or promo code').fill('welcome10')
  await page.getByRole('button', { name: 'Apply' }).click()
  await expect(summary).toContainText('WELCOME10 applied')
  await expect(summary).toContainText('−$2.20')
  await expect(summary).toContainText('$26.80') // 22.00 − 2.20 + 7.00

  await page.getByRole('link', { name: 'Checkout' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Checkout' })).toBeVisible()
  await page.getByLabel('Email').fill('guest-e2e@example.com')
  await page.getByLabel('Full name').fill('Guest Tester')
  await page.getByRole('textbox', { name: 'Address', exact: true }).fill('12 Rue du Chocolat')
  await page.getByLabel('City').fill('Paris')
  await page.getByLabel('Postal code').fill('75003')
  await page.getByLabel('Country').selectOption('FR')
  await page.getByRole('button', { name: /Place order — \$26\.80/ }).click()

  await expect(page.getByRole('heading', { level: 1, name: 'Your order is placed' })).toBeVisible()
  await expect(page.getByText('Awaiting payment')).toBeVisible()
  await expect(page.getByText(/MC-\d{6}-[A-Z0-9]{6}/).first()).toBeVisible()
  await expect(page.locator('main')).toContainText('$26.80')

  // The confirmation link works without signing in, and the bag is now empty.
  const confirmationUrl = page.url()
  await page.goto('/cart')
  await expect(page.getByText('Your bag is empty')).toBeVisible()
  await page.goto(confirmationUrl.replace('&placed=1', ''))
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/MC-/)
})

test('order pages need the confirmation token', async ({ page }) => {
  await page.goto('/order/MC-261024-AAAAAA')
  await expect(page.getByText("We couldn't find that order")).toBeVisible()
})

test('checkout validates the address on the server', async ({ page }) => {
  await page.goto('/products/salted-butter-caramels')
  await page.getByRole('button', { name: /Add to bag/ }).click()
  await page.goto('/checkout')
  await page.getByLabel('Email').fill('not-an-email')
  await page.getByLabel('Full name').fill('X')
  await page.getByRole('button', { name: /Place order/ }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'highlighted fields' })).toBeVisible()
  await expect(page.getByText('Enter a valid email address')).toBeVisible()
})

test('a registered customer sees the order in their history', async ({ page }) => {
  const email = `customer-${Date.now()}@example.com`
  await page.goto('/register')
  await page.getByLabel('Name').fill('Registered Tester')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill('a-good-password-1')
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page.getByRole('heading', { level: 1, name: /Hello, Registered Tester/ })).toBeVisible()

  await page.goto('/products/hazelnut-milk-bar')
  await page.getByRole('button', { name: /Add to bag/ }).click()
  await page.goto('/checkout')
  await expect(page.getByLabel('Email')).toHaveValue(email) // prefilled from the account
  await page.getByRole('textbox', { name: 'Address', exact: true }).fill('5 Cocoa Street')
  await page.getByLabel('City').fill('Boston')
  await page.getByLabel('Postal code').fill('02110')
  await page.getByLabel('Country').selectOption('US')
  await page.getByRole('button', { name: /Place order/ }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Your order is placed' })).toBeVisible()
  const orderNumber = (await page.getByText(/MC-\d{6}-[A-Z0-9]{6}/).first().textContent())!.match(/MC-\d{6}-[A-Z0-9]{6}/)![0]

  await page.goto('/account/orders')
  await expect(page.getByRole('link', { name: new RegExp(orderNumber) })).toBeVisible()
  await page.getByRole('link', { name: new RegExp(orderNumber) }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(orderNumber) // owner needs no token
})
