/**
 * Shared Transaction Context
 * src/engine/policy/transaction.context.ts
 *
 * Single context object consumed by all policy resolvers:
 *   HsnReportingPolicy, GstrClassificationPolicy,
 *   DocumentComplianceProfile, TemplateFieldPolicyService
 *
 * Prevents scattered function parameter lists and ensures every
 * policy receives the same snapshot of transaction facts.
 */

import type {
  SupplyType,
  SupplyClassification,
  GstTaxTreatment,
  TaxMechanism,
  ZeroRatedMethod,
  CustomerGstType,
} from '@/engine/gst/gst.types';
import type { IInvoice } from '@/db/models/invoice.model';

export type TurnoverCategory = 'ABOVE_5CR' | 'UP_TO_5CR';

export interface TransactionContext {
  // Document identification
  documentType: IInvoice['documentType'];
  invoiceDate: Date;
  financialYear: string;

  // Supply & Tax context
  supplierStateCode: string;
  recipientStateCode?: string;
  placeOfSupplyStateCode: string;
  supplyType: SupplyType;
  supplyClassification: SupplyClassification;
  taxTreatment: GstTaxTreatment;
  taxMechanism: TaxMechanism;
  zeroRatedMethod?: ZeroRatedMethod;

  // Registration context
  recipientGstRegistrationStatus: CustomerGstType;
  supplierGstRegistrationType: string;
  turnoverCategory?: TurnoverCategory;

  // E-invoice context
  eInvoiceApplicable: boolean;

  // Computed amounts (from snapshot — never re-calculated at policy resolution time)
  grandTotalPaise: number;
  totalIgstPaise: number;
  totalCgstPaise: number;
  totalSgstPaise: number;
  totalUtgstPaise: number;
  totalCessPaise: number;
  reverseCharge: boolean;
}

/**
 * Build a TransactionContext from an issued/draft invoice document.
 * Use this rather than building context manually to avoid field omissions.
 */
export function buildTransactionContext(
  inv: IInvoice,
  business: { stateCode: string; gstRegistrationType?: string; gstSettings?: { annualTurnoverCategory?: TurnoverCategory } }
): TransactionContext {
  const supplierStateCode = inv.billFromSnapshot?.stateCode ?? business.stateCode;
  const recipientStateCode = inv.billToSnapshot?.stateCode;
  const placeOfSupplyStateCode = inv.supplyDetails?.placeOfSupplyStateCode ?? supplierStateCode;

  // Determine GST classification
  const supplyType: SupplyType = (inv.items?.[0] as any)?.itemType === 'SERVICES' ? 'SERVICES' : 'GOODS';

  // Map invoice supplyType to SupplyClassification
  let supplyClassification: SupplyClassification = 'DOMESTIC';
  if (inv.supplyType?.startsWith('EXPORT')) supplyClassification = 'EXPORT';
  else if (inv.supplyType?.startsWith('SEZ')) supplyClassification = 'SEZ';

  const recipientGstRegistrationStatus: CustomerGstType =
    inv.billToSnapshot?.gstin && inv.billToSnapshot.gstin.length === 15
      ? 'REGISTERED'
      : 'UNREGISTERED';

  return {
    documentType: inv.documentType,
    invoiceDate: inv.invoiceDate,
    financialYear: inv.financialYear,
    supplierStateCode,
    recipientStateCode,
    placeOfSupplyStateCode,
    supplyType,
    supplyClassification,
    taxTreatment: inv.taxTreatment as GstTaxTreatment,
    taxMechanism: inv.supplyDetails?.reverseCharge ? 'REVERSE_CHARGE' : 'FORWARD_CHARGE',
    zeroRatedMethod: undefined, // Set from supplyType when EXPORT/SEZ
    recipientGstRegistrationStatus,
    supplierGstRegistrationType: business.gstRegistrationType ?? 'REGULAR',
    turnoverCategory: business.gstSettings?.annualTurnoverCategory,
    eInvoiceApplicable: false, // Resolved separately in future phase
    grandTotalPaise: inv.grandTotal,
    totalIgstPaise: inv.totalIgst,
    totalCgstPaise: inv.totalCgst,
    totalSgstPaise: inv.totalSgst,
    totalUtgstPaise: inv.totalUtgst,
    totalCessPaise: inv.totalCess,
    reverseCharge: inv.supplyDetails?.reverseCharge ?? false,
  };
}
