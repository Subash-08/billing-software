import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { invoiceService, ImmutableInvoiceError, IllegalStateTransitionError, InvoiceAlreadyIssuedError } from './invoice.service';
import { connectToDatabase } from '@/db/connection';
import { BusinessModel } from '@/db/models/business.model';
import { CustomerModel } from '@/db/models/customer.model';
import { ProductModel } from '@/db/models/product.model';
import { TaxRateModel } from '@/db/models/tax-rate.model';
import { InvoiceModel } from '@/db/models/invoice.model';
import { DocumentSequenceModel } from '@/db/models/document-sequence.model';
import { AuditLogModel } from '@/db/models/audit-log.model';

describe('Phase 12 — Invoice Service & Lifecycle Test Suite', () => {
  let isConnected = false;
  let testBusinessId: string;
  let testCustomerId: string;
  let testProductId: string;
  let testTaxRateId: string;

  beforeAll(async () => {
    try {
      if (process.env.MONGODB_URI) {
        await connectToDatabase();
        isConnected = true;

        // Seed Business
        const biz = await BusinessModel.create({
          legalName: 'Test GST Enterprises Pvt Ltd',
          gstin: '33AAAAA0000A1Z5',
          email: 'test@enterprise.com',
          phone: '9876543210',
          stateCode: '33',
          currency: 'INR',
          address: '123 GST Road',
          city: 'Chennai',
          state: 'Tamil Nadu',
          pincode: '600001',
          gstRegistrationType: 'REGULAR',
          gstinStatus: 'VALID',
        });
        testBusinessId = (biz._id as any).toString();

        // Seed Customer
        const cust = await CustomerModel.create({
          businessId: biz._id,
          name: 'Apex Retailers Ltd',
          gstin: '29BBBBB1111B1Z2', // KA (Inter-State)
          customerType: 'B2B',
          gstType: 'REGULAR',
          placeOfSupply: '29',
          addresses: [
            {
              name: 'Apex Retailers',
              gstin: '29BBBBB1111B1Z2',
              addressLine: '45 MG Road',
              city: 'Bengaluru',
              state: 'Karnataka',
              stateCode: '29',
              pincode: '560001',
              isDefault: true,
            },
          ],
        });
        testCustomerId = (cust._id as any).toString();

        // Seed TaxRate Master
        const tr = await TaxRateModel.create({
          rate: 18,
          cgstRate: 9,
          sgstRate: 9,
          utgstRate: 0,
          igstRate: 18,
          cessRate: 0,
          effectiveFrom: new Date('2024-01-01'),
          version: '1.0',
          status: 'ACTIVE',
        });
        testTaxRateId = (tr._id as any).toString();

        // Seed Product
        const prd = await ProductModel.create({
          businessId: biz._id,
          name: 'Precision Steel Bolt',
          sku: 'BOLT-STEEL-M8',
          hsnCode: '73181500',
          unit: 'PCS',
          uqc: 'PCS',
          sellingPrice: 100, // ₹100.00
          purchasePrice: 60,
          defaultGstRate: 18,
          taxRateId: tr._id,
          status: 'ACTIVE',
        });
        testProductId = (prd._id as any).toString();
      }
    } catch (e) {
      console.warn('MongoDB unavailable for InvoiceService tests.', e);
    }
  });

  afterAll(async () => {
    if (isConnected && testBusinessId) {
      await InvoiceModel.deleteMany({ businessId: testBusinessId });
      await DocumentSequenceModel.deleteMany({ businessId: testBusinessId });
      await AuditLogModel.deleteMany({ businessId: testBusinessId });
      await ProductModel.deleteMany({ businessId: testBusinessId });
      await CustomerModel.deleteMany({ businessId: testBusinessId });
      await BusinessModel.findByIdAndDelete(testBusinessId);
      await TaxRateModel.findByIdAndDelete(testTaxRateId);
    }
  });

  it('Create Draft Invoice authoritatively calculates totals via Phase 11 engine', async () => {
    if (!isConnected) return;

    const draft = await invoiceService.createDraftInvoice(testBusinessId, {
      customerId: testCustomerId,
      invoiceDate: '2024-04-15',
      dueDate: '2024-05-15',
      documentType: 'TAX_INVOICE',
      supplyType: 'B2B',
      placeOfSupplyStateCode: '29', // Inter-State
      items: [
        {
          itemId: testProductId,
          itemType: 'GOODS',
          name: 'Precision Steel Bolt',
          hsnSacCode: '73181500',
          quantity: 10,
          freeQuantity: 0,
          unit: 'PCS',
          uqc: 'PCS',
          rate: 100, // ₹100.00 -> ₹1,000.00 subtotal
          taxTreatment: 'TAXABLE',
        },
      ],
    });

    expect(draft.status).toBe('DRAFT');
    expect(draft.paymentStatus).toBe('UNPAID');
    expect(draft.subTotal).toBe(100000); // ₹1,000.00 in paise
    expect(draft.totalTaxable).toBe(100000);
    expect(draft.totalIgst).toBe(18000); // ₹180.00 IGST in paise
    expect(draft.grandTotal).toBe(118000); // ₹1,180.00 in paise
    expect(draft.invoiceNumber).toContain('DRAFT-');
    expect(draft.financialYear).toBe('2024-25');
  });

  it('Issue Invoice assigns sequential invoice number and locks snapshots', async () => {
    if (!isConnected) return;

    const draft = await invoiceService.createDraftInvoice(testBusinessId, {
      customerId: testCustomerId,
      invoiceDate: '2024-04-15',
      dueDate: '2024-05-15',
      documentType: 'TAX_INVOICE',
      supplyType: 'B2B',
      placeOfSupplyStateCode: '29',
      items: [
        {
          itemId: testProductId,
          itemType: 'GOODS',
          name: 'Precision Steel Bolt',
          hsnSacCode: '73181500',
          quantity: 5,
          freeQuantity: 0,
          unit: 'PCS',
          uqc: 'PCS',
          rate: 100,
          taxTreatment: 'TAXABLE',
        },
      ],
    });

    const issued = await invoiceService.issueInvoice(testBusinessId, (draft._id as any).toString());

    expect(issued.status).toBe('ISSUED');
    expect(issued.invoiceNumber.length).toBeLessThanOrEqual(16); // Rule 46 max 16 chars!
    expect(issued.billToSnapshot.name).toBe('Apex Retailers Ltd');
    expect(issued.items[0].name).toBe('Precision Steel Bolt');

    // Mutate Customer master record
    await CustomerModel.findByIdAndUpdate(testCustomerId, { name: 'Apex Retailers Global Inc' });

    // Verify issued invoice snapshot remains UNCHANGED!
    const reFetched = await invoiceService.getInvoice(testBusinessId, (draft._id as any).toString());
    expect(reFetched.billToSnapshot.name).toBe('Apex Retailers Ltd'); // Historical immutability!
  });

  it('Modifying an ISSUED invoice throws ImmutableInvoiceError', async () => {
    if (!isConnected) return;

    const draft = await invoiceService.createDraftInvoice(testBusinessId, {
      customerId: testCustomerId,
      invoiceDate: '2024-04-15',
      dueDate: '2024-05-15',
      items: [
        {
          itemId: testProductId,
          itemType: 'GOODS',
          name: 'Precision Steel Bolt',
          hsnSacCode: '73181500',
          quantity: 1,
          freeQuantity: 0,
          unit: 'PCS',
          uqc: 'PCS',
          rate: 100,
          taxTreatment: 'TAXABLE',
        },
      ],
      placeOfSupplyStateCode: '29',
    });

    const issued = await invoiceService.issueInvoice(testBusinessId, (draft._id as any).toString());

    await expect(
      invoiceService.updateDraftInvoice(testBusinessId, (issued._id as any).toString(), {
        customerId: testCustomerId,
        invoiceDate: '2024-04-15',
        dueDate: '2024-05-15',
        placeOfSupplyStateCode: '29',
        items: [
          {
            itemId: testProductId,
            itemType: 'GOODS',
            name: 'Precision Steel Bolt',
            hsnSacCode: '73181500',
            quantity: 1,
            freeQuantity: 0,
            unit: 'PCS',
            uqc: 'PCS',
            rate: 100,
            taxTreatment: 'TAXABLE',
          },
        ],
      })
    ).rejects.toThrow(ImmutableInvoiceError);
  });

  it('Cancel Invoice transitions state to CANCELLED and logs AuditLog event', async () => {
    if (!isConnected) return;

    const draft = await invoiceService.createDraftInvoice(testBusinessId, {
      customerId: testCustomerId,
      invoiceDate: '2024-04-15',
      dueDate: '2024-05-15',
      items: [
        {
          itemType: 'SERVICES',
          name: 'Service Item',
          hsnSacCode: '998311',
          quantity: 1,
          freeQuantity: 0,
          unit: 'HRS',
          uqc: 'OTH',
          rate: 500,
          taxTreatment: 'TAXABLE',
        },
      ],
      placeOfSupplyStateCode: '29',
    });

    const cancelled = await invoiceService.cancelInvoice(
      testBusinessId,
      (draft._id as any).toString(),
      'Order cancelled by client'
    );

    expect(cancelled.status).toBe('CANCELLED');

    const auditLog = await AuditLogModel.findOne({
      entityId: draft._id,
      action: 'INVOICE_CANCELLED',
    }).exec();
    expect(auditLog).not.toBeNull();
    expect((auditLog?.details as any)?.reason).toBe('Order cancelled by client');
  });

  it('Re-issuing an already ISSUED invoice throws InvoiceAlreadyIssuedError', async () => {
    if (!isConnected) return;

    const draft = await invoiceService.createDraftInvoice(testBusinessId, {
      customerId: testCustomerId,
      invoiceDate: '2024-04-15',
      dueDate: '2024-05-15',
      items: [
        {
          itemType: 'GOODS',
          name: 'Item',
          hsnSacCode: '1001',
          quantity: 1,
          freeQuantity: 0,
          unit: 'PCS',
          uqc: 'PCS',
          rate: 100,
          taxTreatment: 'TAXABLE',
        },
      ],
      placeOfSupplyStateCode: '29',
    });

    const issued = await invoiceService.issueInvoice(testBusinessId, (draft._id as any).toString());

    await expect(
      invoiceService.issueInvoice(testBusinessId, (issued._id as any).toString())
    ).rejects.toThrow(InvoiceAlreadyIssuedError);
  });
});
