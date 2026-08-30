export type SupplyType = 'GOODS' | 'SERVICES';
export type SupplyClassification = 'DOMESTIC' | 'EXPORT' | 'SEZ';
export type GstTaxTreatment = 'TAXABLE' | 'NIL_RATED' | 'EXEMPT' | 'NON_GST' | 'ZERO_RATED';
export type GstJurisdiction = 'INTRA_STATE' | 'INTER_STATE' | 'UNION_TERRITORY';
export type CustomerGstType = 'REGISTERED' | 'UNREGISTERED' | 'COMPOSITION' | 'SEZ' | 'OTHER';
export type ZeroRatedMethod = 'WITH_PAYMENT_OF_IGST' | 'WITHOUT_PAYMENT_OF_IGST';
export type TaxMechanism = 'FORWARD_CHARGE' | 'REVERSE_CHARGE';
export type CessType = 'NONE' | 'AD_VALOREM' | 'SPECIFIC' | 'BOTH';
export type GstComponent = 'CGST' | 'SGST' | 'UTGST' | 'IGST' | 'CESS';

export type PlaceOfSupplyDetermination =
  | 'CUSTOMER_LOCATION'
  | 'SUPPLIER_LOCATION'
  | 'SPECIFIC_RULE'
  | 'EXPORT'
  | 'SEZ';

export type GstReasonCode =
  | 'INTRA_STATE'
  | 'INTER_STATE'
  | 'UT_SUPPLY'
  | 'EXPORT_ZERO_RATED'
  | 'SEZ_ZERO_RATED'
  | 'NIL_RATED'
  | 'EXEMPT'
  | 'NON_GST'
  | 'TAXABLE';

export interface ResolvedTaxRate {
  taxRateId: string;
  version: string;
  rate: number;
  cessRate: number;
  effectiveFrom: Date;
  effectiveTo?: Date;
}

export interface GstLineInput {
  taxablePaise: number;
  resolvedTaxRate: ResolvedTaxRate;
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
  cessType?: CessType;
  cessAmountPerUnitPaise?: number;
  quantity?: number;
}

export interface GstCalculationTrace {
  gstEngineVersion: string;
  reasonCode: GstReasonCode;
  supplierStateCode: string;
  placeOfSupplyStateCode: string;
  recipientStateCode?: string;
  placeOfSupplyDetermination: PlaceOfSupplyDetermination;
  jurisdiction: GstJurisdiction;
  supplyClassification: SupplyClassification;
  taxTreatment: GstTaxTreatment;
  taxMechanism: TaxMechanism;
  zeroRatedMethod?: ZeroRatedMethod;
  taxRateId: string;
  taxRateVersion: string;
  effectiveRate: number;
  explanation: string;
}

export interface GstLineResult {
  taxablePaise: number;
  taxableAmount: number;
  cgstRate: number;
  cgstPaise: number;
  cgstAmount: number;
  sgstRate: number;
  sgstPaise: number;
  sgstAmount: number;
  utgstRate: number;
  utgstPaise: number;
  utgstAmount: number;
  igstRate: number;
  igstPaise: number;
  igstAmount: number;
  cessRate: number;
  cessType: CessType;
  adValoremCessPaise: number;
  specificCessPaise: number;
  cessPaise: number;
  cessAmount: number;
  totalTaxPaise: number;
  totalTaxAmount: number;
  totalLineAmountPaise: number;
  totalLineAmount: number;
  jurisdiction: GstJurisdiction;
  componentsApplied: GstComponent[];
  trace: GstCalculationTrace;
}
