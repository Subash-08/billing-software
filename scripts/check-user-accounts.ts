import fs from 'fs';
import path from 'path';

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

async function check() {
  const { connectToDatabase } = await import('../src/db/connection');
  const { UserModel } = await import('../src/db/models/user.model');
  const { BusinessModel } = await import('../src/db/models/business.model');
  const { CustomerModel } = await import('../src/db/models/customer.model');
  const { InvoiceModel } = await import('../src/db/models/invoice.model');
  const { PaymentModel } = await import('../src/db/models/payment.model');

  await connectToDatabase();
  const users = await UserModel.find().exec();
  console.log(`Total Users in DB: ${users.length}`);
  for (const u of users) {
    const biz = await BusinessModel.findOne({ userId: u._id }).exec();
    const custCount = biz ? await CustomerModel.countDocuments({ businessId: biz._id }) : 0;
    const invCount = biz ? await InvoiceModel.countDocuments({ businessId: biz._id }) : 0;
    const payCount = biz ? await PaymentModel.countDocuments({ businessId: biz._id }) : 0;
    console.log({
      userId: u._id.toString(),
      email: u.email,
      businessId: biz?._id.toString() || 'NO_BUSINESS',
      legalName: biz?.legalName || 'N/A',
      customers: custCount,
      invoices: invCount,
      payments: payCount,
    });
  }
  process.exit(0);
}

check();
