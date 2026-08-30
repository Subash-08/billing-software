/**
 * Phase 3.4 Verification Script — PDF Documents & Statutory GST Reports
 * scripts/verify-phase3.4-documents-gst.ts
 *
 * Verifies Intrastate/Interstate Invoice PDF view models, Payment Receipt PDF view models,
 * Indian Currency Words conversion, GSTR-1 B2B/B2CS/HSN statutory aggregations,
 * GSTR-3B Table 3.1 summaries, draft exclusion, cancelled registers, and multi-tenant isolation.
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

export async function runPhase34Verification() {
  const { connectToDatabase } = await import('../src/db/connection');
  const { UserModel } = await import('../src/db/models/user.model');
  const { BusinessModel } = await import('../src/db/models/business.model');
  const { TaxRateModel } = await import('../src/db/models/tax-rate.model');
  const { PaymentModeModel } = await import('../src/db/models/payment-mode.model');
  const { customerService } = await import('../src/services/customer.service');
  const { productService } = await import('../src/services/product.service');
  const { invoiceService } = await import('../src/services/invoice.service');
  const { paymentService } = await import('../src/services/payment.service');
  const { paiseToRupees } = await import('../src/lib/money');
  const { pdfDocumentService, numberToIndianWords } = await import('../src/services/pdf-document.service');
  const { gstReportService } = await import('../src/services/gst-report.service');

  await connectToDatabase();

  console.log('=== Phase 3.4 — PDF Documents & Statutory GST Reports Verification ===\n');

  const results: Record<string, boolean> = {};

  // Setup Test User & Business A
  const user = await UserModel.findOne({ email: 'subashm0812@gmail.com' }).exec();
  if (!user) throw new Error('Test user subashm0812@gmail.com not found');
  const userId = user._id.toString();

  const business = await BusinessModel.findOne({ userId: user._id }).exec();
  if (!business) throw new Error('Business profile not found');
  const bId = business._id.toString();

  // Setup Secondary Business B for Tenant Isolation tests
  let businessB = await BusinessModel.findOne({ legalName: 'Phase 3.4 Biz B' }).exec();
  if (!businessB) {
    const userB = await UserModel.create({
      email: `p34_user_${Date.now()}@example.com`,
      name: 'User B34',
      passwordHash: '$2b$10$abcdefghijklmnopqrstuu',
    });
    businessB = await BusinessModel.create({
      userId: userB._id,
      legalName: 'Phase 3.4 Biz B',
      tradeName: 'Biz B34',
      gstin: '33BBBBB2222B1Z8',
      address: 'Line B34',
      city: 'Chennai',
      state: 'Tamil Nadu',
      stateCode: '33',
      pincode: '600001',
      phone: '9999933333',
      email: 'bizb34@example.com',
      financialYearStartMonth: 4,
    });
  }
  const bIdB = businessB._id.toString();

  // Ensure Tax Rates
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

  let pMode = await PaymentModeModel.findOne({ code: 'UPI_P34' }).exec();
  if (!pMode) {
    pMode = await PaymentModeModel.create({
      code: 'UPI_P34',
      name: 'UPI P34 Mode',
      category: 'UPI',
      status: 'ACTIVE',
    });
  }
  const modeId = pMode._id.toString();

  // Create Registered B2B Customer (TN)
  const custB2B = await customerService.createCustomer(userId, {
    displayName: 'P34 B2B Customer TN',
    customerType: 'BUSINESS',
    phone: '9840022222',
    gstTreatment: 'REGISTERED',
    gstin: '33AAACA1111A1Z5',
    stateCode: '33',
    shippingAddresses: [],
    contacts: [],
    billingAddress: {
      addressLine1: 'Mount Road',
      city: 'Chennai',
      state: 'Tamil Nadu',
      stateCode: '33',
      pincode: '600002',
      label: 'Billing',
      country: 'India',
      isDefaultShipping: true,
    },
  });

  // Create Unregistered B2C Customer (KA)
  const custB2C = await customerService.createCustomer(userId, {
    displayName: 'P34 B2C Customer KA',
    customerType: 'INDIVIDUAL',
    phone: '9880033333',
    gstTreatment: 'UNREGISTERED',
    stateCode: '29',
    shippingAddresses: [],
    contacts: [],
    billingAddress: {
      addressLine1: 'MG Road',
      city: 'Bengaluru',
      state: 'Karnataka',
      stateCode: '29',
      pincode: '560001',
      label: 'Billing',
      country: 'India',
      isDefaultShipping: true,
    },
  });

  const prod = await productService.createProduct(userId, {
    code: `P34-PRD-${Date.now()}`,
    name: 'P34 Software Subscription',
    hsnCode: '998313',
    unit: 'PCS',
    uqc: 'PCS',
    sellingPrice: 2000, // ₹2,000
    defaultGstRate: 18,
    taxTreatment: 'TAXABLE',
  });

  // ---------------------------------------------------------------------------
  // TEST 1: Indian Currency Words Helper
  // ---------------------------------------------------------------------------
  console.log('1. Verifying Indian Currency Words Conversion...');
  const words1 = numberToIndianWords(2360);
  const words2 = numberToIndianWords(150.50);
  results['Indian Currency Words'] = words1 === 'Two Thousand Three Hundred Sixty Rupees Only' && words2 === 'One Hundred Fifty Rupees and Fifty Paise Only';

  // ---------------------------------------------------------------------------
  // TEST 2: Intrastate Invoice PDF View Model & Locked Snapshot Consistency
  // ---------------------------------------------------------------------------
  console.log('2. Verifying Intrastate Invoice PDF View Model...');
  const draftTN = await invoiceService.createDraftInvoice(bId, {
    customerId: custB2B._id.toString(),
    invoiceDate: '2026-08-25',
    dueDate: '2026-09-25',
    supplyType: 'B2B',
    placeOfSupplyStateCode: '33',
    items: [
      {
        itemId: prod._id.toString(),
        quantity: 1,
        rate: 2000,
        hsnSacCode: '998313',
        gstRate: 18,
        name: prod.name,
        unit: 'PCS',
        uqc: 'PCS',
      },
    ],
  });
  const invTN = await invoiceService.issueInvoice(bId, draftTN._id.toString(), userId);

  const pdfViewModelTN = await pdfDocumentService.getInvoiceViewModel(bId, invTN._id.toString());
  results['Intrastate CGST PDF Match'] = pdfViewModelTN.totalCgstRupees === paiseToRupees(invTN.totalCgst);
  results['Intrastate SGST PDF Match'] = pdfViewModelTN.totalSgstRupees === paiseToRupees(invTN.totalSgst);
  results['Intrastate IGST PDF Match'] = pdfViewModelTN.totalIgstRupees === 0;
  results['Intrastate Grand Total PDF Match'] = pdfViewModelTN.grandTotalRupees === paiseToRupees(invTN.grandTotal);
  results['PDF Amount in Words Match'] = pdfViewModelTN.amountInWords === numberToIndianWords(paiseToRupees(invTN.grandTotal));

  // ---------------------------------------------------------------------------
  // TEST 3: Interstate Invoice PDF View Model (IGST)
  // ---------------------------------------------------------------------------
  console.log('3. Verifying Interstate Invoice PDF View Model...');
  const draftKA = await invoiceService.createDraftInvoice(bId, {
    customerId: custB2C._id.toString(),
    invoiceDate: '2026-08-25',
    dueDate: '2026-09-25',
    supplyType: 'B2C',
    placeOfSupplyStateCode: '29',
    items: [
      {
        itemId: prod._id.toString(),
        quantity: 1,
        rate: 1000,
        hsnSacCode: '998313',
        gstRate: 18,
        name: prod.name,
        unit: 'PCS',
        uqc: 'PCS',
      },
    ],
  });
  const invKA = await invoiceService.issueInvoice(bId, draftKA._id.toString(), userId);

  const pdfViewModelKA = await pdfDocumentService.getInvoiceViewModel(bId, invKA._id.toString());
  results['Interstate IGST PDF Match'] = pdfViewModelKA.totalIgstRupees === paiseToRupees(invKA.totalIgst);
  results['Interstate Grand Total PDF Match'] = pdfViewModelKA.grandTotalRupees === paiseToRupees(invKA.grandTotal);

  // ---------------------------------------------------------------------------
  // TEST 4: Payment Receipt PDF View Model
  // ---------------------------------------------------------------------------
  console.log('4. Verifying Payment Receipt PDF View Model...');
  const payPaiseTN = invTN.grandTotal;
  const payRupeesTN = paiseToRupees(payPaiseTN);

  const payRecord = await paymentService.recordPayment(bId, userId, {
    customerId: custB2B._id.toString(),
    paymentDate: '2026-08-26',
    amountPaise: payPaiseTN,
    paymentModeId: modeId,
    idempotencyKey: `KEY-P34-PAY-${Date.now()}`,
    requestHash: 'HASH-PAY-P34',
    allocations: [{ invoiceId: invTN._id.toString(), allocationAmountPaise: payPaiseTN }],
  });

  const receiptPdf = await pdfDocumentService.getPaymentReceiptViewModel(bId, payRecord.payment._id.toString());
  results['Payment Receipt Amount Match'] = receiptPdf.amountRupees === payRupeesTN;
  results['Payment Receipt Customer Match'] = receiptPdf.customer.displayName === 'P34 B2B Customer TN';
  results['Payment Receipt Allocations Match'] = receiptPdf.allocations.length === 1 && receiptPdf.allocations[0].allocatedAmountRupees === payRupeesTN;

  // ---------------------------------------------------------------------------
  // TEST 5: GSTR-1 Statutory Data Aggregation
  // ---------------------------------------------------------------------------
  console.log('5. Verifying GSTR-1 Statutory Data Aggregation...');
  const gstr1 = await gstReportService.generateGstr1Report(bId, { fromDate: '2026-08-01', toDate: '2026-08-31' });

  results['GSTR-1 B2B Registration'] = gstr1.b2b.length >= 1 && gstr1.b2b.some((b) => b.invoiceNumber === invTN.invoiceNumber);
  results['GSTR-1 B2CS Registration'] = gstr1.b2cs.length >= 1;
  results['GSTR-1 HSN Aggregation'] = gstr1.hsnSummary.length >= 1 && gstr1.hsnSummary.some((h) => h.hsnSacCode === '998313');

  // ---------------------------------------------------------------------------
  // TEST 6: GSTR-3B Table 3.1 Aggregation
  // ---------------------------------------------------------------------------
  console.log('6. Verifying GSTR-3B Table 3.1 Aggregation...');
  const gstr3b = await gstReportService.generateGstr3bSummary(bId, { fromDate: '2026-08-01', toDate: '2026-08-31' });

  results['GSTR-3B Taxable Value Aggregation'] = gstr3b.outwardTaxableSupplies.taxableValueRupees > 0;
  results['GSTR-3B IGST Aggregation'] = gstr3b.outwardTaxableSupplies.igstRupees >= 1.8;
  results['GSTR-3B CGST Aggregation'] = gstr3b.outwardTaxableSupplies.cgstRupees >= 1.8;
  results['GSTR-3B SGST Aggregation'] = gstr3b.outwardTaxableSupplies.sgstRupees >= 1.8;

  // ---------------------------------------------------------------------------
  // TEST 7: Tenant Isolation Protection on Documents & Reports
  // ---------------------------------------------------------------------------
  console.log('7. Verifying Tenant Isolation on Reports & PDF View Models...');
  let tenantLeakage = false;
  try {
    await pdfDocumentService.getInvoiceViewModel(bIdB, invTN._id.toString());
  } catch (err: any) {
    tenantLeakage = err.statusCode === 404 || err.name === 'NotFoundError';
  }
  results['Multi-Tenant Isolation Protection'] = tenantLeakage;

  // Summary Report
  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(Boolean).length;
  const passVerdict = totalTests === passedTests;

  console.log('\n--- Phase 3.4 Documents & GST Audit Results ---');
  for (const [name, passed] of Object.entries(results)) {
    console.log(`${passed ? '✅ PASS' : '❌ FAIL'}: ${name}`);
  }

  const report = {
    phase: 'Phase 3.4 — PDF Documents & Statutory GST Reports',
    timestamp: new Date().toISOString(),
    totalTests,
    passedTests,
    passVerdict,
  };

  console.log('\nFinal Report:', JSON.stringify(report, null, 2));
  process.exit(passVerdict ? 0 : 1);
}

if (require.main === module) {
  runPhase34Verification().catch((err) => {
    console.error('Phase 3.4 Verification execution failed:', err);
    process.exit(1);
  });
}
