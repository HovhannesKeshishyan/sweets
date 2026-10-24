import { expect, test, type Page } from '@playwright/test'

/*
 * Admin workflows against a seeded throwaway database with an admin created by:
 *   npm run create-admin -- --email $E2E_ADMIN_EMAIL   (password = $E2E_ADMIN_PASSWORD)
 */
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@example.com'
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'admin-password-123'

test.skip(!process.env.E2E_WITH_DB, 'Set E2E_WITH_DB=1 with a seeded throwaway database')
test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'DB workflows run once, on desktop Chromium')
})

async function signInAsAdmin(page: Page) {
  await page.goto('/login?redirect=/admin')
  await page.getByLabel('Email').fill(ADMIN_EMAIL)
  await page.getByLabel('Password').fill(ADMIN_PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible()
}

test('customers cannot reach admin pages or APIs', async ({ page }) => {
  await page.goto('/register')
  await page.getByLabel('Name').fill('Not Admin')
  await page.getByLabel('Email').fill(`nope-${Date.now()}@example.com`)
  await page.getByLabel('Password').fill('a-good-password-1')
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page.getByRole('heading', { level: 1, name: /Hello/ })).toBeVisible()

  const api = await page.request.get('/api/admin/stats')
  expect(api.status()).toBe(403)
  const write = await page.request.post('/api/admin/products', { data: { name: 'Hack', description: 'x', price: 1 } })
  expect(write.status()).toBe(403)
})

test('admin creates a product that appears in the shop, then archives it', async ({ page }) => {
  await signInAsAdmin(page)
  const name = `E2E Praline ${Date.now()}`

  await page.getByRole('navigation', { name: 'Admin' }).getByRole('link', { name: 'Products' }).click()
  await page.getByRole('link', { name: 'New product' }).click()
  await page.getByRole('textbox', { name: 'Name', exact: true }).fill(name)
  await page.getByRole('textbox', { name: 'Description', exact: true }).fill('Created by the end-to-end test.')
  await page.getByLabel(/^Price/).fill('14.50')
  await page.getByLabel('Stock').fill('9')
  await page.getByLabel('Status').selectOption('active')
  await page.getByLabel('Category').selectOption({ label: 'Bonbons' })
  await page.getByLabel('Image URL').fill('https://picsum.photos/seed/bonbons-praline/800/1000')
  await page.getByRole('button', { name: 'Add URL' }).click()
  await page.getByRole('button', { name: 'Create product' }).click()
  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible()

  // Visible in the shop with the server-stored price.
  await page.goto('/products?category=bonbons')
  await expect(page.getByRole('link', { name }).first()).toBeVisible()
  await page.getByRole('link', { name }).first().click()
  await expect(page.getByText('$14.50').first()).toBeVisible()

  // Archive → gone from the shop.
  await page.goto(`/admin/products?q=${encodeURIComponent(name)}`)
  page.once('dialog', (d) => d.accept())
  await page.getByRole('button', { name: 'Archive' }).click()
  await expect(page.getByText(`${name} archived.`)).toBeVisible()
  await page.goto('/products?category=bonbons')
  await expect(page.getByRole('link', { name })).toHaveCount(0)
})

test('admin creates a coupon that customers can use', async ({ page }) => {
  await signInAsAdmin(page)
  const code = `E2E${Date.now().toString(36).toUpperCase()}`
  await page.goto('/admin/coupons')
  await page.getByRole('button', { name: 'New coupon' }).click()
  await page.getByLabel('Code').fill(code)
  await page.getByLabel('Discount type').selectOption('fixed')
  await page.getByLabel(/^Amount off/).fill('3')
  await page.getByRole('button', { name: 'Save coupon' }).click()
  await expect(page.getByText(`Coupon ${code} saved.`)).toBeVisible()

  await page.goto('/products/salted-butter-caramels')
  await page.getByRole('button', { name: /Add to bag/ }).click()
  await page.goto('/cart')
  await page.getByLabel('Gift card or promo code').fill(code)
  await page.getByRole('button', { name: 'Apply' }).click()
  await expect(page.getByRole('complementary', { name: 'Order summary' })).toContainText('−$3.00')

  // Disable it → no longer accepted.
  await page.goto('/admin/coupons')
  await page.getByRole('row', { name: new RegExp(code) }).getByRole('button', { name: 'Disable' }).click()
  await page.goto('/cart')
  await expect(page.getByText('This code is not valid.')).toBeVisible()
})

test('admin moves an order through fulfillment', async ({ page }) => {
  // Place an order as a guest first.
  await page.goto('/products/wildflower-honey-toffee')
  await page.getByRole('button', { name: /Add to bag/ }).click()
  await page.goto('/checkout')
  await page.getByLabel('Email').fill('fulfil-e2e@example.com')
  await page.getByLabel('Full name').fill('Fulfil Tester')
  await page.getByRole('textbox', { name: 'Address', exact: true }).fill('1 Toffee Row')
  await page.getByLabel('City').fill('London')
  await page.getByLabel('Postal code').fill('N1 1AA')
  await page.getByLabel('Country').selectOption('GB')
  await page.getByRole('button', { name: /Place order/ }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Your order is placed' })).toBeVisible()
  const orderNumber = (await page.getByText(/MC-\d{6}-[A-Z0-9]{6}/).first().textContent())!.match(/MC-\d{6}-[A-Z0-9]{6}/)![0]

  await signInAsAdmin(page)
  await page.goto(`/admin/orders?q=${orderNumber}`)
  await page.getByRole('link', { name: orderNumber }).click()
  await expect(page.getByRole('heading', { level: 1, name: orderNumber })).toBeVisible()

  await page.getByLabel('Note (optional)').fill('Packed with care')
  await page.getByRole('button', { name: 'Start preparing' }).click()
  await expect(page.getByText('Order is now preparing.')).toBeVisible()
  await page.getByRole('button', { name: 'Mark shipped' }).click()
  await expect(page.getByText('Order is now shipped.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Cancel order' })).toHaveCount(0)
  await expect(page.getByText('Packed with care')).toBeVisible()
  await expect(page.getByText('Awaiting payment').first()).toBeVisible() // payment status untouched
})

test('dashboard shows store statistics', async ({ page }) => {
  await signInAsAdmin(page)
  await expect(page.getByText('Orders (30 days)')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Recent orders' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Low stock' })).toBeVisible()
})
