import { paiseToRupees } from '@/lib/money';

/**
 * Deterministic Line-Level Component Rounding Policy (LINE_LEVEL_COMPONENT_ROUNDING)
 * Operates on integer paise and component percentage rates.
 */
export function calculateComponentTaxPaise(taxablePaise: number, componentRatePercent: number): number {
  if (taxablePaise <= 0 || componentRatePercent <= 0) return 0;
  return Math.round((taxablePaise * componentRatePercent) / 100);
}

export function formatPaiseToRupees(paise: number): number {
  return paiseToRupees(paise);
}
