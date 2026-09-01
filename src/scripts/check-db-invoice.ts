import mongoose from 'mongoose';

const MONGODB_URI = 'mongodb+srv://nkmoderntechnology24_db_user:NQ7hAKz6UcRqCRCZ@creative-pluz.lcbcjej.mongodb.net/?appName=billing_software';

async function check() {
  await mongoose.connect(MONGODB_URI);

  const db = mongoose.connection.db;
  if (!db) {
    console.error('No DB connection');
    process.exit(1);
  }

  const invoices = await db.collection('invoices').find({ invoiceNumber: 'INV-202627-0001' }).toArray();
  console.log('=== INVOICE DETAILS ===');
  for (const inv of invoices) {
    console.log({
      _id: inv._id,
      invoiceNumber: inv.invoiceNumber,
      grandTotalPaise: inv.grandTotalPaise,
      paidAmountPaise: inv.paidAmountPaise,
      outstandingBalancePaise: inv.outstandingBalancePaise,
      returnedAmountPaise: inv.returnedAmountPaise,
      paymentStatus: inv.paymentStatus,
      updatedAt: inv.updatedAt
    });
  }

  const payments = await db.collection('payments').find({}).toArray();
  console.log('=== ALL PAYMENTS IN DB ===');
  for (const p of payments) {
    console.log({
      _id: p._id,
      receiptNumber: p.receiptNumber,
      amountPaise: p.amountPaise,
      allocations: p.allocations,
      createdAt: p.createdAt
    });
  }

  process.exit(0);
}

check().catch(console.error);
