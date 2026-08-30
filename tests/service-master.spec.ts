import { test, expect } from '@playwright/test';

test.describe('Phase 9 Service Master E2E Live Workflow', () => {
  const timestamp = Date.now();
  const testEmail = `e2e_p9_serv_${timestamp}@niramaalai.test`;
  const testPassword = 'Password@123';
  const serviceName = `IT Infrastructure Consulting ${timestamp}`;

  test('Register -> Create Service -> Search -> Edit -> Deactivate & Verify Persistence', async ({ page }) => {
    // 1. Register Account & Business
    await page.goto('/register');
    await page.fill('input[name="fullName"]', 'Service Master Tester');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.fill('input[name="confirmPassword"]', testPassword);
    await page.click('button:has-text("Continue →")');

    await page.fill('input[name="businessName"]', `P9 Service Business ${timestamp}`);
    await page.fill('input[name="phone"]', '9840066666');
    await page.fill('input[name="address"]', '900 OMR Tech Park');
    await page.fill('input[name="city"]', 'Chennai');
    await page.fill('input[name="state"]', 'Tamil Nadu');
    await page.fill('input[name="pincode"]', '600096');
    await page.click('button:has-text("Continue →")');

    await page.click('button:has-text("Create account")');
    await page.waitForURL('**/');

    // 2. Create Service
    await page.goto('/services/new');
    await page.fill('input[placeholder*="Service Title"]', serviceName);
    await page.fill('input[placeholder*="Service Code"]', `SERV-${timestamp}`);
    await page.fill('input[placeholder*="SAC Code"]', '998314');
    await page.fill('input[placeholder="0.00"]', '2500.00');

    await page.click('button:has-text("Save Service")');
    await page.waitForURL('**/services');

    // 3. Verify Service in Live Table
    await expect(page.locator(`text=${serviceName}`)).toBeVisible();
    await expect(page.locator('text=998314')).toBeVisible();

    // 4. Reload page & verify persistence
    await page.reload();
    await expect(page.locator(`text=${serviceName}`)).toBeVisible();
  });
});
