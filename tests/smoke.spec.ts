import { test, expect } from '@playwright/test';

const routes = [
  '/',
  '/invoices',
  '/invoices/new',
  '/invoices/inv-1',
  '/payments',
  '/payments/pay-1',
  '/outstanding',
  '/receipts',
  '/credit-notes',
  '/debit-notes',
  '/customers',
  '/customers/new',
  '/customers/cust-1',
  '/customers/cust-1/statements',
  '/statements',
  '/products',
  '/products/new',
  '/products/prod-1',
  '/services',
  '/services/new',
  '/services/serv-1',
  '/categories',
  '/units',
  '/reports',
  '/reports/gst',
  '/reports/sales',
  '/reports/hsn-sac',
  '/settings/business',
  '/settings/gst',
  '/settings/invoices',
  '/settings/payments',
  '/settings/templates',
  '/settings/numbering',
  '/settings/backup',
  '/settings/audit-log',
  '/help',
];

for (const route of routes) {
  test(`route ${route} renders without 404`, async ({ page }) => {
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    await expect(page.locator('text=404')).not.toBeVisible();
    await expect(page.locator('text=NIRAMAALAI')).toBeVisible();
  });
}
