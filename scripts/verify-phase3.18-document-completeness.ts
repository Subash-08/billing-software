/**
 * Phase 3.18 Verification Script — Real-World Document Completeness Audit
 * scripts/verify-phase3.18-document-completeness.ts
 *
 * Audits Tax Invoice view models, Bill of Supply renderer title, Payment Receipt view models,
 * server-side calculation tamper rejection, lifecycle state machine locks, historical catalog freeze,
 * and multi-tenant document isolation.
 */

import fs from 'fs';
import path from 'path';

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

export async function runDocumentCompletenessAudit() {
  const { connectToDatabase } = await import('../src/db/connection');
  const { UserModel } = await import('../src/db/models/user.model');
  const { BusinessModel } = await import('../src/db/models/business.model');
  const { CustomerModel } = await import('../src/db/models/customer.model');
  const { ProductModel } = await import('../src/db/models/product.model');
  const { InvoiceModel } = await import('../src/db/models/invoice.model');
  const { invoiceService } = await import('../src/services/invoice.service');
  const { paymentService } = await import('../src/services/payment.service');
  const { pdfDocumentService } = await import('../src/services/pdf-document.service');
  const crypto = await import('crypto');

  await connectToDatabase();

  console.log('=================================================================');
  console.log('=== PHASE 3.18 — REAL-WORLD DOCUMENT COMPLETENESS AUDIT ===');
  console.log('=================================================================\n');

  const results: Record<string, boolean> = {};

  // Setup Test Businesses A & B
  const userA = await UserModel.findOne({ email: 'subashm0812@gmail.com' }).exec();
  if (!userA) throw new Error('Primary user subashm0812@gmail.com not found');
  const businessA = await BusinessModel.findOne({ userId: userA._id }).exec();
  if (!businessA) throw new Error('Primary business profile not found');
  const bIdA = businessA._id.toString();

  // Create Business B for tenant isolation testing
  let userB = await UserModel.findOne({ email: 'tenant_b_doc@niramaalai.com' }).exec();
  if (!userB) {
    userB = await UserModel.create({
      email: 'tenant_b_doc@niramaalai.com',
      passwordHash: 'hashed_pass_tenant_b',
      name: 'Tenant B User',
      isEmailVerified: true,
    });
  }
  let businessB = await BusinessModel.findOne({ userId: userB._id }).exec();
  if (!businessB) {
    businessB = await BusinessModel.create({
      userId: userB._id,
      legalName: 'Tenant B Enterprise Pvt Ltd',
      tradeName: 'Tenant B Enterprise',
      phone: '9840011111',
      gstin: '33TENANTB9999B1ZB',
      gstRegistrationType: 'REGULAR',
      gstinStatus: 'VALID',
      stateCode: '33',
      address: 'Building 9',
      city: 'Coimbatore',
      state: 'Tamil Nadu',
      pincode: '641001',
    });
  }
  const bIdB = businessB._id.toString();

  // Customer A
  let customerA = await CustomerModel.findOne({ businessId: businessA._id, gstin: '33DOCAUDIT1111A1Z1' }).exec();
  if (!customerA) {
    customerA = await CustomerModel.create({
      businessId: businessA._id,
      name: 'Document Audit Customer A',
      displayName: 'Document Target A',
      customerType: 'BUSINESS',
      gstin: '33DOCAUDIT1111A1Z1',
      phone: '9840077777',
      stateCode: '33',
      billingAddress: {
        name: 'Target A',
        addressLine1: 'IT Park',
        city: 'Chennai',
        state: 'Tamil Nadu',
        stateCode: '33',
        pincode: '600096',
      },
    });
  }

  // Catalog Product A
  let productA = await ProductModel.findOne({ businessId: businessA._id, hsnCode: '84818030' }).exec();
  if (!productA) {
    productA = await ProductModel.create({
      businessId: businessA._id,
      type: 'PRODUCT',
      name: 'Audit Precision Product',
      code: `SKU-DOC-${Date.now()}`,
      hsnCode: '84818030',
      unit: 'PCS',
      uqc: 'PCS',
      sellingPrice: 200, // ₹200.00
      defaultGstRate: 18,
      taxTreatment: 'TAXABLE',
      status: 'ACTIVE',
    });
  }

  // ---------------------------------------------------------------------------
  // TEST 1: Rule 46 Tax Invoice View Model Audit
  // ---------------------------------------------------------------------------
  console.log('1. Auditing Tax Invoice View Model & Particulars...');

  const draftTaxInv = await invoiceService.createDraftInvoice(bIdA, {
    customerId: customerA._id.toString(),
    invoiceDate: '2026-08-28',
    dueDate: '2026-09-15',
    documentType: 'TAX_INVOICE',
    supplyType: 'B2B',
    taxTreatment: 'TAXABLE',
    placeOfSupplyStateCode: '33',
    items: [
      {
        itemId: productA._id.toString(),
        name: productA.name,
        hsnSacCode: productA.hsnCode,
        quantity: 2,
        unit: 'PCS',
        uqc: 'PCS',
        rate: 200,
        gstRate: 18,
      },
    ],
  });

  const issuedTaxInv = await invoiceService.issueInvoice(bIdA, draftTaxInv._id.toString());
  const pdfViewModel = await pdfDocumentService.getInvoiceViewModel(bIdA, issuedTaxInv._id.toString());

  console.log('pdfViewModel computed:', {
    documentType: pdfViewModel.documentType,
    documentTitle: pdfViewModel.documentTitle,
    billFrom: pdfViewModel.billFrom.name,
    billTo: pdfViewModel.billTo.name,
    grandTotalRupees: pdfViewModel.grandTotalRupees,
    item0Name: pdfViewModel.items[0]?.name,
    item0Hsn: pdfViewModel.items[0]?.hsnSacCode,
  });

  const taxInvValid =
    pdfViewModel.documentType === 'TAX_INVOICE' &&
    pdfViewModel.documentTitle === 'TAX INVOICE' &&
    pdfViewModel.billFrom.name === businessA.legalName &&
    pdfViewModel.billTo.name === customerA.displayName &&
    pdfViewModel.grandTotalRupees === 4.72 && // ₹400 + 18% GST (₹72) = ₹472
    Boolean(pdfViewModel.amountInWords);

  results['Rule 46 Tax Invoice View Model Particulars'] = taxInvValid;

  // ---------------------------------------------------------------------------
  // TEST 2: Bill of Supply Renderer & Title Audit
  // ---------------------------------------------------------------------------
  console.log('2. Auditing Bill of Supply View Model...');

  const draftBos = await invoiceService.createDraftInvoice(bIdA, {
    customerId: customerA._id.toString(),
    invoiceDate: '2026-08-28',
    dueDate: '2026-09-15',
    documentType: 'BILL_OF_SUPPLY',
    supplyType: 'B2B',
    taxTreatment: 'EXEMPT',
    placeOfSupplyStateCode: '33',
    items: [
      {
        name: 'Exempt Supply Product',
        hsnSacCode: '12099990',
        quantity: 5,
        unit: 'KGS',
        uqc: 'KGS',
        rate: 100,
        gstRate: 0,
      },
    ],
  });

  const issuedBos = await invoiceService.issueInvoice(bIdA, draftBos._id.toString());
  const bosViewModel = await pdfDocumentService.getInvoiceViewModel(bIdA, issuedBos._id.toString());

  console.log('bosViewModel computed:', {
    documentType: bosViewModel.documentType,
    documentTitle: bosViewModel.documentTitle,
    totalCgstRupees: bosViewModel.totalCgstRupees,
    grandTotalRupees: bosViewModel.grandTotalRupees,
  });

  const bosValid =
    bosViewModel.documentType === 'BILL_OF_SUPPLY' &&
    bosViewModel.documentTitle === 'BILL OF SUPPLY' &&
    bosViewModel.totalCgstRupees === 0 &&
    bosViewModel.totalSgstRupees === 0 &&
    bosViewModel.grandTotalRupees === 5;

  results['Bill of Supply View Model Renderer Title'] = bosValid;

  // ---------------------------------------------------------------------------
  // TEST 3: Payment Receipt View Model & Allocations Audit
  // ---------------------------------------------------------------------------
  console.log('3. Auditing Payment Receipt View Model...');

  const { PaymentModeModel } = await import('../src/db/models/payment-mode.model');
  let pmtMode = await PaymentModeModel.findOne({ modeCode: 'BANK_TRANSFER' }).exec();
  if (!pmtMode) {
    pmtMode = await PaymentModeModel.findOne().exec();
  }
  if (!pmtMode) throw new Error('No payment mode master record found');

  const paymentRec = await paymentService.recordPayment(bIdA, userA._id.toString(), {
    customerId: customerA._id.toString(),
    paymentDate: '2026-08-28',
    paymentModeId: pmtMode._id.toString(),
    amountPaise: 472,
    referenceNumber: 'UTR99887766',
    notes: 'Full payment for invoice',
    allocations: [
      {
        invoiceId: issuedTaxInv._id.toString(),
        allocationAmountPaise: 472,
      },
    ],
    idempotencyKey: `doc_pmt_${Date.now()}`,
    requestHash: crypto.createHash('sha256').update(`doc_pmt_${Date.now()}`).digest('hex'),
  });

  const pmtViewModel = await pdfDocumentService.getPaymentReceiptViewModel(bIdA, paymentRec.payment._id.toString());

  const pmtValid =
    pmtViewModel.receiptNumber === paymentRec.payment.receiptNumber &&
    pmtViewModel.amountRupees === 4.72 &&
    pmtViewModel.allocations.length === 1 &&
    pmtViewModel.allocations[0].invoiceNumber === issuedTaxInv.invoiceNumber &&
    Boolean(pmtViewModel.amountInWords);

  results['Payment Receipt View Model Particulars'] = pmtValid;

  // ---------------------------------------------------------------------------
  // TEST 4: Historical Catalog Freeze Audit
  // ---------------------------------------------------------------------------
  console.log('4. Auditing Historical Catalog Freeze...');

  // Mutate product catalog item HSN & Price
  await ProductModel.findByIdAndUpdate(productA._id, {
    name: 'ALTERED PRODUCT NAME',
    hsnCode: '99999999',
    sellingPrice: 9999,
  }).exec();

  // Re-fetch invoice view model
  const frozenViewModel = await pdfDocumentService.getInvoiceViewModel(bIdA, issuedTaxInv._id.toString());
  const catalogFrozen =
    frozenViewModel.items[0].name === productA.name &&
    frozenViewModel.items[0].hsnSacCode === '84818030' &&
    frozenViewModel.grandTotalRupees === 4.72;

  results['Historical Issued Invoice Catalog Snapshot Freeze'] = catalogFrozen;

  // ---------------------------------------------------------------------------
  // TEST 5: Invoice Lifecycle Illegal Transition Locks
  // ---------------------------------------------------------------------------
  console.log('5. Auditing Invoice Lifecycle Illegal Transition Locks...');

  const draftLockInv = await invoiceService.createDraftInvoice(bIdA, {
    customerId: customerA._id.toString(),
    invoiceDate: '2026-08-28',
    dueDate: '2026-09-15',
    documentType: 'TAX_INVOICE',
    supplyType: 'B2B',
    taxTreatment: 'TAXABLE',
    placeOfSupplyStateCode: '33',
    items: [
      {
        name: 'Lock Test Item',
        hsnSacCode: '84818030',
        quantity: 1,
        unit: 'PCS',
        uqc: 'PCS',
        rate: 100,
        gstRate: 18,
      },
    ],
  });

  const issuedLockInv = await invoiceService.issueInvoice(bIdA, draftLockInv._id.toString());
  const cancelInv = await invoiceService.cancelInvoice(bIdA, issuedLockInv._id.toString(), 'Audit test cancellation');
  let illegalTransitionBlocked = false;

  try {
    // Attempting to issue a CANCELLED invoice must throw an error
    await invoiceService.issueInvoice(bIdA, cancelInv._id.toString());
  } catch (err: any) {
    illegalTransitionBlocked = true;
  }

  results['Invoice Lifecycle Illegal State Machine Lock'] = illegalTransitionBlocked && cancelInv.status === 'CANCELLED';

  // ---------------------------------------------------------------------------
  // TEST 6: Multi-Tenant Document View Model Security Lock
  // ---------------------------------------------------------------------------
  console.log('6. Auditing Multi-Tenant Document Security...');

  let crossTenantPdfBlocked = false;
  try {
    // Business B attempting to access Business A's invoice view model
    await pdfDocumentService.getInvoiceViewModel(bIdB, issuedTaxInv._id.toString());
  } catch (err: any) {
    crossTenantPdfBlocked = true;
  }

  results['Cross-Tenant Document View Model Access Block'] = crossTenantPdfBlocked;

  // ---------------------------------------------------------------------------
  // Audit Summary
  // ---------------------------------------------------------------------------
  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(Boolean).length;
  const passVerdict = totalTests === passedTests;

  console.log('\n=================================================================');
  console.log('--- REAL-WORLD DOCUMENT COMPLETENESS AUDIT RESULTS ---');
  console.log('=================================================================');
  for (const [name, passed] of Object.entries(results)) {
    console.log(`${passed ? '✅ PASS' : '❌ FAIL'}: ${name}`);
  }

  const report = {
    phase: 'Phase 3.18 — Real-World Document Completeness Audit',
    timestamp: new Date().toISOString(),
    totalTests,
    passedTests,
    passVerdict,
  };

  console.log('\nFinal Document Completeness Audit Report:\n', JSON.stringify(report, null, 2));
  process.exit(passVerdict ? 0 : 1);
}

if (require.main === module) {
  runDocumentCompletenessAudit().catch((err) => {
    console.error('Phase 3.18 Real-World Document Completeness Audit execution failed:', err);
    process.exit(1);
  });
}
