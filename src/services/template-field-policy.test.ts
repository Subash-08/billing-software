/**
 * Template Field Policy & Document Compliance Profile Unit Tests
 * src/services/template-field-policy.test.ts
 */

import { describe, it, expect } from 'vitest';
import { TemplateFieldPolicyService, TemplatePolicyViolationError } from './template-field-policy.service';
import { TransactionContext } from '@/engine/policy/transaction.context';

function makeContext(overrides: Partial<TransactionContext>): TransactionContext {
  return {
    documentType: 'TAX_INVOICE',
    invoiceDate: new Date('2026-08-31'),
    financialYear: '2026-27',
    supplierStateCode: '33',
    placeOfSupplyStateCode: '33',
    supplyType: 'GOODS',
    supplyClassification: 'DOMESTIC',
    taxTreatment: 'TAXABLE',
    taxMechanism: 'FORWARD_CHARGE',
    recipientGstRegistrationStatus: 'REGISTERED',
    supplierGstRegistrationType: 'REGULAR',
    eInvoiceApplicable: false,
    grandTotalPaise: 590000,
    totalIgstPaise: 0,
    totalCgstPaise: 45000,
    totalSgstPaise: 45000,
    totalUtgstPaise: 0,
    totalCessPaise: 0,
    reverseCharge: false,
    ...overrides,
  };
}

describe('TemplateFieldPolicyService', () => {
  describe('validateTemplateConfig (Save-time enforcement)', () => {
    it('Rejects saving a template when a REQUIRED field is set to HIDDEN', () => {
      expect(() => {
        TemplateFieldPolicyService.validateTemplateConfig(
          { fieldVisibility: { itemDescription: 'HIDDEN' } as any },
          'TAX_INVOICE'
        );
      }).toThrow(TemplatePolicyViolationError);
    });

    it('Rejects saving a template when a FORBIDDEN field is set to VISIBLE on Bill of Supply', () => {
      expect(() => {
        TemplateFieldPolicyService.validateTemplateConfig(
          { fieldVisibility: { itemCgst: 'VISIBLE' } as any },
          'BILL_OF_SUPPLY'
        );
      }).toThrow(TemplatePolicyViolationError);
    });

    it('Allows saving a template with valid VISIBLE and AUTO settings', () => {
      expect(() => {
        TemplateFieldPolicyService.validateTemplateConfig(
          { fieldVisibility: { customerGstin: 'AUTO', bankDetails: 'VISIBLE' } as any },
          'TAX_INVOICE'
        );
      }).not.toThrow();
    });
  });

  describe('resolveEffectiveVisibility (Render-time AUTO resolution)', () => {
    it('Resolves REQUIRED fields to true regardless of user setting', () => {
      const mockTemplate = { fieldVisibility: {} } as any;
      const ctx = makeContext({});
      const vis = TemplateFieldPolicyService.resolveEffectiveVisibility(mockTemplate, ctx);
      expect(vis.itemDescription).toBe(true);
      expect(vis.subtotalRow).toBe(true);
    });

    it('Resolves FORBIDDEN fields to false on Bill of Supply', () => {
      const mockTemplate = { fieldVisibility: {} } as any;
      const ctx = makeContext({ documentType: 'BILL_OF_SUPPLY' });
      const vis = TemplateFieldPolicyService.resolveEffectiveVisibility(mockTemplate, ctx);
      expect(vis.itemCgst).toBe(false);
      expect(vis.cgstRow).toBe(false);
    });

    it('Resolves customerGstin AUTO to true for B2B registered recipient', () => {
      const mockTemplate = { fieldVisibility: { customerGstin: 'AUTO' } } as any;
      const ctx = makeContext({ recipientGstRegistrationStatus: 'REGISTERED' });
      const vis = TemplateFieldPolicyService.resolveEffectiveVisibility(mockTemplate, ctx);
      expect(vis.customerGstin).toBe(true);
    });

    it('Resolves customerGstin AUTO to false for B2C unregistered recipient', () => {
      const mockTemplate = { fieldVisibility: { customerGstin: 'AUTO' } } as any;
      const ctx = makeContext({ recipientGstRegistrationStatus: 'UNREGISTERED' });
      const vis = TemplateFieldPolicyService.resolveEffectiveVisibility(mockTemplate, ctx);
      expect(vis.customerGstin).toBe(false);
    });

    it('Resolves IGST AUTO to true for inter-state supply and false for intra-state', () => {
      const mockTemplate = { fieldVisibility: { igstRow: 'AUTO', cgstRow: 'AUTO' } } as any;
      const intraCtx = makeContext({ supplierStateCode: '33', placeOfSupplyStateCode: '33', totalCgstPaise: 45000, totalIgstPaise: 0 });
      const interCtx = makeContext({ supplierStateCode: '33', placeOfSupplyStateCode: '29', totalCgstPaise: 0, totalIgstPaise: 90000 });

      const intraVis = TemplateFieldPolicyService.resolveEffectiveVisibility(mockTemplate, intraCtx);
      expect(intraVis.cgstRow).toBe(true);
      expect(intraVis.igstRow).toBe(false);

      const interVis = TemplateFieldPolicyService.resolveEffectiveVisibility(mockTemplate, interCtx);
      expect(interVis.cgstRow).toBe(false);
      expect(interVis.igstRow).toBe(true);
    });
  });
});
