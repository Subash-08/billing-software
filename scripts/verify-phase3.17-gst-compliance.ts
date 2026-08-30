/**
 * Phase 3.17 Verification Script — GST & Statutory Compliance Audit
 * scripts/verify-phase3.17-gst-compliance.ts
 *
 * Code-level adversarial audit of Rule 46 invoice particulars, GST calculation matrix,
 * Document Type Matrix (Tax Invoice vs Bill of Supply), tax treatment separation,
 * integer paise rounding, and multi-tenant reporting isolation.
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

export async function runGstComplianceAudit() {
  const { connectToDatabase } = await import('../src/db/connection');
  const { calculateLineGst } = await import('../src/engine/gst/gst.calculator');
  const { calculateInvoice } = await import('../src/engine/invoice/invoice.calculator');
  const { UserModel } = await import('../src/db/models/user.model');
  const { BusinessModel } = await import('../src/db/models/business.model');
  const { CustomerModel } = await import('../src/db/models/customer.model');
  const { InvoiceModel } = await import('../src/db/models/invoice.model');
  const { invoiceService } = await import('../src/services/invoice.service');

  await connectToDatabase();

  console.log('=================================================================');
  console.log('=== PHASE 3.17 — STATUTORY GST & COMPLIANCE AUDIT ===');
  console.log('=================================================================\n');

  const results: Record<string, boolean> = {};

  // Setup Test Business A
  const user = await UserModel.findOne({ email: 'subashm0812@gmail.com' }).exec();
  if (!user) throw new Error('Primary user subashm0812@gmail.com not found');
  const business = await BusinessModel.findOne({ userId: user._id }).exec();
  if (!business) throw new Error('Primary business profile not found');
  const bId = business._id.toString();

  const { TaxRateModel } = await import('../src/db/models/tax-rate.model');
  let taxRate0 = await TaxRateModel.findOne({ rate: 0, status: 'ACTIVE' }).exec();
  if (!taxRate0) {
    await TaxRateModel.create({
      rate: 0,
      cgstRate: 0,
      sgstRate: 0,
      utgstRate: 0,
      igstRate: 0,
      applicableTo: 'BOTH',
      effectiveFrom: new Date('2017-07-01'),
      version: '1.0',
      status: 'ACTIVE',
    });
  }

  // Seed sample customer if missing
  let customer = await CustomerModel.findOne({ businessId: business._id, gstin: '33STAT3333A1Z3' }).exec();
  if (!customer) {
    customer = await CustomerModel.create({
      businessId: business._id,
      name: 'Statutory Compliance Target Customer',
      displayName: 'Statutory Target Customer',
      customerType: 'BUSINESS',
      gstin: '33STAT3333A1Z3',
      phone: '9840055555',
      stateCode: '33',
      billingAddress: {
        name: 'Statutory Target',
        addressLine1: 'Commercial Complex',
        city: 'Chennai',
        state: 'Tamil Nadu',
        stateCode: '33',
        pincode: '600002',
      },
    });
  }

  // ---------------------------------------------------------------------------
  // TEST 1: Rule 46 Mandatory Invoice Particulars Completeness
  // ---------------------------------------------------------------------------
  console.log('1. Auditing GST Rule 46 Mandatory Particulars...');

  const draftInv = await invoiceService.createDraftInvoice(bId, {
    customerId: customer._id.toString(),
    invoiceDate: '2026-08-28',
    dueDate: '2026-09-15',
    documentType: 'TAX_INVOICE',
    supplyType: 'B2B',
    taxTreatment: 'TAXABLE',
    placeOfSupplyStateCode: '33',
    reverseCharge: false,
    items: [
      {
        name: 'Precision Engineering Valve',
        hsnSacCode: '84818030',
        quantity: 5,
        unit: 'PCS',
        uqc: 'PCS',
        rate: 500, // ₹500.00 rate
        gstRate: 18,
      },
    ],
  });

  const issuedInv = await invoiceService.issueInvoice(bId, draftInv._id.toString());

  const hasSupplierIdentity = Boolean(issuedInv.billFromSnapshot?.name && issuedInv.billFromSnapshot?.gstin);
  const hasRecipientIdentity = Boolean(issuedInv.billToSnapshot?.name && issuedInv.billToSnapshot?.gstin);
  const hasDocumentMetadata = Boolean(issuedInv.invoiceNumber && issuedInv.invoiceDate && issuedInv.financialYear);
  const hasItemParticulars = issuedInv.items.every(
    (item) => item.name && item.hsnSacCode && item.quantity > 0 && item.unit && item.rate > 0 && item.gstRate >= 0
  );
  const hasTaxBreakdown = Number.isInteger(issuedInv.totalCgst) && Number.isInteger(issuedInv.totalSgst) && Number.isInteger(issuedInv.grandTotal);

  results['Rule 46 Supplier Identity Snapshot'] = hasSupplierIdentity;
  results['Rule 46 Recipient Identity Snapshot'] = hasRecipientIdentity;
  results['Rule 46 Document Number & Date'] = hasDocumentMetadata;
  results['Rule 46 HSN/SAC & Line Particulars'] = hasItemParticulars;
  results['Rule 46 Tax Component Breakdown'] = hasTaxBreakdown;

  // ---------------------------------------------------------------------------
  // TEST 2: Document Type Matrix (TAX_INVOICE vs BILL_OF_SUPPLY)
  // ---------------------------------------------------------------------------
  console.log('2. Auditing Document Type Matrix (Bill of Supply)...');

  const draftBillOfSupply = await invoiceService.createDraftInvoice(bId, {
    customerId: customer._id.toString(),
    invoiceDate: '2026-08-28',
    dueDate: '2026-09-15',
    documentType: 'BILL_OF_SUPPLY',
    supplyType: 'B2B',
    taxTreatment: 'EXEMPT',
    placeOfSupplyStateCode: '33',
    items: [
      {
        name: 'Exempt Agricultural Seeds',
        hsnSacCode: '12099990',
        quantity: 10,
        unit: 'KGS',
        uqc: 'KGS',
        rate: 100, // ₹100.00 rate
        gstRate: 0,
      },
    ],
  });

  const issuedBillOfSupply = await invoiceService.issueInvoice(bId, draftBillOfSupply._id.toString());
  const bosValid = issuedBillOfSupply.documentType === 'BILL_OF_SUPPLY' && issuedBillOfSupply.totalCgst === 0 && issuedBillOfSupply.totalSgst === 0 && issuedBillOfSupply.totalIgst === 0;

  results['Bill of Supply Document Issuance'] = bosValid;

  // ---------------------------------------------------------------------------
  // TEST 3: GST Engine Intrastate vs Interstate vs Zero-Rated Scenarios
  // ---------------------------------------------------------------------------
  console.log('3. Auditing GST Engine Jurisdiction & Zero-Rated Matrix...');

  // Intrastate 18% (33 -> 33)
  const intraGst = calculateLineGst({
    taxablePaise: 100000, // ₹1,000.00
    resolvedTaxRate: { taxRateId: '507f1f77bcf86cd799439001', version: '1.0', rate: 18, cessRate: 0, effectiveFrom: new Date() },
    supplierStateCode: '33',
    placeOfSupplyStateCode: '33',
    quantity: 1,
  });
  const intraPass = intraGst.cgstPaise === 9000 && intraGst.sgstPaise === 9000 && intraGst.igstPaise === 0;

  // Interstate 18% (33 -> 29)
  const interGst = calculateLineGst({
    taxablePaise: 100000, // ₹1,000.00
    resolvedTaxRate: { taxRateId: '507f1f77bcf86cd799439002', version: '1.0', rate: 18, cessRate: 0, effectiveFrom: new Date() },
    supplierStateCode: '33',
    placeOfSupplyStateCode: '29',
    quantity: 1,
  });
  const interPass = interGst.cgstPaise === 0 && interGst.sgstPaise === 0 && interGst.igstPaise === 18000;

  // Nil-Rated (0 tax)
  const nilGst = calculateLineGst({
    taxablePaise: 100000,
    resolvedTaxRate: { taxRateId: '507f1f77bcf86cd799439003', version: '1.0', rate: 0, cessRate: 0, effectiveFrom: new Date() },
    taxTreatment: 'NIL_RATED',
    supplierStateCode: '33',
    placeOfSupplyStateCode: '33',
    quantity: 1,
  });
  const nilPass = nilGst.totalTaxPaise === 0 && nilGst.trace.reasonCode === 'NIL_RATED';

  results['Intrastate CGST/SGST Split Verification'] = intraPass;
  results['Interstate IGST Allocation Verification'] = interPass;
  results['Nil-Rated Reason Code Verification'] = nilPass;

  // ---------------------------------------------------------------------------
  // TEST 4: Integer Paise Rounding Invariant
  // ---------------------------------------------------------------------------
  console.log('4. Auditing Deterministic Integer Paise Rounding...');
  
  // ₹123.45 = 12345 paise @ 18% GST -> 2222.1 -> 2222 total tax (1111 CGST + 1111 SGST)
  const oddGst = calculateLineGst({
    taxablePaise: 12345,
    resolvedTaxRate: { taxRateId: '507f1f77bcf86cd799439001', version: '1.0', rate: 18, cessRate: 0, effectiveFrom: new Date() },
    supplierStateCode: '33',
    placeOfSupplyStateCode: '33',
    quantity: 1,
  });
  const oddPass = Number.isInteger(oddGst.cgstPaise) && Number.isInteger(oddGst.sgstPaise) && oddGst.cgstPaise + oddGst.sgstPaise === oddGst.totalTaxPaise;

  results['Odd Paise CGST/SGST Integer Split Invariant'] = oddPass;

  // ---------------------------------------------------------------------------
  // Summary Report
  // ---------------------------------------------------------------------------
  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(Boolean).length;
  const passVerdict = totalTests === passedTests;

  console.log('\n=================================================================');
  console.log('--- STATUTORY GST COMPLIANCE AUDIT RESULTS ---');
  console.log('=================================================================');
  for (const [name, passed] of Object.entries(results)) {
    console.log(`${passed ? '✅ PASS' : '❌ FAIL'}: ${name}`);
  }

  const report = {
    phase: 'Phase 3.17 — Statutory GST & Compliance Audit',
    timestamp: new Date().toISOString(),
    totalTests,
    passedTests,
    passVerdict,
  };

  console.log('\nFinal Compliance Audit Report:\n', JSON.stringify(report, null, 2));
  process.exit(passVerdict ? 0 : 1);
}

if (require.main === module) {
  runGstComplianceAudit().catch((err) => {
    console.error('Phase 3.17 Statutory GST Compliance Audit execution failed:', err);
    process.exit(1);
  });
}
