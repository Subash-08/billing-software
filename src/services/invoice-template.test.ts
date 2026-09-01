/**
 * Invoice Template Service & Historical Snapshot Immutability Unit Tests
 * src/services/invoice-template.test.ts
 */

import { describe, it, expect } from 'vitest';
import { invoiceTemplateService } from './invoice-template.service';
import { IInvoiceTemplate } from '@/db/models/invoice-template.model';

describe('InvoiceTemplateService', () => {
  describe('buildTemplateSnapshot', () => {
    it('Creates a complete serializable snapshot containing templateMode, margins, and branding URLs', () => {
      const mockTemplate = {
        _id: '507f1f77bcf86cd799439011',
        version: 3,
        templateMode: 'PRE_PRINTED_LETTERHEAD',
        paperSize: 'A4',
        orientation: 'PORTRAIT',
        pageMargins: { topMm: 12, bottomMm: 15, leftMm: 10, rightMm: 10 },
        letterheadConfig: {
          reservedHeaderHeightMm: 45,
          reservedFooterHeightMm: 30,
          calibrationTopOffsetMm: 2,
          calibrationLeftOffsetMm: -1,
        },
        logoConfig: { enabled: false, alignment: 'LEFT', widthMm: 40, maxHeightMm: 20 },
        companyHeaderConfig: { showName: true, showAddress: true, showPhone: true, showEmail: true, showGstin: true, alignment: 'LEFT' },
        signatoryConfig: { showAuthorizedSignature: true, signatoryLabel: 'Manager Signature' },
        headerConfig: { layout: 'DETAILS_ONLY', showLogo: false },
        itemColumns: [
          { key: 'serialNo', label: '#', visible: true, align: 'CENTER' },
          { key: 'name', label: 'Item', visible: true, align: 'LEFT' },
        ],
        fieldVisibility: {
          customerPhone: 'VISIBLE',
          bankDetails: 'AUTO',
          termsAndConditions: 'VISIBLE',
        },
        sectionOrder: ['HEADER', 'ITEM_TABLE', 'TAX_SUMMARY', 'SIGNATURE'],
        styling: { baseFontSizePt: 10, tableDensity: 'COMPACT', accentColor: '#2563eb', primaryColor: '#0f172a' },
        termsText: 'Custom terms of business.',
        declarationText: 'Custom declaration text.',
        toObject: function () { return this; },
      } as unknown as IInvoiceTemplate;

      const snapshot = invoiceTemplateService.buildTemplateSnapshot(
        mockTemplate,
        'https://res.cloudinary.com/demo/logo.png',
        'https://res.cloudinary.com/demo/signature.png'
      );

      expect(snapshot.templateId).toBe('507f1f77bcf86cd799439011');
      expect(snapshot.templateVersion).toBe(3);
      expect(snapshot.templateMode).toBe('PRE_PRINTED_LETTERHEAD');
      expect((snapshot.pageMargins as any).topMm).toBe(12);
      expect((snapshot.letterheadConfig as any).reservedHeaderHeightMm).toBe(45);
      expect(snapshot.logoUrl).toBe('https://res.cloudinary.com/demo/logo.png');
      expect(snapshot.signatureUrl).toBe('https://res.cloudinary.com/demo/signature.png');
      expect(snapshot.snapshotAt).toBeDefined();
    });
  });
});
