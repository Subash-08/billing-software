import { describe, it, expect } from 'vitest';
import {
  rupeesToPaise,
  paiseToRupees,
  calculateTaxablePaise,
  calculateTaxPaise,
  sumPaise,
} from './money';

describe('Deterministic Money & Financial Precision Utilities', () => {
  it('rupeesToPaise accurately converts decimals to integer paise', () => {
    expect(rupeesToPaise(125.5)).toBe(12550);
    expect(rupeesToPaise(0.1 + 0.2)).toBe(30); // Eliminates 0.30000000000000004 floating-point drift
    expect(rupeesToPaise(175.0)).toBe(17500);
    expect(rupeesToPaise(26250.0)).toBe(2625000);
  });

  it('paiseToRupees accurately converts integer paise to decimal Rupees', () => {
    expect(paiseToRupees(12550)).toBe(125.5);
    expect(paiseToRupees(30)).toBe(0.3);
    expect(paiseToRupees(2625000)).toBe(26250);
  });

  it('calculateTaxablePaise accurately computes taxable paise', () => {
    const grossPaise = rupeesToPaise(1000); // 100,000 paise
    const discountPaise = rupeesToPaise(100); // 10,000 paise
    expect(calculateTaxablePaise(grossPaise, discountPaise)).toBe(90000);
  });

  it('calculateTaxPaise computes exact GST in integer paise without floating point drift', () => {
    const taxablePaise = rupeesToPaise(175); // 17,500 paise
    // 18% GST -> 3,150 paise (₹31.50)
    expect(calculateTaxPaise(taxablePaise, 18)).toBe(3150);
    expect(paiseToRupees(calculateTaxPaise(taxablePaise, 18))).toBe(31.5);
  });

  it('sumPaise deterministically sums financial values', () => {
    const item1 = rupeesToPaise(10.1);
    const item2 = rupeesToPaise(20.2);
    const totalPaise = sumPaise([item1, item2]);
    expect(totalPaise).toBe(3030); // ₹30.30
    expect(paiseToRupees(totalPaise)).toBe(30.3);
  });
});
