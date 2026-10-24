import { expect, test } from '@playwright/test'

/*
 * Server-side protection checks. These run without a database: every request
 * here is rejected before any DB access (no cookie, failed validation, CSRF).
 */

test.describe('admin and account APIs', () => {
  for (const path of ['/api/admin/session', '/api/admin/anything', '/api/account/profile']) {
    test(`${path} requires authentication`, async ({ request }) => {
      const res = await request.get(path)
      expect(res.status()).toBe(401)
    })
  }

  test('path tricks cannot bypass the admin guard', async ({ request }) => {
    for (const path of ['/api/ADMIN/session', '/api//admin/session', '/api/%61dmin/session']) {
      const res = await request.get(path)
      expect(res.status(), path).toBe(401)
    }
  })

  test('mutating admin requests are rejected too', async ({ request }) => {
    const res = await request.post('/api/admin/products', { data: { name: 'x' } })
    expect(res.status()).toBe(401)
  })
})

test.describe('auth endpoints', () => {
  test('me returns null when signed out', async ({ request }) => {
    const res = await request.get('/api/auth/me')
    expect(res.status()).toBe(200)
    expect(await res.json()).toEqual({ user: null })
  })

  test('login rejects operator injection before touching the database', async ({ request }) => {
    const res = await request.post('/api/auth/login', { data: { email: { $ne: '' }, password: 'x' } })
    expect(res.status()).toBe(400)
    expect((await res.json()).data.code).toBe('INVALID_KEY')
  })

  test('login validates input before touching the database', async ({ request }) => {
    const res = await request.post('/api/auth/login', { data: { email: 'not-an-email', password: '' } })
    expect(res.status()).toBe(422)
    expect((await res.json()).data.code).toBe('VALIDATION_ERROR')
  })

  test('cross-site POSTs are blocked (CSRF)', async ({ request }) => {
    const res = await request.post('/api/auth/login', {
      headers: { Origin: 'https://evil.example' },
      data: { email: 'a@b.co', password: 'x' },
    })
    expect(res.status()).toBe(403)
  })

  test('registration is rate limited', async ({ request }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'shares one IP-based limit across projects')
    const statuses: number[] = []
    for (let i = 0; i < 6; i++) {
      const res = await request.post('/api/auth/register', { data: { name: '', email: 'bad', password: '' } })
      statuses.push(res.status())
    }
    expect(statuses.slice(0, 5).every((s) => s === 422)).toBe(true)
    expect(statuses[5]).toBe(429)
  })
})

test.describe('auth pages', () => {
  test('account page redirects anonymous visitors to sign in', async ({ page }) => {
    await page.goto('/account')
    await expect(page).toHaveURL(/\/login\?redirect=(%2F|\/)account/)
    await expect(page.getByRole('heading', { level: 1, name: 'Sign in' })).toBeVisible()
  })

  test('admin page redirects anonymous visitors to sign in', async ({ page }) => {
    await page.goto('/admin')
    await expect(page).toHaveURL(/\/login\?redirect=(%2F|\/)admin/)
  })

  test('sign-in form is labelled and shows server errors accessibly', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email').fill('someone@example.com')
    await page.getByLabel('Password').fill('wrong-password')
    await page.getByRole('button', { name: 'Sign in' }).click()
    // No DB in this environment → 503; with a DB → 401. Either way an alert is shown.
    await expect(page.getByRole('alert')).toBeVisible()
  })
})

test.describe('hardening', () => {
  test('oversized JSON bodies are refused before parsing', async ({ request }) => {
    const res = await request.post('/api/auth/login', { data: { email: 'a@b.co', password: 'x'.repeat(200_000) } })
    expect(res.status()).toBe(413)
  })

  test('security headers are set', async ({ request }) => {
    const res = await request.get('/')
    const h = res.headers()
    expect(h['x-content-type-options']).toBe('nosniff')
    expect(h['x-frame-options']).toBe('DENY')
    expect(h['referrer-policy']).toBe('strict-origin-when-cross-origin')
    expect(h['strict-transport-security']).toContain('max-age=')
  })

  test('robots.txt keeps private areas out of search and links the sitemap', async ({ request }) => {
    const body = await (await request.get('/robots.txt')).text()
    expect(body).toContain('Disallow: /admin')
    expect(body).toContain('Disallow: /checkout')
    expect(body).toMatch(/Sitemap: https?:\/\/.+\/sitemap\.xml/)
  })
})
