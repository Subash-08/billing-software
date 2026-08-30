/**
 * Deterministic Money & Financial Precision Engine
 * 
 * LAW: All monetary calculations MUST operate strictly on integer paise (where ₹1 = 100 paise).
 * Floating-point arithmetic is strictly forbidden in financial calculations.
 */

/**
 * Converts Rupee amount (decimal) to integer paise.
 * Example: 125.50 -> 12550 paise
 */
export function rupeesToPaise(rupees: number): number {
  return Math.round((rupees + Number.EPSILON) * 100);
}

/**
 * Converts integer paise to Rupee amount (decimal) for display/storage.
 * Example: 12550 paise -> 125.50
 */
export function paiseToRupees(paise: number): number {
  return paise / 100;
}

/**
 * Deterministically rounds a Rupee decimal amount to exactly two decimal places.
 */
export function roundToTwoDecimals(amount: number): number {
  return paiseToRupees(rupeesToPaise(amount));
}

/**
 * Calculates line taxable amount in integer paise.
 * Taxable Paise = Gross Paise - Discount Paise
 */
export function calculateTaxablePaise(grossPaise: number, discountPaise: number): number {
  return Math.max(0, grossPaise - discountPaise);
}

/**
 * Calculates tax amount in integer paise given taxable paise and GST percentage rate.
 * Tax Paise = Math.round((Taxable Paise * Rate) / 100)
 */
export function calculateTaxPaise(taxablePaise: number, ratePercent: number): number {
  return Math.round((taxablePaise * ratePercent) / 100);
}

/**
 * Sums an array of paise amounts deterministically.
 */
export function sumPaise(amountsInPaise: number[]): number {
  return amountsInPaise.reduce((acc, curr) => Math.round(acc) + Math.round(curr), 0);
}
