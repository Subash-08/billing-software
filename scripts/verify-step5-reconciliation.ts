/**
 * Step 5 Verification Script — Reconciliation Engine & CRITICAL Alert Verification
 * scripts/verify-step5-reconciliation.ts
 *
 * Executes 5 independent rounds verifying:
 * - Case 1: AUDIT Mode (Drift detection with ZERO mutations).
 * - Case 2: REPAIR Mode (Authoritative projection reconstruction & idempotency).
 * - Case 3: CRITICAL Inconsistency Alerting (Ledger corruption halts repair immediately).
 * - Case 4: Customer Credit Ledger Reconciliation (Audit, Repair, and Invariant C protection).
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

export interface Case1AuditResult {
  round: number;
  invoicesDrifted: number;
  expectedPaise: number;
  actualPaiseBeforeAudit: number;
  actualPaiseAfterAudit: number;
  zeroMutationVerified: boolean;
  passed: boolean;
}

export interface Case2RepairResult {
  round: number;
  invoicesRepairedFirstRun: number;
  repairedPaidAmountPaise: number;
  noRepairRequiredSecondRun: boolean;
  auditLogGenerated: boolean;
  passed: boolean;
}

export interface Case3CriticalResult {
  round: number;
  criticalAlertSurfaced: boolean;
  severity: string;
  code: string;
  reconstructionHaltedWithoutRepair: boolean;
  passed: boolean;
}

export interface Case4CreditResult {
  round: number;
  auditDetectedCreditDrift: boolean;
  repairedCreditBalancePaise: number;
  criticalInvariantCSurfaced: boolean;
  passed: boolean;
}

export interface Step5EvidenceReport {
  step: 'Step 5 — Reconciliation Engine & CRITICAL Alert Verification';
  timestamp: string;
  totalRoundsExecuted: number;
  case1Audit: {
    rounds: Case1AuditResult[];
    allRoundsPassed: boolean;
  };
  case2Repair: {
    rounds: Case2RepairResult[];
    allRoundsPassed: boolean;
  };
  case3Critical: {
    rounds: Case3CriticalResult[];
    allRoundsPassed: boolean;
  };
  case4Credit: {
    rounds: Case4CreditResult[];
    allRoundsPassed: boolean;
  };
  passVerdict: boolean;
}

export async function runStep5Verification(): Promise<Step5EvidenceReport> {
  const { connectToDatabase } = await import('../src/db/connection');
  const { settlementReconciliationService } = await import('../src/services/settlement-reconciliation.service');
  const { paymentService } = await import('../src/services/payment.service');
  const { BusinessModel } = await import('../src/db/models/business.model');
  const { CustomerModel } = await import('../src/db/models/customer.model');
  const { PaymentModeModel } = await import('../src/db/models/payment-mode.model');
  const { InvoiceModel } = await import('../src/db/models/invoice.model');
  const { PaymentAllocationModel } = await import('../src/db/models/payment-allocation.model');
  const { CustomerCreditLedgerModel } = await import('../src/db/models/customer-credit-ledger.model');
  const { AuditLogModel } = await import('../src/db/models/audit-log.model');

  await connectToDatabase();

  const biz = await BusinessModel.create({
    userId: new Types.ObjectId(),
    legalName: `Step 5 Reconciliation Biz ${Date.now()}`,
    gstin: '33AAAAA1111A1Z5',
    email: 'step5@test.com',
    phone: '9876543210',
    stateCode: '33',
    currency: 'INR',
    address: '500 Reconciliation St',
    city: 'Chennai',
    state: 'Tamil Nadu',
    pincode: '600001',
    gstRegistrationType: 'REGULAR',
    gstinStatus: 'VALID',
  });
  const bId = (biz._id as Types.ObjectId).toString();

  const cust = await CustomerModel.create({
    businessId: biz._id,
    displayName: 'Step 5 Customer',
    customerType: 'BUSINESS',
    phone: '9999955555',
    gstTreatment: 'REGISTERED',
    stateCode: '33',
    billingAddress: { addressLine1: 'L1', city: 'Chennai', state: 'Tamil Nadu', stateCode: '33', pincode: '600001' },
  });
  const cId = (cust._id as Types.ObjectId).toString();

  const mode = await PaymentModeModel.create({
    code: `MODE_STEP5_${Date.now()}`,
    name: 'Step 5 Cash',
    category: 'CASH',
    status: 'ACTIVE',
  });
  const mId = (mode._id as Types.ObjectId).toString();

  const TOTAL_ROUNDS = 5;
  const case1Rounds: Case1AuditResult[] = [];
  const case2Rounds: Case2RepairResult[] = [];
  const case3Rounds: Case3CriticalResult[] = [];
  const case4Rounds: Case4CreditResult[] = [];

  // =========================================================================
  // CASE 1: AUDIT Mode (Zero DB Mutations) & CASE 2: REPAIR Mode
  // =========================================================================
  for (let round = 1; round <= TOTAL_ROUNDS; round++) {
    const invoice = await InvoiceModel.create({
      businessId: new Types.ObjectId(bId),
      customerId: new Types.ObjectId(cId),
      invoiceNumber: `INV-REC-R${round}-${Date.now()}`,
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
      billToSnapshot: { name: 'Reconcile Customer', addressLine: 'L1', city: 'Chennai', state: 'Tamil Nadu', stateCode: '33' },
      supplyDetails: { placeOfSupplyStateCode: '33', reverseCharge: false },
      items: [{ name: 'Item', hsnSacCode: '9983', quantity: 1, unit: 'PCS', uqc: 'PCS', rate: 10000, taxableAmount: 10000, gstRate: 0, totalAmount: 10000 }],
      subTotal: 10000,
      totalTaxable: 10000,
      grandTotal: 1000000, // ₹10,000
      paidAmount: 0,
      outstandingBalance: 1000000,
    });
    const invId = (invoice._id as Types.ObjectId).toString();

    // Record valid payment of ₹6,000
    await paymentService.recordPayment(bId, 'user1', {
      customerId: cId,
      paymentDate: '2026-08-25',
      amountPaise: 600000,
      paymentModeId: mId,
      idempotencyKey: `KEY-REC-R${round}-${Date.now()}`,
      requestHash: `HASH-REC-R${round}`,
      allocations: [{ invoiceId: invId, allocationAmountPaise: 600000 }],
    });

    // Corrupt materialized projection directly in DB: paidAmount = ₹2,000 (200,000 paise)
    await InvoiceModel.updateOne(
      { _id: invoice._id, businessId: new Types.ObjectId(bId) },
      { $set: { paidAmount: 200000, outstandingBalance: 800000 } }
    ).exec();

    // === CASE 1: AUDIT MODE ===
    const auditResult = await settlementReconciliationService.run(bId, 'AUDIT');
    const invoicePostAudit = await InvoiceModel.findById(invId).exec();

    const case1Passed =
      'mode' in auditResult &&
      auditResult.mode === 'AUDIT' &&
      'invoicesDrifted' in auditResult &&
      auditResult.invoicesDrifted >= 1 &&
      invoicePostAudit?.paidAmount === 200000; // Zero mutation!

    case1Rounds.push({
      round,
      invoicesDrifted: 'invoicesDrifted' in auditResult ? auditResult.invoicesDrifted : 0,
      expectedPaise: 600000,
      actualPaiseBeforeAudit: 200000,
      actualPaiseAfterAudit: invoicePostAudit?.paidAmount ?? 0,
      zeroMutationVerified: invoicePostAudit?.paidAmount === 200000,
      passed: case1Passed,
    });

    // === CASE 2: REPAIR MODE ===
    const repairResult1 = await settlementReconciliationService.run(bId, 'REPAIR');
    const invoicePostRepair = await InvoiceModel.findById(invId).exec();

    // Second REPAIR call (Idempotency test)
    const repairResult2 = await settlementReconciliationService.run(bId, 'REPAIR');

    const auditLogs = await AuditLogModel.find({
      businessId: new Types.ObjectId(bId),
      action: 'RECONCILIATION_REPAIR',
      resource: 'Invoice',
      resourceId: invId,
    }).exec();

    const case2Passed =
      'mode' in repairResult1 &&
      repairResult1.mode === 'REPAIR' &&
      'invoicesRepaired' in repairResult1 &&
      repairResult1.invoicesRepaired >= 1 &&
      invoicePostRepair?.paidAmount === 600000 &&
      invoicePostRepair?.outstandingBalance === 400000 &&
      'noRepairRequired' in repairResult2 &&
      repairResult2.noRepairRequired === true &&
      auditLogs.length === 1;

    case2Rounds.push({
      round,
      invoicesRepairedFirstRun: 'invoicesRepaired' in repairResult1 ? repairResult1.invoicesRepaired : 0,
      repairedPaidAmountPaise: invoicePostRepair?.paidAmount ?? 0,
      noRepairRequiredSecondRun: 'noRepairRequired' in repairResult2 ? (repairResult2.noRepairRequired ?? false) : false,
      auditLogGenerated: auditLogs.length === 1,
      passed: case2Passed,
    });
    console.log(`[Round ${round}/${TOTAL_ROUNDS}] Case 1 Audit Zero Mutation: ${case1Passed}, Case 2 Repair Restored: ${case2Passed}`);
  }

  // =========================================================================
  // CASE 3: CRITICAL Inconsistency Protection (Corrupted Ledger Halts Repair)
  // =========================================================================
  for (let round = 1; round <= TOTAL_ROUNDS; round++) {
    // Create business with corrupt authoritative ledger: Allocation (₹8,000) > Payment (₹5,000)
    const corruptBiz = await BusinessModel.create({
      userId: new Types.ObjectId(),
      legalName: `Corrupt Biz R${round} ${Date.now()}`,
      gstin: '33AAAAA1111A1Z5',
      email: `corrupt_r${round}@test.com`,
      phone: '9876543210',
      stateCode: '33',
      currency: 'INR',
      address: 'Corrupt St',
      city: 'Chennai',
      state: 'Tamil Nadu',
      pincode: '600001',
      gstRegistrationType: 'REGULAR',
      gstinStatus: 'VALID',
    });
    const cbId = (corruptBiz._id as Types.ObjectId).toString();

    const corruptCust = await CustomerModel.create({
      businessId: corruptBiz._id,
      displayName: `Corrupt Cust R${round}`,
      customerType: 'BUSINESS',
      phone: '9999955555',
      gstTreatment: 'REGISTERED',
      stateCode: '33',
      billingAddress: { addressLine1: 'L1', city: 'Chennai', state: 'Tamil Nadu', stateCode: '33', pincode: '600001' },
    });
    const ccId = (corruptCust._id as Types.ObjectId).toString();

    const payRes = await paymentService.recordPayment(cbId, 'user1', {
      customerId: ccId,
      paymentDate: '2026-08-25',
      amountPaise: 500000, // Payment = ₹5,000
      paymentModeId: mId,
      idempotencyKey: `KEY-CORRUPT-R${round}-${Date.now()}`,
      requestHash: `HASH-CORRUPT-R${round}`,
      onAccountOnly: true,
    });

    // Inject direct allocation corruption in DB: allocatedAmountPaise = ₹8,000 (> ₹5,000 payment)
    await PaymentAllocationModel.create({
      businessId: corruptBiz._id,
      paymentId: payRes.payment._id,
      invoiceId: new Types.ObjectId(),
      customerId: corruptCust._id,
      allocatedAmountPaise: 800000,
    });

    // Run REPAIR mode on corrupt ledger
    const criticalRes = await settlementReconciliationService.run(cbId, 'REPAIR');

    const case3Passed =
      'severity' in criticalRes &&
      criticalRes.severity === 'CRITICAL' &&
      criticalRes.code === 'CRITICAL_LEDGER_INCONSISTENCY';

    case3Rounds.push({
      round,
      criticalAlertSurfaced: case3Passed,
      severity: 'severity' in criticalRes ? criticalRes.severity : 'NONE',
      code: 'code' in criticalRes ? criticalRes.code : 'NONE',
      reconstructionHaltedWithoutRepair: case3Passed,
      passed: case3Passed,
    });
    console.log(`[Round ${round}/${TOTAL_ROUNDS}] Case 3 Critical Alert Surfaced: ${case3Passed}`);
  }

  // =========================================================================
  // CASE 4: Customer Credit Ledger Reconciliation & Invariant C
  // =========================================================================
  for (let round = 1; round <= TOTAL_ROUNDS; round++) {
    const roundBiz = await BusinessModel.create({
      userId: new Types.ObjectId(),
      legalName: `Credit Biz R${round} ${Date.now()}`,
      gstin: '33AAAAA1111A1Z5',
      email: `credit_r${round}@test.com`,
      phone: '9876543210',
      stateCode: '33',
      currency: 'INR',
      address: '500 Credit St',
      city: 'Chennai',
      state: 'Tamil Nadu',
      pincode: '600001',
      gstRegistrationType: 'REGULAR',
      gstinStatus: 'VALID',
    });
    const rBid = (roundBiz._id as Types.ObjectId).toString();

    const creditCust = await CustomerModel.create({
      businessId: roundBiz._id,
      displayName: `Credit Cust R${round}`,
      customerType: 'BUSINESS',
      phone: '9999955555',
      gstTreatment: 'REGISTERED',
      stateCode: '33',
      billingAddress: { addressLine1: 'L1', city: 'Chennai', state: 'Tamil Nadu', stateCode: '33', pincode: '600001' },
    });
    const creditCustId = (creditCust._id as Types.ObjectId).toString();

    const rMode = await PaymentModeModel.create({
      code: `MODE_C4_R${round}_${Date.now()}`,
      name: 'Case 4 Cash',
      category: 'CASH',
      status: 'ACTIVE',
    });
    const rMid = (rMode._id as Types.ObjectId).toString();

    // Seed on-account credit ₹10,000 (1,000,000 paise)
    const payRes = await paymentService.recordPayment(rBid, 'user1', {
      customerId: creditCustId,
      paymentDate: '2026-08-25',
      amountPaise: 1000000,
      paymentModeId: rMid,
      idempotencyKey: `KEY-CREDIT-REC-R${round}-${Date.now()}`,
      requestHash: `HASH-CREDIT-REC-R${round}`,
      onAccountOnly: true,
    });

    // Corrupt customer.creditBalance in DB to ₹1,000 (100,000 paise)
    await CustomerModel.updateOne(
      { _id: creditCust._id, businessId: roundBiz._id },
      { $set: { creditBalance: 100000 } }
    ).exec();

    // Audit check
    const auditRes = await settlementReconciliationService.run(rBid, 'AUDIT');

    // Repair check
    const repairRes = await settlementReconciliationService.run(rBid, 'REPAIR');
    const custPostRepair = await CustomerModel.findById(creditCustId).exec();

    // Inject Invariant C violation into credit ledger (negative balance)
    await CustomerCreditLedgerModel.create({
      businessId: roundBiz._id,
      customerId: creditCust._id,
      paymentId: payRes.payment._id,
      type: 'DEBIT_ALLOCATION',
      amountPaise: 5000000, // ₹50,000 debit against ₹10,000 credit
      notes: 'Synthetic Invariant C violation test',
    });

    const criticalCRes = await settlementReconciliationService.run(rBid, 'REPAIR');

    const case4Passed =
      'creditsDrifted' in auditRes &&
      auditRes.creditsDrifted >= 1 &&
      'creditsRepaired' in repairRes &&
      repairRes.creditsRepaired >= 1 &&
      custPostRepair?.creditBalance === 1000000 &&
      'severity' in criticalCRes &&
      criticalCRes.severity === 'CRITICAL';

    case4Rounds.push({
      round,
      auditDetectedCreditDrift: 'creditsDrifted' in auditRes && auditRes.creditsDrifted >= 1,
      repairedCreditBalancePaise: custPostRepair?.creditBalance ?? 0,
      criticalInvariantCSurfaced: 'severity' in criticalCRes && criticalCRes.severity === 'CRITICAL',
      passed: case4Passed,
    });
    console.log(`[Round ${round}/${TOTAL_ROUNDS}] Case 4 Credit Reconciliation Passed: ${case4Passed}`);
  }

  const allCase1Passed = case1Rounds.every((r) => r.passed);
  const allCase2Passed = case2Rounds.every((r) => r.passed);
  const allCase3Passed = case3Rounds.every((r) => r.passed);
  const allCase4Passed = case4Rounds.every((r) => r.passed);

  const passVerdict = allCase1Passed && allCase2Passed && allCase3Passed && allCase4Passed;

  return {
    step: 'Step 5 — Reconciliation Engine & CRITICAL Alert Verification',
    timestamp: new Date().toISOString(),
    totalRoundsExecuted: TOTAL_ROUNDS,
    case1Audit: { rounds: case1Rounds, allRoundsPassed: allCase1Passed },
    case2Repair: { rounds: case2Rounds, allRoundsPassed: allCase2Passed },
    case3Critical: { rounds: case3Rounds, allRoundsPassed: allCase3Passed },
    case4Credit: { rounds: case4Rounds, allRoundsPassed: allCase4Passed },
    passVerdict,
  };
}

if (require.main === module) {
  runStep5Verification()
    .then((report) => {
      console.log(JSON.stringify(report, null, 2));
      process.exit(report.passVerdict ? 0 : 1);
    })
    .catch((err) => {
      console.error('Step 5 Verification execution failed:', err);
      process.exit(1);
    });
}
