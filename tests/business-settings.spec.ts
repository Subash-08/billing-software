import { test, expect } from '@playwright/test';

test.describe('Phase 7 Business Settings E2E Persistence Flow', () => {
  const timestamp = Date.now();
  const testEmail = `e2e_p7_user_${timestamp}@niramaalai.test`;
  const testPassword = 'Password@123';
  const businessName = `P7 E2E Business ${timestamp}`;

  test('Register -> Update Profile -> GST -> Bank -> Invoice Settings -> Verify Persistence', async ({ page }) => {
    // 1. Complete Registration
    await page.goto('/register');
    await page.fill('input[name="fullName"]', 'P7 Tester');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.fill('input[name="confirmPassword"]', testPassword);
    await page.click('button:has-text("Continue →")');

    await page.fill('input[name="businessName"]', businessName);
    await page.fill('input[name="phone"]', '9840054321');
    await page.fill('input[name="address"]', '100 Mount Road');
    await page.fill('input[name="city"]', 'Chennai');
    await page.fill('input[name="state"]', 'Tamil Nadu');
    await page.fill('input[name="pincode"]', '600002');
    await page.click('button:has-text("Continue →")');

    await page.click('button:has-text("Create account")');
    await page.waitForURL('**/');

    // 2. Business Profile Update
    await page.goto('/settings/business');
    await page.fill('input[name="website"]', 'https://p7test.com');
    await page.click('button:has-text("Save business profile")');
    await expect(page.locator('text=Business profile saved successfully')).toBeVisible();

    await page.reload();
    await expect(page.locator('input[name="website"]')).toHaveValue('https://p7test.com');

    // 3. GST Settings Update
    await page.goto('/settings/gst');
    await page.fill('input[name="gstin"]', '33AAAAA0000A1Z5');
    await page.click('button:has-text("Save GST settings")');
    await expect(page.locator('text=GST settings saved successfully')).toBeVisible();

    // 4. Bank Details Update
    await page.goto('/settings/bank-details');
    await page.fill('input[name="bankName"]', 'Indian Bank');
    await page.fill('input[name="accountNumber"]', '602910129381');
    await page.fill('input[name="ifscCode"]', 'IDIB000G001');
    await page.click('button:has-text("Save bank details")');
    await expect(page.locator('text=Bank details saved successfully')).toBeVisible();
    await expect(page.locator('text=XXXX XXXX 9381')).toBeVisible();

    // 5. Invoice Settings Update
    await page.goto('/settings/invoices');
    await page.fill('input[name="prefix"]', 'NIRA');
    await page.click('button:has-text("Save invoice settings")');
    await expect(page.locator('text=Invoice settings saved successfully')).toBeVisible();

    await page.reload();
    await expect(page.locator('input[name="prefix"]')).toHaveValue('NIRA');
  });
});
