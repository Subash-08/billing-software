import fs from 'fs';
import path from 'path';

// Parse .env manually BEFORE dynamic import
const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      if (key) {
        process.env[key] = val;
      }
    }
  }
}

console.log('MONGODB_URI loaded:', process.env.MONGODB_URI ? 'YES (Atlas)' : 'NO');

async function main() {
  console.log('Starting v8 database migration...');
  // Dynamic import AFTER process.env is set
  const { migrateInvoiceSnapshotV8 } = await import('./migrate-invoice-snapshot-v8');
  const result = await migrateInvoiceSnapshotV8();
  console.log('Migration Result:', JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error('Migration execution failed:', err);
  process.exit(1);
});
