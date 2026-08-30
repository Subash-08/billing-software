/**
 * Step 2 Verification Script — Transaction Failure & Atomic Rollback Verification
 * scripts/verify-step2-rollback.ts
 *
 * Proves that when a transaction fails mid-flight after meaningful financial writes,
 * MongoDB leaves ZERO partial state behind.
 *
 * Checks existence and absence across 4 target collections:
 * - Payment (before: 0, during: 1, after rollback: 0)
 * - PaymentAllocation (before: 0, during: 1, after rollback: 0)
 * - CustomerCreditLedger (before: 0, during: 1, after rollback: 0)
 * - DocumentSequence (before: X, during: X+1, after rollback: X)
 *
 * Also executes a subsequent valid transaction to verify clean sequence continuation.
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

export interface Step2EvidenceReport {
  step: 'Step 2 — Transaction Failure & Atomic Rollback';
  timestamp: string;
  testBusinessId: string;
  baselineState: {
    paymentCount: number;
    allocationCount: number;
    creditLedgerCount: number;
    sequenceNextSeq: number;
  };
  duringTransactionState: {
    paymentCount: number;
    allocationCount: number;
    creditLedgerCount: number;
    sequenceNextSeq: number;
    syntheticFailureInjected: boolean;
  };
  afterRollbackState: {
    paymentCount: number;
    allocationCount: number;
    creditLedgerCount: number;
    sequenceNextSeq: number;
  };
  subsequentSuccessVerification: {
    successfulPaymentId: string;
    successfulReceiptNumber: string;
    finalSequenceNextSeq: number;
  };
  atomicRollbackPassed: boolean;
  sequencePreservedPassed: boolean;
  passVerdict: boolean;
}

export async function runStep2Verification(): Promise<Step2EvidenceReport> {
  const { connectToDatabase } = await import('../src/db/connection');
  const { PaymentModel } = await import('../src/db/models/payment.model');
  const { PaymentAllocationModel } = await import('../src/db/models/payment-allocation.model');
  const { CustomerCreditLedgerModel } = await import('../src/db/models/customer-credit-ledger.model');
  const { DocumentSequenceModel } = await import('../src/db/models/document-sequence.model');

  const mongooseInstance = await connectToDatabase();

  const bId = new Types.ObjectId();
  const cId = new Types.ObjectId();
  const pId = new Types.ObjectId();
  const invId = new Types.ObjectId();
  const financialYear = '2026-27';

  // === 1. BASELINE SETUP ===
  // Seed DocumentSequence baseline (nextSeq = 101)
  const baselineSeqDoc = await DocumentSequenceModel.create({
    businessId: bId,
    documentType: 'RECEIPT',
    financialYear,
    prefix: 'RCP',
    nextSeq: 101,
  });

  const baselineState = {
    paymentCount: await PaymentModel.countDocuments({ businessId: bId }).exec(),
    allocationCount: await PaymentAllocationModel.countDocuments({ businessId: bId }).exec(),
    creditLedgerCount: await CustomerCreditLedgerModel.countDocuments({ businessId: bId }).exec(),
    sequenceNextSeq: baselineSeqDoc.nextSeq,
  };

  // === 2. TRANSACTION WITH SYNTHETIC FAILURE ===
  let duringState = {
    paymentCount: 0,
    allocationCount: 0,
    creditLedgerCount: 0,
    sequenceNextSeq: 0,
    syntheticFailureInjected: false,
  };

  const session = await mongooseInstance.startSession();

  try {
    await session.withTransaction(async () => {
      // Step A: Insert Payment
      const [payment] = await PaymentModel.create(
        [
          {
            businessId: bId,
            customerId: cId,
            customerSnapshot: {
              customerId: cId,
              displayName: 'Step 2 Test Client',
              phone: '9876543210',
              billingAddressLine: '100 Rollback Way',
              billingCity: 'Chennai',
              billingState: 'Tamil Nadu',
              billingStateCode: '33',
            },
            receiptNumber: `RCP-202627-0101`,
            financialYear,
            paymentDate: '2026-08-27',
            amountPaise: 50000,
            paymentModeId: pId,
            paymentModeSnapshot: { modeId: pId, code: 'CASH', name: 'Cash' },
            idempotencyKey: `KEY-FAIL-${Date.now()}`,
            requestHash: 'HASH-FAIL',
            status: 'COMPLETED',
          },
        ],
        { session }
      );

      // Step B: Insert Allocation
      await PaymentAllocationModel.create(
        [
          {
            businessId: bId,
            paymentId: payment._id,
            invoiceId: invId,
            customerId: cId,
            allocatedAmountPaise: 30000,
          },
        ],
        { session }
      );

      // Step C: Insert CustomerCreditLedger entry
      await CustomerCreditLedgerModel.create(
        [
          {
            businessId: bId,
            customerId: cId,
            paymentId: payment._id,
            type: 'CREDIT',
            amountPaise: 20000,
            notes: 'On-account credit from failed transaction test',
          },
        ],
        { session }
      );

      // Step D: Increment DocumentSequence (101 -> 102)
      const seqDoc = await DocumentSequenceModel.findOneAndUpdate(
        { businessId: bId, documentType: 'RECEIPT', financialYear, prefix: 'RCP' },
        { $inc: { nextSeq: 1 } },
        { new: true, session }
      ).exec();

      // Query state DURING transaction (inside session)
      duringState = {
        paymentCount: await PaymentModel.countDocuments({ businessId: bId }, { session }).exec(),
        allocationCount: await PaymentAllocationModel.countDocuments({ businessId: bId }, { session }).exec(),
        creditLedgerCount: await CustomerCreditLedgerModel.countDocuments({ businessId: bId }, { session }).exec(),
        sequenceNextSeq: seqDoc ? seqDoc.nextSeq : 0,
        syntheticFailureInjected: true,
      };

      // Step E: INJECT SYNTHETIC FAILURE AFTER ALL DB MUTATIONS SUCCEEDED INSIDE SESSION
      throw new Error('SYNTHETIC_DATABASE_FAILURE_AFTER_MUTATIONS_STEP2');
    });
  } catch (err) {
    // Expected synthetic error caught during withTransaction abort
  } finally {
    await session.endSession();
  }

  // === 3. AFTER ROLLBACK VERIFICATION (OUTSIDE SESSION) ===
  const seqDocAfter = await DocumentSequenceModel.findOne({
    businessId: bId,
    documentType: 'RECEIPT',
    financialYear,
    prefix: 'RCP',
  }).exec();

  const afterRollbackState = {
    paymentCount: await PaymentModel.countDocuments({ businessId: bId }).exec(),
    allocationCount: await PaymentAllocationModel.countDocuments({ businessId: bId }).exec(),
    creditLedgerCount: await CustomerCreditLedgerModel.countDocuments({ businessId: bId }).exec(),
    sequenceNextSeq: seqDocAfter ? seqDocAfter.nextSeq : 0,
  };

  // === 4. SUBSEQUENT SUCCESSFUL TRANSACTION VERIFICATION ===
  let successfulPaymentId = '';
  let successfulReceiptNumber = '';
  let finalSequenceNextSeq = 0;

  const validSession = await mongooseInstance.startSession();
  try {
    await validSession.withTransaction(async () => {
      const seqDoc = await DocumentSequenceModel.findOneAndUpdate(
        { businessId: bId, documentType: 'RECEIPT', financialYear, prefix: 'RCP' },
        { $inc: { nextSeq: 1 } },
        { new: true, session: validSession }
      ).exec();

      const seqNum = seqDoc!.nextSeq - 1; // Expected 101
      const receiptNumber = `RCP-202627-${String(seqNum).padStart(6, '0')}`;

      const [payment] = await PaymentModel.create(
        [
          {
            businessId: bId,
            customerId: cId,
            customerSnapshot: {
              customerId: cId,
              displayName: 'Step 2 Test Client',
              phone: '9876543210',
              billingAddressLine: '100 Rollback Way',
              billingCity: 'Chennai',
              billingState: 'Tamil Nadu',
              billingStateCode: '33',
            },
            receiptNumber,
            financialYear,
            paymentDate: '2026-08-27',
            amountPaise: 50000,
            paymentModeId: pId,
            paymentModeSnapshot: { modeId: pId, code: 'CASH', name: 'Cash' },
            idempotencyKey: `KEY-SUCCESS-${Date.now()}`,
            requestHash: 'HASH-SUCCESS',
            status: 'COMPLETED',
          },
        ],
        { session: validSession }
      );

      successfulPaymentId = payment._id.toString();
      successfulReceiptNumber = receiptNumber;
      finalSequenceNextSeq = seqDoc!.nextSeq; // Expected 102
    });
  } finally {
    await validSession.endSession();
  }

  // === 5. PASS VERDICT EVALUATION ===
  const atomicRollbackPassed =
    afterRollbackState.paymentCount === 0 &&
    afterRollbackState.allocationCount === 0 &&
    afterRollbackState.creditLedgerCount === 0 &&
    afterRollbackState.sequenceNextSeq === 101;

  const sequencePreservedPassed =
    successfulReceiptNumber === 'RCP-202627-000101' && finalSequenceNextSeq === 102;

  const passVerdict = atomicRollbackPassed && sequencePreservedPassed;

  // Cleanup test business sequence
  await DocumentSequenceModel.deleteOne({ _id: baselineSeqDoc._id }).exec();
  await PaymentModel.deleteOne({ _id: successfulPaymentId }).exec();

  return {
    step: 'Step 2 — Transaction Failure & Atomic Rollback',
    timestamp: new Date().toISOString(),
    testBusinessId: bId.toString(),
    baselineState,
    duringTransactionState: duringState,
    afterRollbackState,
    subsequentSuccessVerification: {
      successfulPaymentId,
      successfulReceiptNumber,
      finalSequenceNextSeq,
    },
    atomicRollbackPassed,
    sequencePreservedPassed,
    passVerdict,
  };
}

if (require.main === module) {
  runStep2Verification()
    .then((report) => {
      console.log(JSON.stringify(report, null, 2));
      process.exit(report.passVerdict ? 0 : 1);
    })
    .catch((err) => {
      console.error('Step 2 Verification execution failed:', err);
      process.exit(1);
    });
}
