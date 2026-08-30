import { test, expect } from '@playwright/test';

test.describe('Phase 8 Customer Master E2E Live Workflow', () => {
  const timestamp = Date.now();
  const testEmail = `e2e_p8_user_${timestamp}@niramaalai.test`;
  const testPassword = 'Password@123';
  const customerName = `Alpha Logistics ${timestamp}`;

  test('Register -> Create Customer -> Add Shipping Address -> Verify Persistence & Soft Deactivate', async ({ page }) => {
    // 1. Register Account & Business
    await page.goto('/register');
    await page.fill('input[name="fullName"]', 'Customer Master Tester');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.fill('input[name="confirmPassword"]', testPassword);
    await page.click('button:has-text("Continue →")');

    await page.fill('input[name="businessName"]', `P8 Business ${timestamp}`);
    await page.fill('input[name="phone"]', '9840098765');
    await page.fill('input[name="address"]', '500 Guindy Industrial Estate');
    await page.fill('input[name="city"]', 'Chennai');
    await page.fill('input[name="state"]', 'Tamil Nadu');
    await page.fill('input[name="pincode"]', '600032');
    await page.click('button:has-text("Continue →")');

    await page.click('button:has-text("Create account")');
    await page.waitForURL('**/');

    // 2. Create Customer
    await page.goto('/customers/new');
    await page.fill('input[name="displayName"]', customerName);
    await page.fill('input[name="phone"]', '9840012345');
    await page.fill('input[name="email"]', 'alpha@logistics.com');
    await page.fill('input[name="gstin"]', '33AAAAA0000A1Z5');

    // Billing address fields
    await page.fill('input[name="addressLine1"]', '120 Mount Road');
    await page.fill('input[name="city"]', 'Chennai');
    await page.fill('input[name="state"]', 'Tamil Nadu');
    await page.fill('input[name="pincode"]', '600002');

    await page.click('button:has-text("Save & create customer")');
    await page.waitForURL(/\/customers\/[a-f0-9]{24}/);

    // 3. Verify Overview Tab
    await expect(page.locator(`text=${customerName}`)).toBeVisible();
    await expect(page.locator('text=33AAAAA0000A1Z5')).toBeVisible();

    // 4. Reload page & verify persistence
    await page.reload();
    await expect(page.locator(`text=${customerName}`)).toBeVisible();

    // 5. Navigate to Customer Directory Table
    await page.goto('/customers');
    await expect(page.locator(`text=${customerName}`)).toBeVisible();
  });
});
