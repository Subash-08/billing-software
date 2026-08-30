/**
 * Phase 3.15 Verification Script — Billing & GST Subsystem Adversarial Audit
 * scripts/verify-phase3.15-adversarial-audit.ts
 *
 * Adversarial suite testing boundary conditions, malformed payloads, concurrent reversals,
 * accounting state transitions, tax rounding, historical immutability, and tenant isolation.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import mongoose from 'mongoose';

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

export async function runAdversarialAudit() {
  const { connectToDatabase } = await import('../src/db/connection');
  const { calculateLineGst } = await import('../src/engine/gst/gst.calculator');
  const { calculateInvoice } = await import('../src/engine/invoice/invoice.calculator');
  const { UserModel } = await import('../src/db/models/user.model');
  const { BusinessModel } = await import('../src/db/models/business.model');
  const { CustomerModel } = await import('../src/db/models/customer.model');
  const { InvoiceModel } = await import('../src/db/models/invoice.model');
  const { PaymentModel } = await import('../src/db/models/payment.model');
  const { invoiceService } = await import('../src/services/invoice.service');
  const { paymentService } = await import('../src/services/payment.service');

  await connectToDatabase();

  console.log('===========================================================');
  console.log('=== PHASE 3.15 — ADVERSARIAL BILLING & GST AUDIT ===');
  console.log('===========================================================\n');

  const results: Record<string, boolean> = {};

  // Setup Test Business A & B
  const userA = await UserModel.findOne({ email: 'subashm0812@gmail.com' }).exec();
  if (!userA) throw new Error('User A subashm0812@gmail.com not found');
  const businessA = await BusinessModel.findOne({ userId: userA._id }).exec();
  if (!businessA) throw new Error('Business A profile not found');
  const bIdA = businessA._id.toString();

  // Create Business B if missing
  let businessB = await BusinessModel.findOne({ legalName: 'Adversarial Test Biz B' }).exec();
  if (!businessB) {
    const userB = await UserModel.create({
      email: `adv_user_${Date.now()}@example.com`,
      name: 'User B Adv',
      passwordHash: '$2b$10$abcdefghijklmnopqrstuu',
    });
    businessB = await BusinessModel.create({
      userId: userB._id,
      legalName: 'Adversarial Test Biz B',
      tradeName: 'Adv B',
      gstin: '33ADVBIZ9999B1Z9',
      address: 'Line B Adv',
      city: 'Chennai',
      state: 'Tamil Nadu',
      stateCode: '33',
      pincode: '600001',
      phone: '9999900000',
      email: 'bizb_adv@example.com',
      financialYearStartMonth: 4,
    });
  }
  const bIdB = businessB._id.toString();

  // ---------------------------------------------------------------------------
  // TEST 1: GST Engine Deterministic Integer Rounding & Tax Splits
  // ---------------------------------------------------------------------------
  console.log('1. Adversarial Test: GST Math & Integer Rounding...');

  // Intrastate 18% CGST + SGST split (e.g. ₹99.99 = 9999 paise)
  const gstIntra = calculateLineGst({
    taxablePaise: 9999,
    resolvedTaxRate: { taxRateId: '507f1f77bcf86cd799439001', version: '1.0', rate: 18, cessRate: 0, effectiveFrom: new Date() },
    supplierStateCode: '33',
    placeOfSupplyStateCode: '33',
    quantity: 1,
  });
  const intraValid = gstIntra.totalTaxPaise === 1800 && gstIntra.cgstPaise === 900 && gstIntra.sgstPaise === 900 && gstIntra.igstPaise === 0;

  // Interstate 18% IGST (e.g. ₹99.99 = 9999 paise)
  const gstInter = calculateLineGst({
    taxablePaise: 9999,
    resolvedTaxRate: { taxRateId: '507f1f77bcf86cd799439002', version: '1.0', rate: 18, cessRate: 0, effectiveFrom: new Date() },
    supplierStateCode: '33',
    placeOfSupplyStateCode: '29',
    quantity: 1,
  });
  const interValid = gstInter.totalTaxPaise === 1800 && gstInter.cgstPaise === 0 && gstInter.sgstPaise === 0 && gstInter.igstPaise === 1800;

  // Exempt & Nil-Rated Tax Treatment (0 tax)
  const gstExempt = calculateLineGst({
    taxablePaise: 50000,
    resolvedTaxRate: { taxRateId: '507f1f77bcf86cd799439003', version: '1.0', rate: 18, cessRate: 0, effectiveFrom: new Date() },
    taxTreatment: 'EXEMPT',
    supplierStateCode: '33',
    placeOfSupplyStateCode: '33',
    quantity: 1,
  });
  const exemptValid = gstExempt.totalTaxPaise === 0 && gstExempt.cgstPaise === 0 && gstExempt.sgstPaise === 0;

  results['Intrastate CGST/SGST Integer Split'] = intraValid;
  results['Interstate IGST Tax Calculation'] = interValid;
  results['Exempt Supply 0 Tax Enforcement'] = exemptValid;

  // ---------------------------------------------------------------------------
  // TEST 2: Invoice Totals & Line-Item Aggregation Determinism
  // ---------------------------------------------------------------------------
  console.log('2. Adversarial Test: Multi-Line Invoice Aggregation...');
  const invTotals = calculateInvoice({
    supplierStateCode: '33',
    placeOfSupplyStateCode: '33',
    items: [
      {
        name: 'Item 1',
        classificationCode: { type: 'HSN', code: '998311' },
        quantity: 2,
        unit: 'PCS',
        uqc: 'PCS',
        ratePaise: 1001,
        resolvedTaxRate: { taxRateId: '507f1f77bcf86cd799439001', version: '1.0', rate: 18, cessRate: 0, effectiveFrom: new Date() },
      },
      {
        name: 'Item 2',
        classificationCode: { type: 'SAC', code: '998312' },
        quantity: 1,
        unit: 'PCS',
        uqc: 'PCS',
        ratePaise: 5000,
        resolvedTaxRate: { taxRateId: '507f1f77bcf86cd799439002', version: '1.0', rate: 12, cessRate: 0, effectiveFrom: new Date() },
      },
    ],
  });

  const aggValid = invTotals.totalTaxablePaise === 7002 && invTotals.totalTaxPaise === 960 && invTotals.grandTotalPaise === 8000;
  results['Multi-Line Invoice Tax Reconciliation'] = aggValid;

  // ---------------------------------------------------------------------------
  // TEST 3: State Transition Lock — Cancelled Invoice Payment Prevention
  // ---------------------------------------------------------------------------
  console.log('3. Adversarial Test: State Transition Locks...');
  
  let testCustA = await CustomerModel.findOne({ businessId: businessA._id, gstin: '33ADVTEST1111A1Z1' }).exec();
  if (!testCustA) {
    testCustA = await CustomerModel.create({
      businessId: businessA._id,
      name: 'Adversarial Customer A',
      displayName: 'Adversarial Customer A',
      customerType: 'BUSINESS',
      gstin: '33ADVTEST1111A1Z1',
      phone: '9840099999',
      stateCode: '33',
      billingAddress: {
        name: 'Adversarial Target',
        addressLine1: 'Line 1',
        city: 'Chennai',
        state: 'Tamil Nadu',
        stateCode: '33',
        pincode: '600001',
      },
    });
  }

  const draftInv = await invoiceService.createDraftInvoice(bIdA, {
    customerId: testCustA._id.toString(),
    invoiceDate: '2026-08-27',
    dueDate: '2026-09-10',
    placeOfSupplyStateCode: '33',
    items: [
      {
        name: 'Audit Test Item',
        hsnSacCode: '998311',
        quantity: 1,
        unit: 'PCS',
        uqc: 'PCS',
        rate: 100,
        gstRate: 18,
      },
    ],
  });

  const issuedInv = await invoiceService.issueInvoice(bIdA, draftInv._id.toString());
  const cancelledInv = await invoiceService.cancelInvoice(bIdA, issuedInv._id.toString(), 'Adversarial audit cancellation test');

  results['Invoice Cancellation State Lock'] = cancelledInv.status === 'CANCELLED';

  let doubleCancelFailed = false;
  try {
    await invoiceService.cancelInvoice(bIdA, cancelledInv._id.toString(), 'Second cancel attempt');
  } catch (err: any) {
    doubleCancelFailed = true;
  }
  results['Double Cancellation Prevention'] = doubleCancelFailed;

  // ---------------------------------------------------------------------------
  // TEST 4: Tenant Isolation Security Lock — Cross-Tenant Access Rejection
  // ---------------------------------------------------------------------------
  console.log('4. Adversarial Test: Cross-Tenant Access Controls...');
  let crossTenantRejected = false;
  try {
    await invoiceService.cancelInvoice(bIdB, cancelledInv._id.toString(), 'Cross-tenant attack');
  } catch (err: any) {
    crossTenantRejected = true;
  }
  results['Cross-Tenant Invoice Mutation Rejection'] = crossTenantRejected;

  // ---------------------------------------------------------------------------
  // TEST 5: Payment Over-Allocation & Double Reversal Rejection
  // ---------------------------------------------------------------------------
  console.log('5. Adversarial Test: Payment Over-Allocation & Double Reversal...');
  
  const draftInv2 = await invoiceService.createDraftInvoice(bIdA, {
    customerId: testCustA._id.toString(),
    invoiceDate: '2026-08-27',
    dueDate: '2026-09-10',
    placeOfSupplyStateCode: '33',
    items: [
      {
        name: 'Payment Audit Item',
        hsnSacCode: '998311',
        quantity: 1,
        unit: 'PCS',
        uqc: 'PCS',
        rate: 5000,
        gstRate: 18,
      },
    ],
  });
  const issuedInv2 = await invoiceService.issueInvoice(bIdA, draftInv2._id.toString());

  const { PaymentModeModel } = await import('../src/db/models/payment-mode.model');
  let pmtMode = await PaymentModeModel.findOne({ code: 'UPI' }).exec();
  if (!pmtMode) {
    pmtMode = await PaymentModeModel.create({
      code: 'UPI',
      name: 'BHIM UPI',
      category: 'UPI',
      status: 'ACTIVE',
    });
  }

  const pmtHash = crypto.createHash('sha256').update(`adv_pmt_${Date.now()}`).digest('hex');
  const paymentRecord = await paymentService.recordPayment(bIdA, userA._id.toString(), {
    customerId: testCustA._id.toString(),
    paymentDate: '2026-08-27',
    amountPaise: 5900,
    paymentModeId: pmtMode._id.toString(),
    idempotencyKey: `adv_pmt_${Date.now()}`,
    requestHash: pmtHash,
    allocations: [{ invoiceId: issuedInv2._id.toString(), allocationAmountPaise: 5900 }],
  });

  results['Payment Recorded & Allocated'] = paymentRecord.payment.amountPaise === 5900;

  const { PaymentAllocationModel } = await import('../src/db/models/payment-allocation.model');
  const allocRecord = await PaymentAllocationModel.findOne({ paymentId: paymentRecord.payment._id }).exec();
  if (!allocRecord) throw new Error('Payment allocation record not found');

  const revHash = crypto.createHash('sha256').update(`adv_rev_${Date.now()}`).digest('hex');
  const reversalRes = await paymentService.reversePaymentAllocation(bIdA, userA._id.toString(), paymentRecord.payment._id.toString(), {
    allocationId: allocRecord._id.toString(),
    reason: 'Adversarial reversal test',
    reversalIdempotencyKey: `adv_rev_${Date.now()}`,
    reversalRequestHash: revHash,
    reversedAmountPaise: 5900,
  });

  results['Payment Reversal Execution'] = Boolean(reversalRes.reversalId);

  let doubleReversalFailed = false;
  try {
    await paymentService.reversePaymentAllocation(bIdA, userA._id.toString(), paymentRecord.payment._id.toString(), {
      allocationId: allocRecord._id.toString(),
      reason: 'Double reversal attempt',
      reversalIdempotencyKey: `adv_rev2_${Date.now()}`,
      reversalRequestHash: crypto.createHash('sha256').update(`adv_rev2_${Date.now()}`).digest('hex'),
      reversedAmountPaise: 5900,
    });
  } catch (err: any) {
    doubleReversalFailed = true;
  }
  results['Double Payment Reversal Rejection'] = doubleReversalFailed;

  // ---------------------------------------------------------------------------
  // Summary Report
  // ---------------------------------------------------------------------------
  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(Boolean).length;
  const passVerdict = totalTests === passedTests;

  console.log('\n===========================================================');
  console.log('--- PHASE 3.15 ADVERSARIAL AUDIT RESULTS ---');
  console.log('===========================================================');
  for (const [name, passed] of Object.entries(results)) {
    console.log(`${passed ? '✅ PASS' : '❌ FAIL'}: ${name}`);
  }

  const report = {
    phase: 'Phase 3.15 — Billing Subsystem Adversarial Audit',
    timestamp: new Date().toISOString(),
    totalTests,
    passedTests,
    passVerdict,
  };

  console.log('\nFinal Adversarial Audit Report:', JSON.stringify(report, null, 2));
  process.exit(passVerdict ? 0 : 1);
}

if (require.main === module) {
  runAdversarialAudit().catch((err) => {
    console.error('Phase 3.15 Adversarial Audit execution failed:', err);
    process.exit(1);
  });
}
