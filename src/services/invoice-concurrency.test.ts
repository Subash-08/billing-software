/**
 * Concurrency & Idempotency Race-Condition Unit Tests
 * src/services/invoice-concurrency.test.ts
 */

import { describe, it, expect } from 'vitest';
import { InvoiceCancellationPolicy } from '@/engine/policy/invoice-cancellation.policy';

describe('Invoice Concurrency & Idempotency Rules', () => {
  describe('InvoiceCancellationPolicy Evaluation', () => {
    it('Allows direct cancellation for DRAFT invoice', () => {
      const mockInvoice: any = { status: 'DRAFT' };
      const res = InvoiceCancellationPolicy.evaluate(mockInvoice, 0, 0);
      expect(res.decision).toBe('ALLOWED');
      expect(res.canCancelDirectly).toBe(true);
    });

    it('Blocks direct cancellation when active payment allocations exist', () => {
      const mockInvoice: any = { status: 'ISSUED', paidAmount: 50000 };
      const res = InvoiceCancellationPolicy.evaluate(mockInvoice, 50000, 0);
      expect(res.decision).toBe('REQUIRES_CREDIT_NOTE');
      expect(res.canCancelDirectly).toBe(false);
      expect(res.blockers).toHaveLength(1);
    });

    it('Blocks direct cancellation when IRN has been generated', () => {
      const mockInvoice: any = { status: 'ISSUED', paidAmount: 0, einvoiceStatus: 'GENERATED' };
      const res = InvoiceCancellationPolicy.evaluate(mockInvoice, 0, 0);
      expect(res.decision).toBe('REQUIRES_EINVOICE_CANCELLATION');
      expect(res.canCancelDirectly).toBe(false);
    });

    it('Blocks cancellation for already CANCELLED invoice', () => {
      const mockInvoice: any = { status: 'CANCELLED' };
      const res = InvoiceCancellationPolicy.evaluate(mockInvoice, 0, 0);
      expect(res.decision).toBe('BLOCKED');
      expect(res.canCancelDirectly).toBe(false);
    });

    it('Allows direct cancellation for ISSUED invoice with zero payments and no IRN', () => {
      const mockInvoice: any = { status: 'ISSUED', paidAmount: 0, einvoiceStatus: 'NOT_REQUIRED' };
      const res = InvoiceCancellationPolicy.evaluate(mockInvoice, 0, 0);
      expect(res.decision).toBe('ALLOWED');
      expect(res.canCancelDirectly).toBe(true);
    });
  });
});
