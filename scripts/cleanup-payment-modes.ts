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

async function runCleanup() {
  const { connectToDatabase } = await import('../src/db/connection');
  const { PaymentModeModel } = await import('../src/db/models/payment-mode.model');

  await connectToDatabase();
  console.log('Cleaning up duplicate PaymentMode records in MongoDB...');

  const allModes = await PaymentModeModel.find({}).exec();
  const seenCodes = new Set<string>();
  let deletedCount = 0;

  for (const m of allModes) {
    if (seenCodes.has(m.code)) {
      await PaymentModeModel.findByIdAndDelete(m._id).exec();
      deletedCount++;
    } else {
      seenCodes.add(m.code);
    }
  }

  console.log(`Cleanup complete! Removed ${deletedCount} duplicate payment mode entries.`);
  process.exit(0);
}

runCleanup().catch((err) => {
  console.error('Cleanup failed:', err);
  process.exit(1);
});
