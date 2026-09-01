import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Types } from 'mongoose';
import { purchaseInvoiceService } from './purchase-invoice.service';
import { PurchaseInvoiceModel } from '@/db/models/purchase-invoice.model';
import { SupplierModel } from '@/db/models/supplier.model';
import { BusinessModel } from '@/db/models/business.model';
import { inventoryService } from './inventory.service';
import { documentSequenceRepository } from '@/db/repositories/document-sequence.repository';

vi.mock('@/db/connection', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
}));
vi.mock('@/db/models/purchase-invoice.model');
vi.mock('@/db/models/supplier.model');
vi.mock('@/db/models/business.model');
vi.mock('@/services/inventory.service');
vi.mock('@/db/repositories/document-sequence.repository');
vi.mock('@/engine/gst/gst.rate-resolver', () => ({
  resolveTaxRate: vi.fn().mockResolvedValue({
    taxRateId: 'rate-18',
    version: '1.0',
    rate: 18,
    cessRate: 0,
    effectiveFrom: new Date('2017-07-01'),
  }),
}));
vi.mock('@/db/repositories/audit-log.repository', () => ({
  auditLogRepository: { log: vi.fn() },
}));

describe('PurchaseInvoiceService', () => {
  const testBusinessId = new Types.ObjectId().toString();
  const testSupplierId = new Types.ObjectId().toString();
  const testUserId = new Types.ObjectId().toString();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should record purchase invoice, update supplier balance, and trigger stock inward for Goods', async () => {
    const mockBusiness = { _id: new Types.ObjectId(testBusinessId), stateCode: '33' };
    const mockSupplier = {
      _id: new Types.ObjectId(testSupplierId),
      name: 'Supplier ABC',
      stateCode: '33',
      outstandingBalancePaise: 0,
      save: vi.fn().mockResolvedValue(true),
    };

    (BusinessModel.findById as any).mockReturnValue({
      lean: () => ({ exec: vi.fn().mockResolvedValue(mockBusiness) }),
    });

    (SupplierModel.findOne as any).mockReturnValue({
      exec: vi.fn().mockResolvedValue(mockSupplier),
    });

    (documentSequenceRepository.getNextSequenceNumber as any).mockResolvedValue(1);

    const createdPurchase = {
      _id: new Types.ObjectId(),
      purchaseNumber: 'PUR-202627-0001',
      grandTotalPaise: 118000,
    };
    (PurchaseInvoiceModel.create as any).mockResolvedValue(createdPurchase);
    (inventoryService.recordMovement as any).mockResolvedValue({} as any);

    const result = await purchaseInvoiceService.recordPurchaseInvoice(testBusinessId, testUserId, {
      supplierId: testSupplierId,
      supplierInvoiceNumber: 'SUP-9988',
      items: [
        {
          productId: new Types.ObjectId().toString(),
          name: 'Raw Material A',
          itemType: 'GOODS',
          hsnSacCode: '8471',
          quantity: 10,
          rate: 100,
          gstRate: 18,
        },
      ],
    });

    expect(result).toBeDefined();
    expect(mockSupplier.save).toHaveBeenCalled();
    expect(inventoryService.recordMovement).toHaveBeenCalledWith(
      testBusinessId,
      expect.objectContaining({
        type: 'PURCHASE',
        quantity: 10,
        referenceType: 'PURCHASE_ORDER',
      })
    );
  });
});
