import { test, expect } from '@playwright/test';

test.describe('Phase 6 Authentication & Business Onboarding E2E Flow', () => {
  const timestamp = Date.now();
  const testEmail = `e2e_user_${timestamp}@niramaalai.test`;
  const testPassword = 'Password@123';
  const businessName = `E2E Tech Services ${timestamp}`;

  test('Complete Registration -> Dashboard -> Live Business Settings Update -> Logout -> Navigation Protection', async ({ page }) => {
    // 1. Visit /register
    await page.goto('/register');
    await expect(page.locator('text=Step 1: Account Credentials')).toBeVisible();

    // Fill Step 1
    await page.fill('input[name="fullName"]', 'E2E Tester');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.fill('input[name="confirmPassword"]', testPassword);
    await page.click('button:has-text("Continue")');

    // Fill Step 2 (Business Details)
    await expect(page.locator('text=Step 2: Business Details')).toBeVisible();
    await page.fill('input[name="businessName"]', businessName);
    await page.fill('input[name="phone"]', '9840012345');
    await page.fill('input[name="address"]', '45 Guindy Industrial Estate');
    await page.fill('input[name="city"]', 'Chennai');
    await page.fill('input[name="state"]', 'Tamil Nadu');
    await page.fill('input[name="pincode"]', '600032');
    await page.click('button:has-text("Continue")');

    // Fill Step 3 (GST Setup)
    await expect(page.locator('text=Step 3: GST Compliance Setup')).toBeVisible();
    await page.selectOption('select[name="gstRegistrationType"]', 'REGULAR');
    await page.fill('input[name="gstin"]', '33AAACB1234C1Z1');
    await page.click('button:has-text("Complete Setup & Enter")');

    // 2. Reach Dashboard & Verify Setup Checklist
    await page.waitForURL('**/onboarding**', { timeout: 10000 }).catch(() => {});
    await page.goto('/');
    await expect(page.locator('text=NIRAMAALAI Business Onboarding')).toBeVisible();

    // 3. Open Business Settings (/settings/business) & Update Live Profile
    await page.goto('/settings/business');
    await expect(page.locator('input[name="legalName"]')).toHaveValue(businessName);

    // Update phone & trade name
    await page.fill('input[name="tradeName"]', 'E2E Brand Trade');
    await page.click('button:has-text("Save Business Profile")');
    await expect(page.locator('text=Business profile updated successfully')).toBeVisible();

    // Refresh page & verify live persistence in MongoDB Atlas
    await page.reload();
    await expect(page.locator('input[name="tradeName"]')).toHaveValue('E2E Brand Trade');

    // 4. Logout
    await page.click('header button:has-text("E2E")');
    await page.click('button:has-text("Sign Out")');
    await page.waitForURL('**/login');

    // 5. Verify Unauthenticated Navigation Protection
    await page.goto('/invoices');
    await expect(page.url()).toContain('/login');
  });
});
