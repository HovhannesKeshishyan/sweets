import { expect, test } from "@playwright/test";

test("homepage renders with SEO metadata and accessible landmarks", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/HK Sweets/);
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    /chocolates/i,
  );
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Primary" })).toBeVisible();
  await expect(page.getByRole("main")).toBeVisible();
});

test("unknown routes return a friendly 404 page", async ({ page }) => {
  const response = await page.goto("/this-page-does-not-exist");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    /melted away/i,
  );
});

test("health endpoint reports status without leaking details", async ({
  request,
}) => {
  const response = await request.get("/api/health");
  const body = await response.json();
  expect(["ok", "degraded"]).toContain(body.status);
  expect(Object.keys(body).sort()).toEqual(["database", "status"]);
});
