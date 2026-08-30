import { Types } from 'mongoose';
import mongoose from 'mongoose';
import { invoiceRepository, InvoiceListFilters } from '@/db/repositories/invoice.repository';
import { IInvoice, IAddressSnapshot, IInvoiceItemSnapshot } from '@/db/models/invoice.model';
import { InvoiceModel } from '@/db/models/invoice.model';
import { BusinessModel, IBusiness } from '@/db/models/business.model';
import { CustomerModel, ICustomer } from '@/db/models/customer.model';
import { ProductModel } from '@/db/models/product.model';
import { ServiceModel } from '@/db/models/service.model';
import { AuditLogModel } from '@/db/models/audit-log.model';
import { calculateInvoice } from '@/engine/invoice/invoice.calculator';
import { resolveTaxRate } from '@/engine/gst/gst.rate-resolver';
import { getFinancialYear } from '@/lib/financial-year';
import { rupeesToPaise } from '@/lib/money';
import { ApplicationError, NotFoundError, ConflictError } from '@/lib/errors';
import { CreateInvoiceSchema, CreateInvoiceInput, CreateInvoiceOutput } from '@/validations/invoice.schema';

export class InvoiceServiceError extends ApplicationError {
  constructor(message: string, code = 'INVOICE_SERVICE_ERROR', statusCode = 400) {
    super(message, code, statusCode);
  }
}

export class InvoiceNotFoundError extends NotFoundError {
  constructor(id: string) {
    super(`Invoice with ID '${id}' not found.`);
  }
}

export class InvoiceAlreadyIssuedError extends ConflictError {
  constructor(id: string) {
    super(`Invoice '${id}' is already issued and immutable.`);
  }
}

export class InvoiceIssuanceInProgressError extends ConflictError {
  constructor(id: string) {
    super(`Invoice '${id}' issuance is currently in progress. Please retry.`);
  }
}

export class ImmutableInvoiceError extends ApplicationError {
  constructor(id: string) {
    super(`Issued or cancelled invoice '${id}' cannot be modified.`, 'IMMUTABLE_INVOICE', 400);
  }
}

export class IllegalStateTransitionError extends ApplicationError {
  constructor(from: string, to: string) {
    super(`Illegal invoice status transition from '${from}' to '${to}'.`, 'ILLEGAL_STATE_TRANSITION', 400);
  }
}

export class InvoiceService {
  /**
   * Constructs server-side address snapshot from Customer/Business data.
   */
  private buildAddressSnapshot(entity: any, fallbackName: string): IAddressSnapshot {
    const primaryAddr = entity.billingAddress || (entity.addresses && entity.addresses.length > 0 ? entity.addresses[0] : entity.address || {});
    const name = entity.legalName || entity.displayName || entity.tradeName || entity.name || fallbackName;
    const logoUrl = entity.branding?.logo?.secureUrl || entity.branding?.invoiceLogo?.secureUrl || entity.logoUrl;
    return {
      name,
      gstin: entity.gstin,
      addressLine: typeof primaryAddr === 'string' ? primaryAddr : primaryAddr.addressLine1 || primaryAddr.addressLine || primaryAddr.street || 'Address Not Provided',
      city: typeof primaryAddr === 'object' ? primaryAddr.city || 'City' : 'City',
      state: typeof primaryAddr === 'object' ? primaryAddr.state || 'State' : 'State',
      stateCode: typeof primaryAddr === 'object' ? primaryAddr.stateCode || entity.stateCode || '33' : entity.stateCode || '33',
      pincode: typeof primaryAddr === 'object' ? primaryAddr.pincode || primaryAddr.postalCode : undefined,
      phone: entity.phone,
      logoUrl,
    };
  }

  /**
   * Resolves Line items and executes Phase 11 calculateInvoice() on the server.
   */
  private async calculateInvoiceAuthoritatively(
    business: IBusiness,
    customer: ICustomer,
    payload: CreateInvoiceOutput
  ) {
    const invoiceDate = new Date(payload.invoiceDate);
    const supplierStateCode = business.stateCode || '33';
    const placeOfSupplyStateCode = payload.placeOfSupplyStateCode;

    // Resolve Item details and Tax Rates
    const invoiceLineInputs = [];
    const itemSnapshotsForDb: IInvoiceItemSnapshot[] = [];

    for (const itemInput of payload.items) {
      let resolvedRateDoc;

      if (itemInput.gstRate !== undefined) {
        resolvedRateDoc = await resolveTaxRate(itemInput.gstRate, invoiceDate);
      } else {
        // Look up product or service default tax rate
        let defaultGstRate = 18;
        if (itemInput.itemId) {
          if (itemInput.itemType === 'SERVICES') {
            const svc = await ServiceModel.findOne({ _id: itemInput.itemId, businessId: business._id }).exec();
            if (svc && svc.defaultGstRate !== undefined) defaultGstRate = svc.defaultGstRate;
          } else {
            const prd = await ProductModel.findOne({ _id: itemInput.itemId, businessId: business._id }).exec();
            if (prd && prd.defaultGstRate !== undefined) defaultGstRate = prd.defaultGstRate;
          }
        }
        resolvedRateDoc = await resolveTaxRate(defaultGstRate, invoiceDate);
      }

      const ratePaise = rupeesToPaise(itemInput.rate);

      invoiceLineInputs.push({
        itemId: itemInput.itemId,
        name: itemInput.name,
        itemType: itemInput.itemType,
        classificationCode: {
          type: (itemInput.itemType === 'SERVICES' ? 'SAC' : 'HSN') as 'HSN' | 'SAC',
          code: itemInput.hsnSacCode,
        },
        quantity: itemInput.quantity,
        freeQuantity: itemInput.freeQuantity || 0,
        unit: itemInput.unit,
        uqc: itemInput.uqc,
        ratePaise,
        lineDiscount: itemInput.lineDiscount,
        taxTreatment: itemInput.taxTreatment,
        resolvedTaxRate: resolvedRateDoc,
        cessAmountPerUnitPaise: itemInput.cessAmountPerUnit ? rupeesToPaise(itemInput.cessAmountPerUnit) : undefined,
      });
    }

    // Resolve Additional Charges
    const additionalChargeInputs = [];
    if (payload.additionalCharges && payload.additionalCharges.length > 0) {
      for (const chg of payload.additionalCharges) {
        let chargeResolvedRate;
        if (chg.valuationTreatment === 'TAXABLE') {
          chargeResolvedRate = await resolveTaxRate(chg.gstRate || 18, invoiceDate);
        }
        additionalChargeInputs.push({
          id: chg.id,
          name: chg.name,
          amountPaise: rupeesToPaise(chg.amount),
          valuationTreatment: chg.valuationTreatment,
          resolvedTaxRate: chargeResolvedRate,
          taxTreatment: chg.taxTreatment,
        });
      }
    }

    // Delegate calculation strictly to Phase 11 Engine
    const calcResult = calculateInvoice({
      supplierStateCode,
      placeOfSupplyStateCode,
      supplyClassification: payload.supplyType?.includes('SEZ')
        ? 'SEZ'
        : payload.supplyType?.includes('EXPORT')
        ? 'EXPORT'
        : 'DOMESTIC',
      taxTreatment: payload.taxTreatment,
      items: invoiceLineInputs,
      invoiceDiscount: payload.invoiceDiscount,
      additionalCharges: additionalChargeInputs,
      roundOffPolicy: payload.roundOffPolicy,
    });

    // Build Item Snapshots in Integer Paise
    for (let i = 0; i < calcResult.items.length; i++) {
      const calcItem = calcResult.items[i];
      const origInput = payload.items[i];
      itemSnapshotsForDb.push({
        itemId: origInput.itemId ? new Types.ObjectId(origInput.itemId) : undefined,
        name: calcItem.name,
        hsnSacCode: calcItem.classificationCode.code,
        quantity: calcItem.quantity,
        freeQuantity: calcItem.freeQuantity,
        unit: calcItem.unit,
        uqc: calcItem.uqc,
        rate: calcItem.ratePaise,
        discountAmount: calcItem.taxReducingDiscountPaise + calcItem.commercialDiscountPaise,
        taxableAmount: calcItem.taxablePaise,
        taxTreatment: calcItem.gstResult.trace.taxTreatment,
        gstRate: calcItem.gstResult.trace.effectiveRate,
        cgstAmount: calcItem.gstResult.cgstPaise,
        sgstAmount: calcItem.gstResult.sgstPaise,
        utgstAmount: calcItem.gstResult.utgstPaise,
        igstAmount: calcItem.gstResult.igstPaise,
        cessRate: calcItem.gstResult.cessRate,
        cessAmount: calcItem.gstResult.cessPaise,
        totalAmount: calcItem.totalAmountPaise,
      });
    }

    return { calcResult, itemSnapshotsForDb };
  }

  /**
   * Creates a new Draft Invoice with authoritative calculation.
   */
  async createDraftInvoice(businessId: string, payload: CreateInvoiceInput): Promise<IInvoice> {
    const validated = CreateInvoiceSchema.parse(payload);
    const bId = new Types.ObjectId(businessId);

    const business = await BusinessModel.findById(bId).exec();
    if (!business) throw new ApplicationError('Business not found', 'BUSINESS_NOT_FOUND', 404);

    const customer = await CustomerModel.findOne({ _id: validated.customerId, businessId: bId }).exec();
    if (!customer) throw new NotFoundError(`Customer with ID '${validated.customerId}' not found.`);

    const { calcResult, itemSnapshotsForDb } = await this.calculateInvoiceAuthoritatively(business, customer, validated);

    const billFromSnapshot = this.buildAddressSnapshot(business, business.legalName);
    const billToSnapshot = this.buildAddressSnapshot(customer, customer.displayName || customer.legalName || 'Customer');
    const invoiceDate = new Date(validated.invoiceDate);
    const financialYear = getFinancialYear(invoiceDate);
    const tempDraftNumber = `DRAFT-${Date.now().toString().slice(-6)}`;

    return invoiceRepository.create({
      businessId: bId,
      customerId: customer._id as Types.ObjectId,
      invoiceNumber: tempDraftNumber,
      financialYear,
      documentType: validated.documentType,
      supplyType: validated.supplyType,
      taxTreatment: validated.taxTreatment,
      status: 'DRAFT',
      paymentStatus: 'UNPAID',
      invoiceDate,
      dueDate: new Date(validated.dueDate),
      currency: 'INR',
      exchangeRate: 1.0,
      billFromSnapshot,
      billToSnapshot,
      supplyDetails: {
        placeOfSupplyStateCode: validated.placeOfSupplyStateCode,
        reverseCharge: validated.reverseCharge || false,
      },
      items: itemSnapshotsForDb,
      subTotal: calcResult.subTotalPaise,
      totalDiscount: calcResult.totalDiscountPaise,
      totalTaxable: calcResult.totalTaxablePaise,
      totalCgst: calcResult.totalCgstPaise,
      totalSgst: calcResult.totalSgstPaise,
      totalUtgst: calcResult.totalUtgstPaise,
      totalIgst: calcResult.totalIgstPaise,
      totalCess: calcResult.totalCessPaise,
      roundOff: calcResult.roundOffPaise,
      grandTotal: calcResult.grandTotalPaise,
      paidAmount: 0,
      outstandingBalance: calcResult.grandTotalPaise,
      calculationTrace: {
        rateSummaries: calcResult.rateSummaries,
        calculationVersion: calcResult.calculationVersion,
      },
    });
  }

  /**
   * Updates an existing DRAFT invoice. Re-calculates totals authoritatively.
   */
  async updateDraftInvoice(businessId: string, invoiceId: string, payload: CreateInvoiceInput): Promise<IInvoice> {
    const validated = CreateInvoiceSchema.parse(payload);
    const existing = await invoiceRepository.findById(businessId, invoiceId);
    if (!existing) throw new InvoiceNotFoundError(invoiceId);

    if (existing.status !== 'DRAFT') {
      throw new ImmutableInvoiceError(invoiceId);
    }

    const bId = new Types.ObjectId(businessId);
    const business = await BusinessModel.findById(bId).exec();
    if (!business) throw new ApplicationError('Business not found', 'BUSINESS_NOT_FOUND', 404);

    const customer = await CustomerModel.findOne({ _id: validated.customerId, businessId: bId }).exec();
    if (!customer) throw new NotFoundError(`Customer with ID '${validated.customerId}' not found.`);

    const { calcResult, itemSnapshotsForDb } = await this.calculateInvoiceAuthoritatively(business, customer, validated);

    const billFromSnapshot = this.buildAddressSnapshot(business, business.legalName);
    const billToSnapshot = this.buildAddressSnapshot(customer, customer.displayName || customer.legalName || 'Customer');
    const invoiceDate = new Date(validated.invoiceDate);
    const financialYear = getFinancialYear(invoiceDate);

    const updated = await invoiceRepository.update(businessId, invoiceId, {
      customerId: customer._id as Types.ObjectId,
      financialYear,
      documentType: validated.documentType,
      supplyType: validated.supplyType,
      taxTreatment: validated.taxTreatment,
      invoiceDate,
      dueDate: new Date(validated.dueDate),
      billFromSnapshot,
      billToSnapshot,
      supplyDetails: {
        placeOfSupplyStateCode: validated.placeOfSupplyStateCode,
        reverseCharge: validated.reverseCharge || false,
      },
      items: itemSnapshotsForDb,
      subTotal: calcResult.subTotalPaise,
      totalDiscount: calcResult.totalDiscountPaise,
      totalTaxable: calcResult.totalTaxablePaise,
      totalCgst: calcResult.totalCgstPaise,
      totalSgst: calcResult.totalSgstPaise,
      totalUtgst: calcResult.totalUtgstPaise,
      totalIgst: calcResult.totalIgstPaise,
      totalCess: calcResult.totalCessPaise,
      roundOff: calcResult.roundOffPaise,
      grandTotal: calcResult.grandTotalPaise,
      outstandingBalance: calcResult.grandTotalPaise,
      calculationTrace: {
        rateSummaries: calcResult.rateSummaries,
        calculationVersion: calcResult.calculationVersion,
      },
    });

    return updated!;
  }

  /**
   * Atomically issues a DRAFT invoice:
   * 1. Claims DRAFT -> VALIDATING state
   * 2. Resolves server-side financialYear & generates sequential invoiceNumber
   * 3. Locks Rule 46 immutable snapshots
   * 4. Updates status to ISSUED
   * 5. Writes INVOICE_ISSUED audit trail
   */
  async issueInvoice(businessId: string, invoiceId: string, userId?: string): Promise<IInvoice> {
    const existing = await invoiceRepository.findById(businessId, invoiceId);
    if (!existing) throw new InvoiceNotFoundError(invoiceId);

    if (existing.status === 'ISSUED') {
      throw new InvoiceAlreadyIssuedError(invoiceId);
    }
    if (existing.status === 'VALIDATING') {
      throw new InvoiceIssuanceInProgressError(invoiceId);
    }
    if (existing.status !== 'DRAFT') {
      throw new IllegalStateTransitionError(existing.status, 'ISSUED');
    }

    // 1. Atomic State Claim (DRAFT -> VALIDATING)
    const claimed = await invoiceRepository.atomicClaimDraftForIssuance(businessId, invoiceId);
    if (!claimed) {
      throw new InvoiceIssuanceInProgressError(invoiceId);
    }

    try {
      // 2. Derive Financial Year & Generate Sequential Number
      const financialYear = getFinancialYear(existing.invoiceDate);
      const prefix = existing.documentType === 'TAX_INVOICE' ? 'INV' : existing.documentType.slice(0, 3);
      const { formattedInvoiceNumber } = await invoiceRepository.getNextSequenceNumber(
        businessId,
        existing.documentType,
        financialYear,
        prefix
      );

      // 3. Mark ISSUED and Lock Snapshots
      const issued = await invoiceRepository.update(businessId, invoiceId, {
        invoiceNumber: formattedInvoiceNumber,
        financialYear,
        status: 'ISSUED',
      });

      // 4. Audit Trail Event
      await AuditLogModel.create({
        businessId: new Types.ObjectId(businessId),
        userId: userId ? new Types.ObjectId(userId) : undefined,
        action: 'INVOICE_ISSUED',
        resource: 'Invoice',
        resourceId: invoiceId,
        metadata: { invoiceNumber: formattedInvoiceNumber, financialYear, grandTotal: issued?.grandTotal },
      });

      return issued!;
    } catch (err) {
      // Roll back state VALIDATING -> DRAFT on error
      await invoiceRepository.rollbackIssuanceState(businessId, invoiceId);
      throw err;
    }
  }

  /**
   * Cancels a DRAFT or ISSUED invoice.
   *
   * Two-phase cancellation protocol [C1] [A2]:
   *   Phase 1 — Authoritative ledger check via paymentService.assertInvoiceCancellable()
   *             Counts active (un-reversed) PaymentAllocation documents. AUTHORITATIVE.
   *   Phase 2 — Write-conflicting conditional findOneAndUpdate on invoice.
   *             Acts as TOCTOU backstop: a concurrent allocation that decrement
   *             outstandingBalance between Phase 1 and Phase 2 will cause the
   *             $eq condition to fail, safely rejecting the cancellation.
   */
  async cancelInvoice(businessId: string, invoiceId: string, reason: string, userId?: string): Promise<IInvoice> {
    const existing = await invoiceRepository.findById(businessId, invoiceId);
    if (!existing) throw new InvoiceNotFoundError(invoiceId);

    if (existing.status === 'CANCELLED') {
      throw new InvoiceServiceError(`Invoice '${invoiceId}' is already cancelled.`, 'ALREADY_CANCELLED', 400);
    }

    if (existing.status === 'DRAFT') {
      // DRAFT invoices have no allocations — cancel directly without transaction
      const cancelled = await invoiceRepository.update(businessId, invoiceId, { status: 'CANCELLED' });
      await AuditLogModel.create({
        businessId: new Types.ObjectId(businessId),
        userId: userId ? new Types.ObjectId(userId) : undefined,
        action: 'INVOICE_CANCELLED',
        resource: 'Invoice',
        resourceId: invoiceId,
        metadata: { invoiceNumber: existing.invoiceNumber, reason, fromStatus: 'DRAFT' },
      });
      return cancelled!;
    }

    // ISSUED invoice — two-phase cancellation inside a transaction
    const { connectToDatabase } = await import('@/db/connection');
    await connectToDatabase();

    const session = await mongoose.startSession();
    try {
      let cancelledInvoice: IInvoice | null = null;

      await session.withTransaction(async () => {
        // Lazy import to avoid circular dependency at module load time
        const { paymentService } = await import('@/services/payment.service');

        // === PHASE 1: Authoritative ledger check [C1] ===
        // Throws InvoiceHasActivePaymentsError if active allocations exist
        await paymentService.assertInvoiceCancellable(businessId, invoiceId, session);

        // === PHASE 2: Write-conflicting conditional update [A2] ===
        // $eq condition: if a concurrent recordPayment() decremented outstandingBalance
        // between Phase 1 and here, this update will fail → InvoiceHasActivePaymentsError
        cancelledInvoice = await InvoiceModel.findOneAndUpdate(
          {
            _id: invoiceId,
            businessId: new Types.ObjectId(businessId),
            status: 'ISSUED',
            outstandingBalance: { $eq: existing.grandTotal },  // secondary TOCTOU guard
          },
          { $set: { status: 'CANCELLED', cancelledAt: new Date() } },
          { session, new: true }
        ).exec();

        if (!cancelledInvoice) {
          // A concurrent payment allocation slipped through between Phase 1 and Phase 2
          const { InvoiceHasActivePaymentsError } = await import('@/engine/settlement/settlement.errors');
          throw new InvoiceHasActivePaymentsError(invoiceId);
        }

        await AuditLogModel.create(
          [
            {
              businessId: new Types.ObjectId(businessId),
              userId: userId ? new Types.ObjectId(userId) : undefined,
              action: 'INVOICE_CANCELLED',
              resource: 'Invoice',
              resourceId: invoiceId,
              metadata: { invoiceNumber: existing.invoiceNumber, reason, fromStatus: 'ISSUED' },
            },
          ],
          { session }
        );
      });

      return cancelledInvoice!;
    } finally {
      await session.endSession();
    }
  }

  async getInvoice(businessId: string, invoiceId: string): Promise<IInvoice> {
    const invoice = await invoiceRepository.findById(businessId, invoiceId);
    if (!invoice) throw new InvoiceNotFoundError(invoiceId);
    return invoice;
  }

  async listInvoices(businessId: string, filters: InvoiceListFilters = {}) {
    return invoiceRepository.list(businessId, filters);
  }
}

export const invoiceService = new InvoiceService();
