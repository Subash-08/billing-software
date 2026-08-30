import { connectToDatabase } from './connection';
import {
  UserModel,
  BusinessModel,
  CustomerModel,
  ProductModel,
  ServiceModel,
  UnitModel,
  TaxRateModel,
  PaymentModeModel,
} from './models';
import { logger } from '@/lib/logger';

export async function seedDatabase() {
  if (process.env.NODE_ENV === 'production' || process.env.MONGODB_URI?.includes('prod')) {
    throw new Error('SAFETY VIOLATION: Database seed script cannot be executed in production environment or against a production database URI!');
  }

  if (process.env.ALLOW_DB_SEED === 'false') {
    throw new Error('SAFETY VIOLATION: Database seed script explicitly disabled by ALLOW_DB_SEED=false!');
  }

  logger.info('Starting development database seed...');
  await connectToDatabase();

  // 1. Seed Global Master Units
  const unitsCount = await UnitModel.countDocuments();
  if (unitsCount === 0) {
    await UnitModel.insertMany([
      { name: 'Pieces', symbol: 'Pcs', uqc: 'PCS', description: 'PIECES' },
      { name: 'Boxes', symbol: 'Box', uqc: 'BOX', description: 'BOXES' },
      { name: 'Kilograms', symbol: 'Kg', uqc: 'KGS', description: 'KILOGRAMS' },
      { name: 'Numbers', symbol: 'Nos', uqc: 'NOS', description: 'NUMBERS' },
      { name: 'Others', symbol: 'Oth', uqc: 'OTH', description: 'OTHERS' },
    ]);
    logger.info('Seeded Unit master data.');
  }

  // 2. Seed Global Tax Rates
  const ratesCount = await TaxRateModel.countDocuments();
  if (ratesCount === 0) {
    await TaxRateModel.insertMany([
      { rate: 18, cgstRate: 9, sgstRate: 9, utgstRate: 0, igstRate: 18, applicableTo: 'BOTH', effectiveFrom: new Date('2017-07-01'), version: '1.0', status: 'ACTIVE' },
      { rate: 12, cgstRate: 6, sgstRate: 6, utgstRate: 0, igstRate: 12, applicableTo: 'BOTH', effectiveFrom: new Date('2017-07-01'), version: '1.0', status: 'ACTIVE' },
      { rate: 5, cgstRate: 2.5, sgstRate: 2.5, utgstRate: 0, igstRate: 5, applicableTo: 'BOTH', effectiveFrom: new Date('2017-07-01'), version: '1.0', status: 'ACTIVE' },
      { rate: 28, cgstRate: 14, sgstRate: 14, utgstRate: 0, igstRate: 28, applicableTo: 'BOTH', effectiveFrom: new Date('2017-07-01'), version: '1.0', status: 'ACTIVE' },
      { rate: 40, cgstRate: 20, sgstRate: 20, utgstRate: 0, igstRate: 40, applicableTo: 'BOTH', effectiveFrom: new Date('2025-09-01'), sourceNotification: 'IRIS IRP 2025', version: '2.0', status: 'ACTIVE' },
      { rate: 0, cgstRate: 0, sgstRate: 0, utgstRate: 0, igstRate: 0, applicableTo: 'BOTH', effectiveFrom: new Date('2017-07-01'), version: '1.0', status: 'ACTIVE' },
    ]);
    logger.info('Seeded TaxRate master data.');
  }

  // 3. Seed Payment Modes
  const modesCount = await PaymentModeModel.countDocuments();
  if (modesCount === 0) {
    await PaymentModeModel.insertMany([
      { code: 'CASH', name: 'Cash', category: 'CASH', status: 'ACTIVE' },
      { code: 'UPI', name: 'UPI (GPay / PhonePe / Paytm)', category: 'UPI', status: 'ACTIVE' },
      { code: 'BANK_TRANSFER', name: 'Bank Transfer (NEFT / RTGS / IMPS)', category: 'BANK_TRANSFER', status: 'ACTIVE' },
      { code: 'CHEQUE', name: 'Cheque', category: 'CHEQUE', status: 'ACTIVE' },
      { code: 'CARD', name: 'Credit / Debit Card', category: 'CARD', status: 'ACTIVE' },
    ]);
    logger.info('Seeded PaymentMode master data.');
  }

  // 4. Seed Development User & Business
  let devUser = await UserModel.findOne({ email: 'subash@niramaalai.com' });
  if (!devUser) {
    devUser = await UserModel.create({
      email: 'subash@niramaalai.com',
      passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$dev_hashed_pass',
      isEmailVerified: true,
    });
  }

  let devBusiness = await BusinessModel.findOne({ userId: devUser._id });
  if (!devBusiness) {
    devBusiness = await BusinessModel.create({
      userId: devUser._id,
      legalName: 'NIRAMAALAI SERVICES PRIVATE LIMITED',
      tradeName: 'NIRAMAALAI Billing & Payments',
      phone: '9876543210',
      email: 'support@niramaalai.com',
      gstRegistrationType: 'REGULAR',
      gstin: '33AAAAA0000A1Z5',
      gstinStatus: 'VALID',
      stateCode: '33',
      address: '123 GST Road, Guindy, Chennai - 600032',
      city: 'Chennai',
      state: 'Tamil Nadu',
      pincode: '600032',
      bankDetails: {
        bankName: 'HDFC Bank',
        accountNumber: '50100234567890',
        ifscCode: 'HDFC0001234',
        branch: 'Guindy Branch, Chennai',
        upiId: 'niramaalai@hdfcbank',
      },
    });
    logger.info('Seeded Development Business profile.');
  }

  // 5. Seed Customers for Business
  const custCount = await CustomerModel.countDocuments({ businessId: devBusiness._id });
  if (custCount === 0) {
    await CustomerModel.insertMany([
      {
        businessId: devBusiness._id,
        displayName: 'ABC Technologies Pvt Ltd',
        companyName: 'ABC Technologies Private Limited',
        phone: '9840012345',
        email: 'billing@abctech.in',
        gstTreatment: 'REGULAR',
        gstin: '33AAACB1234C1Z1',
        billingAddress: {
          addressLine: '123 Anna Salai, Guindy Industrial Estate',
          city: 'Chennai',
          state: 'Tamil Nadu',
          stateCode: '33',
          pincode: '600032',
        },
        creditBalance: 0,
        status: 'ACTIVE',
      },
      {
        businessId: devBusiness._id,
        displayName: 'Sri Lakshmi Traders',
        companyName: 'Sri Lakshmi Enterprises',
        phone: '9876543210',
        email: 'lakshmitraders@gmail.com',
        gstTreatment: 'REGULAR',
        gstin: '29AAACL5678D1Z2',
        billingAddress: {
          addressLine: '45 MG Road',
          city: 'Bengaluru',
          state: 'Karnataka',
          stateCode: '29',
          pincode: '560001',
        },
        creditBalance: 0,
        status: 'ACTIVE',
      },
    ]);
    logger.info('Seeded Development Customers.');
  }

  // 6. Seed Products & Services
  const prodCount = await ProductModel.countDocuments({ businessId: devBusiness._id });
  if (prodCount === 0) {
    await ProductModel.create({
      businessId: devBusiness._id,
      type: 'PRODUCT',
      name: 'Thermal Receipt Printer 80mm',
      code: 'PRN-80M',
      hsnSacCode: '84433210',
      unit: 'Pcs',
      uqc: 'PCS',
      sellingPrice: 4500,
      gstRate: 18,
      cessRate: 0,
      category: 'Hardware',
      status: 'ACTIVE',
    });
  }

  const servCount = await ServiceModel.countDocuments({ businessId: devBusiness._id });
  if (servCount === 0) {
    await ServiceModel.create({
      businessId: devBusiness._id,
      name: 'SaaS Billing Software Implementation & Setup',
      code: 'SRV-IMPL',
      sacCode: '998313',
      billingUnit: 'Job',
      rate: 15000,
      gstRate: 18,
      cessRate: 0,
      category: 'Software Consulting',
      status: 'ACTIVE',
    });
  }

  logger.info('Database seed completed successfully!');
}

// Allow CLI invocation if executed directly
if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
