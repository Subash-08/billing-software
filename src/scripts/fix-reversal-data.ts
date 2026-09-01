import mongoose from 'mongoose';

const MONGODB_URI = 'mongodb+srv://nkmoderntechnology24_db_user:NQ7hAKz6UcRqCRCZ@creative-pluz.lcbcjej.mongodb.net/?appName=billing_software';

async function runDataCorrection() {
  console.log('Connecting to MongoDB Atlas to execute data correction script...');
  await mongoose.connect(MONGODB_URI);

  const db = mongoose.connection.db;
  if (!db) {
    console.error('Failed to establish MongoDB database handle.');
    process.exit(1);
  }

  // 1. Delete erroneous paymentreversals record
  const deleteResult = await db.collection('paymentreversals').deleteMany({
    $or: [
      { _id: new mongoose.Types.ObjectId('6a9508a1cd1ec3d4a0450a77') },
      { reversedAmountPaise: 4500000 }
    ]
  });
  console.log(`[1] Removed ${deleteResult.deletedCount} erroneous paymentreversal records.`);

  // 2. Reset paymentallocations reversedAmountPaise to 0 for allocation 6a94f49e9f4aa8bd41f1da44
  const allocResult = await db.collection('paymentallocations').updateMany(
    { _id: new mongoose.Types.ObjectId('6a94f49e9f4aa8bd41f1da44') },
    { $set: { reversedAmountPaise: 0 } }
  );
  console.log(`[2] Reset ${allocResult.modifiedCount} paymentallocation reversedAmountPaise to 0.`);

  // 3. Reset payment status to COMPLETED for payment 6a94f49e9f4aa8bd41f1da42
  const paymentResult = await db.collection('payments').updateMany(
    { _id: new mongoose.Types.ObjectId('6a94f49e9f4aa8bd41f1da42') },
    { $set: { status: 'COMPLETED' } }
  );
  console.log(`[3] Updated ${paymentResult.modifiedCount} payment status to COMPLETED.`);

  // 4. Restore invoice INV-202627-0001 state: paidAmount = ₹50,000, outstandingBalance = ₹0, returnedAmount = ₹1,29,800
  const invoiceResult = await db.collection('invoices').updateMany(
    { invoiceNumber: 'INV-202627-0001' },
    {
      $set: {
        paidAmount: 5000000,
        returnedAmount: 12980000,
        outstandingBalance: 0,
        paymentStatus: 'PAID',
      }
    }
  );
  console.log(`[4] Restored ${invoiceResult.modifiedCount} invoice INV-202627-0001 state (Paid ₹50,000, Due ₹0, Returned ₹1,29,800).`);

  await mongoose.disconnect();
  console.log('✅ Data correction script execution complete!');
  process.exit(0);
}

runDataCorrection().catch(console.error);
