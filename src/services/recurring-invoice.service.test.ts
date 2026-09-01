import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Types } from 'mongoose';
import { recurringInvoiceService } from './recurring-invoice.service';
import { RecurringInvoiceModel } from '@/db/models/recurring-invoice.model';
import { invoiceService } from './invoice.service';

vi.mock('@/db/connection', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
}));
vi.mock('@/db/models/recurring-invoice.model');
vi.mock('@/services/invoice.service', () => ({
  invoiceService: {
    createDraftInvoice: vi.fn(),
    issueInvoice: vi.fn(),
  },
}));
vi.mock('@/db/repositories/audit-log.repository', () => ({
  auditLogRepository: { log: vi.fn() },
}));

describe('RecurringInvoiceService', () => {
  const testBusinessId = new Types.ObjectId().toString();
  const testCustomerId = new Types.ObjectId().toString();
  const testUserId = new Types.ObjectId().toString();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should process due recurring schedules and generate draft invoices', async () => {
    const mockSchedule = {
      _id: new Types.ObjectId(),
      businessId: new Types.ObjectId(testBusinessId),
      customerId: new Types.ObjectId(testCustomerId),
      title: 'Monthly Retainer',
      frequency: 'MONTHLY',
      nextRunDate: new Date(Date.now() - 86400000), // Yesterday
      documentType: 'TAX_INVOICE',
      items: [
        {
          name: 'Monthly Service',
          itemType: 'SERVICES',
          hsnSacCode: '998314',
          quantity: 1,
          unit: 'JOB',
          ratePaise: 500000,
          gstRate: 18,
          priceMode: 'EXCLUSIVE',
        },
      ],
      autoIssue: false,
      status: 'ACTIVE',
      generatedCount: 0,
      save: vi.fn().mockResolvedValue(true),
    };

    (RecurringInvoiceModel.find as any).mockReturnValue({
      exec: vi.fn().mockResolvedValue([mockSchedule]),
    });

    (invoiceService.createDraftInvoice as any).mockResolvedValue({
      _id: new Types.ObjectId(),
      invoiceNumber: 'INV-2026-999',
    });

    const result = await recurringInvoiceService.processDueSchedules(testBusinessId);

    expect(result.generatedInvoiceIds.length).toBe(1);
    expect(invoiceService.createDraftInvoice).toHaveBeenCalledWith(
      testBusinessId,
      expect.objectContaining({
        customerId: testCustomerId,
        supplyType: 'B2B',
      })
    );
    expect(mockSchedule.save).toHaveBeenCalled();
  });
});
