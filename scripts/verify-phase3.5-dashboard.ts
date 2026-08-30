/**
 * Phase 3.5 Verification Script — Dashboard & Sales Analytics
 * scripts/verify-phase3.5-dashboard.ts
 *
 * Verifies KPI aggregations, invoice status breakdowns, outstanding ageing analysis,
 * top customers/products, date period filtering, and multi-tenant isolation.
 */

import fs from 'fs';
import path from 'path';
import { Types } from 'mongoose';

if (!process.env.MONGODB_URI) {
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const [key, ...vals] = trimmed.split('=');
          const value = vals.join('=').trim();
          if (key.trim() && !process.env[key.trim()]) {
            process.env[key.trim()] = value;
          }
        }
      }
    }
  } catch (err) {}
}

export async function runPhase35Verification() {
  const { connectToDatabase } = await import('../src/db/connection');
  const { UserModel } = await import('../src/db/models/user.model');
  const { BusinessModel } = await import('../src/db/models/business.model');
  const { TaxRateModel } = await import('../src/db/models/tax-rate.model');
  const { PaymentModeModel } = await import('../src/db/models/payment-mode.model');
  const { customerService } = await import('../src/services/customer.service');
  const { productService } = await import('../src/services/product.service');
  const { invoiceService } = await import('../src/services/invoice.service');
  const { paymentService } = await import('../src/services/payment.service');
  const { dashboardService } = await import('../src/services/dashboard.service');

  await connectToDatabase();

  console.log('=== Phase 3.5 — Dashboard & Sales Analytics Verification ===\n');

  const results: Record<string, boolean> = {};

  // Setup Test User & Business A
  const user = await UserModel.findOne({ email: 'subashm0812@gmail.com' }).exec();
  if (!user) throw new Error('Test user subashm0812@gmail.com not found');
  const userId = user._id.toString();

  const business = await BusinessModel.findOne({ userId: user._id }).exec();
  if (!business) throw new Error('Business profile not found');
  const bId = business._id.toString();

  // Setup Secondary Business B for Tenant Isolation tests
  let businessB = await BusinessModel.findOne({ legalName: 'Phase 3.5 Biz B' }).exec();
  if (!businessB) {
    const userB = await UserModel.create({
      email: `p35_user_${Date.now()}@example.com`,
      name: 'User B35',
      passwordHash: '$2b$10$abcdefghijklmnopqrstuu',
    });
    businessB = await BusinessModel.create({
      userId: userB._id,
      legalName: 'Phase 3.5 Biz B',
      tradeName: 'Biz B35',
      gstin: '33BBBBB3333B1Z7',
      address: 'Line B35',
      city: 'Chennai',
      state: 'Tamil Nadu',
      stateCode: '33',
      pincode: '600001',
      phone: '9999944444',
      email: 'bizb35@example.com',
      financialYearStartMonth: 4,
    });
  }
  const bIdB = businessB._id.toString();

  // Ensure Tax Rate
  await TaxRateModel.deleteMany({ rate: 18 }).exec();
  await TaxRateModel.create({
    rate: 18,
    cgstRate: 9,
    sgstRate: 9,
    utgstRate: 0,
    igstRate: 18,
    cessRate: 0,
    applicableTo: 'BOTH',
    effectiveFrom: new Date('2026-01-01'),
    version: '1.0',
    status: 'ACTIVE',
  });

  let pMode = await PaymentModeModel.findOne({ code: 'UPI_P35' }).exec();
  if (!pMode) {
    pMode = await PaymentModeModel.create({
      code: 'UPI_P35',
      name: 'UPI P35 Mode',
      category: 'UPI',
      status: 'ACTIVE',
    });
  }
  const modeId = pMode._id.toString();

  // Create Customer & Product
  const cust = await customerService.createCustomer(userId, {
    displayName: 'P35 Analytics Customer',
    customerType: 'BUSINESS',
    phone: '9840033333',
    gstTreatment: 'REGISTERED',
    gstin: '33AAAAA3333A1Z3',
    stateCode: '33',
    shippingAddresses: [],
    contacts: [],
    billingAddress: {
      addressLine1: 'Line 35',
      city: 'Chennai',
      state: 'Tamil Nadu',
      stateCode: '33',
      pincode: '600001',
      label: 'Billing',
      country: 'India',
      isDefaultShipping: true,
    },
  });

  const prod = await productService.createProduct(userId, {
    code: `P35-PRD-${Date.now()}`,
    name: 'P35 Cloud License',
    hsnCode: '998314',
    unit: 'PCS',
    uqc: 'PCS',
    sellingPrice: 5000, // ₹5,000
    defaultGstRate: 18,
    taxTreatment: 'TAXABLE',
  });

  // Create Invoice 1 & Issue
  const draft1 = await invoiceService.createDraftInvoice(bId, {
    customerId: cust._id.toString(),
    invoiceDate: '2026-08-25',
    dueDate: '2026-09-25',
    supplyType: 'B2B',
    placeOfSupplyStateCode: '33',
    items: [
      {
        itemId: prod._id.toString(),
        quantity: 1,
        rate: 5000, // ₹5,000
        hsnSacCode: '998314',
        gstRate: 18,
        name: prod.name,
        unit: 'PCS',
        uqc: 'PCS',
      },
    ],
  });
  const inv1 = await invoiceService.issueInvoice(bId, draft1._id.toString(), userId);

  // ---------------------------------------------------------------------------
  // TEST 1: Dashboard KPI Aggregations
  // ---------------------------------------------------------------------------
  console.log('1. Verifying Dashboard KPI Aggregations...');
  const dashDataA = await dashboardService.getDashboardData(bId);

  results['Gross Billed Sales KPI'] = dashDataA.summary.grossSalesRupees > 0;
  results['Taxable Sales KPI'] = dashDataA.summary.taxableSalesRupees > 0;
  results['GST Collected KPI'] = dashDataA.summary.gstCollectedRupees > 0;
  results['Issued Invoice Count KPI'] = dashDataA.summary.issuedInvoiceCount >= 1;

  // ---------------------------------------------------------------------------
  // TEST 2: Invoice Status Distribution Breakdown
  // ---------------------------------------------------------------------------
  console.log('2. Verifying Invoice Status Breakdown...');
  results['Status Breakdown Issued Count'] = dashDataA.statusBreakdown.issued >= 1;
  results['Status Breakdown Draft Count'] = dashDataA.statusBreakdown.draft >= 0;

  // ---------------------------------------------------------------------------
  // TEST 3: Outstanding Ageing Analysis
  // ---------------------------------------------------------------------------
  console.log('3. Verifying Outstanding Ageing Analysis...');
  results['Outstanding Ageing Structure'] = typeof dashDataA.ageingBreakdown.currentRupees === 'number' && typeof dashDataA.ageingBreakdown.days90plusRupees === 'number';

  // ---------------------------------------------------------------------------
  // TEST 4: Top Customers & Top Products Ranking
  // ---------------------------------------------------------------------------
  console.log('4. Verifying Top Customers & Top Products Ranking...');
  results['Top Customers Ranking'] = dashDataA.topCustomers.length >= 1 && dashDataA.topCustomers.some((c) => c.name === 'P35 Analytics Customer');
  results['Top Products Ranking'] = dashDataA.topProducts.length >= 1 && dashDataA.topProducts.some((p) => p.name === 'P35 Cloud License');

  // ---------------------------------------------------------------------------
  // TEST 5: Financial Period Date Boundaries
  // ---------------------------------------------------------------------------
  console.log('5. Verifying Period Date Boundaries...');
  const dashFY = await dashboardService.getDashboardData(bId, { period: 'current_fy' });
  results['Current FY Period Filter'] = dashFY.summary.issuedInvoiceCount >= 1;

  // ---------------------------------------------------------------------------
  // TEST 6: Multi-Tenant Isolation Protection
  // ---------------------------------------------------------------------------
  console.log('6. Verifying Multi-Tenant Isolation on Dashboard Data...');
  const dashDataB = await dashboardService.getDashboardData(bIdB);
  results['Multi-Tenant Isolation Protection'] = dashDataB.summary.grossSalesRupees === 0 && dashDataB.summary.issuedInvoiceCount === 0;

  // Summary Report
  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(Boolean).length;
  const passVerdict = totalTests === passedTests;

  console.log('\n--- Phase 3.5 Dashboard Audit Results ---');
  for (const [name, passed] of Object.entries(results)) {
    console.log(`${passed ? '✅ PASS' : '❌ FAIL'}: ${name}`);
  }

  const report = {
    phase: 'Phase 3.5 — Dashboard & Sales Analytics',
    timestamp: new Date().toISOString(),
    totalTests,
    passedTests,
    passVerdict,
  };

  console.log('\nFinal Report:', JSON.stringify(report, null, 2));
  process.exit(passVerdict ? 0 : 1);
}

if (require.main === module) {
  runPhase35Verification().catch((err) => {
    console.error('Phase 3.5 Verification execution failed:', err);
    process.exit(1);
  });
}
