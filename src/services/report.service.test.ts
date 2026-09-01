import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Types } from 'mongoose';
import { reportService } from './report.service';
import { InvoiceModel } from '@/db/models/invoice.model';
import { PurchaseInvoiceModel } from '@/db/models/purchase-invoice.model';
import { ProductModel } from '@/db/models/product.model';

vi.mock('@/db/connection', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
}));
vi.mock('@/db/models/invoice.model');
vi.mock('@/db/models/purchase-invoice.model');
vi.mock('@/db/models/product.model');

describe('ReportService', () => {
  const testBusinessId = new Types.ObjectId().toString();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should generate sales report totals correctly from Mongo invoices', async () => {
    const mockInvoices = [
      {
        _id: new Types.ObjectId(),
        invoiceNumber: 'INV-001',
        invoiceDate: new Date(),
        billToSnapshot: { name: 'Customer A' },
        grandTotal: 118000,
        totalTaxable: 100000,
        totalCgst: 9000,
        totalSgst: 9000,
        totalIgst: 0,
        paidAmount: 50000,
        outstandingBalance: 68000,
        paymentStatus: 'PARTIALLY_PAID',
      },
    ];

    (InvoiceModel.find as any).mockReturnValue({
      sort: () => ({
        lean: () => ({
          exec: vi.fn().mockResolvedValue(mockInvoices),
        }),
      }),
    });

    const report = await reportService.getSalesReport(testBusinessId);

    expect(report.invoiceCount).toBe(1);
    expect(report.totalSalesRupees).toBe(1180);
    expect(report.totalTaxableRupees).toBe(1000);
    expect(report.totalCgstRupees).toBe(90);
    expect(report.totalSgstRupees).toBe(90);
    expect(report.totalPaidRupees).toBe(500);
    expect(report.totalOutstandingRupees).toBe(680);
  });

  it('should generate stock valuation report correctly', async () => {
    const mockProducts = [
      {
        _id: new Types.ObjectId(),
        name: 'Laptop',
        code: 'LAP-001',
        hsnCode: '8471',
        unit: 'PCS',
        sellingPrice: 50000,
        purchasePrice: 40000,
        stockQuantity: 10,
        reorderLevel: 2,
        trackInventory: true,
      },
    ];

    (ProductModel.find as any).mockReturnValue({
      select: () => ({
        sort: () => ({
          lean: () => ({
            exec: vi.fn().mockResolvedValue(mockProducts),
          }),
        }),
      }),
    });

    const report = await reportService.getStockValuationReport(testBusinessId);

    expect(report.productCount).toBe(1);
    expect(report.totalValuationSellingRupees).toBe(500000);
    expect(report.totalValuationPurchaseRupees).toBe(400000);
    expect(report.items[0].stockQuantity).toBe(10);
  });
});
