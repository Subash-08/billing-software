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

async function runReset() {
  const { connectToDatabase } = await import('../src/db/connection');
  const { PaymentModeModel } = await import('../src/db/models/payment-mode.model');

  await connectToDatabase();
  console.log('Purging test/duplicate payment modes from MongoDB Atlas...');

  // Delete all test / backup payment modes
  await PaymentModeModel.deleteMany({}).exec();

  // Re-seed strictly the 5 clean standard payment modes
  await PaymentModeModel.insertMany([
    { code: 'CASH', name: 'Cash', category: 'CASH', status: 'ACTIVE' },
    { code: 'UPI', name: 'UPI / GPay / PhonePe', category: 'UPI', status: 'ACTIVE' },
    { code: 'BANK_TRANSFER', name: 'Bank Transfer (NEFT/RTGS/IMPS)', category: 'BANK_TRANSFER', status: 'ACTIVE' },
    { code: 'CHEQUE', name: 'Cheque', category: 'CHEQUE', status: 'ACTIVE' },
    { code: 'CARD', name: 'Credit / Debit Card', category: 'CARD', status: 'ACTIVE' },
  ]);

  console.log('Successfully reset PaymentMode master table to 5 clean options!');
  process.exit(0);
}

runReset().catch((err) => {
  console.error('Reset failed:', err);
  process.exit(1);
});
