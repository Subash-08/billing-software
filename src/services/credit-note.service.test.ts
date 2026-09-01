import { describe, it, expect } from 'vitest';

/**
 * Pure Domain Settlement Calculator for Credit Notes & Invoices
 */
export function calculateCreditNoteSettlement(params: {
  invoiceGrandTotalPaise: number;
  invoicePaidAmountPaise: number;
  invoicePriorReturnedPaise: number;
  creditNoteGrandTotalPaise: number;
}) {
  const currentOutstandingPaise = Math.max(
    0,
    params.invoiceGrandTotalPaise - params.invoicePaidAmountPaise - params.invoicePriorReturnedPaise
  );

  const offsetPaise = Math.min(params.creditNoteGrandTotalPaise, currentOutstandingPaise);
  const remainingOutstandingPaise = currentOutstandingPaise - offsetPaise;
  const refundDuePaise = Math.max(0, params.creditNoteGrandTotalPaise - offsetPaise);

  return {
    historicalPaidAmountPaise: params.invoicePaidAmountPaise, // NEVER MUTATED!
    newReturnedAmountPaise: params.invoicePriorReturnedPaise + params.creditNoteGrandTotalPaise,
    offsetAppliedToOutstandingPaise: offsetPaise,
    remainingOutstandingPaise,
    refundDuePaise,
    paymentStatus: remainingOutstandingPaise === 0 ? 'PAID' : 'PARTIALLY_PAID',
  };
}

describe('Credit Note Domain Service & Settlement Invariants', () => {
  it('1. Credit Note against partially paid invoice (CN > Outstanding)', () => {
    // Scenario: Invoice ₹1,41,600, Paid ₹50,000, Outstanding ₹91,600, Credit Note ₹1,29,800
    const result = calculateCreditNoteSettlement({
      invoiceGrandTotalPaise: 14160000,
      invoicePaidAmountPaise: 5000000,
      invoicePriorReturnedPaise: 0,
      creditNoteGrandTotalPaise: 12980000,
    });

    expect(result.historicalPaidAmountPaise).toBe(5000000); // Historical payment remains ₹50,000!
    expect(result.offsetAppliedToOutstandingPaise).toBe(9160000); // Offsets ₹91,600 outstanding to ₹0!
    expect(result.remainingOutstandingPaise).toBe(0);
    expect(result.refundDuePaise).toBe(3820000); // ₹38,200 Refund Due created!
    expect(result.newReturnedAmountPaise).toBe(12980000);
    expect(result.paymentStatus).toBe('PAID');
  });

  it('2. Credit Note against unpaid invoice (CN < Invoice Total)', () => {
    // Scenario: Invoice ₹1,00,000, Paid ₹0, Credit Note ₹40,000
    const result = calculateCreditNoteSettlement({
      invoiceGrandTotalPaise: 10000000,
      invoicePaidAmountPaise: 0,
      invoicePriorReturnedPaise: 0,
      creditNoteGrandTotalPaise: 4000000,
    });

    expect(result.historicalPaidAmountPaise).toBe(0);
    expect(result.offsetAppliedToOutstandingPaise).toBe(4000000);
    expect(result.remainingOutstandingPaise).toBe(6000000); // ₹60,000 due remaining!
    expect(result.refundDuePaise).toBe(0);
    expect(result.paymentStatus).toBe('PARTIALLY_PAID');
  });

  it('3. Credit Note issuance MUST NEVER alter historical payment received amount', () => {
    const result = calculateCreditNoteSettlement({
      invoiceGrandTotalPaise: 5000000,
      invoicePaidAmountPaise: 2000000, // ₹20,000 paid
      invoicePriorReturnedPaise: 0,
      creditNoteGrandTotalPaise: 2500000, // ₹25,000 return
    });

    expect(result.historicalPaidAmountPaise).toBe(2000000); // Exactly ₹20,000 preserved!
    expect(result.offsetAppliedToOutstandingPaise).toBe(2500000);
    expect(result.remainingOutstandingPaise).toBe(500000);
    expect(result.refundDuePaise).toBe(0);
  });

  it('4. Fully paid invoice with partial return', () => {
    // Scenario: Invoice ₹50,000, Paid ₹50,000, Outstanding ₹0, Return ₹10,000
    const result = calculateCreditNoteSettlement({
      invoiceGrandTotalPaise: 5000000,
      invoicePaidAmountPaise: 5000000,
      invoicePriorReturnedPaise: 0,
      creditNoteGrandTotalPaise: 1000000,
    });

    expect(result.historicalPaidAmountPaise).toBe(5000000);
    expect(result.offsetAppliedToOutstandingPaise).toBe(0);
    expect(result.remainingOutstandingPaise).toBe(0);
    expect(result.refundDuePaise).toBe(1000000); // Entire ₹10,000 becomes Refund Due!
  });
});
