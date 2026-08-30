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

async function runMigration() {
  const { connectToDatabase } = await import('../src/db/connection');
  const { InvoiceModel } = await import('../src/db/models/invoice.model');

  await connectToDatabase();
  console.log('Migrating legacy MongoDB invoices from rupees to paise...');

  const invoices = await InvoiceModel.find({}).exec();
  let count = 0;

  for (const inv of invoices) {
    // If grandTotal < 500,000 and items indicate rupees:
    if (inv.grandTotal < 500000 && inv.items && inv.items.length > 0) {
      const firstItemGross = (inv.items[0].rate || 0) * (inv.items[0].quantity || 1);
      if (firstItemGross > 0 && inv.grandTotal <= firstItemGross * 2) {
        const grandTotalPaise = Math.round(inv.grandTotal * 100);
        const paidAmountPaise = Math.round((inv.paidAmount || 0) * 100);
        const outstandingPaise = grandTotalPaise - paidAmountPaise;

        await InvoiceModel.updateOne(
          { _id: inv._id },
          {
            $set: {
              grandTotal: grandTotalPaise,
              outstandingBalance: outstandingPaise,
              paidAmount: paidAmountPaise,
              subTotal: Math.round((inv.subTotal || 0) * 100),
              totalDiscount: Math.round((inv.totalDiscount || 0) * 100),
              totalTaxable: Math.round((inv.totalTaxable || 0) * 100),
              totalCgst: Math.round((inv.totalCgst || 0) * 100),
              totalSgst: Math.round((inv.totalSgst || 0) * 100),
              totalIgst: Math.round((inv.totalIgst || 0) * 100),
            },
          }
        ).exec();

        console.log(`Migrated Invoice ${inv.invoiceNumber} (${inv._id}): grandTotal ${inv.grandTotal} -> ${grandTotalPaise} paise`);
        count++;
      }
    }
  }

  console.log(`Migration completed cleanly. Updated ${count} legacy invoices.`);
  process.exit(0);
}

runMigration().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
