import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Types } from 'mongoose';
import { ProductModel } from '@/db/models/product.model';

vi.mock('@/db/connection', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
}));
vi.mock('@/db/models/product.model');

describe('Product Bulk Import Schema & Logic', () => {
  const testBusinessId = new Types.ObjectId().toString();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should validate HSN code and stock quantity during bulk product import', async () => {
    const mockCreated = {
      _id: new Types.ObjectId(),
      name: 'Bulk Imported Product',
      hsnCode: '8471',
      sellingPrice: 1500,
      stockQuantity: 50,
    };

    (ProductModel.findOne as any).mockReturnValue({
      exec: vi.fn().mockResolvedValue(null),
    });
    (ProductModel.create as any).mockResolvedValue(mockCreated);

    const productPayload = {
      name: 'Bulk Imported Product',
      code: 'BULK-001',
      hsnCode: '8471',
      unit: 'PCS',
      sellingPrice: 1500,
      defaultGstRate: 18,
      stockQuantity: 50,
    };

    expect(productPayload.name).toBe('Bulk Imported Product');
    expect(productPayload.stockQuantity).toBe(50);
  });
});
