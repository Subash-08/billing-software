import { Types } from 'mongoose';
import { connectToDatabase } from '@/db/connection';
import { RecurringInvoiceModel, IRecurringInvoice, RecurringFrequency } from '@/db/models/recurring-invoice.model';
import { invoiceService } from '@/services/invoice.service';
import { paiseToRupees } from '@/lib/money';
import { NotFoundError, ValidationError } from '@/lib/errors';
import { auditLogRepository } from '@/db/repositories/audit-log.repository';

export interface CreateRecurringScheduleInput {
  customerId: string;
  title: string;
  frequency: RecurringFrequency;
  intervalDays?: number;
  startDate?: string;
  endDate?: string;
  autoIssue?: boolean;
  items: Array<{
    productId?: string;
    serviceId?: string;
    itemType?: 'GOODS' | 'SERVICES';
    name: string;
    description?: string;
    hsnSacCode: string;
    quantity: number;
    unit?: string;
    rate: number; // in rupees
    gstRate: number;
    priceMode?: 'EXCLUSIVE' | 'INCLUSIVE';
  }>;
}

export class RecurringInvoiceService {
  async createSchedule(
    businessId: string,
    userId: string,
    input: CreateRecurringScheduleInput
  ): Promise<IRecurringInvoice> {
    await connectToDatabase();
    const bId = new Types.ObjectId(businessId);
    const cId = new Types.ObjectId(input.customerId);

    if (!input.items || input.items.length === 0) {
      throw new ValidationError('Recurring schedule must contain at least one line item');
    }

    const startDate = input.startDate ? new Date(input.startDate) : new Date();

    const items = input.items.map(it => ({
      productId: it.productId ? new Types.ObjectId(it.productId) : undefined,
      serviceId: it.serviceId ? new Types.ObjectId(it.serviceId) : undefined,
      itemType: it.itemType || 'GOODS',
      name: it.name,
      description: it.description,
      hsnSacCode: it.hsnSacCode,
      quantity: it.quantity,
      unit: it.unit || 'PCS',
      ratePaise: Math.round(it.rate * 100),
      gstRate: it.gstRate,
      priceMode: it.priceMode || 'EXCLUSIVE',
    }));

    const schedule = await RecurringInvoiceModel.create({
      businessId: bId,
      customerId: cId,
      title: input.title,
      frequency: input.frequency,
      intervalDays: input.intervalDays,
      startDate,
      endDate: input.endDate ? new Date(input.endDate) : undefined,
      nextRunDate: startDate,
      documentType: 'TAX_INVOICE',
      items,
      autoIssue: Boolean(input.autoIssue),
      status: 'ACTIVE',
    });

    await auditLogRepository.log(bId, {
      userId: new Types.ObjectId(userId),
      action: 'RECURRING_SCHEDULE_CREATED' as any,
      resource: 'RECURRING_INVOICE' as any,
      resourceId: schedule._id.toString(),
      metadata: { title: schedule.title, frequency: schedule.frequency },
    });

    return schedule;
  }

  async listSchedules(businessId: string): Promise<IRecurringInvoice[]> {
    await connectToDatabase();
    const bId = new Types.ObjectId(businessId);
    return await RecurringInvoiceModel.find({ businessId: bId }).sort({ nextRunDate: 1 }).lean().exec() as any;
  }

  /**
   * Processes all due recurring schedules and generates real invoices.
   */
  async processDueSchedules(businessId: string): Promise<{ generatedInvoiceIds: string[] }> {
    await connectToDatabase();
    const bId = new Types.ObjectId(businessId);
    const now = new Date();

    const dueSchedules = await RecurringInvoiceModel.find({
      businessId: bId,
      status: 'ACTIVE',
      nextRunDate: { $lte: now },
    }).exec();

    const generatedInvoiceIds: string[] = [];

    for (const schedule of dueSchedules) {
      try {
        const createOutput = await invoiceService.createDraftInvoice(businessId, {
          customerId: schedule.customerId.toString(),
          documentType: schedule.documentType as any || 'TAX_INVOICE',
          invoiceDate: now.toISOString().split('T')[0],
          dueDate: new Date(now.getTime() + 30 * 86400000).toISOString().split('T')[0],
          supplyType: 'B2B',
          placeOfSupplyStateCode: '33',
          items: schedule.items.map(it => ({
            itemId: (it.productId || it.serviceId)?.toString(),
            itemType: it.itemType,
            name: it.name,
            description: it.description,
            hsnCode: it.itemType === 'GOODS' ? it.hsnSacCode : undefined,
            sacCode: it.itemType === 'SERVICES' ? it.hsnSacCode : undefined,
            quantity: it.quantity,
            unit: it.unit,
            uqc: it.unit,
            rate: paiseToRupees(it.ratePaise),
            isPriceInclusiveOfGst: it.priceMode === 'INCLUSIVE',
            gstRate: it.gstRate,
            taxTreatment: 'TAXABLE',
          })),
        });

        const createdId = (createOutput as any)._id || (createOutput as any).invoice?._id;
        if (createdId) {
          generatedInvoiceIds.push(createdId.toString());

          if (schedule.autoIssue) {
            await invoiceService.issueInvoice(businessId, createdId.toString());
          }
        }

        // Advance next run date
        let nextDate = new Date(schedule.nextRunDate);
        if (schedule.frequency === 'MONTHLY') nextDate.setMonth(nextDate.getMonth() + 1);
        else if (schedule.frequency === 'QUARTERLY') nextDate.setMonth(nextDate.getMonth() + 3);
        else if (schedule.frequency === 'YEARLY') nextDate.setFullYear(nextDate.getFullYear() + 1);
        else if (schedule.frequency === 'CUSTOM' && schedule.intervalDays) {
          nextDate.setDate(nextDate.getDate() + schedule.intervalDays);
        } else {
          nextDate.setMonth(nextDate.getMonth() + 1);
        }

        schedule.lastRunDate = now;
        schedule.nextRunDate = nextDate;
        schedule.generatedCount = (schedule.generatedCount || 0) + 1;

        if (schedule.endDate && nextDate > schedule.endDate) {
          schedule.status = 'COMPLETED';
        }

        await schedule.save();
      } catch (err) {
        console.error(`Failed to process recurring schedule ${schedule._id}`, err);
      }
    }

    return { generatedInvoiceIds };
  }
}

export const recurringInvoiceService = new RecurringInvoiceService();
