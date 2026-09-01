import {
  GstLineResult,
  ResolvedTaxRate,
  SupplyType,
  SupplyClassification,
  GstTaxTreatment,
  CustomerGstType,
  ZeroRatedMethod,
  TaxMechanism,
  PlaceOfSupplyDetermination,
  GstJurisdiction,
} from '../gst/gst.types';

export type DiscountType = 'FIXED' | 'PERCENTAGE';
export type DiscountTaxTreatment = 'REDUCE_TAXABLE_VALUE' | 'COMMERCIAL_ONLY';
export type RoundOffPolicy = 'NEAREST_RUPEE' | 'DISABLED';

export interface LineDiscountInput {
  type: DiscountType;
  value: number; // Rupee amount if FIXED, or percentage (e.g. 10 for 10%)
  taxTreatment?: DiscountTaxTreatment; // Default: 'REDUCE_TAXABLE_VALUE'
}

export interface InvoiceDiscountInput {
  type: DiscountType;
  value: number;
  taxTreatment?: DiscountTaxTreatment; // Default: 'REDUCE_TAXABLE_VALUE'
}

export interface AdditionalChargeInput {
  id?: string;
  name: string;
  amountPaise: number; // Integer paise
  valuationTreatment: 'TAXABLE' | 'NON_TAXABLE';
  resolvedTaxRate?: ResolvedTaxRate;
  taxTreatment?: GstTaxTreatment;
  cessAmountPerUnitPaise?: number;
  classificationCode?: { type: 'HSN' | 'SAC'; code: string };
}

export interface InvoiceLineInput {
  itemId?: string;
  name: string;
  itemType?: SupplyType; // 'GOODS' | 'SERVICES'
  classificationCode: { type: 'HSN' | 'SAC'; code: string };
  quantity: number;
  freeQuantity?: number;
  unit: string;
  uqc: string;
  ratePaise: number; // Unit price in integer paise
  lineDiscount?: LineDiscountInput;
  taxTreatment?: GstTaxTreatment;
  resolvedTaxRate: ResolvedTaxRate;
  cessAmountPerUnitPaise?: number;
  isPriceInclusiveOfGst?: boolean;
}

export interface InvoiceCalculationInput {
  supplierStateCode: string;
  placeOfSupplyStateCode: string;
  recipientStateCode?: string;
  supplyType?: SupplyType;
  supplyClassification?: SupplyClassification;
  taxTreatment?: GstTaxTreatment;
  customerGstType?: CustomerGstType;
  zeroRatedMethod?: ZeroRatedMethod;
  taxMechanism?: TaxMechanism;
  placeOfSupplyDetermination?: PlaceOfSupplyDetermination;
  items: InvoiceLineInput[];
  invoiceDiscount?: InvoiceDiscountInput;
  additionalCharges?: AdditionalChargeInput[];
  roundOffPolicy?: RoundOffPolicy;
}

export interface GstRateSummary {
  gstRate: number;
  taxTreatment: GstTaxTreatment;
  jurisdiction: GstJurisdiction;
  supplyClassification: SupplyClassification;
  taxMechanism: TaxMechanism;
  taxablePaise: number;
  taxableAmount: number;
  cgstPaise: number;
  cgstAmount: number;
  sgstPaise: number;
  sgstAmount: number;
  utgstPaise: number;
  utgstAmount: number;
  igstPaise: number;
  igstAmount: number;
  adValoremCessPaise: number;
  specificCessPaise: number;
  cessPaise: number;
  cessAmount: number;
  totalTaxPaise: number;
  totalTaxAmount: number;
}

export interface CalculatedInvoiceItem {
  itemId?: string;
  name: string;
  classificationCode: { type: 'HSN' | 'SAC'; code: string };
  quantity: number;
  freeQuantity: number;
  unit: string;
  uqc: string;
  ratePaise: number;
  rateAmount: number;
  grossAmountPaise: number;
  grossAmount: number;
  lineDiscountPaise: number;
  lineDiscountAmount: number;
  allocatedInvoiceDiscountPaise: number;
  allocatedInvoiceDiscountAmount: number;
  taxReducingDiscountPaise: number;
  taxReducingDiscountAmount: number;
  commercialDiscountPaise: number;
  commercialDiscountAmount: number;
  taxablePaise: number;
  taxableAmount: number;
  gstResult: GstLineResult;
  isPriceInclusiveOfGst: boolean;
  enteredRatePaise: number;
  inclusiveGrossPaise: number;
  resolvedCgstPaise: number;
  resolvedSgstPaise: number;
  resolvedIgstPaise: number;
  resolvedUtgstPaise: number;
  totalAmountPaise: number;
  totalAmount: number;
}

export interface CalculatedAdditionalCharge {
  id?: string;
  name: string;
  amountPaise: number;
  amount: number;
  valuationTreatment: 'TAXABLE' | 'NON_TAXABLE';
  gstResult?: GstLineResult;
}

export interface InvoiceCalculationResult {
  items: CalculatedInvoiceItem[];
  additionalCharges: CalculatedAdditionalCharge[];
  subTotalPaise: number;
  subTotalAmount: number;
  totalLineDiscountPaise: number;
  totalLineDiscountAmount: number;
  totalInvoiceDiscountPaise: number;
  totalInvoiceDiscountAmount: number;
  totalTaxReducingDiscountPaise: number;
  totalTaxReducingDiscountAmount: number;
  totalCommercialDiscountPaise: number;
  totalCommercialDiscountAmount: number;
  totalDiscountPaise: number;
  totalDiscountAmount: number;
  taxableAdditionalChargesPaise: number;
  taxableAdditionalChargesAmount: number;
  nonTaxableAdditionalChargesPaise: number;
  nonTaxableAdditionalChargesAmount: number;
  totalTaxablePaise: number;
  totalTaxableAmount: number;
  totalCgstPaise: number;
  totalCgstAmount: number;
  totalSgstPaise: number;
  totalSgstAmount: number;
  totalUtgstPaise: number;
  totalUtgstAmount: number;
  totalIgstPaise: number;
  totalIgstAmount: number;
  totalAdValoremCessPaise: number;
  totalAdValoremCessAmount: number;
  totalSpecificCessPaise: number;
  totalSpecificCessAmount: number;
  totalCessPaise: number;
  totalCessAmount: number;
  totalTaxPaise: number;
  totalTaxAmount: number;
  rateSummaries: GstRateSummary[];
  roundOffPaise: number;
  roundOffAmount: number;
  grandTotalPaise: number;
  grandTotalAmount: number;
  calculationVersion: string;
}
