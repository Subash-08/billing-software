import {
  GstJurisdiction,
  SupplyClassification,
  PlaceOfSupplyDetermination,
  GstReasonCode,
} from './gst.types';
import { getTerritoryConfig, isValidGstStateCode } from './gst.constants';
import { InvalidStateCodeError } from './gst.errors';

export interface PlaceOfSupplyInput {
  supplierStateCode: string;
  placeOfSupplyStateCode: string;
  supplyClassification?: SupplyClassification;
  placeOfSupplyDetermination?: PlaceOfSupplyDetermination;
}

export interface PlaceOfSupplyResult {
  jurisdiction: GstJurisdiction;
  reasonCode: GstReasonCode;
  placeOfSupplyDetermination: PlaceOfSupplyDetermination;
  supplierStateCode: string;
  placeOfSupplyStateCode: string;
}

export function determineJurisdiction(input: PlaceOfSupplyInput): PlaceOfSupplyResult {
  const supplierState = input.supplierStateCode ? input.supplierStateCode.trim() : '';
  const posState = input.placeOfSupplyStateCode ? input.placeOfSupplyStateCode.trim() : '';

  if (!isValidGstStateCode(supplierState)) {
    throw new InvalidStateCodeError(input.supplierStateCode);
  }
  if (!isValidGstStateCode(posState)) {
    throw new InvalidStateCodeError(input.placeOfSupplyStateCode);
  }

  const classification = input.supplyClassification || 'DOMESTIC';
  let determination = input.placeOfSupplyDetermination;

  if (!determination) {
    if (classification === 'EXPORT') {
      determination = 'EXPORT';
    } else if (classification === 'SEZ') {
      determination = 'SEZ';
    } else {
      determination = 'CUSTOMER_LOCATION';
    }
  }

  // 1. Export / SEZ supplies are legally Inter-State supplies under IGST Act
  if (classification === 'EXPORT') {
    return {
      jurisdiction: 'INTER_STATE',
      reasonCode: 'EXPORT_ZERO_RATED',
      placeOfSupplyDetermination: determination,
      supplierStateCode: supplierState,
      placeOfSupplyStateCode: posState,
    };
  }

  if (classification === 'SEZ') {
    return {
      jurisdiction: 'INTER_STATE',
      reasonCode: 'SEZ_ZERO_RATED',
      placeOfSupplyDetermination: determination,
      supplierStateCode: supplierState,
      placeOfSupplyStateCode: posState,
    };
  }

  // 2. Inter-State Domestic Supply
  if (supplierState !== posState) {
    return {
      jurisdiction: 'INTER_STATE',
      reasonCode: 'INTER_STATE',
      placeOfSupplyDetermination: determination,
      supplierStateCode: supplierState,
      placeOfSupplyStateCode: posState,
    };
  }

  // 3. Intra-State Domestic Supply: Check if Union Territory without legislature
  const territory = getTerritoryConfig(supplierState);
  if (territory && territory.utgstApplicable) {
    return {
      jurisdiction: 'UNION_TERRITORY',
      reasonCode: 'UT_SUPPLY',
      placeOfSupplyDetermination: determination,
      supplierStateCode: supplierState,
      placeOfSupplyStateCode: posState,
    };
  }

  return {
    jurisdiction: 'INTRA_STATE',
    reasonCode: 'INTRA_STATE',
    placeOfSupplyDetermination: determination,
    supplierStateCode: supplierState,
    placeOfSupplyStateCode: posState,
  };
}
