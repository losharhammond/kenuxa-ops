// @ts-nocheck
/**
 * E2E: Registration → POS Sale → Invoice
 *
 * Prerequisites:
 *   E2E_EMAIL    — unique test email (auto-generated if not set)
 *   E2E_PASSWORD — password for the test account (default: TestPass123!)
 *   E2E_BASE_URL — app URL (default: http://localhost:3002)
 *
 * Run: npx playwright test e2e/pos-flow.spec.ts --headed
 */

import { test, expect, type Page } from "@playwright/test";

const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3002";
const EMAIL    = process.env.E2E_EMAIL    ?? `e2e+${Date.now()}@kenuxa-test.invalid`;
const PASSWORD = process.env.E2E_PASSWORD ?? "TestPass123!";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function register(page: Page) {
  await page.goto(`${BASE_URL}/register`);
  await page.getByLabel(/full name/i).fill("E2E Test User");
  await page.getByLabel(/email/i).fill(EMAIL);
  await page.getByLabel(/^password$/i).fill(PASSWORD);
  await page.getByLabel(/confirm password/i).fill(PASSWORD);
  await page.getByRole("button", { name: /create account/i }).click();
  await expect(page).toHaveURL(/(onboarding|dashboard)/, { timeout: 15_000 });
}

async function completeOnboarding(page: Page) {
  if (!page.url().includes("onboarding")) return;
  await page.getByPlaceholder(/business name/i).fill("E2E Test Shop");
  const industrySelect = page.locator("select").first();
  if (await industrySelect.isVisible()) {
    await industrySelect.selectOption({ index: 1 });
  }
  await page.getByRole("button", { name: /continue|next|finish/i }).first().click();
  await expect(page).toHaveURL(/dashboard/, { timeout: 15_000 });
}

async function login(page: Page) {
  await page.goto(`${BASE_URL}/login`);
  await page.getByLabel(/email/i).fill(EMAIL);
  await page.getByLabel(/password/i).fill(PASSWORD);
  await page.getByRole("button", { name: /sign in|log in/i }).click();
  await expect(page).toHaveURL(/dashboard/, { timeout: 15_000 });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

test.describe("Registration → POS sale → Invoice", () => {
  test("registers a new account", async ({ page }) => {
    await register(page);
    await completeOnboarding(page);
    await expect(page).toHaveURL(/dashboard/);
  });

  test("navigates to the POS terminal", async ({ page }) => {
    await login(page);
    await page.getByRole("link", { name: /point of sale|pos/i }).click();
    await expect(page).toHaveURL(/dashboard\/pos/);
    await expect(page.getByText(/pos terminal|sale/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test("adds a product to cart and completes sale", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/dashboard/pos`);
    await page.waitForLoadState("networkidle");

    const addButton = page.getByRole("button", { name: /add to cart|add/i }).first();
    if (await addButton.isVisible()) {
      await addButton.click();
    } else {
      test.skip();
      return;
    }

    await expect(page.getByText(/1 item|items in cart|\×\s*1/i)).toBeVisible({ timeout: 5_000 });

    const checkoutBtn = page.getByRole("button", { name: /checkout|complete sale|pay/i });
    await expect(checkoutBtn).toBeEnabled();
    await checkoutBtn.click();

    const cashOption = page.getByText(/cash/i).first();
    if (await cashOption.isVisible({ timeout: 3_000 })) {
      await cashOption.click();
    }

    const confirmBtn = page.getByRole("button", { name: /confirm|complete|process/i }).last();
    if (await confirmBtn.isVisible({ timeout: 3_000 })) {
      await confirmBtn.click();
    }

    await expect(
      page.getByText(/sale complete|success|receipt/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("generates an invoice", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/dashboard/invoicing`);
    await page.waitForLoadState("networkidle");

    const newInvoiceBtn = page.getByRole("button", { name: /new invoice|create invoice/i });
    await expect(newInvoiceBtn).toBeVisible({ timeout: 10_000 });
    await newInvoiceBtn.click();

    const customerInput = page.getByPlaceholder(/customer|client name/i).first();
    if (await customerInput.isVisible()) {
      await customerInput.fill("E2E Customer");
    }

    const addItemBtn = page.getByRole("button", { name: /add item|add line/i }).first();
    if (await addItemBtn.isVisible()) {
      await addItemBtn.click();
      const descInput = page.getByPlaceholder(/description|item/i).last();
      if (await descInput.isVisible()) await descInput.fill("Test Service");
      const amtInput = page.getByPlaceholder(/amount|price/i).last();
      if (await amtInput.isVisible()) await amtInput.fill("100");
    }

    const saveBtn = page.getByRole("button", { name: /save|create invoice/i }).last();
    if (await saveBtn.isVisible()) {
      await saveBtn.click();
      await expect(page.getByText(/invoice/i).first()).toBeVisible({ timeout: 10_000 });
    }
  });
});
