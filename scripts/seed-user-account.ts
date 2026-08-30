/**
 * Seed User Account Script
 * scripts/seed-user-account.ts
 *
 * Populates realistic sample master data (Customers, Products, Tax Rates, Issued Invoices, Payments, Receipts)
 * into the specified user business account (e.g., subashm0812@gmail.com).
 */

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

async function seedUserAccount() {
  const { connectToDatabase } = await import('../src/db/connection');
  const { UserModel } = await import('../src/db/models/user.model');
  const { BusinessModel } = await import('../src/db/models/business.model');
  const { TaxRateModel } = await import('../src/db/models/tax-rate.model');
  const { PaymentModeModel } = await import('../src/db/models/payment-mode.model');
  const { customerService } = await import('../src/services/customer.service');
  const { productService } = await import('../src/services/product.service');
  const { invoiceService } = await import('../src/services/invoice.service');
  const { paymentService } = await import('../src/services/payment.service');

  await connectToDatabase();

  const targetEmail = process.argv[2] || 'subashm0812@gmail.com';
  const user = await UserModel.findOne({ email: targetEmail }).exec();
  if (!user) {
    console.error(`User with email ${targetEmail} not found!`);
    process.exit(1);
  }

  const userIdStr = user._id.toString();
  const business = await BusinessModel.findOne({ userId: user._id }).exec();
  if (!business) {
    console.error(`No business profile found for user ${targetEmail}!`);
    process.exit(1);
  }
  const bId = business._id.toString();

  console.log(`Seeding sample data into Business: ${business.legalName} (${bId}) for User: ${targetEmail}...`);

  // 1. Ensure Tax Rates
  await TaxRateModel.deleteMany({ rate: { $in: [5, 12, 18, 28] } }).exec();
  const rates = [
    { rate: 5, cgstRate: 2.5, sgstRate: 2.5, utgstRate: 0, igstRate: 5 },
    { rate: 12, cgstRate: 6, sgstRate: 6, utgstRate: 0, igstRate: 12 },
    { rate: 18, cgstRate: 9, sgstRate: 9, utgstRate: 0, igstRate: 18 },
    { rate: 28, cgstRate: 14, sgstRate: 14, utgstRate: 0, igstRate: 28 },
  ];
  for (const r of rates) {
    await TaxRateModel.create({
      ...r,
      cessRate: 0,
      applicableTo: 'BOTH',
      effectiveFrom: new Date('2026-01-01'),
      version: '1.0',
      status: 'ACTIVE',
    });
  }

  // 2. Ensure Payment Mode
  let mode = await PaymentModeModel.findOne({ code: 'CASH_SEED' }).exec();
  if (!mode) {
    mode = await PaymentModeModel.create({
      code: 'CASH_SEED',
      name: 'Cash / UPI Bank',
      category: 'UPI',
      status: 'ACTIVE',
    });
  }
  const mId = mode._id.toString();

  // 3. Create Sample Customers
  const cust1 = await customerService.createCustomer(userIdStr, {
    displayName: 'Apex Technologies Pvt Ltd',
    customerType: 'BUSINESS',
    phone: '9840012345',
    email: 'accounts@apextech.com',
    gstTreatment: 'REGISTERED',
    gstin: '33AAACA1234A1Z1',
    stateCode: '33',
    shippingAddresses: [],
    contacts: [],
    billingAddress: {
      addressLine1: '42 Anna Salai, Guindy',
      city: 'Chennai',
      state: 'Tamil Nadu',
      stateCode: '33',
      pincode: '600032',
      label: 'Billing',
      country: 'India',
      isDefaultShipping: true,
    },
  });

  const cust2 = await customerService.createCustomer(userIdStr, {
    displayName: 'Karnataka Traders Ltd',
    customerType: 'BUSINESS',
    phone: '9880054321',
    email: 'billing@kartraders.com',
    gstTreatment: 'REGISTERED',
    gstin: '29BBBCB5678B1Z2',
    stateCode: '29',
    shippingAddresses: [],
    contacts: [],
    billingAddress: {
      addressLine1: '100 MG Road',
      city: 'Bengaluru',
      state: 'Karnataka',
      stateCode: '29',
      pincode: '560001',
      label: 'Billing',
      country: 'India',
      isDefaultShipping: true,
    },
  });

  // 4. Create Sample Products
  const prod1 = await productService.createProduct(userIdStr, {
    code: `PRD-001-${Date.now()}`,
    name: 'Cloud Software License Subscription',
    hsnCode: '998313',
    unit: 'NOS',
    uqc: 'OTH',
    sellingPrice: 15000, // ₹15,000
    defaultGstRate: 18,
    taxTreatment: 'TAXABLE',
    description: 'Annual Enterprise SaaS License',
  });

  const prod2 = await productService.createProduct(userIdStr, {
    code: `PRD-002-${Date.now()}`,
    name: 'Hardware POS Terminal',
    hsnCode: '84713010',
    unit: 'PCS',
    uqc: 'PCS',
    sellingPrice: 25000, // ₹25,000
    defaultGstRate: 18,
    taxTreatment: 'TAXABLE',
    description: 'Touchscreen Thermal Printer Combo',
  });

  // 5. Create & Issue Invoice 1 (Intrastate TN -> TN)
  const draft1 = await invoiceService.createDraftInvoice(bId, {
    customerId: cust1._id.toString(),
    invoiceDate: '2026-08-15',
    dueDate: '2026-09-15',
    supplyType: 'B2B',
    placeOfSupplyStateCode: '33',
    items: [
      {
        itemId: prod1._id.toString(),
        quantity: 2,
        rate: 15000, // ₹15,000
        hsnSacCode: '998313',
        gstRate: 18,
        name: prod1.name,
        unit: 'NOS',
        uqc: 'OTH',
      },
    ],
  });
  const inv1 = await invoiceService.issueInvoice(bId, draft1._id.toString(), userIdStr);
  console.log(`Created & Issued Intrastate Invoice: ${inv1.invoiceNumber} (Grand Total: ₹${inv1.grandTotal / 100})`);

  // Record Partial Payment for Invoice 1
  const pay1 = await paymentService.recordPayment(bId, userIdStr, {
    customerId: cust1._id.toString(),
    paymentDate: '2026-08-20',
    amountPaise: 15000, // ₹150 partial payment
    paymentModeId: mId,
    idempotencyKey: `KEY-SEED-PAY1-${Date.now()}`,
    requestHash: 'HASH-SEED-PAY1',
    allocations: [{ invoiceId: inv1._id.toString(), allocationAmountPaise: 15000 }],
  });
  console.log(`Recorded Partial Payment: ${pay1.receiptNumber} (Amount: ₹150)`);

  // 6. Create & Issue Invoice 2 (Interstate TN -> KA)
  const draft2 = await invoiceService.createDraftInvoice(bId, {
    customerId: cust2._id.toString(),
    invoiceDate: '2026-08-22',
    dueDate: '2026-09-22',
    supplyType: 'B2B',
    placeOfSupplyStateCode: '29',
    items: [
      {
        itemId: prod2._id.toString(),
        quantity: 1,
        rate: 25000, // ₹25,000
        hsnSacCode: '84713010',
        gstRate: 18,
        name: prod2.name,
        unit: 'PCS',
        uqc: 'PCS',
      },
    ],
  });
  const inv2 = await invoiceService.issueInvoice(bId, draft2._id.toString(), userIdStr);
  console.log(`Created & Issued Interstate Invoice: ${inv2.invoiceNumber} (Grand Total: ₹${inv2.grandTotal / 100})`);

  console.log(`\n✅ Sample data successfully seeded for user ${targetEmail}!`);
  process.exit(0);
}

seedUserAccount().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
