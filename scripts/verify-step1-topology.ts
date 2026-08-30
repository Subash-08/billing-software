/**
 * Step 1 Verification Script — MongoDB Deployment Topology & Transaction Proof
 * scripts/verify-step1-topology.ts
 *
 * Executes the Step 1 verification sequence against the configured MongoDB database:
 * 1. Queries MongoDB buildInfo and hello/isMaster command for topology & version details.
 * 2. Executes a real multi-document transaction via session.withTransaction().
 * 3. Inspects actual deployed collection index catalogs from MongoDB (not Mongoose definitions).
 * 4. Generates the Step 1 Verification Evidence Artifact.
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
// Static imports for models are handled inside runStep1Verification dynamically

export interface Step1EvidenceReport {
  step: 'Step 1 — MongoDB Deployment Topology';
  timestamp: string;
  environment: {
    mongodbUriConfigured: boolean;
    serverVersion: string;
    deploymentType: string;         // 'ReplicaSet' | 'Sharded' | 'Standalone'
    replicaSetName?: string;
    isPrimaryAvailable: boolean;
  };
  transactionVerification: {
    sessionEstablished: boolean;
    multiDocumentTransactionSucceeded: boolean;
    committedTestDocumentId?: string;
    error?: string;
  };
  indexInventory: Array<{
    collection: string;
    indexes: Array<{ name: string; key: Record<string, number>; unique?: boolean }>;
    requiredIndexesPresent: boolean;
  }>;
  passVerdict: boolean;
}

export async function runStep1Verification(): Promise<Step1EvidenceReport> {
  const { connectToDatabase } = await import('../src/db/connection');
  const { PaymentModel } = await import('../src/db/models/payment.model');
  const { PaymentAllocationModel } = await import('../src/db/models/payment-allocation.model');

  const mongooseInstance = await connectToDatabase();
  const db = mongooseInstance.connection.db;

  if (!db) {
    throw new Error('Database connection established but db instance is undefined.');
  }

  // === 1. TOPOLOGY & SERVER VERSION ===
  const buildInfo = await db.command({ buildInfo: 1 });
  const serverVersion = buildInfo.version || 'Unknown';

  const helloResponse = await db.command({ hello: 1 }).catch(() => db.command({ isMaster: 1 }));
  const replicaSetName = helloResponse.setName || undefined;
  const isPrimary = Boolean(helloResponse.isWritablePrimary || helloResponse.ismaster);
  const msg = helloResponse.msg;

  let deploymentType = 'Standalone';
  if (replicaSetName) {
    deploymentType = 'ReplicaSet';
  } else if (msg === 'isdbgrid') {
    deploymentType = 'Sharded / Atlas Proxy';
  }

  // === 2. TRANSACTION VERIFICATION ===
  let sessionEstablished = false;
  let multiDocumentTransactionSucceeded = false;
  let committedTestDocumentId: string | undefined = undefined;
  let transactionError: string | undefined = undefined;

  try {
    const session = await mongooseInstance.startSession();
    sessionEstablished = true;

    try {
      await session.withTransaction(async () => {
        const bId = new Types.ObjectId();
        const cId = new Types.ObjectId();
        const pId = new Types.ObjectId();

        const [payment] = await PaymentModel.create(
          [
            {
              businessId: bId,
              customerId: cId,
              customerSnapshot: {
                customerId: cId,
                displayName: 'Step1 Test Cust',
                phone: '9999999999',
                billingAddressLine: 'L1',
                billingCity: 'Chennai',
                billingState: 'TN',
                billingStateCode: '33',
              },
              receiptNumber: `STEP1-RCP-${Date.now()}`,
              financialYear: '2026-27',
              paymentDate: '2026-08-27',
              amountPaise: 1000,
              paymentModeId: pId,
              paymentModeSnapshot: { modeId: pId, code: 'CASH', name: 'Cash' },
              idempotencyKey: `STEP1-KEY-${Date.now()}`,
              requestHash: 'STEP1-HASH',
              status: 'COMPLETED',
            },
          ],
          { session }
        );

        const [alloc] = await PaymentAllocationModel.create(
          [
            {
              businessId: bId,
              paymentId: payment._id,
              invoiceId: new Types.ObjectId(),
              customerId: cId,
              allocatedAmountPaise: 1000,
            },
          ],
          { session }
        );

        committedTestDocumentId = payment._id.toString();

        // Clean up test documents inside session before transaction ends
        await PaymentModel.deleteOne({ _id: payment._id }, { session });
        await PaymentAllocationModel.deleteOne({ _id: alloc._id }, { session });
      });

      multiDocumentTransactionSucceeded = true;
    } catch (err: unknown) {
      transactionError = err instanceof Error ? err.message : String(err);
    } finally {
      await session.endSession();
    }
  } catch (err: unknown) {
    transactionError = err instanceof Error ? err.message : String(err);
  }

  // === 3. DEPLOYED INDEX INVENTORY ===
  const collectionsToCheck = [
    'payments',
    'paymentallocations',
    'paymentreversals',
    'customercreditledgers',
    'invoices',
    'documentsequences',
  ];

  const indexInventory: Step1EvidenceReport['indexInventory'] = [];

  // Specific required index definitions per collection
  const requiredIndexMap: Record<string, string[]> = {
    payments: ['businessId_1_idempotencyKey_1', 'businessId_1_receiptNumber_1'],
    paymentallocations: ['businessId_1_paymentId_1', 'businessId_1_invoiceId_1'],
    paymentreversals: ['businessId_1_reversalIdempotencyKey_1'],
    customercreditledgers: ['businessId_1_customerId_1_createdAt_1'],
    invoices: ['businessId_1_invoiceNumber_1'],
    documentsequences: ['businessId_1_documentType_1_prefix_1_financialYear_1'],
  };

  for (const collName of collectionsToCheck) {
    try {
      const coll = db.collection(collName);
      const rawIndexes = await coll.listIndexes().toArray();
      const formatted = rawIndexes.map((idx) => ({
        name: idx.name,
        key: idx.key as Record<string, number>,
        unique: Boolean(idx.unique),
      }));

      const requiredForColl = requiredIndexMap[collName] || [];
      const presentNames = formatted.map((i) => i.name);
      const requiredIndexesPresent = requiredForColl.every((req) => presentNames.includes(req));

      indexInventory.push({
        collection: collName,
        indexes: formatted,
        requiredIndexesPresent,
      });
    } catch (err) {
      indexInventory.push({
        collection: collName,
        indexes: [],
        requiredIndexesPresent: false,
      });
    }
  }

  const allIndexesVerified = indexInventory.every((item) => item.requiredIndexesPresent);

  // === 4. PASS VERDICT ===
  // Pass requires: (ReplicaSet OR Sharded) AND primary available AND transaction succeeded AND all required indexes present
  const passVerdict =
    (deploymentType === 'ReplicaSet' || deploymentType === 'Sharded / Atlas Proxy') &&
    isPrimary &&
    multiDocumentTransactionSucceeded &&
    allIndexesVerified;

  return {
    step: 'Step 1 — MongoDB Deployment Topology',
    timestamp: new Date().toISOString(),
    environment: {
      mongodbUriConfigured: true,
      serverVersion,
      deploymentType,
      replicaSetName,
      isPrimaryAvailable: isPrimary,
    },
    transactionVerification: {
      sessionEstablished,
      multiDocumentTransactionSucceeded,
      committedTestDocumentId,
      error: transactionError,
    },
    indexInventory,
    passVerdict,
  };
}

// Execute if run directly
if (require.main === module) {
  runStep1Verification()
    .then((report) => {
      console.log(JSON.stringify(report, null, 2));
      process.exit(report.passVerdict ? 0 : 1);
    })
    .catch((err) => {
      console.error('Step 1 Verification execution failed:', err);
      process.exit(1);
    });
}
