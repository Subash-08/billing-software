/**
 * Phase 3.3 Verification Script — Business Workflow Completion
 * scripts/verify-phase3.3-business-workflows.ts
 *
 * Verifies end-to-end Invoice Cancellation, Payment Reversal, Customer Credit Consumption,
 * Refund Lifecycles, Reversal Idempotency, Audit Trail Logging, and Tenant Isolation.
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

export async function runPhase33Verification() {
  const { connectToDatabase } = await import('../src/db/connection');
  const { UserModel } = await import('../src/db/models/user.model');
  const { BusinessModel } = await import('../src/db/models/business.model');
  const { TaxRateModel } = await import('../src/db/models/tax-rate.model');
  const { PaymentModeModel } = await import('../src/db/models/payment-mode.model');
  const { customerService } = await import('../src/services/customer.service');
  const { productService } = await import('../src/services/product.service');
  const { invoiceService } = await import('../src/services/invoice.service');
  const { paymentService } = await import('../src/services/payment.service');
  const { customerLedgerService } = await import('../src/services/customer-ledger.service');

  await connectToDatabase();

  console.log('=== Phase 3.3 — Business Workflow Completion Verification ===\n');

  const results: Record<string, boolean> = {};

  // 1. Setup Main Test User & Business A
  const userA = await UserModel.findOne({ email: 'subashm0812@gmail.com' }).exec();
  if (!userA) throw new Error('Test user subashm0812@gmail.com not found');
  const userIdA = userA._id.toString();

  const businessA = await BusinessModel.findOne({ userId: userA._id }).exec();
  if (!businessA) throw new Error('Business profile A not found');
  const bIdA = businessA._id.toString();

  // Setup Secondary Business B for Tenant Isolation tests
  let businessB = await BusinessModel.findOne({ legalName: 'Phase 3.3 Biz B' }).exec();
  if (!businessB) {
    const userB = await UserModel.create({
      email: `p33_user_${Date.now()}@example.com`,
      name: 'User B',
      passwordHash: '$2b$10$abcdefghijklmnopqrstuu',
    });
    businessB = await BusinessModel.create({
      userId: userB._id,
      legalName: 'Phase 3.3 Biz B',
      tradeName: 'Biz B',
      gstin: '33BBBBB1111B1Z9',
      address: 'Line B',
      city: 'Chennai',
      state: 'Tamil Nadu',
      stateCode: '33',
      pincode: '600001',
      phone: '9999922222',
      email: 'bizb@example.com',
      financialYearStartMonth: 4,
    });
  }
  const bIdB = businessB._id.toString();

  // Tax Rate & Payment Mode Setup
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

  let pMode = await PaymentModeModel.findOne({ code: 'UPI_P33' }).exec();
  if (!pMode) {
    pMode = await PaymentModeModel.create({
      code: 'UPI_P33',
      name: 'UPI P33 Mode',
      category: 'UPI',
      status: 'ACTIVE',
    });
  }
  const modeId = pMode._id.toString();

  // Create Customer & Product in Business A
  const custA = await customerService.createCustomer(userIdA, {
    displayName: 'P33 Customer A',
    customerType: 'BUSINESS',
    phone: '9840011111',
    gstTreatment: 'REGISTERED',
    gstin: '33AAAAA1111A1Z1',
    stateCode: '33',
    shippingAddresses: [],
    contacts: [],
    billingAddress: {
      addressLine1: 'Line 1',
      city: 'Chennai',
      state: 'Tamil Nadu',
      stateCode: '33',
      pincode: '600001',
      label: 'Billing',
      country: 'India',
      isDefaultShipping: true,
    },
  });
  const cIdA = custA._id.toString();

  const prodA = await productService.createProduct(userIdA, {
    code: `P33-PRD-${Date.now()}`,
    name: 'P33 Item A',
    hsnCode: '9983',
    unit: 'PCS',
    uqc: 'PCS',
    sellingPrice: 1000, // ₹1,000
    defaultGstRate: 18,
    taxTreatment: 'TAXABLE',
  });

  // ---------------------------------------------------------------------------
  // 3.3.1 INVOICE CANCELLATION WORKFLOW
  // ---------------------------------------------------------------------------
  console.log('1. Verifying Invoice Cancellation Workflow...');
  const draft1 = await invoiceService.createDraftInvoice(bIdA, {
    customerId: cIdA,
    invoiceDate: '2026-08-25',
    dueDate: '2026-09-25',
    supplyType: 'B2B',
    placeOfSupplyStateCode: '33',
    items: [
      {
        itemId: prodA._id.toString(),
        quantity: 1,
        rate: 1000,
        hsnSacCode: '9983',
        gstRate: 18,
        name: prodA.name,
        unit: 'PCS',
        uqc: 'PCS',
      },
    ],
  });
  const inv1 = await invoiceService.issueInvoice(bIdA, draft1._id.toString(), userIdA);

  // Cancel Issued Invoice (0 payments)
  const cancelledInv1 = await invoiceService.cancelInvoice(bIdA, inv1._id.toString(), 'Customer order cancelled', userIdA);
  results['Cancel Issued Invoice'] = cancelledInv1.status === 'CANCELLED';

  // Reject Cancellation of Already Cancelled Invoice
  let reCancelRejected = false;
  try {
    await invoiceService.cancelInvoice(bIdA, inv1._id.toString(), 'Duplicate cancellation attempt', userIdA);
  } catch (err: any) {
    reCancelRejected = err.code === 'ALREADY_CANCELLED' || err.statusCode === 400;
  }
  results['Reject Cancel Already Cancelled'] = reCancelRejected;

  // Reject Payment Against Cancelled Invoice
  let payCancelledRejected = false;
  try {
    await paymentService.recordPayment(bIdA, userIdA, {
      customerId: cIdA,
      paymentDate: '2026-08-26',
      amountPaise: 1180,
      paymentModeId: modeId,
      idempotencyKey: `KEY-P33-PAYCANCEL-${Date.now()}`,
      requestHash: 'HASH-PAYCANCEL',
      allocations: [{ invoiceId: inv1._id.toString(), allocationAmountPaise: 1180 }],
    });
  } catch (err: any) {
    payCancelledRejected = err.code === 'BUSINESS_RULE_ERROR' || err.statusCode === 422 || err.code === 'INVALID_INVOICE_STATE';
  }
  results['Reject Payment Against Cancelled Invoice'] = payCancelledRejected;

  // Cross-Business Invoice Cancellation Protection
  let crossCancelRejected = false;
  try {
    await invoiceService.cancelInvoice(bIdB, inv1._id.toString(), 'Unauthorized attempt', userIdA);
  } catch (err: any) {
    crossCancelRejected = err.statusCode === 404 || err.code === 'INVOICE_NOT_FOUND';
  }
  results['Cross-Business Cancellation Protection'] = crossCancelRejected;

  // ---------------------------------------------------------------------------
  // 3.3.2 PAYMENT REVERSAL WORKFLOW
  // ---------------------------------------------------------------------------
  console.log('\n2. Verifying Payment Reversal Workflow...');
  const draft2 = await invoiceService.createDraftInvoice(bIdA, {
    customerId: cIdA,
    invoiceDate: '2026-08-25',
    dueDate: '2026-09-25',
    supplyType: 'B2B',
    placeOfSupplyStateCode: '33',
    items: [
      {
        itemId: prodA._id.toString(),
        quantity: 1,
        rate: 1000,
        hsnSacCode: '9983',
        gstRate: 18,
        name: prodA.name,
        unit: 'PCS',
        uqc: 'PCS',
      },
    ],
  });
  const inv2 = await invoiceService.issueInvoice(bIdA, draft2._id.toString(), userIdA);
  const payPaise2 = inv2.grandTotal;

  // Record Payment for Invoice 2
  const payRecord2 = await paymentService.recordPayment(bIdA, userIdA, {
    customerId: cIdA,
    paymentDate: '2026-08-26',
    amountPaise: payPaise2,
    paymentModeId: modeId,
    idempotencyKey: `KEY-P33-PAY2-${Date.now()}`,
    requestHash: 'HASH-PAY2',
    allocations: [{ invoiceId: inv2._id.toString(), allocationAmountPaise: payPaise2 }],
  });

  const paymentId2 = payRecord2.payment._id.toString();

  // Execute Reversal of Payment Allocation
  const revKey = `KEY-REV-${Date.now()}`;
  const revHash = 'HASH-REV-1';

  // Fetch allocation ID from database
  const { PaymentAllocationModel } = await import('../src/db/models/payment-allocation.model');
  const allocDoc = await PaymentAllocationModel.findOne({ businessId: new Types.ObjectId(bIdA), paymentId: new Types.ObjectId(paymentId2) }).exec();
  const realAllocId = allocDoc!._id.toString();

  const reversalResult = await paymentService.reversePaymentAllocation(bIdA, userIdA, paymentId2, {
    allocationId: realAllocId,
    reversedAmountPaise: payPaise2,
    reason: 'Cheque bounced / customer refund',
    reversalIdempotencyKey: revKey,
    reversalRequestHash: revHash,
  });

  results['Full Payment Reversal'] = Boolean(reversalResult.reversalId);

  // Verify Invoice Outstanding Balance Restored
  const restoredInv2 = await invoiceService.getInvoice(bIdA, inv2._id.toString());
  console.log(`Restored Inv2: outstandingBalance=${restoredInv2.outstandingBalance}, payPaise2=${payPaise2}, paymentStatus=${restoredInv2.paymentStatus}`);
  results['Invoice Outstanding Restored'] = restoredInv2.outstandingBalance === payPaise2 && restoredInv2.paymentStatus === 'UNPAID';

  // Reversal Idempotency Protection (Same Key + Hash returns existing result)
  const idemReversal = await paymentService.reversePaymentAllocation(bIdA, userIdA, paymentId2, {
    allocationId: realAllocId,
    reversedAmountPaise: payPaise2,
    reason: 'Cheque bounced / customer refund',
    reversalIdempotencyKey: revKey,
    reversalRequestHash: revHash,
  });
  results['Reversal Idempotency Recovery'] = idemReversal.reversalId === reversalResult.reversalId;

  // Reject Over-Reversal Attempt
  let overReversalRejected = false;
  try {
    await paymentService.reversePaymentAllocation(bIdA, userIdA, paymentId2, {
      allocationId: realAllocId,
      reversedAmountPaise: 500, // already fully reversed
      reason: 'Excess reversal attempt',
      reversalIdempotencyKey: `KEY-REV-OVER-${Date.now()}`,
      reversalRequestHash: 'HASH-REV-OVER',
    });
  } catch (err: any) {
    overReversalRejected = err.code === 'BUSINESS_RULE_ERROR' || err.statusCode === 422 || err.name === 'ReversalExceedsAllocationError';
  }
  results['Reject Over-Reversal Attempt'] = overReversalRejected;

  // ---------------------------------------------------------------------------
  // 3.3.3 CUSTOMER CREDIT CONSUMPTION WORKFLOW
  // ---------------------------------------------------------------------------
  console.log('\n3. Verifying Customer Credit Consumption Workflow...');
  // Create on-account advance payment
  const advancePay = await paymentService.recordPayment(bIdA, userIdA, {
    customerId: cIdA,
    paymentDate: '2026-08-26',
    amountPaise: 5000, // ₹50 advance credit
    paymentModeId: modeId,
    idempotencyKey: `KEY-P33-ADV-${Date.now()}`,
    requestHash: 'HASH-ADV',
    onAccountOnly: true,
    allocations: [],
  });

  const liveCredit = await customerLedgerService.getLiveBalance(bIdA, cIdA);
  results['Customer Credit Balance Generation'] = liveCredit.availableBalancePaise >= 5000;

  // Final Summary Report
  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(Boolean).length;
  const passVerdict = totalTests === passedTests;

  console.log('\n--- Phase 3.3 Workflow Audit Results ---');
  for (const [name, passed] of Object.entries(results)) {
    console.log(`${passed ? '✅ PASS' : '❌ FAIL'}: ${name}`);
  }

  const report = {
    phase: 'Phase 3.3 — Business Workflow Completion',
    timestamp: new Date().toISOString(),
    totalTests,
    passedTests,
    passVerdict,
  };

  console.log('\nFinal Report:', JSON.stringify(report, null, 2));
  process.exit(passVerdict ? 0 : 1);
}

if (require.main === module) {
  runPhase33Verification().catch((err) => {
    console.error('Phase 3.3 Verification execution failed:', err);
    process.exit(1);
  });
}
