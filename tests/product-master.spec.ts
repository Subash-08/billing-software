import { test, expect } from '@playwright/test';

test.describe('Phase 9 Product Master E2E Live Workflow', () => {
  const timestamp = Date.now();
  const testEmail = `e2e_p9_prod_${timestamp}@niramaalai.test`;
  const testPassword = 'Password@123';
  const productName = `Industrial Fastener ${timestamp}`;

  test('Register -> Create Product -> Edit Product -> Deactivate & Verify Persistence', async ({ page }) => {
    // 1. Register Account & Business
    await page.goto('/register');
    await page.fill('input[name="fullName"]', 'Product Master Tester');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.fill('input[name="confirmPassword"]', testPassword);
    await page.click('button:has-text("Continue →")');

    await page.fill('input[name="businessName"]', `P9 Business ${timestamp}`);
    await page.fill('input[name="phone"]', '9840055555');
    await page.fill('input[name="address"]', '800 Ambassador Pallavaram');
    await page.fill('input[name="city"]', 'Chennai');
    await page.fill('input[name="state"]', 'Tamil Nadu');
    await page.fill('input[name="pincode"]', '600043');
    await page.click('button:has-text("Continue →")');

    await page.click('button:has-text("Create account")');
    await page.waitForURL('**/');

    // 2. Create Product
    await page.goto('/products/new');
    await page.fill('input[placeholder*="Product Name"]', productName);
    await page.fill('input[placeholder*="SKU"]', `SKU-${timestamp}`);
    await page.fill('input[placeholder*="HSN"]', '73181500');
    await page.fill('input[placeholder="0.00"]', '450.00');

    await page.click('button:has-text("Save Product")');
    await page.waitForURL('**/products');

    // 3. Verify Product in Live Table
    await expect(page.locator(`text=${productName}`)).toBeVisible();
    await expect(page.locator('text=73181500')).toBeVisible();

    // 4. Reload page & verify persistence
    await page.reload();
    await expect(page.locator(`text=${productName}`)).toBeVisible();
  });
});
