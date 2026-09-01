/**
 * Migration Script v8 — Invoice Item Snapshot & Credit Note Schema Migration
 * src/scripts/migrate-invoice-snapshot-v8.ts
 *
 * Fast batch implementation using bulkWrite for high performance over Atlas.
 */

import { connectToDatabase } from '@/db/connection';
import { InvoiceModel } from '@/db/models/invoice.model';
import { CreditNoteModel } from '@/db/models/credit-note.model';
import { AuditLogModel } from '@/db/models/audit-log.model';

export async function migrateInvoiceSnapshotV8(): Promise<{
  success: boolean;
  invoicesMigrated: number;
  creditNotesMigrated: number;
}> {
  await connectToDatabase();

  console.log('🚀 Starting Invoice & Credit Note Schema Migration (v8)...');

  // STEP 1: Pre-migration state & totals
  const invoiceCountBefore = await InvoiceModel.countDocuments({});
  const creditNoteCountBefore = await CreditNoteModel.countDocuments({});

  const invoiceGrandTotalBefore = await InvoiceModel.aggregate([
    { $group: { _id: null, sum: { $sum: '$grandTotal' } } },
  ]);
  const initialInvoiceTotalSum = invoiceGrandTotalBefore[0]?.sum || 0;

  console.log(`📊 Initial State: ${invoiceCountBefore} Invoices, ${creditNoteCountBefore} Credit Notes. Grand Total Sum: ${initialInvoiceTotalSum} paise`);

  // STEP 2: Fast Bulk Migration for Invoices
  const allInvoices = await InvoiceModel.find({}).lean().exec();
  const invoiceOperations: any[] = [];

  for (const inv of allInvoices) {
    const updatedItems = (inv.items || []).map((item: any) => {
      const isGoods = (item.itemType || 'GOODS') === 'GOODS';
      const rawCode = item.hsnCode || item.sacCode || item.hsnSacCode || '';

      return {
        itemId: item.itemId,
        itemType: item.itemType || 'GOODS',
        name: item.name,
        description: item.description,
        hsnCode: isGoods ? (item.hsnCode || rawCode) : undefined,
        sacCode: !isGoods ? (item.sacCode || rawCode) : undefined,
        quantity: item.quantity,
        freeQuantity: item.freeQuantity || 0,
        unit: item.unit || 'Pcs',
        uqc: item.uqc || (isGoods ? 'PCS' : 'JOB'),
        enteredRatePaise: item.enteredRatePaise !== undefined ? item.enteredRatePaise : (item.rate ?? 0),
        isPriceInclusiveOfGst: item.isPriceInclusiveOfGst ?? false,
        discountType: item.discountType,
        discountValueRaw: item.discountValueRaw,
        discountAmountPaise: item.discountAmountPaise !== undefined ? item.discountAmountPaise : (item.discountAmount ?? 0),
        taxTreatment: item.taxTreatment || 'TAXABLE',
        gstRate: item.gstRate ?? 0,
        cgstRate: item.cgstRate ?? (item.gstRate ? item.gstRate / 2 : 0),
        sgstRate: item.sgstRate ?? (item.gstRate ? item.gstRate / 2 : 0),
        igstRate: item.igstRate ?? 0,
        taxRateId: item.taxRateId || '',
        taxRateVersion: item.taxRateVersion || '1.0',
        taxableAmountPaise: item.taxableAmountPaise !== undefined ? item.taxableAmountPaise : (item.taxableAmount ?? 0),
        cgstAmountPaise: item.cgstAmountPaise !== undefined ? item.cgstAmountPaise : (item.cgstAmount ?? 0),
        sgstAmountPaise: item.sgstAmountPaise !== undefined ? item.sgstAmountPaise : (item.sgstAmount ?? 0),
        utgstAmountPaise: item.utgstAmountPaise !== undefined ? item.utgstAmountPaise : (item.utgstAmount ?? 0),
        igstAmountPaise: item.igstAmountPaise !== undefined ? item.igstAmountPaise : (item.igstAmount ?? 0),
        cessRate: item.cessRate ?? 0,
        cessAmountPaise: item.cessAmountPaise !== undefined ? item.cessAmountPaise : (item.cessAmount ?? 0),
        totalAmountPaise: item.totalAmountPaise !== undefined ? item.totalAmountPaise : (item.totalAmount ?? 0),
      };
    });

    invoiceOperations.push({
      updateOne: {
        filter: { _id: inv._id },
        update: { $set: { items: updatedItems } },
      },
    });
  }

  const BATCH_SIZE = 500;
  let invoicesMigrated = 0;
  for (let i = 0; i < invoiceOperations.length; i += BATCH_SIZE) {
    const batch = invoiceOperations.slice(i, i + BATCH_SIZE);
    await InvoiceModel.bulkWrite(batch);
    invoicesMigrated += batch.length;
    console.log(`  Processed ${invoicesMigrated}/${invoiceOperations.length} invoices...`);
  }

  // STEP 3: Fast Bulk Migration for Credit Notes
  const allCNs = await CreditNoteModel.find({}).lean().exec();
  const cnOperations: any[] = [];

  for (const cn of allCNs) {
    const updatedItems = (cn.items || []).map((item: any) => {
      const isGoods = (item.itemType || 'GOODS') === 'GOODS';
      const rawCode = item.hsnCode || item.sacCode || item.hsnSacCode || '';

      return {
        itemId: item.itemId,
        itemType: item.itemType || 'GOODS',
        name: item.name,
        description: item.description,
        hsnCode: isGoods ? (item.hsnCode || rawCode) : undefined,
        sacCode: !isGoods ? (item.sacCode || rawCode) : undefined,
        quantity: item.quantity,
        freeQuantity: item.freeQuantity || 0,
        unit: item.unit || 'Pcs',
        uqc: item.uqc || (isGoods ? 'PCS' : 'JOB'),
        enteredRatePaise: item.enteredRatePaise !== undefined ? item.enteredRatePaise : (item.rate ?? 0),
        isPriceInclusiveOfGst: item.isPriceInclusiveOfGst ?? false,
        taxableAmountPaise: item.taxableAmountPaise !== undefined ? item.taxableAmountPaise : (item.taxableAmount ?? 0),
        gstRate: item.gstRate ?? 0,
        cgstRate: item.cgstRate ?? 0,
        sgstRate: item.sgstRate ?? 0,
        igstRate: item.igstRate ?? 0,
        taxRateId: item.taxRateId || '',
        taxRateVersion: item.taxRateVersion || '1.0',
        cgstAmountPaise: item.cgstAmountPaise !== undefined ? item.cgstAmountPaise : (item.cgstAmount ?? 0),
        sgstAmountPaise: item.sgstAmountPaise !== undefined ? item.sgstAmountPaise : (item.sgstAmount ?? 0),
        igstAmountPaise: item.igstAmountPaise !== undefined ? item.igstAmountPaise : (item.igstAmount ?? 0),
        totalAmountPaise: item.totalAmountPaise !== undefined ? item.totalAmountPaise : (item.totalAmount ?? 0),
      };
    });

    cnOperations.push({
      updateOne: {
        filter: { _id: cn._id },
        update: { $set: { items: updatedItems } },
      },
    });
  }

  let creditNotesMigrated = 0;
  if (cnOperations.length > 0) {
    for (let i = 0; i < cnOperations.length; i += BATCH_SIZE) {
      const batch = cnOperations.slice(i, i + BATCH_SIZE);
      await CreditNoteModel.bulkWrite(batch);
      creditNotesMigrated += batch.length;
    }
  }

  // STEP 4: Post-Migration Reconciliation Checks
  const invoiceCountAfter = await InvoiceModel.countDocuments({});
  const creditNoteCountAfter = await CreditNoteModel.countDocuments({});

  const invoiceGrandTotalAfter = await InvoiceModel.aggregate([
    { $group: { _id: null, sum: { $sum: '$grandTotal' } } },
  ]);
  const finalInvoiceTotalSum = invoiceGrandTotalAfter[0]?.sum || 0;

  if (invoiceCountBefore !== invoiceCountAfter) {
    throw new Error(`RECONCILIATION FAILURE: Invoice count changed from ${invoiceCountBefore} to ${invoiceCountAfter}`);
  }

  if (creditNoteCountBefore !== creditNoteCountAfter) {
    throw new Error(`RECONCILIATION FAILURE: Credit Note count changed from ${creditNoteCountBefore} to ${creditNoteCountAfter}`);
  }

  if (initialInvoiceTotalSum !== finalInvoiceTotalSum) {
    throw new Error(`RECONCILIATION FAILURE: Invoice grandTotal sum changed from ${initialInvoiceTotalSum} to ${finalInvoiceTotalSum}`);
  }

  console.log('✅ RECONCILIATION PASSED: All document counts and grand total sums match perfectly.');

  // STEP 5: Spot Check Sample Invoices
  const sampleInvoices = await InvoiceModel.find({}).limit(10).lean().exec();
  for (const sample of sampleInvoices) {
    for (const item of (sample.items as any[])) {
      if (item.enteredRatePaise === undefined || isNaN(item.enteredRatePaise)) {
        throw new Error(`SPOT CHECK FAILURE: Invoice ${sample.invoiceNumber} item ${item.name} has invalid enteredRatePaise`);
      }
      if (item.taxableAmountPaise === undefined || isNaN(item.taxableAmountPaise)) {
        throw new Error(`SPOT CHECK FAILURE: Invoice ${sample.invoiceNumber} item ${item.name} has invalid taxableAmountPaise`);
      }
    }
  }

  console.log('✅ SPOT CHECK PASSED: 10 sample invoices verified for v8 field integrity.');

  // STEP 6: Write Audit Trail Log
  const sampleDoc = await InvoiceModel.findOne({}).lean().exec();
  if (sampleDoc?.businessId) {
    await AuditLogModel.create({
      businessId: sampleDoc.businessId,
      action: 'SCHEMA_MIGRATION_V8',
      resource: 'SYSTEM',
      metadata: {
        invoicesMigrated,
        creditNotesMigrated,
        totalInvoices: invoiceCountAfter,
        grandTotalPaiseSum: finalInvoiceTotalSum,
        timestamp: new Date(),
      },
    });
  }

  console.log(`🎉 Migration v8 completed successfully. ${invoicesMigrated} Invoices and ${creditNotesMigrated} Credit Notes updated.`);

  return {
    success: true,
    invoicesMigrated,
    creditNotesMigrated,
  };
}
