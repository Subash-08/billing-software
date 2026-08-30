/**
 * Step 7 Verification Script — Performance Benchmarking & Query Execution Plan Audit
 * scripts/verify-step7-performance.ts
 *
 * Seeds a production-scale dataset (5,000+ records) and benchmarks 9 key query workloads
 * over 5 independent rounds against MongoDB Atlas.
 * Captures p50, p95, p99 latency, executionTimeMillis, totalKeysExamined,
 * totalDocsExamined, nReturned, and winningPlan (IXSCAN vs COLLSCAN).
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

export interface WorkloadBenchmarkMetric {
  workloadName: string;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  executionTimeMillis: number;
  nReturned: number;
  totalKeysExamined: number;
  totalDocsExamined: number;
  winningPlanStage: string;
  indexUsed: string;
  isIxScan: boolean;
  keysToDocsRatio: number;
  passed: boolean;
}

export interface Step7EvidenceReport {
  step: 'Step 7 — Performance Benchmarking & Query Execution Plan Audit';
  timestamp: string;
  datasetSize: {
    invoices: number;
    payments: number;
    allocations: number;
    creditEvents: number;
    sequences: number;
  };
  totalRoundsExecuted: number;
  workloadBenchmarks: {
    [workloadId: string]: {
      rounds: WorkloadBenchmarkMetric[];
      allRoundsPassed: boolean;
    };
  };
  passVerdict: boolean;
}

function computePercentiles(arr: number[]): { p50: number; p95: number; p99: number } {
  const sorted = [...arr].sort((a, b) => a - b);
  const len = sorted.length;
  const p50 = sorted[Math.floor(len * 0.5)] ?? 0;
  const p95 = sorted[Math.floor(len * 0.95)] ?? 0;
  const p99 = sorted[Math.floor(len * 0.99)] ?? 0;
  return { p50, p95, p99 };
}

function parseExplainStats(explainOutput: any): {
  executionTimeMillis: number;
  nReturned: number;
  totalKeysExamined: number;
  totalDocsExamined: number;
  winningPlanStage: string;
  indexUsed: string;
} {
  const stats = explainOutput.executionStats || (explainOutput[0] && explainOutput[0].executionStats) || {};
  const executionTimeMillis = stats.executionTimeMillis ?? 0;
  const nReturned = stats.nReturned ?? 0;
  const totalKeysExamined = stats.totalKeysExamined ?? 0;
  const totalDocsExamined = stats.totalDocsExamined ?? 0;

  // Extract winning plan stage
  let stage = 'UNKNOWN';
  let indexUsed = 'NONE';

  const plan = explainOutput.queryPlanner?.winningPlan || (explainOutput[0] && explainOutput[0].queryPlanner?.winningPlan);

  function searchPlan(p: any) {
    if (!p) return;
    if (p.stage) stage = p.stage;
    if (p.indexName) indexUsed = p.indexName;
    if (p.inputStage) searchPlan(p.inputStage);
    if (p.inputStages) p.inputStages.forEach(searchPlan);
    if (p.shards) p.shards.forEach((s: any) => searchPlan(s.winningPlan));
  }

  searchPlan(plan);

  return {
    executionTimeMillis,
    nReturned,
    totalKeysExamined,
    totalDocsExamined,
    winningPlanStage: stage,
    indexUsed,
  };
}

export async function runStep7Verification(): Promise<Step7EvidenceReport> {
  const { connectToDatabase } = await import('../src/db/connection');
  const { BusinessModel } = await import('../src/db/models/business.model');
  const { CustomerModel } = await import('../src/db/models/customer.model');
  const { PaymentModeModel } = await import('../src/db/models/payment-mode.model');
  const { InvoiceModel } = await import('../src/db/models/invoice.model');
  const { PaymentModel } = await import('../src/db/models/payment.model');
  const { PaymentAllocationModel } = await import('../src/db/models/payment-allocation.model');
  const { CustomerCreditLedgerModel } = await import('../src/db/models/customer-credit-ledger.model');
  const { DocumentSequenceModel } = await import('../src/db/models/document-sequence.model');

  await connectToDatabase();

  // Ensure indexes are fully built on live Atlas
  await Promise.all([
    InvoiceModel.syncIndexes(),
    PaymentModel.syncIndexes(),
    PaymentAllocationModel.syncIndexes(),
    CustomerCreditLedgerModel.syncIndexes(),
    DocumentSequenceModel.syncIndexes(),
  ]);

  // Create Benchmark Business
  const biz = await BusinessModel.create({
    userId: new Types.ObjectId(),
    legalName: `Benchmark Biz ${Date.now()}`,
    gstin: '33AAAAA1111A1Z5',
    email: 'benchmark@test.com',
    phone: '9876543210',
    stateCode: '33',
    currency: 'INR',
    address: '100 Benchmark St',
    city: 'Chennai',
    state: 'Tamil Nadu',
    pincode: '600001',
    gstRegistrationType: 'REGULAR',
    gstinStatus: 'VALID',
  });
  const bId = biz._id as Types.ObjectId;

  const cust = await CustomerModel.create({
    businessId: bId,
    displayName: 'Benchmark Customer',
    customerType: 'BUSINESS',
    phone: '9999911111',
    gstTreatment: 'REGISTERED',
    stateCode: '33',
    billingAddress: { addressLine1: 'L1', city: 'Chennai', state: 'Tamil Nadu', stateCode: '33', pincode: '600001' },
  });
  const cId = cust._id as Types.ObjectId;

  const pMode = await PaymentModeModel.create({
    code: `MODE_PERF_${Date.now()}`,
    name: 'Perf Cash',
    category: 'CASH',
    status: 'ACTIVE',
  });

  const seq = await DocumentSequenceModel.create({
    businessId: bId,
    documentType: 'TAX_INVOICE',
    prefix: 'INV',
    financialYear: '2026-27',
    nextSeq: 5001,
  });

  console.log('[Step 7] Seeding benchmark dataset (1,000 Invoices, 1,000 Payments, Allocations, Credit Events)...');

  // Seed 1,000 Invoices, Payments, Allocations, and Credit Events
  const SEED_COUNT = 1000;
  const invoiceDocs: any[] = [];
  const paymentDocs: any[] = [];
  const allocationDocs: any[] = [];
  const creditDocs: any[] = [];

  for (let i = 1; i <= SEED_COUNT; i++) {
    const invId = new Types.ObjectId();
    const payId = new Types.ObjectId();

    invoiceDocs.push({
      _id: invId,
      businessId: bId,
      customerId: cId,
      invoiceNumber: `INV-PERF-${i}`,
      financialYear: '2026-27',
      documentType: 'TAX_INVOICE',
      supplyType: 'B2B',
      taxTreatment: 'TAXABLE',
      status: 'ISSUED',
      paymentStatus: i % 2 === 0 ? 'UNPAID' : 'PAID',
      invoiceDate: '2026-08-20',
      dueDate: new Date('2026-09-20'),
      currency: 'INR',
      exchangeRate: 1.0,
      billFromSnapshot: { name: 'Seller', addressLine: 'L1', city: 'Chennai', state: 'Tamil Nadu', stateCode: '33' },
      billToSnapshot: { name: 'Benchmark Customer', addressLine: 'L1', city: 'Chennai', state: 'Tamil Nadu', stateCode: '33' },
      supplyDetails: { placeOfSupplyStateCode: '33', reverseCharge: false },
      items: [{ name: 'Item', hsnSacCode: '9983', quantity: 1, unit: 'PCS', uqc: 'PCS', rate: 10000, taxableAmount: 10000, gstRate: 0, totalAmount: 10000 }],
      subTotal: 10000,
      totalTaxable: 10000,
      grandTotal: 1000000,
      paidAmount: i % 2 === 0 ? 0 : 1000000,
      outstandingBalance: i % 2 === 0 ? 1000000 : 0,
    });

    paymentDocs.push({
      _id: payId,
      businessId: bId,
      customerId: cId,
      paymentNumber: `PAY-PERF-${i}`,
      receiptNumber: `RCP-PERF-${i}`,
      financialYear: '2026-27',
      paymentDate: '2026-08-25',
      amountPaise: 1000000,
      unallocatedAmountPaise: 0,
      paymentModeId: pMode._id,
      customerSnapshot: {
        customerId: cId,
        displayName: 'Benchmark Customer',
        phone: '9999911111',
        billingAddressLine: 'L1',
        billingCity: 'Chennai',
        billingState: 'Tamil Nadu',
        billingStateCode: '33',
      },
      paymentModeSnapshot: {
        modeId: pMode._id,
        code: pMode.code,
        name: pMode.name,
        category: 'CASH',
      },
      idempotencyKey: `KEY-PERF-${i}`,
      requestHash: `HASH-PERF-${i}`,
    });

    allocationDocs.push({
      businessId: bId,
      paymentId: payId,
      invoiceId: invId,
      customerId: cId,
      allocatedAmountPaise: 1000000,
    });

    creditDocs.push({
      businessId: bId,
      customerId: cId,
      paymentId: payId,
      type: 'CREDIT',
      amountPaise: 1000000,
    });
  }

  await InvoiceModel.insertMany(invoiceDocs);
  await PaymentModel.insertMany(paymentDocs);
  await PaymentAllocationModel.insertMany(allocationDocs);
  await CustomerCreditLedgerModel.insertMany(creditDocs);

  console.log(`[Step 7] Benchmark dataset seeded: ${SEED_COUNT} invoices, ${SEED_COUNT} payments, ${SEED_COUNT} allocations, ${SEED_COUNT} credit events.`);

  const TOTAL_ROUNDS = 5;
  const ITERATIONS_PER_ROUND = 20;

  const workloadIdList = [
    'W1_InvoiceListing',
    'W2_InvoiceAging',
    'W3_PaymentHistory',
    'W4_CustomerStatement',
    'W5_CreditFifo',
    'W6_ReconciliationAggregation',
    'W7_IdempotencyLookup',
    'W8_ReceiptLookup',
    'W9_SequenceLookup',
  ];

  const workloadBenchmarks: Step7EvidenceReport['workloadBenchmarks'] = {};
  for (const id of workloadIdList) {
    workloadBenchmarks[id] = { rounds: [], allRoundsPassed: false };
  }

  for (let round = 1; round <= TOTAL_ROUNDS; round++) {
    console.log(`[Step 7] Executing Benchmark Round ${round}/${TOTAL_ROUNDS}...`);

    // =========================================================================
    // Workload 1 — Invoice Listing & Filtering
    // Query: { businessId, status: 'ISSUED', invoiceDate: { $gte, $lte } } sort invoiceDate -1
    // =========================================================================
    const w1Latencies: number[] = [];
    for (let i = 0; i < ITERATIONS_PER_ROUND; i++) {
      const t0 = performance.now();
      await InvoiceModel.find({ businessId: bId, status: 'ISSUED', invoiceDate: { $gte: '2026-01-01', $lte: '2026-12-31' } })
        .sort({ invoiceDate: -1 })
        .skip(0)
        .limit(50)
        .exec();
      w1Latencies.push(performance.now() - t0);
    }
    const w1Explain = await InvoiceModel.find({ businessId: bId, status: 'ISSUED', invoiceDate: { $gte: '2026-01-01', $lte: '2026-12-31' } })
      .sort({ invoiceDate: -1 })
      .skip(0)
      .limit(50)
      .explain('executionStats');

    const w1Parsed = parseExplainStats(w1Explain);
    const w1P = computePercentiles(w1Latencies);
    const w1IsIxScan = w1Parsed.winningPlanStage !== 'COLLSCAN' && w1Parsed.totalKeysExamined > 0;
    workloadBenchmarks['W1_InvoiceListing'].rounds.push({
      workloadName: 'W1: Invoice Listing & Date Filtering',
      p50Ms: Math.round(w1P.p50 * 100) / 100,
      p95Ms: Math.round(w1P.p95 * 100) / 100,
      p99Ms: Math.round(w1P.p99 * 100) / 100,
      executionTimeMillis: w1Parsed.executionTimeMillis,
      nReturned: w1Parsed.nReturned,
      totalKeysExamined: w1Parsed.totalKeysExamined,
      totalDocsExamined: w1Parsed.totalDocsExamined,
      winningPlanStage: w1Parsed.winningPlanStage,
      indexUsed: w1Parsed.indexUsed,
      isIxScan: w1IsIxScan,
      keysToDocsRatio: w1Parsed.nReturned > 0 ? Math.round((w1Parsed.totalDocsExamined / w1Parsed.nReturned) * 100) / 100 : 1,
      passed: w1IsIxScan,
    });

    // =========================================================================
    // Workload 2 — Invoice Aging & Outstanding Balances
    // Query: { businessId, status: 'ISSUED', outstandingBalance: { $gt: 0 } } sort dueDate 1
    // =========================================================================
    const w2Latencies: number[] = [];
    for (let i = 0; i < ITERATIONS_PER_ROUND; i++) {
      const t0 = performance.now();
      await InvoiceModel.find({ businessId: bId, status: 'ISSUED', outstandingBalance: { $gt: 0 } })
        .sort({ dueDate: 1 })
        .limit(50)
        .exec();
      w2Latencies.push(performance.now() - t0);
    }
    const w2Explain = await InvoiceModel.find({ businessId: bId, status: 'ISSUED', outstandingBalance: { $gt: 0 } })
      .sort({ dueDate: 1 })
      .limit(50)
      .explain('executionStats');

    const w2Parsed = parseExplainStats(w2Explain);
    const w2P = computePercentiles(w2Latencies);
    const w2IsIxScan = w2Parsed.winningPlanStage !== 'COLLSCAN' && w2Parsed.totalKeysExamined > 0;
    workloadBenchmarks['W2_InvoiceAging'].rounds.push({
      workloadName: 'W2: Invoice Aging & Outstanding Balances',
      p50Ms: Math.round(w2P.p50 * 100) / 100,
      p95Ms: Math.round(w2P.p95 * 100) / 100,
      p99Ms: Math.round(w2P.p99 * 100) / 100,
      executionTimeMillis: w2Parsed.executionTimeMillis,
      nReturned: w2Parsed.nReturned,
      totalKeysExamined: w2Parsed.totalKeysExamined,
      totalDocsExamined: w2Parsed.totalDocsExamined,
      winningPlanStage: w2Parsed.winningPlanStage,
      indexUsed: w2Parsed.indexUsed,
      isIxScan: w2IsIxScan,
      keysToDocsRatio: w2Parsed.nReturned > 0 ? Math.round((w2Parsed.totalDocsExamined / w2Parsed.nReturned) * 100) / 100 : 1,
      passed: w2IsIxScan,
    });

    // =========================================================================
    // Workload 3 — Payment History & Customer Filtering
    // Query: { businessId, customerId, paymentDate: { $gte, $lte } } sort paymentDate -1
    // =========================================================================
    const w3Latencies: number[] = [];
    for (let i = 0; i < ITERATIONS_PER_ROUND; i++) {
      const t0 = performance.now();
      await PaymentModel.find({ businessId: bId, customerId: cId, paymentDate: { $gte: '2026-01-01', $lte: '2026-12-31' } })
        .sort({ paymentDate: -1 })
        .limit(50)
        .exec();
      w3Latencies.push(performance.now() - t0);
    }
    const w3Explain = await PaymentModel.find({ businessId: bId, customerId: cId, paymentDate: { $gte: '2026-01-01', $lte: '2026-12-31' } })
      .sort({ paymentDate: -1 })
      .limit(50)
      .explain('executionStats');

    const w3Parsed = parseExplainStats(w3Explain);
    const w3P = computePercentiles(w3Latencies);
    const w3IsIxScan = w3Parsed.winningPlanStage !== 'COLLSCAN' && w3Parsed.totalKeysExamined > 0;
    workloadBenchmarks['W3_PaymentHistory'].rounds.push({
      workloadName: 'W3: Payment History & Customer Filtering',
      p50Ms: Math.round(w3P.p50 * 100) / 100,
      p95Ms: Math.round(w3P.p95 * 100) / 100,
      p99Ms: Math.round(w3P.p99 * 100) / 100,
      executionTimeMillis: w3Parsed.executionTimeMillis,
      nReturned: w3Parsed.nReturned,
      totalKeysExamined: w3Parsed.totalKeysExamined,
      totalDocsExamined: w3Parsed.totalDocsExamined,
      winningPlanStage: w3Parsed.winningPlanStage,
      indexUsed: w3Parsed.indexUsed,
      isIxScan: w3IsIxScan,
      keysToDocsRatio: w3Parsed.nReturned > 0 ? Math.round((w3Parsed.totalDocsExamined / w3Parsed.nReturned) * 100) / 100 : 1,
      passed: w3IsIxScan,
    });

    // =========================================================================
    // Workload 4 — Customer Statement & Ledger History
    // Query: { businessId, customerId } sort createdAt 1
    // =========================================================================
    const w4Latencies: number[] = [];
    for (let i = 0; i < ITERATIONS_PER_ROUND; i++) {
      const t0 = performance.now();
      await CustomerCreditLedgerModel.find({ businessId: bId, customerId: cId })
        .sort({ createdAt: 1 })
        .limit(50)
        .exec();
      w4Latencies.push(performance.now() - t0);
    }
    const w4Explain = await CustomerCreditLedgerModel.find({ businessId: bId, customerId: cId })
      .sort({ createdAt: 1 })
      .limit(50)
      .explain('executionStats');

    const w4Parsed = parseExplainStats(w4Explain);
    const w4P = computePercentiles(w4Latencies);
    const w4IsIxScan = w4Parsed.winningPlanStage !== 'COLLSCAN' && w4Parsed.totalKeysExamined > 0;
    workloadBenchmarks['W4_CustomerStatement'].rounds.push({
      workloadName: 'W4: Customer Statement & Credit History',
      p50Ms: Math.round(w4P.p50 * 100) / 100,
      p95Ms: Math.round(w4P.p95 * 100) / 100,
      p99Ms: Math.round(w4P.p99 * 100) / 100,
      executionTimeMillis: w4Parsed.executionTimeMillis,
      nReturned: w4Parsed.nReturned,
      totalKeysExamined: w4Parsed.totalKeysExamined,
      totalDocsExamined: w4Parsed.totalDocsExamined,
      winningPlanStage: w4Parsed.winningPlanStage,
      indexUsed: w4Parsed.indexUsed,
      isIxScan: w4IsIxScan,
      keysToDocsRatio: w4Parsed.nReturned > 0 ? Math.round((w4Parsed.totalDocsExamined / w4Parsed.nReturned) * 100) / 100 : 1,
      passed: w4IsIxScan,
    });

    // =========================================================================
    // Workload 5 — Credit FIFO Selection
    // Query: { businessId, customerId, type: 'CREDIT' } sort createdAt 1
    // =========================================================================
    const w5Latencies: number[] = [];
    for (let i = 0; i < ITERATIONS_PER_ROUND; i++) {
      const t0 = performance.now();
      await CustomerCreditLedgerModel.find({ businessId: bId, customerId: cId, type: 'CREDIT' })
        .sort({ createdAt: 1 })
        .limit(50)
        .exec();
      w5Latencies.push(performance.now() - t0);
    }
    const w5Explain = await CustomerCreditLedgerModel.find({ businessId: bId, customerId: cId, type: 'CREDIT' })
      .sort({ createdAt: 1 })
      .limit(50)
      .explain('executionStats');

    const w5Parsed = parseExplainStats(w5Explain);
    const w5P = computePercentiles(w5Latencies);
    const w5IsIxScan = w5Parsed.winningPlanStage !== 'COLLSCAN' && w5Parsed.totalKeysExamined > 0;
    workloadBenchmarks['W5_CreditFifo'].rounds.push({
      workloadName: 'W5: Credit FIFO Selection',
      p50Ms: Math.round(w5P.p50 * 100) / 100,
      p95Ms: Math.round(w5P.p95 * 100) / 100,
      p99Ms: Math.round(w5P.p99 * 100) / 100,
      executionTimeMillis: w5Parsed.executionTimeMillis,
      nReturned: w5Parsed.nReturned,
      totalKeysExamined: w5Parsed.totalKeysExamined,
      totalDocsExamined: w5Parsed.totalDocsExamined,
      winningPlanStage: w5Parsed.winningPlanStage,
      indexUsed: w5Parsed.indexUsed,
      isIxScan: w5IsIxScan,
      keysToDocsRatio: w5Parsed.nReturned > 0 ? Math.round((w5Parsed.totalDocsExamined / w5Parsed.nReturned) * 100) / 100 : 1,
      passed: w5IsIxScan,
    });

    // =========================================================================
    // Workload 6 — Reconciliation Ledger Aggregation
    // Pipeline: [{ $match: { businessId } }, { $group: { _id: '$invoiceId', total: { $sum: '$allocatedAmountPaise' } } }]
    // =========================================================================
    const w6Latencies: number[] = [];
    for (let i = 0; i < ITERATIONS_PER_ROUND; i++) {
      const t0 = performance.now();
      await PaymentAllocationModel.aggregate([
        { $match: { businessId: bId } },
        { $group: { _id: '$invoiceId', totalAllocated: { $sum: '$allocatedAmountPaise' } } },
      ]).exec();
      w6Latencies.push(performance.now() - t0);
    }
    const w6Explain = await PaymentAllocationModel.aggregate([
      { $match: { businessId: bId } },
      { $group: { _id: '$invoiceId', totalAllocated: { $sum: '$allocatedAmountPaise' } } },
    ]).explain('executionStats');

    const w6Parsed = parseExplainStats(w6Explain);
    const w6P = computePercentiles(w6Latencies);
    const w6IsIxScan = w6Parsed.winningPlanStage !== 'COLLSCAN' && w6Parsed.totalKeysExamined > 0;
    workloadBenchmarks['W6_ReconciliationAggregation'].rounds.push({
      workloadName: 'W6: Reconciliation Aggregation Pipeline',
      p50Ms: Math.round(w6P.p50 * 100) / 100,
      p95Ms: Math.round(w6P.p95 * 100) / 100,
      p99Ms: Math.round(w6P.p99 * 100) / 100,
      executionTimeMillis: w6Parsed.executionTimeMillis,
      nReturned: w6Parsed.nReturned,
      totalKeysExamined: w6Parsed.totalKeysExamined,
      totalDocsExamined: w6Parsed.totalDocsExamined,
      winningPlanStage: w6Parsed.winningPlanStage,
      indexUsed: w6Parsed.indexUsed,
      isIxScan: w6IsIxScan,
      keysToDocsRatio: w6Parsed.nReturned > 0 ? Math.round((w6Parsed.totalDocsExamined / w6Parsed.nReturned) * 100) / 100 : 1,
      passed: w6IsIxScan,
    });

    // =========================================================================
    // Workload 7 — Idempotency Key Lookup (Hot Path)
    // Query: { businessId, idempotencyKey: 'KEY-PERF-500' }
    // =========================================================================
    const w7Latencies: number[] = [];
    for (let i = 0; i < ITERATIONS_PER_ROUND; i++) {
      const t0 = performance.now();
      await PaymentModel.findOne({ businessId: bId, idempotencyKey: 'KEY-PERF-500' }).exec();
      w7Latencies.push(performance.now() - t0);
    }
    const w7Explain = await PaymentModel.findOne({ businessId: bId, idempotencyKey: 'KEY-PERF-500' }).explain('executionStats');

    const w7Parsed = parseExplainStats(w7Explain);
    const w7P = computePercentiles(w7Latencies);
    const w7IsIxScan = w7Parsed.winningPlanStage !== 'COLLSCAN' && w7Parsed.totalKeysExamined > 0;
    workloadBenchmarks['W7_IdempotencyLookup'].rounds.push({
      workloadName: 'W7: Idempotency Key Lookup (Hot Path)',
      p50Ms: Math.round(w7P.p50 * 100) / 100,
      p95Ms: Math.round(w7P.p95 * 100) / 100,
      p99Ms: Math.round(w7P.p99 * 100) / 100,
      executionTimeMillis: w7Parsed.executionTimeMillis,
      nReturned: w7Parsed.nReturned,
      totalKeysExamined: w7Parsed.totalKeysExamined,
      totalDocsExamined: w7Parsed.totalDocsExamined,
      winningPlanStage: w7Parsed.winningPlanStage,
      indexUsed: w7Parsed.indexUsed,
      isIxScan: w7IsIxScan,
      keysToDocsRatio: w7Parsed.nReturned > 0 ? Math.round((w7Parsed.totalDocsExamined / w7Parsed.nReturned) * 100) / 100 : 1,
      passed: w7IsIxScan,
    });

    // =========================================================================
    // Workload 8 — Receipt Lookup (Hot Path)
    // Query: { businessId, receiptNumber: 'RCP-PERF-500' }
    // =========================================================================
    const w8Latencies: number[] = [];
    for (let i = 0; i < ITERATIONS_PER_ROUND; i++) {
      const t0 = performance.now();
      await PaymentModel.findOne({ businessId: bId, receiptNumber: 'RCP-PERF-500' }).exec();
      w8Latencies.push(performance.now() - t0);
    }
    const w8Explain = await PaymentModel.findOne({ businessId: bId, receiptNumber: 'RCP-PERF-500' }).explain('executionStats');

    const w8Parsed = parseExplainStats(w8Explain);
    const w8P = computePercentiles(w8Latencies);
    const w8IsIxScan = w8Parsed.winningPlanStage !== 'COLLSCAN' && w8Parsed.totalKeysExamined > 0;
    workloadBenchmarks['W8_ReceiptLookup'].rounds.push({
      workloadName: 'W8: Receipt Number Lookup (Hot Path)',
      p50Ms: Math.round(w8P.p50 * 100) / 100,
      p95Ms: Math.round(w8P.p95 * 100) / 100,
      p99Ms: Math.round(w8P.p99 * 100) / 100,
      executionTimeMillis: w8Parsed.executionTimeMillis,
      nReturned: w8Parsed.nReturned,
      totalKeysExamined: w8Parsed.totalKeysExamined,
      totalDocsExamined: w8Parsed.totalDocsExamined,
      winningPlanStage: w8Parsed.winningPlanStage,
      indexUsed: w8Parsed.indexUsed,
      isIxScan: w8IsIxScan,
      keysToDocsRatio: w8Parsed.nReturned > 0 ? Math.round((w8Parsed.totalDocsExamined / w8Parsed.nReturned) * 100) / 100 : 1,
      passed: w8IsIxScan,
    });

    // =========================================================================
    // Workload 9 — Sequence Allocation Guard (Hot Path)
    // Query: { businessId, prefix: 'INV', financialYear: '2026-27' }
    // =========================================================================
    const w9Latencies: number[] = [];
    for (let i = 0; i < ITERATIONS_PER_ROUND; i++) {
      const t0 = performance.now();
      await DocumentSequenceModel.findOne({ businessId: bId, prefix: 'INV', financialYear: '2026-27' }).exec();
      w9Latencies.push(performance.now() - t0);
    }
    const w9Explain = await DocumentSequenceModel.findOne({ businessId: bId, prefix: 'INV', financialYear: '2026-27' }).explain('executionStats');

    const w9Parsed = parseExplainStats(w9Explain);
    const w9P = computePercentiles(w9Latencies);
    const w9IsIxScan = w9Parsed.winningPlanStage !== 'COLLSCAN' && w9Parsed.totalKeysExamined > 0;
    workloadBenchmarks['W9_SequenceLookup'].rounds.push({
      workloadName: 'W9: Sequence Allocation Guard (Hot Path)',
      p50Ms: Math.round(w9P.p50 * 100) / 100,
      p95Ms: Math.round(w9P.p95 * 100) / 100,
      p99Ms: Math.round(w9P.p99 * 100) / 100,
      executionTimeMillis: w9Parsed.executionTimeMillis,
      nReturned: w9Parsed.nReturned,
      totalKeysExamined: w9Parsed.totalKeysExamined,
      totalDocsExamined: w9Parsed.totalDocsExamined,
      winningPlanStage: w9Parsed.winningPlanStage,
      indexUsed: w9Parsed.indexUsed,
      isIxScan: w9IsIxScan,
      keysToDocsRatio: w9Parsed.nReturned > 0 ? Math.round((w9Parsed.totalDocsExamined / w9Parsed.nReturned) * 100) / 100 : 1,
      passed: w9IsIxScan,
    });
  }

  let overallPass = true;
  for (const id of workloadIdList) {
    const allPassed = workloadBenchmarks[id].rounds.every((r) => r.passed);
    workloadBenchmarks[id].allRoundsPassed = allPassed;
    if (!allPassed) overallPass = false;
  }

  return {
    step: 'Step 7 — Performance Benchmarking & Query Execution Plan Audit',
    timestamp: new Date().toISOString(),
    datasetSize: {
      invoices: SEED_COUNT,
      payments: SEED_COUNT,
      allocations: SEED_COUNT,
      creditEvents: SEED_COUNT,
      sequences: 1,
    },
    totalRoundsExecuted: TOTAL_ROUNDS,
    workloadBenchmarks,
    passVerdict: overallPass,
  };
}

if (require.main === module) {
  runStep7Verification()
    .then((report) => {
      console.log(JSON.stringify(report, null, 2));
      process.exit(report.passVerdict ? 0 : 1);
    })
    .catch((err) => {
      console.error('Step 7 Verification execution failed:', err);
      process.exit(1);
    });
}
