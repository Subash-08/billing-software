import { Types, ClientSession } from 'mongoose';
import { ProductModel } from '@/db/models/product.model';
import { StockMovementModel, StockMovementType, StockReferenceType, IStockMovement } from '@/db/models/stock-movement.model';
import { IInvoice } from '@/db/models/invoice.model';
import { ICreditNote } from '@/db/models/credit-note.model';
import { NotFoundError, ValidationError } from '@/lib/errors';
import { auditLogRepository } from '@/db/repositories/audit-log.repository';

export interface CreateStockMovementInput {
  productId: string | Types.ObjectId;
  type: StockMovementType;
  quantity: number;
  unit?: string;
  referenceType: StockReferenceType;
  referenceId?: string;
  referenceNumber?: string;
  notes?: string;
  createdBy?: string | Types.ObjectId;
}

export class InventoryService {
  /**
   * Performs an atomic stock movement and updates Product stockQuantity.
   */
  async recordMovement(
    businessId: string | Types.ObjectId,
    input: CreateStockMovementInput,
    session?: ClientSession
  ): Promise<IStockMovement> {
    const bId = new Types.ObjectId(businessId.toString());
    const pId = new Types.ObjectId(input.productId.toString());

    if (input.quantity <= 0) {
      throw new ValidationError('Stock movement quantity must be greater than zero');
    }

    const product = await ProductModel.findOne({ _id: pId, businessId: bId }).session(session || null).exec();
    if (!product) {
      throw new NotFoundError(`Product '${input.productId}' not found`);
    }

    // Idempotency check: if referenceId is provided, check if already recorded
    if (input.referenceId) {
      const existing = await StockMovementModel.findOne({
        businessId: bId,
        productId: pId,
        referenceType: input.referenceType,
        referenceId: input.referenceId,
      }).session(session || null).exec();

      if (existing) {
        return existing;
      }
    }

    const previousStock = product.stockQuantity || 0;
    let newStock = previousStock;

    switch (input.type) {
      case 'OPENING':
      case 'PURCHASE':
      case 'SALE_RETURN':
      case 'ADJUSTMENT_IN':
        newStock = previousStock + input.quantity;
        break;
      case 'SALE':
      case 'ADJUSTMENT_OUT':
      case 'DAMAGE':
        newStock = previousStock - input.quantity;
        break;
      default:
        throw new ValidationError(`Unsupported stock movement type '${input.type}'`);
    }

    // Atomic update of Product stockQuantity
    await ProductModel.updateOne(
      { _id: pId, businessId: bId },
      { $set: { stockQuantity: newStock } },
      { session }
    ).exec();

    // Create Stock Movement Ledger entry
    const movement = new StockMovementModel({
      businessId: bId,
      productId: pId,
      type: input.type,
      quantity: input.quantity,
      unit: input.unit || product.unit || 'PCS',
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      referenceNumber: input.referenceNumber,
      previousStock,
      newStock,
      notes: input.notes,
      createdBy: input.createdBy ? new Types.ObjectId(input.createdBy.toString()) : undefined,
    });

    if (session) {
      await movement.save({ session });
    } else {
      await movement.save();
    }

    return movement;
  }

  /**
   * Decrements stock for all PRODUCTS (GOODS) on an issued invoice.
   * SERVICES are ignored.
   * Idempotent per (businessId, invoiceId, productId).
   */
  async deductStockForInvoice(
    businessId: string | Types.ObjectId,
    invoice: IInvoice,
    session?: ClientSession
  ): Promise<void> {
    if (!invoice || !invoice.items || invoice.items.length === 0) return;

    for (const item of invoice.items) {
      const itemType = (item.itemType || 'GOODS') as string;
      if (itemType !== 'GOODS' || !item.itemId) continue;

      const qty = item.quantity || 0;
      if (qty <= 0) continue;

      await this.recordMovement(
        businessId,
        {
          productId: item.itemId.toString(),
          type: 'SALE',
          quantity: qty,
          unit: item.unit || 'PCS',
          referenceType: 'INVOICE',
          referenceId: (invoice._id as Types.ObjectId).toString(),
          referenceNumber: invoice.invoiceNumber,
          notes: `Stock deduction for issued invoice ${invoice.invoiceNumber}`,
        },
        session
      );
    }
  }

  /**
   * Restores stock for returned PRODUCTS (GOODS) on an issued Credit Note.
   * Idempotent per (businessId, creditNoteId, productId).
   */
  async restoreStockForCreditNote(
    businessId: string | Types.ObjectId,
    creditNote: ICreditNote,
    session?: ClientSession
  ): Promise<void> {
    if (!creditNote || !creditNote.items || creditNote.items.length === 0) return;

    for (const item of creditNote.items) {
      const itemType = (item.itemType || 'GOODS') as string;
      if (itemType !== 'GOODS' || !item.itemId) continue;

      const qty = item.quantity || 0;
      if (qty <= 0) continue;

      await this.recordMovement(
        businessId,
        {
          productId: item.itemId.toString(),
          type: 'SALE_RETURN',
          quantity: qty,
          unit: item.unit || 'PCS',
          referenceType: 'CREDIT_NOTE',
          referenceId: (creditNote._id as Types.ObjectId).toString(),
          referenceNumber: creditNote.creditNoteNumber,
          notes: `Stock return for credit note ${creditNote.creditNoteNumber}`,
        },
        session
      );
    }
  }

  /**
   * Fetches paginated stock ledger entries for a product.
   */
  async getStockLedger(
    businessId: string | Types.ObjectId,
    productId: string | Types.ObjectId,
    options: { page?: number; limit?: number } = {}
  ): Promise<{ items: IStockMovement[]; total: number; page: number; limit: number }> {
    const bId = new Types.ObjectId(businessId.toString());
    const pId = new Types.ObjectId(productId.toString());
    const page = options.page || 1;
    const limit = Math.min(options.limit || 20, 100);
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      StockMovementModel.find({ businessId: bId, productId: pId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      StockMovementModel.countDocuments({ businessId: bId, productId: pId }).exec(),
    ]);

    return {
      items: items as any,
      total,
      page,
      limit,
    };
  }

  /**
   * Returns current low stock items below reorder level.
   */
  async getLowStockAlerts(businessId: string | Types.ObjectId): Promise<any[]> {
    const bId = new Types.ObjectId(businessId.toString());
    const products = await ProductModel.find({
      businessId: bId,
      status: 'ACTIVE',
      trackInventory: true,
      $expr: { $lte: ['$stockQuantity', '$reorderLevel'] },
    }).lean().exec();

    return products;
  }
}

export const inventoryService = new InventoryService();
