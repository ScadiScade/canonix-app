import { test, expect } from "@playwright/test";

test.describe("Landing page", () => {
  test("loads and shows hero", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  });

  test("has login link", async ({ page }) => {
    await page.goto("/");
    const loginLink = page.getByRole("link", { name: /login|войти/i });
    await expect(loginLink).toBeVisible();
  });
});

test.describe("Auth", () => {
  test("login page renders form", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("textbox", { name: /email/i })).toBeVisible();
  });

  test("register page renders form", async ({ page }) => {
    await page.goto("/login?mode=register");
    await expect(page.getByRole("textbox", { name: /email/i })).toBeVisible();
  });
});

test.describe("Dashboard", () => {
  test("redirects to login when unauthenticated", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForURL(/\/login/);
    expect(page.url()).toContain("/login");
  });
});

test.describe("Public universe", () => {
  test("shows 404 for non-existent universe", async ({ page }) => {
    const response = await page.goto("/s/nonexistent-universe-slug-12345");
    expect(response?.status()).toBe(404);
  });
});

test.describe("Marketplace", () => {
  test("loads marketplace page", async ({ page }) => {
    await page.goto("/marketplace");
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  });
});
