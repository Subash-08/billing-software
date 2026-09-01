import fs from 'fs';
import path from 'path';

// Parse .env before importing DB modules
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.substring(0, idx).trim();
      const value = trimmed.substring(idx + 1).trim();
      if (key && !process.env[key]) {
        process.env[key] = value;
      }
    }
  }
}

async function runReconciliation() {
  const { connectToDatabase } = await import('../src/db/connection');
  const { InvoiceModel } = await import('../src/db/models/invoice.model');
  const { PaymentAllocationModel } = await import('../src/db/models/payment-allocation.model');
  const { PaymentReversalModel } = await import('../src/db/models/payment-reversal.model');

  await connectToDatabase();
  console.log('Running authoritative DB Reconciliation & Payment Status Repair...');

  const invoices = await InvoiceModel.find({}).exec();
  let updatedCount = 0;

  for (const inv of invoices) {
    // 1. Upgrade legacy rupees units to paise if needed
    let grandTotalPaise = inv.grandTotal;
    if (inv.grandTotal < 500000 && inv.items && inv.items.length > 0) {
      const firstItemGross = (((inv.items[0] as any).enteredRatePaise || (inv.items[0] as any).rate || 0) / 100) * (inv.items[0].quantity || 1);
      if (firstItemGross > 0 && inv.grandTotal <= firstItemGross * 2) {
        grandTotalPaise = Math.round(inv.grandTotal * 100);
      }
    }

    // 2. Sum all active payment allocations for this invoice
    const allocations = await PaymentAllocationModel.find({ invoiceId: inv._id }).exec();
    let computedPaidPaise = 0;

    for (const alloc of allocations) {
      const reversals = await PaymentReversalModel.find({ allocationId: alloc._id }).exec();
      const reversedSumPaise = reversals.reduce((s, r) => s + r.reversedAmountPaise, 0);
      computedPaidPaise += Math.max(0, alloc.allocatedAmountPaise - reversedSumPaise);
    }

    // 3. Compute exact outstanding and status
    const outstandingPaise = Math.max(0, grandTotalPaise - computedPaidPaise);
    let correctPaymentStatus: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' = 'UNPAID';
    if (computedPaidPaise >= grandTotalPaise) {
      correctPaymentStatus = 'PAID';
    } else if (computedPaidPaise > 0) {
      correctPaymentStatus = 'PARTIALLY_PAID';
    }

    await InvoiceModel.updateOne(
      { _id: inv._id },
      {
        $set: {
          grandTotal: grandTotalPaise,
          paidAmount: computedPaidPaise,
          outstandingBalance: outstandingPaise,
          paymentStatus: correctPaymentStatus,
          subTotal: inv.subTotal < 500000 && grandTotalPaise !== inv.grandTotal ? Math.round(inv.subTotal * 100) : inv.subTotal,
          totalTaxable: inv.totalTaxable < 500000 && grandTotalPaise !== inv.grandTotal ? Math.round(inv.totalTaxable * 100) : inv.totalTaxable,
          totalCgst: inv.totalCgst < 500000 && grandTotalPaise !== inv.grandTotal ? Math.round(inv.totalCgst * 100) : inv.totalCgst,
          totalSgst: inv.totalSgst < 500000 && grandTotalPaise !== inv.grandTotal ? Math.round(inv.totalSgst * 100) : inv.totalSgst,
          totalIgst: inv.totalIgst < 500000 && grandTotalPaise !== inv.grandTotal ? Math.round(inv.totalIgst * 100) : inv.totalIgst,
        },
      }
    ).exec();

    console.log(
      `Reconciled Invoice ${inv.invoiceNumber} (${inv._id}): GrandTotal=₹${(grandTotalPaise / 100).toLocaleString('en-IN')}, Paid=₹${(computedPaidPaise / 100).toLocaleString('en-IN')}, Outstanding=₹${(outstandingPaise / 100).toLocaleString('en-IN')}, Status=${correctPaymentStatus}`
    );
    updatedCount++;
  }

  console.log(`Reconciliation finished! Updated ${updatedCount} invoices.`);
  process.exit(0);
}

runReconciliation().catch((err) => {
  console.error('Reconciliation failed:', err);
  process.exit(1);
});
