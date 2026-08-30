/**
 * Step 3 Verification Script — Concurrency & Write-Conflict Verification
 * scripts/verify-step3-concurrency.ts
 *
 * Executes 5 independent rounds for three high-concurrency scenarios against live MongoDB:
 * - Scenario A: 100 concurrent recordPayment() calls against 1 invoice (Over-settlement protection).
 * - Scenario B: 100 concurrent consumeCredit() calls against 1 source credit (Credit ceiling protection).
 * - Scenario C: Simultaneous recordPayment() vs cancelInvoice() race condition.
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

export interface ScenarioAResult {
  round: number;
  totalAttempted: number;
  successfulRequests: number;
  rejectedRequests: number;
  authoritativeAllocationTotalPaise: number;
  invoiceGrandTotalPaise: number;
  finalInvoiceOutstandingPaise: number;
  overSettlementIncidents: number;
  passed: boolean;
}

export interface ScenarioBResult {
  round: number;
  totalAttempted: number;
  successfulDebits: number;
  rejectedDebits: number;
  authoritativeConsumptionTotalPaise: number;
  sourceCreditAmountPaise: number;
  overConsumptionIncidents: number;
  passed: boolean;
}

export interface ScenarioCResult {
  round: number;
  paymentResult: 'SUCCESS' | 'FAILURE';
  cancellationResult: 'SUCCESS' | 'FAILURE';
  finalInvoiceStatus: string;
  authoritativeAllocationsCount: number;
  invalidStateIncidents: number;
  passed: boolean;
}

export interface Step3EvidenceReport {
  step: 'Step 3 — Concurrency & Write-Conflict Verification';
  timestamp: string;
  totalRoundsExecuted: number;
  scenarioA: {
    rounds: ScenarioAResult[];
    totalAttempted: number;
    totalAuthoritativeAllocatedPaise: number;
    totalOverSettlementIncidents: number;
    allRoundsPassed: boolean;
  };
  scenarioB: {
    rounds: ScenarioBResult[];
    totalAttempted: number;
    totalAuthoritativeConsumedPaise: number;
    totalOverConsumptionIncidents: number;
    allRoundsPassed: boolean;
  };
  scenarioC: {
    rounds: ScenarioCResult[];
    totalInvalidStateIncidents: number;
    allRoundsPassed: boolean;
  };
  passVerdict: boolean;
}

export async function runStep3Verification(): Promise<Step3EvidenceReport> {
  const { connectToDatabase } = await import('../src/db/connection');
  const { paymentService } = await import('../src/services/payment.service');
  const { customerLedgerService } = await import('../src/services/customer-ledger.service');
  const { invoiceService } = await import('../src/services/invoice.service');
  const { BusinessModel } = await import('../src/db/models/business.model');
  const { CustomerModel } = await import('../src/db/models/customer.model');
  const { PaymentModeModel } = await import('../src/db/models/payment-mode.model');
  const { InvoiceModel } = await import('../src/db/models/invoice.model');
  const { PaymentAllocationModel } = await import('../src/db/models/payment-allocation.model');
  const { CustomerCreditLedgerModel } = await import('../src/db/models/customer-credit-ledger.model');

  await connectToDatabase();

  // Create test master data
  const biz = await BusinessModel.create({
    userId: new Types.ObjectId(),
    legalName: `Step 3 Concurrency Biz ${Date.now()}`,
    gstin: '33AAAAA1111A1Z5',
    email: 'step3@test.com',
    phone: '9876543210',
    stateCode: '33',
    currency: 'INR',
    address: '300 Concurrency St',
    city: 'Chennai',
    state: 'Tamil Nadu',
    pincode: '600001',
    gstRegistrationType: 'REGULAR',
    gstinStatus: 'VALID',
  });
  const bId = (biz._id as Types.ObjectId).toString();

  const cust = await CustomerModel.create({
    businessId: biz._id,
    displayName: 'Step 3 Concurrency Customer',
    customerType: 'BUSINESS',
    phone: '9999933333',
    gstTreatment: 'REGISTERED',
    stateCode: '33',
    billingAddress: {
      addressLine1: 'Suite 300',
      city: 'Chennai',
      state: 'Tamil Nadu',
      stateCode: '33',
      pincode: '600001',
    },
  });
  const cId = (cust._id as Types.ObjectId).toString();

  const mode = await PaymentModeModel.create({
    code: `MODE_STEP3_${Date.now()}`,
    name: 'Step 3 Cash',
    category: 'CASH',
    status: 'ACTIVE',
  });
  const mId = (mode._id as Types.ObjectId).toString();

  const scenarioARounds: ScenarioAResult[] = [];
  const scenarioBRounds: ScenarioBResult[] = [];
  const scenarioCRounds: ScenarioCResult[] = [];

  const TOTAL_ROUNDS = 5;

  // =========================================================================
  // SCENARIO A: 100 Concurrent Payments against 1 Invoice (5 Rounds)
  // =========================================================================
  for (let round = 1; round <= TOTAL_ROUNDS; round++) {
    const grandTotalPaise = 1000000; // ₹10,000

    const invoice = await InvoiceModel.create({
      businessId: new Types.ObjectId(bId),
      customerId: new Types.ObjectId(cId),
      invoiceNumber: `INV-SCEN-A-R${round}-${Date.now()}`,
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
      billToSnapshot: { name: 'Concurrency Customer', addressLine: 'L1', city: 'Chennai', state: 'Tamil Nadu', stateCode: '33' },
      supplyDetails: { placeOfSupplyStateCode: '33', reverseCharge: false },
      items: [{ name: 'Item', hsnSacCode: '9983', quantity: 1, unit: 'PCS', uqc: 'PCS', rate: 10000, taxableAmount: 10000, gstRate: 0, totalAmount: 10000 }],
      subTotal: 10000,
      totalTaxable: 10000,
      grandTotal: grandTotalPaise,
      paidAmount: 0,
      outstandingBalance: grandTotalPaise,
    });
    const invId = (invoice._id as Types.ObjectId).toString();

    // Fire 100 concurrent recordPayment() requests in batches of 20 to respect connection pool limits
    const results: Array<{ success: boolean; error: string | null }> = [];
    for (let batch = 0; batch < 5; batch++) {
      const batchPromises = Array.from({ length: 20 }).map((_, idx) => {
        const globalIdx = batch * 20 + idx;
        return paymentService
          .recordPayment(bId, 'user1', {
            customerId: cId,
            paymentDate: '2026-08-25',
            amountPaise: 200000, // ₹2,000 each
            paymentModeId: mId,
            idempotencyKey: `KEY-SCEN-A-R${round}-${globalIdx}-${Date.now()}`,
            requestHash: `HASH-SCEN-A-R${round}-${globalIdx}`,
            allocations: [{ invoiceId: invId, allocationAmountPaise: 200000 }],
          })
          .then(() => ({ success: true, error: null }))
          .catch((err: unknown) => ({
            success: false,
            error: err instanceof Error ? err.message : String(err),
          }));
      });
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    const successfulRequests = results.filter((r) => r.success).length;
    const rejectedRequests = results.filter((r) => !r.success).length;
    const sampleError = results.find((r) => !r.success)?.error;
    console.log(`[Scenario A Round ${round}/${TOTAL_ROUNDS}] Success: ${successfulRequests}, Rejected: ${rejectedRequests}. Sample Error: ${sampleError}`);

    // AUTHORITATIVE CHECK: Query PaymentAllocation records from database
    const allocations = await PaymentAllocationModel.find({
      businessId: new Types.ObjectId(bId),
      invoiceId: new Types.ObjectId(invId),
    }).exec();

    const authoritativeAllocationTotalPaise = allocations.reduce(
      (sum, a) => sum + a.allocatedAmountPaise,
      0
    );

    const finalInvoice = await InvoiceModel.findById(invId).exec();
    const finalInvoiceOutstandingPaise = finalInvoice?.outstandingBalance ?? 0;

    const overSettlementIncidents =
      authoritativeAllocationTotalPaise > grandTotalPaise ? 1 : 0;

    scenarioARounds.push({
      round,
      totalAttempted: 100,
      successfulRequests,
      rejectedRequests,
      authoritativeAllocationTotalPaise,
      invoiceGrandTotalPaise: grandTotalPaise,
      finalInvoiceOutstandingPaise,
      overSettlementIncidents,
      passed: overSettlementIncidents === 0 && authoritativeAllocationTotalPaise <= grandTotalPaise,
    });
  }

  // =========================================================================
  // SCENARIO B: 100 Concurrent Credit Consumptions against 1 Source Credit (5 Rounds)
  // =========================================================================
  for (let round = 1; round <= TOTAL_ROUNDS; round++) {
    const sourceCreditAmountPaise = 1000000; // ₹10,000

    // Seed on-account credit via paymentService
    const payResult = await paymentService.recordPayment(bId, 'user1', {
      customerId: cId,
      paymentDate: '2026-08-25',
      amountPaise: sourceCreditAmountPaise,
      paymentModeId: mId,
      idempotencyKey: `KEY-SEED-CREDIT-R${round}-${Date.now()}`,
      requestHash: `HASH-SEED-CREDIT-R${round}`,
      onAccountOnly: true,
    });

    const creditEvents = await CustomerCreditLedgerModel.find({
      businessId: new Types.ObjectId(bId),
      paymentId: payResult.payment._id,
      type: 'CREDIT',
    }).exec();

    const sourceCreditId = (creditEvents[0]._id as Types.ObjectId).toString();

    // Bulk create 100 target invoices (1 network round-trip per round)
    const invoiceDocs = Array.from({ length: 100 }).map((_, i) => ({
      businessId: new Types.ObjectId(bId),
      customerId: new Types.ObjectId(cId),
      invoiceNumber: `INV-CREDIT-TGT-R${round}-${i}-${Date.now()}`,
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
      billToSnapshot: { name: 'Concurrency Customer', addressLine: 'L1', city: 'Chennai', state: 'Tamil Nadu', stateCode: '33' },
      supplyDetails: { placeOfSupplyStateCode: '33', reverseCharge: false },
      items: [{ name: 'Item', hsnSacCode: '9983', quantity: 1, unit: 'PCS', uqc: 'PCS', rate: 5000, taxableAmount: 5000, gstRate: 0, totalAmount: 5000 }],
      subTotal: 5000,
      totalTaxable: 5000,
      grandTotal: 500000, // paise
      paidAmount: 0,
      outstandingBalance: 500000, // paise
    }));

    const insertedInvoices = await InvoiceModel.insertMany(invoiceDocs);
    const targetInvoiceIds = insertedInvoices.map((inv) => (inv._id as Types.ObjectId).toString());

    // Fire 100 concurrent consumeCredit() requests in batches of 20
    const results: Array<{ success: boolean; error: string | null }> = [];
    for (let batch = 0; batch < 5; batch++) {
      const chunk = targetInvoiceIds.slice(batch * 20, (batch + 1) * 20);
      const batchPromises = chunk.map((targetInvId) =>
        customerLedgerService
          .consumeCredit({
            businessId: bId,
            customerId: cId,
            paymentId: payResult.payment._id.toString(),
            sourceCreditId,
            invoiceId: targetInvId,
            consumePaise: 300000, // ₹3,000 each
          })
          .then(() => ({ success: true, error: null }))
          .catch((err: unknown) => ({
            success: false,
            error: err instanceof Error ? err.message : String(err),
          }))
      );
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    const successfulDebits = results.filter((r) => r.success).length;
    const rejectedDebits = results.filter((r) => !r.success).length;
    console.log(`[Scenario B Round ${round}/${TOTAL_ROUNDS}] Success Debits: ${successfulDebits}, Rejected: ${rejectedDebits}`);

    // AUTHORITATIVE CHECK: Query CustomerCreditLedger DEBIT_ALLOCATION records for sourceCreditId
    const debits = await CustomerCreditLedgerModel.find({
      businessId: new Types.ObjectId(bId),
      sourceCreditId: new Types.ObjectId(sourceCreditId),
      type: 'DEBIT_ALLOCATION',
    }).exec();

    const authoritativeConsumptionTotalPaise = debits.reduce(
      (sum, d) => sum + d.amountPaise,
      0
    );

    const overConsumptionIncidents =
      authoritativeConsumptionTotalPaise > sourceCreditAmountPaise ? 1 : 0;

    scenarioBRounds.push({
      round,
      totalAttempted: 100,
      successfulDebits,
      rejectedDebits,
      authoritativeConsumptionTotalPaise,
      sourceCreditAmountPaise,
      overConsumptionIncidents,
      passed: overConsumptionIncidents === 0 && authoritativeConsumptionTotalPaise <= sourceCreditAmountPaise,
    });
  }

  // =========================================================================
  // SCENARIO C: Simultaneous recordPayment() vs cancelInvoice() Race (5 Rounds)
  // =========================================================================
  for (let round = 1; round <= TOTAL_ROUNDS; round++) {
    const invoice = await InvoiceModel.create({
      businessId: new Types.ObjectId(bId),
      customerId: new Types.ObjectId(cId),
      invoiceNumber: `INV-RACE-R${round}-${Date.now()}`,
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
      billToSnapshot: { name: 'Concurrency Customer', addressLine: 'L1', city: 'Chennai', state: 'Tamil Nadu', stateCode: '33' },
      supplyDetails: { placeOfSupplyStateCode: '33', reverseCharge: false },
      items: [{ name: 'Item', hsnSacCode: '9983', quantity: 1, unit: 'PCS', uqc: 'PCS', rate: 10000, taxableAmount: 10000, gstRate: 0, totalAmount: 10000 }],
      subTotal: 10000,
      totalTaxable: 10000,
      grandTotal: 1000000, // paise
      paidAmount: 0,
      outstandingBalance: 1000000, // paise
    });
    const invId = (invoice._id as Types.ObjectId).toString();

    // Fire recordPayment() and cancelInvoice() simultaneously
    const [payRes, cancelRes] = await Promise.allSettled([
      paymentService.recordPayment(bId, 'user1', {
        customerId: cId,
        paymentDate: '2026-08-25',
        amountPaise: 1000000,
        paymentModeId: mId,
        idempotencyKey: `KEY-RACE-R${round}-${Date.now()}`,
        requestHash: `HASH-RACE-R${round}`,
        allocations: [{ invoiceId: invId, allocationAmountPaise: 1000000 }],
      }),
      invoiceService.cancelInvoice(bId, invId, `Step 3 Race Cancel R${round}`),
    ]);

    const paymentResult = payRes.status === 'fulfilled' ? 'SUCCESS' : 'FAILURE';
    const cancellationResult = cancelRes.status === 'fulfilled' ? 'SUCCESS' : 'FAILURE';

    const finalInvoice = await InvoiceModel.findById(invId).exec();
    const finalInvoiceStatus = finalInvoice?.status || 'UNKNOWN';

    const allocations = await PaymentAllocationModel.find({
      businessId: new Types.ObjectId(bId),
      invoiceId: new Types.ObjectId(invId),
    }).exec();

    // Invalid state: Invoice status == CANCELLED but active allocations exist, or BOTH succeeded
    const bothSucceeded = paymentResult === 'SUCCESS' && cancellationResult === 'SUCCESS';
    const cancelledWithAllocations = finalInvoiceStatus === 'CANCELLED' && allocations.length > 0;
    const invalidStateIncidents = (bothSucceeded || cancelledWithAllocations) ? 1 : 0;

    scenarioCRounds.push({
      round,
      paymentResult,
      cancellationResult,
      finalInvoiceStatus,
      authoritativeAllocationsCount: allocations.length,
      invalidStateIncidents,
      passed: invalidStateIncidents === 0 && (paymentResult === 'SUCCESS' || cancellationResult === 'SUCCESS'),
    });
  }

  // Evaluate final pass verdicts
  const allScenarioAPassed = scenarioARounds.every((r) => r.passed);
  const allScenarioBPassed = scenarioBRounds.every((r) => r.passed);
  const allScenarioCPassed = scenarioCRounds.every((r) => r.passed);

  const passVerdict = allScenarioAPassed && allScenarioBPassed && allScenarioCPassed;

  return {
    step: 'Step 3 — Concurrency & Write-Conflict Verification',
    timestamp: new Date().toISOString(),
    totalRoundsExecuted: TOTAL_ROUNDS,
    scenarioA: {
      rounds: scenarioARounds,
      totalAttempted: TOTAL_ROUNDS * 100,
      totalAuthoritativeAllocatedPaise: scenarioARounds.reduce((s, r) => s + r.authoritativeAllocationTotalPaise, 0),
      totalOverSettlementIncidents: scenarioARounds.reduce((s, r) => s + r.overSettlementIncidents, 0),
      allRoundsPassed: allScenarioAPassed,
    },
    scenarioB: {
      rounds: scenarioBRounds,
      totalAttempted: TOTAL_ROUNDS * 100,
      totalAuthoritativeConsumedPaise: scenarioBRounds.reduce((s, r) => s + r.authoritativeConsumptionTotalPaise, 0),
      totalOverConsumptionIncidents: scenarioBRounds.reduce((s, r) => s + r.overConsumptionIncidents, 0),
      allRoundsPassed: allScenarioBPassed,
    },
    scenarioC: {
      rounds: scenarioCRounds,
      totalInvalidStateIncidents: scenarioCRounds.reduce((s, r) => s + r.invalidStateIncidents, 0),
      allRoundsPassed: allScenarioCPassed,
    },
    passVerdict,
  };
}

if (require.main === module) {
  runStep3Verification()
    .then((report) => {
      console.log(JSON.stringify(report, null, 2));
      process.exit(report.passVerdict ? 0 : 1);
    })
    .catch((err) => {
      console.error('Step 3 Verification execution failed:', err);
      process.exit(1);
    });
}
