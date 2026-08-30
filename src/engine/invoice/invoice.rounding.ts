import { RoundOffPolicy } from './invoice.types';
import { paiseToRupees } from '@/lib/money';

export interface RoundOffResult {
  roundOffPaise: number;
  roundOffAmount: number;
  grandTotalPaise: number;
  grandTotalAmount: number;
}

/**
 * Calculates auto round-off adjustment paise and grand total.
 * Round-off adjusts ONLY the final grand total amount.
 * It NEVER alters taxable value, CGST, SGST, UTGST, IGST, or Cess amounts.
 */
export function applyInvoiceRoundOff(unroundedGrandTotalPaise: number, policy: RoundOffPolicy = 'NEAREST_RUPEE'): RoundOffResult {
  if (policy === 'DISABLED') {
    return {
      roundOffPaise: 0,
      roundOffAmount: 0,
      grandTotalPaise: unroundedGrandTotalPaise,
      grandTotalAmount: paiseToRupees(unroundedGrandTotalPaise),
    };
  }

  // Nearest Rupee rounding: e.g. 10049 -> 10000 (roundOff = -49); 10050 -> 10100 (roundOff = +50)
  const roundedRupees = Math.round(unroundedGrandTotalPaise / 100);
  const roundedGrandTotalPaise = roundedRupees * 100;
  const roundOffPaise = roundedGrandTotalPaise - unroundedGrandTotalPaise;

  return {
    roundOffPaise,
    roundOffAmount: paiseToRupees(roundOffPaise),
    grandTotalPaise: roundedGrandTotalPaise,
    grandTotalAmount: paiseToRupees(roundedGrandTotalPaise),
  };
}
