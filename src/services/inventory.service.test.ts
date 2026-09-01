import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Types } from 'mongoose';
import { inventoryService } from './inventory.service';
import { ProductModel } from '@/db/models/product.model';
import { StockMovementModel } from '@/db/models/stock-movement.model';
import { IInvoice } from '@/db/models/invoice.model';
import { ICreditNote } from '@/db/models/credit-note.model';

vi.mock('@/db/models/product.model');
vi.mock('@/db/models/stock-movement.model');
vi.mock('@/db/repositories/audit-log.repository', () => ({
  auditLogRepository: { log: vi.fn() },
}));

describe('InventoryService', () => {
  const testBusinessId = new Types.ObjectId().toString();
  const testProductId = new Types.ObjectId().toString();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('recordMovement', () => {
    it('should record opening stock and update product stockQuantity', async () => {
      const mockProduct = {
        _id: new Types.ObjectId(testProductId),
        businessId: new Types.ObjectId(testBusinessId),
        name: 'Test Laptop',
        stockQuantity: 10,
        unit: 'PCS',
      };

      (ProductModel.findOne as any).mockReturnValue({
        session: () => ({
          exec: vi.fn().mockResolvedValue(mockProduct),
        }),
      });

      (StockMovementModel.findOne as any).mockReturnValue({
        session: () => ({
          exec: vi.fn().mockResolvedValue(null),
        }),
      });

      (ProductModel.updateOne as any).mockReturnValue({
        exec: vi.fn().mockResolvedValue({ modifiedCount: 1 }),
      });

      (StockMovementModel.prototype.save as any) = vi.fn().mockResolvedValue(true);

      const movement = await inventoryService.recordMovement(testBusinessId, {
        productId: testProductId,
        type: 'PURCHASE',
        quantity: 5,
        unit: 'PCS',
        referenceType: 'PURCHASE_ORDER',
        notes: 'Stock received',
      });

      expect(ProductModel.updateOne).toHaveBeenCalledWith(
        { _id: new Types.ObjectId(testProductId), businessId: new Types.ObjectId(testBusinessId) },
        { $set: { stockQuantity: 15 } },
        { session: undefined }
      );
    });

    it('should be idempotent if referenceId has already been recorded', async () => {
      const existingMovement = {
        _id: new Types.ObjectId(),
        businessId: new Types.ObjectId(testBusinessId),
        productId: new Types.ObjectId(testProductId),
        referenceId: 'INV-1001',
      };

      (ProductModel.findOne as any).mockReturnValue({
        session: () => ({
          exec: vi.fn().mockResolvedValue({ stockQuantity: 10 }),
        }),
      });

      (StockMovementModel.findOne as any).mockReturnValue({
        session: () => ({
          exec: vi.fn().mockResolvedValue(existingMovement),
        }),
      });

      const movement = await inventoryService.recordMovement(testBusinessId, {
        productId: testProductId,
        type: 'SALE',
        quantity: 2,
        referenceType: 'INVOICE',
        referenceId: 'INV-1001',
      });

      expect(movement).toEqual(existingMovement);
      expect(ProductModel.updateOne).not.toHaveBeenCalled();
    });
  });

  describe('deductStockForInvoice', () => {
    it('should deduct stock for GOODS items and skip SERVICES items', async () => {
      const goodsId = new Types.ObjectId().toString();
      const serviceId = new Types.ObjectId().toString();

      const mockInvoice = {
        _id: new Types.ObjectId(),
        invoiceNumber: 'INV-2026-0001',
        items: [
          { itemId: goodsId, itemType: 'GOODS', quantity: 3, unit: 'PCS' },
          { itemId: serviceId, itemType: 'SERVICES', quantity: 1, unit: 'JOB' },
        ],
      } as unknown as IInvoice;

      const recordSpy = vi.spyOn(inventoryService, 'recordMovement').mockResolvedValue({} as any);

      await inventoryService.deductStockForInvoice(testBusinessId, mockInvoice);

      // Should only call recordMovement once for GOODS item
      expect(recordSpy).toHaveBeenCalledTimes(1);
      expect(recordSpy).toHaveBeenCalledWith(
        testBusinessId,
        expect.objectContaining({
          productId: goodsId,
          type: 'SALE',
          quantity: 3,
          referenceType: 'INVOICE',
          referenceNumber: 'INV-2026-0001',
        }),
        undefined
      );
    });
  });

  describe('restoreStockForCreditNote', () => {
    it('should restore stock for returned GOODS items on a Credit Note', async () => {
      const goodsId = new Types.ObjectId().toString();

      const mockCreditNote = {
        _id: new Types.ObjectId(),
        creditNoteNumber: 'CN-2026-0001',
        items: [
          { itemId: goodsId, itemType: 'GOODS', quantity: 2, unit: 'PCS' },
        ],
      } as unknown as ICreditNote;

      const recordSpy = vi.spyOn(inventoryService, 'recordMovement').mockResolvedValue({} as any);

      await inventoryService.restoreStockForCreditNote(testBusinessId, mockCreditNote);

      expect(recordSpy).toHaveBeenCalledTimes(1);
      expect(recordSpy).toHaveBeenCalledWith(
        testBusinessId,
        expect.objectContaining({
          productId: goodsId,
          type: 'SALE_RETURN',
          quantity: 2,
          referenceType: 'CREDIT_NOTE',
          referenceNumber: 'CN-2026-0001',
        }),
        undefined
      );
    });
  });
});
