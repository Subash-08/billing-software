/**
 * Step 4 Verification Script — Idempotency & E11000 Race Recovery Verification
 * scripts/verify-step4-idempotency.ts
 *
 * Executes 5 independent rounds for three idempotency scenarios against live MongoDB Atlas:
 * - Scenario A: 100 concurrent identical recordPayment() calls (same key + same hash).
 * - Scenario B: Idempotency key reuse conflict (same key + different hash).
 * - Scenario C: 100 concurrent duplicate reversePaymentAllocation() calls (same reversal key).
 */

import fs from 'fs';
import path from 'path';
import { Types } from 'mongoose';

// Load .env manually if process.env.MONGODB_URI is not set
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
  } catch (err) {
    // Ignore .env read error
  }
}

export interface ScenarioAIdempotencyResult {
  round: number;
  totalAttempted: number;
  successfulDeduplicatedResponses: number;
  uniquePaymentDocumentsCreated: number;
  authoritativeAllocationsCreated: number;
  auditLogsCreated: number;
  identicalReceiptNumberReturned: boolean;
  passed: boolean;
}

export interface ScenarioBIdempotencyResult {
  round: number;
  initialRequestSucceeded: boolean;
  conflictingRequestFailedWithCorrectError: boolean;
  errorMessage: string;
  uniquePaymentDocumentsCreated: number;
  passed: boolean;
}

export interface ScenarioCIdempotencyResult {
  round: number;
  totalAttempted: number;
  successfulReversalsReturned: number;
  uniqueReversalDocumentsCreated: number;
  finalInvoiceOutstandingPaise: number;
  passed: boolean;
}

export interface Step4EvidenceReport {
  step: 'Step 4 — Idempotency & E11000 Race Recovery Verification';
  timestamp: string;
  totalRoundsExecuted: number;
  scenarioA: {
    rounds: ScenarioAIdempotencyResult[];
    allRoundsPassed: boolean;
  };
  scenarioB: {
    rounds: ScenarioBIdempotencyResult[];
    allRoundsPassed: boolean;
  };
  scenarioC: {
    rounds: ScenarioCIdempotencyResult[];
    allRoundsPassed: boolean;
  };
  passVerdict: boolean;
}

export async function runStep4Verification(): Promise<Step4EvidenceReport> {
  const { connectToDatabase } = await import('../src/db/connection');
  const { paymentService } = await import('../src/services/payment.service');
  const { BusinessModel } = await import('../src/db/models/business.model');
  const { CustomerModel } = await import('../src/db/models/customer.model');
  const { PaymentModeModel } = await import('../src/db/models/payment-mode.model');
  const { InvoiceModel } = await import('../src/db/models/invoice.model');
  const { PaymentModel } = await import('../src/db/models/payment.model');
  const { PaymentAllocationModel } = await import('../src/db/models/payment-allocation.model');
  const { PaymentReversalModel } = await import('../src/db/models/payment-reversal.model');
  const { AuditLogModel } = await import('../src/db/models/audit-log.model');

  await connectToDatabase();

  // Create test master data
  const biz = await BusinessModel.create({
    userId: new Types.ObjectId(),
    legalName: `Step 4 Idempotency Biz ${Date.now()}`,
    gstin: '33AAAAA1111A1Z5',
    email: 'step4@test.com',
    phone: '9876543210',
    stateCode: '33',
    currency: 'INR',
    address: '400 Idempotency Way',
    city: 'Chennai',
    state: 'Tamil Nadu',
    pincode: '600001',
    gstRegistrationType: 'REGULAR',
    gstinStatus: 'VALID',
  });
  const bId = (biz._id as Types.ObjectId).toString();

  const cust = await CustomerModel.create({
    businessId: biz._id,
    displayName: 'Step 4 Idempotency Customer',
    customerType: 'BUSINESS',
    phone: '9999944444',
    gstTreatment: 'REGISTERED',
    stateCode: '33',
    billingAddress: {
      addressLine1: 'Suite 400',
      city: 'Chennai',
      state: 'Tamil Nadu',
      stateCode: '33',
      pincode: '600001',
    },
  });
  const cId = (cust._id as Types.ObjectId).toString();

  const mode = await PaymentModeModel.create({
    code: `MODE_STEP4_${Date.now()}`,
    name: 'Step 4 Bank Transfer',
    category: 'BANK_TRANSFER',
    status: 'ACTIVE',
  });
  const mId = (mode._id as Types.ObjectId).toString();

  const TOTAL_ROUNDS = 5;
  const scenarioARounds: ScenarioAIdempotencyResult[] = [];
  const scenarioBRounds: ScenarioBIdempotencyResult[] = [];
  const scenarioCRounds: ScenarioCIdempotencyResult[] = [];

  // =========================================================================
  // SCENARIO A: 100 Concurrent Identical Requests (Same Key + Same Hash)
  // =========================================================================
  for (let round = 1; round <= TOTAL_ROUNDS; round++) {
    const grandTotalPaise = 1000000; // ₹10,000
    const invoice = await InvoiceModel.create({
      businessId: new Types.ObjectId(bId),
      customerId: new Types.ObjectId(cId),
      invoiceNumber: `INV-IDEM-A-R${round}-${Date.now()}`,
      financialYear: '2026-27',
      documentType: 'TAX_INVOICE',
      supplyType: 'B2B',
      taxTreatment: 'TAXABLE',
      status: 'ISSUED',
      paymentStatus: 'UNPAID',
      invoiceDate: '2026-08-20',
      dueDate: new Date('2026-09-20'),
      currency: 'INR',
      exchangeRate: 1.0,
      billFromSnapshot: { name: 'Seller', addressLine: 'L1', city: 'Chennai', state: 'Tamil Nadu', stateCode: '33' },
      billToSnapshot: { name: 'Idempotency Customer', addressLine: 'L1', city: 'Chennai', state: 'Tamil Nadu', stateCode: '33' },
      supplyDetails: { placeOfSupplyStateCode: '33', reverseCharge: false },
      items: [{ name: 'Item', hsnSacCode: '9983', quantity: 1, unit: 'PCS', uqc: 'PCS', rate: 10000, taxableAmount: 10000, gstRate: 0, totalAmount: 10000 }],
      subTotal: 10000,
      totalTaxable: 10000,
      grandTotal: grandTotalPaise,
      paidAmount: 0,
      outstandingBalance: grandTotalPaise,
    });
    const invId = (invoice._id as Types.ObjectId).toString();

    const sharedKey = `KEY-CONCURRENT-IDEM-R${round}-${Date.now()}`;
    const sharedHash = `HASH-CONCURRENT-IDEM-R${round}`;

    // Fire 100 concurrent recordPayment() requests with identical key and hash (in 5 chunks of 20)
    const responses: any[] = [];
    for (let batch = 0; batch < 5; batch++) {
      const batchPromises = Array.from({ length: 20 }).map(() =>
        paymentService
          .recordPayment(bId, 'user1', {
            customerId: cId,
            paymentDate: '2026-08-25',
            amountPaise: 500000, // ₹5,000
            paymentModeId: mId,
            idempotencyKey: sharedKey,
            requestHash: sharedHash,
            allocations: [{ invoiceId: invId, allocationAmountPaise: 500000 }],
          })
          .then((res) => ({ success: true, result: res }))
          .catch((err: unknown) => ({
            success: false,
            error: err instanceof Error ? err.message : String(err),
          }))
      );
      const batchRes = await Promise.all(batchPromises);
      responses.push(...batchRes);
    }

    const successfulDeduplicatedResponses = responses.filter((r) => r.success).length;

    // Database state assertions
    const paymentDocs = await PaymentModel.find({ businessId: new Types.ObjectId(bId), idempotencyKey: sharedKey }).exec();
    const uniquePaymentDocumentsCreated = paymentDocs.length;

    const allocations = await PaymentAllocationModel.find({
      businessId: new Types.ObjectId(bId),
      invoiceId: new Types.ObjectId(invId),
    }).exec();

    const auditLogs = await AuditLogModel.find({
      businessId: new Types.ObjectId(bId),
      action: 'PAYMENT_RECORDED',
      resource: 'Payment',
      resourceId: paymentDocs[0]?._id?.toString(),
    }).exec();

    const receiptNumbers = new Set(responses.filter((r) => r.success).map((r) => r.result.receiptNumber));
    const identicalReceiptNumberReturned = receiptNumbers.size === 1;

    const passed =
      successfulDeduplicatedResponses === 100 &&
      uniquePaymentDocumentsCreated === 1 &&
      allocations.length === 1 &&
      auditLogs.length === 1 &&
      identicalReceiptNumberReturned;

    scenarioARounds.push({
      round,
      totalAttempted: 100,
      successfulDeduplicatedResponses,
      uniquePaymentDocumentsCreated,
      authoritativeAllocationsCreated: allocations.length,
      auditLogsCreated: auditLogs.length,
      identicalReceiptNumberReturned,
      passed,
    });
    console.log(`[Scenario A Round ${round}/${TOTAL_ROUNDS}] Success: ${successfulDeduplicatedResponses}, Unique Payments DB: ${uniquePaymentDocumentsCreated}`);
  }

  // =========================================================================
  // SCENARIO B: Idempotency Key Reuse Conflict (Same Key + Different Hash)
  // =========================================================================
  for (let round = 1; round <= TOTAL_ROUNDS; round++) {
    const invoice = await InvoiceModel.create({
      businessId: new Types.ObjectId(bId),
      customerId: new Types.ObjectId(cId),
      invoiceNumber: `INV-IDEM-B-R${round}-${Date.now()}`,
      financialYear: '2026-27',
      documentType: 'TAX_INVOICE',
      supplyType: 'B2B',
      taxTreatment: 'TAXABLE',
      status: 'ISSUED',
      paymentStatus: 'UNPAID',
      invoiceDate: '2026-08-20',
      dueDate: new Date('2026-09-20'),
      currency: 'INR',
      exchangeRate: 1.0,
      billFromSnapshot: { name: 'Seller', addressLine: 'L1', city: 'Chennai', state: 'Tamil Nadu', stateCode: '33' },
      billToSnapshot: { name: 'Idempotency Customer', addressLine: 'L1', city: 'Chennai', state: 'Tamil Nadu', stateCode: '33' },
      supplyDetails: { placeOfSupplyStateCode: '33', reverseCharge: false },
      items: [{ name: 'Item', hsnSacCode: '9983', quantity: 1, unit: 'PCS', uqc: 'PCS', rate: 10000, taxableAmount: 10000, gstRate: 0, totalAmount: 10000 }],
      subTotal: 10000,
      totalTaxable: 10000,
      grandTotal: 1000000,
      paidAmount: 0,
      outstandingBalance: 1000000,
    });
    const invId = (invoice._id as Types.ObjectId).toString();

    const sharedKey = `KEY-REUSE-R${round}-${Date.now()}`;

    // Request 1
    let initialRequestSucceeded = false;
    try {
      await paymentService.recordPayment(bId, 'user1', {
        customerId: cId,
        paymentDate: '2026-08-25',
        amountPaise: 400000,
        paymentModeId: mId,
        idempotencyKey: sharedKey,
        requestHash: `HASH-ORIGINAL-R${round}`,
        allocations: [{ invoiceId: invId, allocationAmountPaise: 400000 }],
      });
      initialRequestSucceeded = true;
    } catch (err) {
      initialRequestSucceeded = false;
    }

    // Request 2 with same key but DIFFERENT hash
    let conflictingRequestFailedWithCorrectError = false;
    let errorMessage = '';
    try {
      await paymentService.recordPayment(bId, 'user1', {
        customerId: cId,
        paymentDate: '2026-08-25',
        amountPaise: 800000, // Different amount/payload!
        paymentModeId: mId,
        idempotencyKey: sharedKey,
        requestHash: `HASH-DIFFERENT-R${round}`,
        allocations: [{ invoiceId: invId, allocationAmountPaise: 800000 }],
      });
    } catch (err: any) {
      errorMessage = err.message || String(err);
      if (err.code === 'IDEMPOTENCY_CONFLICT' || errorMessage.includes('already used with a different payload')) {
        conflictingRequestFailedWithCorrectError = true;
      }
    }

    const paymentDocs = await PaymentModel.find({ businessId: new Types.ObjectId(bId), idempotencyKey: sharedKey }).exec();

    const passed =
      initialRequestSucceeded &&
      conflictingRequestFailedWithCorrectError &&
      paymentDocs.length === 1;

    scenarioBRounds.push({
      round,
      initialRequestSucceeded,
      conflictingRequestFailedWithCorrectError,
      errorMessage,
      uniquePaymentDocumentsCreated: paymentDocs.length,
      passed,
    });
    console.log(`[Scenario B Round ${round}/${TOTAL_ROUNDS}] Initial Success: ${initialRequestSucceeded}, Conflict Error Caught: ${conflictingRequestFailedWithCorrectError}`);
  }

  // =========================================================================
  // SCENARIO C: 100 Concurrent Duplicate Reversals (Same Reversal Key)
  // =========================================================================
  for (let round = 1; round <= TOTAL_ROUNDS; round++) {
    const invoice = await InvoiceModel.create({
      businessId: new Types.ObjectId(bId),
      customerId: new Types.ObjectId(cId),
      invoiceNumber: `INV-IDEM-C-R${round}-${Date.now()}`,
      financialYear: '2026-27',
      documentType: 'TAX_INVOICE',
      supplyType: 'B2B',
      taxTreatment: 'TAXABLE',
      status: 'ISSUED',
      paymentStatus: 'UNPAID',
      invoiceDate: '2026-08-20',
      dueDate: new Date('2026-09-20'),
      currency: 'INR',
      exchangeRate: 1.0,
      billFromSnapshot: { name: 'Seller', addressLine: 'L1', city: 'Chennai', state: 'Tamil Nadu', stateCode: '33' },
      billToSnapshot: { name: 'Idempotency Customer', addressLine: 'L1', city: 'Chennai', state: 'Tamil Nadu', stateCode: '33' },
      supplyDetails: { placeOfSupplyStateCode: '33', reverseCharge: false },
      items: [{ name: 'Item', hsnSacCode: '9983', quantity: 1, unit: 'PCS', uqc: 'PCS', rate: 10000, taxableAmount: 10000, gstRate: 0, totalAmount: 10000 }],
      subTotal: 10000,
      totalTaxable: 10000,
      grandTotal: 1000000,
      paidAmount: 0,
      outstandingBalance: 1000000,
    });
    const invId = (invoice._id as Types.ObjectId).toString();

    // Create payment to reverse
    const payRes = await paymentService.recordPayment(bId, 'user1', {
      customerId: cId,
      paymentDate: '2026-08-25',
      amountPaise: 500000,
      paymentModeId: mId,
      idempotencyKey: `KEY-TO-REVERSE-R${round}-${Date.now()}`,
      requestHash: `HASH-TO-REVERSE-R${round}`,
      allocations: [{ invoiceId: invId, allocationAmountPaise: 500000 }],
    });

    const allocs = await PaymentAllocationModel.find({
      businessId: new Types.ObjectId(bId),
      paymentId: payRes.payment._id,
    }).exec();
    const allocId = (allocs[0]._id as Types.ObjectId).toString();

    const sharedReversalKey = `KEY-REVERSAL-IDEM-R${round}-${Date.now()}`;
    const sharedReversalHash = `HASH-REVERSAL-IDEM-R${round}`;

    // Fire 100 concurrent reversePaymentAllocation() requests with identical key & hash
    const responses: any[] = [];
    for (let batch = 0; batch < 5; batch++) {
      const batchPromises = Array.from({ length: 20 }).map(() =>
        paymentService
          .reversePaymentAllocation(bId, 'user1', payRes.payment._id.toString(), {
            allocationId: allocId,
            reversedAmountPaise: 500000,
            reason: 'Duplicate payment test',
            reversalIdempotencyKey: sharedReversalKey,
            reversalRequestHash: sharedReversalHash,
          })
          .then((res) => ({ success: true, result: res }))
          .catch((err: unknown) => ({
            success: false,
            error: err instanceof Error ? err.message : String(err),
          }))
      );
      const batchRes = await Promise.all(batchPromises);
      responses.push(...batchRes);
    }

    const successfulReversalsReturned = responses.filter((r) => r.success).length;
    const sampleReversalError = responses.find((r) => !r.success)?.error;
    console.log(`[Scenario C Round ${round}/${TOTAL_ROUNDS}] Success Reversals: ${successfulReversalsReturned}. Sample Error: ${sampleReversalError}`);

    const reversalDocs = await PaymentReversalModel.find({
      businessId: new Types.ObjectId(bId),
      reversalIdempotencyKey: sharedReversalKey,
    }).exec();

    const finalInvoice = await InvoiceModel.findById(invId).exec();
    const finalInvoiceOutstandingPaise = finalInvoice?.outstandingBalance ?? 0;

    const passed =
      successfulReversalsReturned === 100 &&
      reversalDocs.length === 1 &&
      finalInvoiceOutstandingPaise === 1000000;

    scenarioCRounds.push({
      round,
      totalAttempted: 100,
      successfulReversalsReturned,
      uniqueReversalDocumentsCreated: reversalDocs.length,
      finalInvoiceOutstandingPaise,
      passed,
    });
    console.log(`[Scenario C Round ${round}/${TOTAL_ROUNDS}] Success Reversals: ${successfulReversalsReturned}, Unique Reversal DB: ${reversalDocs.length}`);
  }

  const allScenarioAPassed = scenarioARounds.every((r) => r.passed);
  const allScenarioBPassed = scenarioBRounds.every((r) => r.passed);
  const allScenarioCPassed = scenarioCRounds.every((r) => r.passed);

  const passVerdict = allScenarioAPassed && allScenarioBPassed && allScenarioCPassed;

  return {
    step: 'Step 4 — Idempotency & E11000 Race Recovery Verification',
    timestamp: new Date().toISOString(),
    totalRoundsExecuted: TOTAL_ROUNDS,
    scenarioA: {
      rounds: scenarioARounds,
      allRoundsPassed: allScenarioAPassed,
    },
    scenarioB: {
      rounds: scenarioBRounds,
      allRoundsPassed: allScenarioBPassed,
    },
    scenarioC: {
      rounds: scenarioCRounds,
      allRoundsPassed: allScenarioCPassed,
    },
    passVerdict,
  };
}

if (require.main === module) {
  runStep4Verification()
    .then((report) => {
      console.log(JSON.stringify(report, null, 2));
      process.exit(report.passVerdict ? 0 : 1);
    })
    .catch((err) => {
      console.error('Step 4 Verification execution failed:', err);
      process.exit(1);
    });
}
