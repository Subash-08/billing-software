/**
 * HSN / SAC Validator & Reporting Code Resolver
 * src/engine/gst/hsn-sac.validator.ts
 *
 * Architecture Invariants:
 * 1. Structural Validation (Hard block): Numeric only, digits length range check,
 *    itemType consistency (GOODS must use HSN; SERVICES must use SAC).
 * 2. Reporting Code Resolution (Storage vs Presentation):
 *    resolveHsnReportingCode() preserves full stored code while deriving
 *    the required digit representation for GSTR reporting.
 * 3. Master Lookup (Diagnostic warning only):
 *    MASTER_NOT_FOUND / MASTER_UNAVAILABLE raise audit warnings; NEVER block invoice issuance.
 */

import { connectToDatabase } from '@/db/connection';
import { HsnSacModel } from '@/db/models/hsn-sac.model';

export type HsnValidationError =
  | 'MISSING_CLASSIFICATION'
  | 'NON_NUMERIC_CHARACTERS'
  | 'BELOW_MINIMUM_DIGITS'
  | 'SAC_ON_GOODS'
  | 'HSN_ON_SERVICES'
  | 'BELOW_REQUIRED_REPORTING_LEVEL';

export type HsnMasterStatus =
  | 'MASTER_MATCH'
  | 'MASTER_NOT_FOUND'
  | 'MASTER_INACTIVE'
  | 'MASTER_UNAVAILABLE';

export interface HsnValidationResult {
  valid: boolean;
  errors: HsnValidationError[];
  errorMessages: string[];
}

export interface HsnReportingCodeResult {
  valid: boolean;
  reportingCode: string;
  fullCode: string;
  error?: HsnValidationError;
}

export interface HsnMasterCheckResult {
  status: HsnMasterStatus;
  description?: string;
  gstRate?: number;
}

export class HsnSacValidator {
  /**
   * Layer 1 & 2: Hard structural and type consistency validation.
   * Fails if code contains non-digits, has wrong length, or mismatches item type.
   */
  public static validateStructure(
    code: string | undefined | null,
    itemType: 'GOODS' | 'SERVICES',
    requiredDigits: 4 | 6 | 8 = 4
  ): HsnValidationResult {
    const errors: HsnValidationError[] = [];
    const errorMessages: string[] = [];

    if (!code || code.trim().length === 0) {
      errors.push('MISSING_CLASSIFICATION');
      errorMessages.push(`${itemType} line item must have a valid ${itemType === 'GOODS' ? 'HSN' : 'SAC'} code before issuing.`);
      return { valid: false, errors, errorMessages };
    }

    const cleanCode = code.trim();

    // Numeric check
    if (!/^\d+$/.test(cleanCode)) {
      errors.push('NON_NUMERIC_CHARACTERS');
      errorMessages.push(`HSN/SAC code '${cleanCode}' contains non-numeric characters.`);
    }

    // Length bounds check (HSN: 2-8 digits; SAC: 6 digits starting with 99)
    if (cleanCode.length < 2 || cleanCode.length > 8) {
      errors.push('BELOW_MINIMUM_DIGITS');
      errorMessages.push(`HSN/SAC code '${cleanCode}' length must be between 2 and 8 digits.`);
    }

    // Type consistency check
    if (itemType === 'SERVICES') {
      // SAC codes start with '99' and are 6 digits
      if (!cleanCode.startsWith('99')) {
        errors.push('HSN_ON_SERVICES');
        errorMessages.push(`Service item has code '${cleanCode}', but SAC codes for services must start with '99'.`);
      }
    } else if (itemType === 'GOODS') {
      // GOODS cannot use SAC (cannot start with 99 and be 6 digits)
      if (cleanCode.length === 6 && cleanCode.startsWith('99')) {
        errors.push('SAC_ON_GOODS');
        errorMessages.push(`Goods item has SAC code '${cleanCode}'. Goods items must use HSN codes, not SAC service codes.`);
      }
    }

    // Reporting digit level check
    if (cleanCode.length < requiredDigits) {
      errors.push('BELOW_REQUIRED_REPORTING_LEVEL');
      errorMessages.push(`HSN code '${cleanCode}' (${cleanCode.length} digits) is below required reporting level of ${requiredDigits} digits.`);
    }

    return {
      valid: errors.length === 0,
      errors,
      errorMessages,
    };
  }

  /**
   * Derives the reporting representation of an HSN code for GSTR-1 Table 12.
   * Preserves full stored code while slice/formatting for required digit level.
   */
  public static resolveHsnReportingCode(
    storedCode: string,
    requiredDigits: 4 | 6 | 8
  ): HsnReportingCodeResult {
    const clean = (storedCode || '').trim();
    if (clean.length < requiredDigits) {
      return {
        valid: false,
        reportingCode: clean,
        fullCode: clean,
        error: 'BELOW_REQUIRED_REPORTING_LEVEL',
      };
    }

    return {
      valid: true,
      reportingCode: clean.slice(0, requiredDigits),
      fullCode: clean,
    };
  }

  /**
   * Layer 3: Diagnostic Master Lookup.
   * NEVER blocks invoice issuance. Raises warning / audit note if code not found in local master.
   */
  public static async checkMaster(
    code: string,
    type: 'HSN' | 'SAC'
  ): Promise<HsnMasterCheckResult> {
    try {
      await connectToDatabase();
      const record = await HsnSacModel.findOne({ code: code.trim(), type }).lean().exec();

      if (!record) {
        return { status: 'MASTER_NOT_FOUND' };
      }

      if (record.status === 'INACTIVE') {
        return {
          status: 'MASTER_INACTIVE',
          description: record.description,
        };
      }

      return {
        status: 'MASTER_MATCH',
        description: record.description,
      };
    } catch {
      return { status: 'MASTER_UNAVAILABLE' };
    }
  }
}
