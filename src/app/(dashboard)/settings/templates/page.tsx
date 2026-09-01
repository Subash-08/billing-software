'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  FileText,
  Save,
  CheckCircle2,
  Lock,
  Eye,
  MoveUp,
  MoveDown,
  Layout,
  Loader2,
  Plus,
  Copy,
  Trash2,
  Star,
  ArrowLeft,
  AlertCircle,
  Printer,
  Sliders,
  Image as ImageIcon,
  Table2,
  PenLine,
  Settings2,
  ChevronDown,
  ChevronRight,
  Info,
  ExternalLink,
} from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────────

type TemplateMode = 'STANDARD' | 'PRE_PRINTED_LETTERHEAD' | 'DIGITAL_LETTERHEAD';
type FieldVisValue = 'VISIBLE' | 'HIDDEN' | 'AUTO';

interface PageMargins {
  topMm: number;
  bottomMm: number;
  leftMm: number;
  rightMm: number;
}

interface LetterheadConfig {
  reservedHeaderHeightMm: number;
  reservedFooterHeightMm: number;
  calibrationTopOffsetMm: number;
  calibrationLeftOffsetMm: number;
  backgroundMediaUrl?: string;
  backgroundOpacity?: number;
}

interface LogoConfig {
  enabled: boolean;
  alignment: 'LEFT' | 'CENTER' | 'RIGHT';
  widthMm: number;
  maxHeightMm: number;
}

interface StylingConfig {
  baseFontSizePt: number;
  tableDensity: 'COMFORTABLE' | 'COMPACT';
  accentColor: string;
  primaryColor: string;
}

interface ColumnConfig {
  key: string;
  label: string;
  visible: boolean;
  align: 'LEFT' | 'CENTER' | 'RIGHT';
}

export interface InvoiceTemplateData {
  _id: string;
  name: string;
  code: string;
  documentType: string;
  isDefault: boolean;
  isActive?: boolean;
  version: number;
  templateMode: TemplateMode;
  paperSize: string;
  orientation: string;
  pageMargins: PageMargins;
  letterheadConfig: LetterheadConfig;
  logoConfig: LogoConfig;
  companyHeaderConfig: {
    showName: boolean;
    showAddress: boolean;
    showPhone: boolean;
    showEmail: boolean;
    showGstin: boolean;
    showWebsite: boolean;
    showPan: boolean;
    alignment: 'LEFT' | 'CENTER' | 'RIGHT';
  };
  signatoryConfig: {
    showAuthorizedSignature: boolean;
    showCustomerSignature: boolean;
    signatoryLabel: string;
    signatoryName?: string;
    designation?: string;
    signatureImageUrl?: string;
  };
  headerConfig: {
    layout: 'LOGO_LEFT' | 'LOGO_CENTER' | 'LOGO_RIGHT' | 'DETAILS_ONLY';
    showLogo: boolean;
    showTagline: boolean;
    showPhone: boolean;
    showEmail: boolean;
    invoiceTitleOverride?: string;
  };
  itemColumns: ColumnConfig[];
  fieldVisibility: Record<string, FieldVisValue | boolean>;
  sectionOrder: string[];
  styling: StylingConfig;
  termsText: string;
  declarationText: string;
}

// ─── Helper: field visibility tristate ─────────────────────────────────────

function toVisibility(v: FieldVisValue | boolean | undefined): FieldVisValue {
  if (v === true || v === 'VISIBLE') return 'VISIBLE';
  if (v === false || v === 'HIDDEN') return 'HIDDEN';
  return 'AUTO';
}

function cycleVisibility(current: FieldVisValue | boolean | undefined): FieldVisValue {
  const cur = toVisibility(current);
  if (cur === 'VISIBLE') return 'AUTO';
  if (cur === 'AUTO') return 'HIDDEN';
  return 'VISIBLE';
}

const VISIBILITY_STYLES: Record<FieldVisValue, string> = {
  VISIBLE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  AUTO:    'bg-blue-50 text-blue-700 border-blue-200',
  HIDDEN:  'bg-slate-100 text-slate-500 border-slate-200',
};

// ─── Collapsible section ────────────────────────────────────────────────────

function Section({ title, icon, children, defaultOpen = true }: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-[#E5E7EB] rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-[#F9FAFB] hover:bg-slate-50 text-xs font-bold text-[#1F2937] uppercase tracking-wider transition"
      >
        <span className="flex items-center gap-2">{icon}{title}</span>
        {open ? <ChevronDown className="h-3.5 w-3.5 text-slate-400" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}
      </button>
      {open && <div className="p-4 bg-white space-y-3 text-xs">{children}</div>}
    </div>
  );
}

// ─── A4 Live Preview ────────────────────────────────────────────────────────

function A4Preview({ template, logoUrl }: { template: InvoiceTemplateData; logoUrl?: string }) {
  const fv = template.fieldVisibility;
  const isVisible = (key: string) => toVisibility(fv[key]) !== 'HIDDEN';
  const isAuto = (key: string) => toVisibility(fv[key]) === 'AUTO';
  const isPPL = template.templateMode === 'PRE_PRINTED_LETTERHEAD';
  const isDigital = template.templateMode === 'DIGITAL_LETTERHEAD';

  const accentBg = template.styling?.accentColor || '#1e40af';
  const primaryColor = template.styling?.primaryColor || '#0f172a';
  const density = template.styling?.tableDensity === 'COMPACT' ? 'p-1' : 'p-2';
  const fontSizePx = Math.round((template.styling?.baseFontSizePt || 9) * 1.33);

  const A4_PX_HEIGHT = 1122; // 297mm at 96dpi≈ scaled
  const A4_PX_WIDTH = 794;   // 210mm at 96dpi scaled
  const SCALE = 0.48; // Fit to panel

  const topReserved = isPPL ? template.letterheadConfig?.reservedHeaderHeightMm || 40 : 0;
  const bottomReserved = isPPL ? template.letterheadConfig?.reservedFooterHeightMm || 25 : 0;
  const topReservedPx = (topReserved / 297) * A4_PX_HEIGHT;
  const bottomReservedPx = (bottomReserved / 297) * A4_PX_HEIGHT;

  const visibleColumns = (template.itemColumns || []).filter(c => c.visible);

  const logoAlignment = template.logoConfig?.alignment || 'LEFT';
  const showLogo = template.logoConfig?.enabled !== false && !isPPL && template.headerConfig?.showLogo;

  const companyHeaderAlignment = template.companyHeaderConfig?.alignment || 'LEFT';

  const renderLogo = () => {
    if (!showLogo) return null;
    if (logoUrl) {
      return (
        <img
          src={logoUrl}
          alt="Company Logo"
          style={{
            maxWidth: `${(template.logoConfig?.widthMm || 40) * 1.2}px`,
            maxHeight: `${(template.logoConfig?.maxHeightMm || 20) * 1.2}px`,
          }}
          className="object-contain shrink-0"
        />
      );
    }
    return (
      <Link
        href="/settings/branding"
        target="_blank"
        className="px-2 py-1 bg-amber-50 border border-amber-300 rounded text-[7px] text-amber-700 font-bold hover:bg-amber-100 shrink-0 flex items-center gap-0.5"
      >
        + Upload Logo in Branding
      </Link>
    );
  };

  return (
    <div
      className="relative bg-white shadow-2xl ring-1 ring-slate-200 overflow-hidden select-none flex-shrink-0"
      style={{
        width: A4_PX_WIDTH * SCALE,
        height: A4_PX_HEIGHT * SCALE,
        fontSize: fontSizePx * SCALE * 1.2,
        backgroundImage: isDigital && template.letterheadConfig?.backgroundMediaUrl
          ? `url(${template.letterheadConfig.backgroundMediaUrl})`
          : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Digital letterhead opacity overlay */}
      {isDigital && template.letterheadConfig?.backgroundMediaUrl && (
        <div className="absolute inset-0 bg-white pointer-events-none"
          style={{ opacity: 1 - (template.letterheadConfig.backgroundOpacity ?? 1) }} />
      )}

      {/* Pre-printed letterhead reserved area indicator */}
      {isPPL && topReservedPx > 0 && (
        <div className="absolute left-0 right-0 top-0 border-b-2 border-dashed border-amber-400 bg-amber-50/70 flex items-center justify-center"
          style={{ height: topReservedPx * SCALE }}>
          <span className="text-amber-700 font-bold text-[8px]">PRE-PRINTED HEADER RESERVED ({topReserved}mm)</span>
        </div>
      )}
      {isPPL && bottomReservedPx > 0 && (
        <div className="absolute left-0 right-0 bottom-0 border-t-2 border-dashed border-amber-400 bg-amber-50/70 flex items-center justify-center"
          style={{ height: bottomReservedPx * SCALE }}>
          <span className="text-amber-700 font-bold text-[8px]">PRE-PRINTED FOOTER RESERVED ({bottomReserved}mm)</span>
        </div>
      )}

      {/* Printable content area */}
      <div className="absolute overflow-hidden"
        style={{
          top: topReservedPx * SCALE,
          bottom: bottomReservedPx * SCALE,
          left: 0,
          right: 0,
          padding: `${(template.pageMargins?.topMm || 10) * SCALE * 0.6}px ${(template.pageMargins?.rightMm || 10) * SCALE * 0.6}px`,
        }}>

        {/* HEADER Section */}
        {template.sectionOrder.includes('HEADER') && (
          <div className="flex items-start justify-between border-b border-slate-200 pb-2 mb-2">
            {logoAlignment === 'LEFT' && renderLogo()}
            <div className={`flex-1 ${companyHeaderAlignment === 'CENTER' ? 'text-center' : companyHeaderAlignment === 'RIGHT' ? 'text-right' : ''}`}>
              {template.companyHeaderConfig?.showName !== false && (
                <div className="font-bold text-[9px] leading-tight" style={{ color: primaryColor }}>
                  {template.headerConfig?.invoiceTitleOverride || 'APEX TECHNOLOGIES PVT LTD'}
                </div>
              )}
              {template.companyHeaderConfig?.showAddress !== false && (
                <div className="text-[7px] text-slate-500 leading-tight">100 Mount Road, Guindy, Chennai - 600032</div>
              )}
              {template.companyHeaderConfig?.showGstin !== false && (
                <div className="text-[7px] font-semibold text-slate-600">GSTIN: 33AAAAA0000A1Z5</div>
              )}
              {template.companyHeaderConfig?.showPhone !== false && (
                <div className="text-[7px] text-slate-400">Ph: +91 98400 99999</div>
              )}
            </div>
            {logoAlignment === 'RIGHT' && renderLogo()}
            <div className="text-right ml-2 flex-shrink-0">
              <div className="text-[9px] font-black uppercase tracking-wide" style={{ color: accentBg }}>TAX INVOICE</div>
              <div className="text-[7px] font-mono text-slate-500">INV-2627-0001</div>
            </div>
          </div>
        )}

        {/* INVOICE_META */}
        {template.sectionOrder.includes('INVOICE_META') && (
          <div className="grid grid-cols-3 gap-1 p-1.5 bg-slate-50 rounded border border-slate-200 mb-2 text-[7px]">
            <div><span className="text-slate-400">Invoice Date:</span><br/><b>25/08/2026</b></div>
            {isVisible('dueDate') && (
              <div>
                <span className="text-slate-400">Due Date:</span><br/><b>24/09/2026</b>
                {isAuto('dueDate') && <span className="text-blue-400 ml-0.5">(auto)</span>}
              </div>
            )}
            <div><span className="text-slate-400">Place of Supply:</span><br/><b>Karnataka (29)</b></div>
          </div>
        )}

        {/* CUSTOMER_DETAILS */}
        {template.sectionOrder.includes('CUSTOMER_DETAILS') && (
          <div className={`grid gap-2 border-b border-slate-100 pb-2 mb-2 ${isVisible('shippingAddress') ? 'grid-cols-2' : 'grid-cols-1'}`}>
            <div>
              <div className="text-[6px] font-bold text-slate-400 uppercase mb-0.5">Bill To</div>
              <div className="font-bold text-[8px] text-slate-800">Karnataka Traders Ltd</div>
              <div className="text-[7px] text-slate-500">200 Indiranagar, Bengaluru, KA 560038</div>
              {isVisible('customerGstin') && <div className="text-[7px] font-semibold">GSTIN: 29BBBCB8888B1Z2</div>}
              {isVisible('customerPhone') && <div className="text-[7px] text-slate-400">Ph: 98800 88888</div>}
            </div>
            {isVisible('shippingAddress') && (
              <div>
                <div className="text-[6px] font-bold text-slate-400 uppercase mb-0.5">Ship To</div>
                <div className="font-bold text-[8px] text-slate-800">KT Warehouse</div>
                <div className="text-[7px] text-slate-500">Peenya Industrial Area, Bengaluru</div>
              </div>
            )}
          </div>
        )}

        {/* ITEM_TABLE */}
        {template.sectionOrder.includes('ITEM_TABLE') && (
          <div className="mb-2 border border-slate-200 rounded overflow-hidden">
            <table className="w-full border-collapse text-[6.5px]">
              <thead>
                <tr style={{ backgroundColor: accentBg, color: 'white' }}>
                  {visibleColumns.length > 0 ? visibleColumns.map(col => (
                    <th key={col.key} className={`${density} font-semibold text-${col.align === 'RIGHT' ? 'right' : col.align === 'CENTER' ? 'center' : 'left'}`}>{col.label}</th>
                  )) : (
                    <>
                      <th className={`${density} text-left`}>#</th>
                      <th className={`${density} text-left`}>Item</th>
                      <th className={`${density} text-center`}>HSN</th>
                      <th className={`${density} text-right`}>Qty</th>
                      <th className={`${density} text-right`}>Rate</th>
                      <th className={`${density} text-right`}>Amount</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-slate-100">
                  {visibleColumns.length > 0 ? visibleColumns.map(col => (
                    <td key={col.key} className={`${density} text-${col.align === 'RIGHT' ? 'right' : col.align === 'CENTER' ? 'center' : 'left'} text-slate-700`}>
                      {col.key === 'name' ? 'Cloud Software License' :
                       col.key === 'serialNo' ? '1' :
                       col.key === 'hsnSac' ? '8471' :
                       col.key === 'quantity' ? '1' :
                       col.key === 'unit' ? 'PCS' :
                       col.key === 'rate' ? '₹1,000' :
                       col.key === 'taxableValue' ? '₹1,000' :
                       col.key === 'gstRate' ? '18%' :
                       col.key === 'cgst' ? '₹90' :
                       col.key === 'sgst' ? '₹90' :
                       col.key === 'igst' ? '₹180' :
                       col.key === 'total' ? '₹1,180' :
                       col.key === 'discount' ? '—' : '—'}
                    </td>
                  )) : (
                    <>
                      <td className={`${density}`}>1</td>
                      <td className={`${density}`}>Cloud Software License</td>
                      <td className={`${density} text-center`}>8471</td>
                      <td className={`${density} text-right`}>1 PCS</td>
                      <td className={`${density} text-right`}>₹1,000</td>
                      <td className={`${density} text-right font-bold`}>₹1,180</td>
                    </>
                  )}
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* TAX_SUMMARY */}
        {template.sectionOrder.includes('TAX_SUMMARY') && (
          <div className="flex justify-end mb-2">
            <div className="w-36 space-y-0.5 text-[6.5px]">
              {isVisible('subtotalRow') && <div className="flex justify-between"><span>Subtotal:</span><span>₹1,000.00</span></div>}
              {isVisible('cgstRow') && <div className="flex justify-between text-blue-600"><span>CGST (9%):</span><span>₹90.00</span></div>}
              {isVisible('sgstRow') && <div className="flex justify-between text-blue-600"><span>SGST (9%):</span><span>₹90.00</span></div>}
              {isVisible('igstRow') && <div className="flex justify-between text-blue-600"><span>IGST (18%):</span><span>₹180.00</span></div>}
              {isVisible('roundOffRow') && <div className="flex justify-between text-slate-400"><span>Round Off:</span><span>+₹0.00</span></div>}
              <div className="flex justify-between font-bold border-t border-slate-300 pt-0.5 text-[7px]" style={{ color: accentBg }}>
                <span>Grand Total:</span><span>₹1,180.00</span>
              </div>
            </div>
          </div>
        )}

        {/* BANK_DETAILS */}
        {template.sectionOrder.includes('BANK_DETAILS') && isVisible('bankDetails') && (
          <div className="p-1.5 bg-slate-50 rounded border border-slate-200 text-[6.5px] mb-1.5 space-y-0.5">
            <div className="font-bold text-slate-700 uppercase text-[5.5px] tracking-wider">Bank Details</div>
            <div>HDFC Bank | A/C: 50200012345678 | IFSC: HDFC0001234</div>
          </div>
        )}

        {/* TERMS */}
        {template.sectionOrder.includes('TERMS') && isVisible('termsAndConditions') && (
          <div className="text-[6px] text-slate-500 border-t border-slate-200 pt-1.5 mb-1">
            <b className="text-slate-600 uppercase text-[5.5px] tracking-wider block mb-0.5">Terms &amp; Conditions</b>
            <span className="whitespace-pre-line">{(template.termsText || '').substring(0, 120)}{template.termsText?.length > 120 ? '…' : ''}</span>
          </div>
        )}

        {/* SIGNATURE */}
        {template.sectionOrder.includes('SIGNATURE') && isVisible('authorizedSignature') && (
          <div className="flex justify-between items-end text-[6px] mt-2 pt-1.5 border-t border-slate-200">
            {isVisible('amountInWords') && (
              <div className="text-slate-500 italic">
                Amount (words): <b>Rupees One Thousand One Hundred Eighty only</b>
              </div>
            )}
            <div className="text-center min-w-20">
              <div className="border-t border-slate-400 pt-0.5 font-bold text-slate-700">
                {template.signatoryConfig?.signatoryLabel || 'Authorized Signatory'}
              </div>
              {template.signatoryConfig?.signatoryName && (
                <div className="text-[5px] text-slate-400">{template.signatoryConfig.signatoryName}</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Default template factory ───────────────────────────────────────────────

function buildDefaultTemplate(): Partial<InvoiceTemplateData> {
  return {
    templateMode: 'STANDARD',
    paperSize: 'A4',
    orientation: 'PORTRAIT',
    pageMargins: { topMm: 10, bottomMm: 10, leftMm: 10, rightMm: 10 },
    letterheadConfig: { reservedHeaderHeightMm: 40, reservedFooterHeightMm: 25, calibrationTopOffsetMm: 0, calibrationLeftOffsetMm: 0 },
    logoConfig: { enabled: true, alignment: 'LEFT', widthMm: 40, maxHeightMm: 20 },
    companyHeaderConfig: { showName: true, showAddress: true, showPhone: true, showEmail: true, showGstin: true, showWebsite: false, showPan: false, alignment: 'LEFT' },
    signatoryConfig: { showAuthorizedSignature: true, showCustomerSignature: false, signatoryLabel: 'Authorized Signatory' },
    headerConfig: { layout: 'LOGO_LEFT', showLogo: true, showTagline: false, showPhone: true, showEmail: true },
    itemColumns: [
      { key: 'serialNo', label: '#', visible: true, align: 'CENTER' },
      { key: 'name', label: 'Item', visible: true, align: 'LEFT' },
      { key: 'hsnSac', label: 'HSN/SAC', visible: true, align: 'CENTER' },
      { key: 'quantity', label: 'Qty', visible: true, align: 'RIGHT' },
      { key: 'unit', label: 'Unit', visible: true, align: 'CENTER' },
      { key: 'rate', label: 'Rate', visible: true, align: 'RIGHT' },
      { key: 'discount', label: 'Discount', visible: false, align: 'RIGHT' },
      { key: 'taxableValue', label: 'Taxable', visible: true, align: 'RIGHT' },
      { key: 'gstRate', label: 'GST %', visible: false, align: 'CENTER' },
      { key: 'cgst', label: 'CGST', visible: false, align: 'RIGHT' },
      { key: 'sgst', label: 'SGST', visible: false, align: 'RIGHT' },
      { key: 'igst', label: 'IGST', visible: false, align: 'RIGHT' },
      { key: 'cess', label: 'Cess', visible: false, align: 'RIGHT' },
      { key: 'total', label: 'Amount', visible: true, align: 'RIGHT' },
    ],
    fieldVisibility: {
      businessPan: 'HIDDEN', businessCin: 'HIDDEN', businessWebsite: 'HIDDEN',
      customerPhone: 'VISIBLE', customerEmail: 'VISIBLE', shippingAddress: 'VISIBLE',
      customerGstin: 'AUTO', reverseCharge: 'AUTO', placeOfSupply: 'VISIBLE',
      dueDate: 'VISIBLE', referenceNumber: 'HIDDEN',
      vehicleNumber: 'HIDDEN', transportMode: 'HIDDEN', eWayBillNumber: 'HIDDEN',
      bankDetails: 'VISIBLE', paymentQrCode: 'VISIBLE',
      termsAndConditions: 'VISIBLE', declaration: 'VISIBLE',
      authorizedSignature: 'VISIBLE', customerSignature: 'HIDDEN',
      subtotalRow: 'VISIBLE', discountRow: 'AUTO', taxableValueRow: 'VISIBLE',
      cgstRow: 'AUTO', sgstRow: 'AUTO', utgstRow: 'AUTO', igstRow: 'AUTO', cessRow: 'AUTO',
      roundOffRow: 'VISIBLE', amountInWords: 'VISIBLE',
      eInvoiceQr: 'HIDDEN', irnNumber: 'HIDDEN',
    },
    sectionOrder: ['HEADER', 'INVOICE_META', 'CUSTOMER_DETAILS', 'ITEM_TABLE', 'TAX_SUMMARY', 'BANK_DETAILS', 'TERMS', 'SIGNATURE'],
    styling: { baseFontSizePt: 9, tableDensity: 'COMFORTABLE', accentColor: '#1e40af', primaryColor: '#0f172a' },
    termsText: '1. Goods once sold will not be taken back.\n2. All disputes subject to local jurisdiction.',
    declarationText: 'We declare that this invoice shows the actual price of the goods/services described and that all particulars are true and correct.',
  };
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function DocumentTemplatesPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState<InvoiceTemplateData[]>([]);
  const [selected, setSelected] = useState<InvoiceTemplateData | null>(null);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [businessLogoUrl, setBusinessLogoUrl] = useState<string | undefined>(undefined);

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const [tplRes, brandRes] = await Promise.all([
        fetch('/api/templates'),
        fetch('/api/business/branding'),
      ]);
      const tplJson = await tplRes.json();
      if (tplJson.success) setTemplates(tplJson.templates || []);

      if (brandRes.ok) {
        const brandJson = await brandRes.json();
        const logo = brandJson.branding?.invoiceLogo?.secureUrl || brandJson.branding?.logo?.secureUrl;
        if (logo) setBusinessLogoUrl(logo);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, ...buildDefaultTemplate() }),
      });
      const json = await res.json();
      if (json.success) {
        setNewName('');
        await fetchTemplates();
        showMsg('success', `Template '${json.data.name}' created.`);
      } else {
        showMsg('error', json.error || 'Failed to create template');
      }
    } catch (e: any) { showMsg('error', e.message); }
    finally { setCreating(false); }
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/templates/${selected._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selected),
      });
      const json = await res.json();
      if (json.success) {
        setSelected(json.data);
        await fetchTemplates();
        showMsg('success', 'Template configuration saved successfully!');
      } else {
        showMsg('error', json.error || 'Failed to save template');
      }
    } catch (e: any) { showMsg('error', e.message); }
    finally { setSaving(false); }
  };

  const handleSetDefault = async (id: string) => {
    try {
      const res = await fetch(`/api/templates/${id}/default`, { method: 'POST' });
      const json = await res.json();
      if (json.success) { await fetchTemplates(); showMsg('success', 'Default template updated.'); }
      else showMsg('error', json.error || 'Failed to set default');
    } catch (e: any) { showMsg('error', e.message); }
  };

  const handleClone = async (id: string) => {
    try {
      const res = await fetch(`/api/templates/${id}/clone`, { method: 'POST' });
      const json = await res.json();
      if (json.success) { await fetchTemplates(); showMsg('success', 'Template cloned successfully.'); }
      else showMsg('error', json.error || 'Failed to clone');
    } catch (e: any) { showMsg('error', e.message); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this template? This cannot be undone.')) return;
    try {
      const res = await fetch(`/api/templates/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) { await fetchTemplates(); showMsg('success', 'Template deleted.'); }
      else showMsg('error', json.error || 'Failed to delete template');
    } catch (e: any) { showMsg('error', e.message); }
  };

  // ── Mutation helpers ─────────────────────────────────────────────────────

  const update = (patch: Partial<InvoiceTemplateData>) =>
    setSelected(prev => prev ? { ...prev, ...patch } : prev);

  const updateNested = <K extends keyof InvoiceTemplateData>(key: K, patch: Partial<InvoiceTemplateData[K]>) =>
    setSelected(prev => prev ? { ...prev, [key]: { ...(prev[key] as object), ...patch } } : prev);

  const toggleFieldVisibility = (field: string) => {
    if (!selected) return;
    const cur = toVisibility(selected.fieldVisibility?.[field]);
    update({ fieldVisibility: { ...selected.fieldVisibility, [field]: cycleVisibility(cur) } });
  };

  const toggleColumn = (key: string) => {
    if (!selected) return;
    const cols = (selected.itemColumns || []).map(c => c.key === key ? { ...c, visible: !c.visible } : c);
    update({ itemColumns: cols });
  };

  const moveSection = (idx: number, dir: 'UP' | 'DOWN') => {
    if (!selected) return;
    const arr = [...selected.sectionOrder];
    const ti = dir === 'UP' ? idx - 1 : idx + 1;
    if (ti < 0 || ti >= arr.length) return;
    [arr[idx], arr[ti]] = [arr[ti], arr[idx]];
    update({ sectionOrder: arr });
  };

  // ── Loading state ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-2 text-[#6B7280]">
        <Loader2 className="w-8 h-8 animate-spin text-[#2563EB]" />
        <span className="text-xs font-medium">Loading template engine...</span>
      </div>
    );
  }

  // ── Toast ─────────────────────────────────────────────────────────────────

  const Toast = () => message ? (
    <div className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-xs font-medium shadow-sm ${
      message.type === 'success'
        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
        : 'bg-rose-50 border-rose-200 text-rose-800'
    }`}>
      {message.type === 'success'
        ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
        : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
      <span>{message.text}</span>
    </div>
  ) : null;

  // ── Template Directory ────────────────────────────────────────────────────

  if (!selected) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto pb-16">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[#1F2937]">Invoice &amp; Document Templates</h1>
            <p className="text-xs text-[#6B7280] mt-0.5">
              Manage reusable document layouts for Tax Invoices, Credit Notes, and Receipts.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Input placeholder="New template name…" value={newName} onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              className="text-xs w-52" />
            <Button onClick={handleCreate} disabled={creating || !newName.trim()} size="sm"
              className="bg-[#2563EB] text-white text-xs gap-1">
              {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              <span>Create</span>
            </Button>
          </div>
        </div>

        <Toast />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map(tpl => (
            <Card key={tpl._id}
              className={`border ${tpl.isDefault ? 'border-[#2563EB] ring-1 ring-[#93C5FD] bg-[#EFF6FF]' : 'border-[#E5E7EB] bg-white'} shadow-sm hover:shadow-md transition`}>
              <div className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-[#1F2937]">{tpl.name}</span>
                      {tpl.isDefault && (
                        <span className="bg-[#2563EB] text-white text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                          <Star className="h-2.5 w-2.5 fill-white" /> DEFAULT
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-[#6B7280] mt-0.5 space-x-1">
                      <span className="font-mono">{(tpl.templateMode || 'STANDARD').replace('_', ' ')}</span>
                      <span>·</span>
                      <span>v{tpl.version}</span>
                      <span>·</span>
                      <span>{tpl.documentType.replace('_', ' ')}</span>
                    </div>
                  </div>
                  <div className={`p-1.5 rounded ${tpl.isDefault ? 'bg-blue-100' : 'bg-slate-100'}`}>
                    <FileText className={`h-4 w-4 ${tpl.isDefault ? 'text-blue-600' : 'text-slate-400'}`} />
                  </div>
                </div>

                <div className="pt-2 border-t border-[#E5E7EB] flex items-center justify-between gap-2">
                  <Button onClick={() => setSelected(tpl)} size="sm" variant="outline" className="text-xs h-8">
                    <Settings2 className="h-3 w-3 mr-1" /> Edit Template
                  </Button>
                  <div className="flex items-center gap-0.5">
                    {!tpl.isDefault && (
                      <Button onClick={() => handleSetDefault(tpl._id)} size="sm" variant="ghost"
                        className="text-[11px] text-[#2563EB] h-8 px-2">Set Default</Button>
                    )}
                    <Button onClick={() => handleClone(tpl._id)} size="sm" variant="ghost" className="h-8 w-8 p-0" title="Clone">
                      <Copy className="h-3.5 w-3.5 text-[#6B7280]" />
                    </Button>
                    {!tpl.isDefault && (
                      <Button onClick={() => handleDelete(tpl._id)} size="sm" variant="ghost"
                        className="h-8 w-8 p-0 text-rose-500 hover:text-rose-600 hover:bg-rose-50" title="Delete">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // ── Template Editor ───────────────────────────────────────────────────────

  const fieldGroups: Array<{ group: string; fields: Array<{ key: string; label: string; locked?: boolean }> }> = [
    {
      group: 'Customer Info',
      fields: [
        { key: 'customerPhone', label: 'Customer Phone' },
        { key: 'customerEmail', label: 'Customer Email' },
        { key: 'customerGstin', label: 'Customer GSTIN' },
        { key: 'shippingAddress', label: 'Shipping / Ship-To Address' },
      ],
    },
    {
      group: 'Invoice Meta',
      fields: [
        { key: 'dueDate', label: 'Due Date' },
        { key: 'placeOfSupply', label: 'Place of Supply' },
        { key: 'reverseCharge', label: 'Reverse Charge' },
        { key: 'referenceNumber', label: 'Reference / PO Number' },
      ],
    },
    {
      group: 'Transport',
      fields: [
        { key: 'vehicleNumber', label: 'Vehicle Number' },
        { key: 'transportMode', label: 'Transport Mode' },
        { key: 'eWayBillNumber', label: 'E-Way Bill Number' },
      ],
    },
    {
      group: 'Totals Section',
      fields: [
        { key: 'subtotalRow', label: 'Subtotal Row' },
        { key: 'discountRow', label: 'Discount Row' },
        { key: 'taxableValueRow', label: 'Taxable Value Row' },
        { key: 'cgstRow', label: 'CGST Row' },
        { key: 'sgstRow', label: 'SGST Row' },
        { key: 'utgstRow', label: 'UTGST Row' },
        { key: 'igstRow', label: 'IGST Row' },
        { key: 'cessRow', label: 'Cess Row' },
        { key: 'roundOffRow', label: 'Round Off Row' },
        { key: 'amountInWords', label: 'Amount in Words' },
      ],
    },
    {
      group: 'Footer Sections',
      fields: [
        { key: 'bankDetails', label: 'Bank Account Details' },
        { key: 'paymentQrCode', label: 'UPI / Payment QR Code' },
        { key: 'termsAndConditions', label: 'Terms & Conditions' },
        { key: 'declaration', label: 'Declaration Statement' },
        { key: 'authorizedSignature', label: 'Authorized Signatory Block' },
        { key: 'customerSignature', label: 'Customer Signature Block' },
      ],
    },
    {
      group: 'E-Invoice / Compliance',
      fields: [
        { key: 'eInvoiceQr', label: 'E-Invoice QR Code' },
        { key: 'irnNumber', label: 'IRN Number' },
      ],
    },
  ];

  const isPPL = selected.templateMode === 'PRE_PRINTED_LETTERHEAD';
  const isDigital = selected.templateMode === 'DIGITAL_LETTERHEAD';

  return (
    <div className="pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Button onClick={() => setSelected(null)} size="sm" variant="outline" className="text-xs gap-1.5">
            <ArrowLeft className="h-3.5 w-3.5" /> Templates
          </Button>
          <div>
            <h1 className="text-lg font-bold text-[#1F2937] leading-tight">
              {selected.name}
              {selected.isDefault && (
                <span className="ml-2 text-[9px] bg-blue-600 text-white font-bold px-1.5 py-0.5 rounded">DEFAULT</span>
              )}
            </h1>
            <p className="text-[11px] text-[#6B7280]">v{selected.version} · {selected.templateMode} · {selected.documentType.replace('_', ' ')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Toast />
          <Button onClick={handleSave} disabled={saving} size="sm"
            className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs gap-1.5 font-semibold">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save Template
          </Button>
        </div>
      </div>

      {/* Two-panel grid */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(380px,420px)_1fr] gap-6 items-start">

        {/* ── LEFT: Configuration Panel ────────────────────────────────── */}
        <div className="space-y-3">

          {/* 1. Template Mode */}
          <Section title="Print Mode" icon={<Printer className="h-4 w-4 text-purple-600" />}>
            <div className="grid grid-cols-1 gap-1.5">
              {([
                ['STANDARD', 'Standard A4', 'Full company header & logo on blank paper. Best for PDF/email.'],
                ['PRE_PRINTED_LETTERHEAD', 'Pre-printed Letterhead', 'Physical stationery with your letterhead already printed. Suppresses digital header; reserves top/bottom margins.'],
                ['DIGITAL_LETTERHEAD', 'Digital Letterhead', 'Uploads a background image (letterhead JPEG/PNG) behind content on blank A4.'],
              ] as const).map(([mode, label, desc]) => (
                <button key={mode} onClick={() => update({ templateMode: mode })}
                  className={`p-2.5 rounded-lg border text-left transition ${
                    selected.templateMode === mode
                      ? 'border-purple-500 bg-purple-50 text-purple-900'
                      : 'border-[#E5E7EB] bg-white text-[#374151] hover:bg-slate-50'
                  }`}>
                  <div className="font-semibold text-[11px]">{label}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">{desc}</div>
                </button>
              ))}
            </div>

            {/* Pre-printed letterhead config */}
            {isPPL && (
              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-3">
                <div className="text-[10px] font-bold text-amber-800 flex items-center gap-1">
                  <Info className="h-3.5 w-3.5" /> Reserved Area Configuration
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    ['reservedHeaderHeightMm', 'Top Reserved (mm)', 0, 120],
                    ['reservedFooterHeightMm', 'Bottom Reserved (mm)', 0, 80],
                    ['calibrationTopOffsetMm', 'Top Offset (mm)', -20, 20],
                    ['calibrationLeftOffsetMm', 'Left Offset (mm)', -20, 20],
                  ].map(([field, label, min, max]) => (
                    <div key={field as string}>
                      <label className="text-[10px] font-medium text-amber-900 block mb-1">{label as string}</label>
                      <input type="number"
                        value={(selected.letterheadConfig as any)?.[field as string] ?? 0}
                        min={min as number} max={max as number}
                        onChange={e => updateNested('letterheadConfig', { [field as string]: Number(e.target.value) })}
                        className="w-full text-[11px] px-2 py-1 border border-amber-300 rounded bg-white" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Digital letterhead config */}
            {isDigital && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
                <div className="text-[10px] font-bold text-blue-800">Background Image (letterhead)</div>
                <input type="url"
                  placeholder="https://example.com/letterhead.jpg"
                  value={selected.letterheadConfig?.backgroundMediaUrl || ''}
                  onChange={e => updateNested('letterheadConfig', { backgroundMediaUrl: e.target.value })}
                  className="w-full text-[11px] px-2 py-1 border border-blue-300 rounded bg-white" />
                <div>
                  <label className="text-[10px] font-medium text-blue-800 block mb-1">
                    Background Opacity: {Math.round((selected.letterheadConfig?.backgroundOpacity ?? 1) * 100)}%
                  </label>
                  <input type="range" min={0} max={1} step={0.05}
                    value={selected.letterheadConfig?.backgroundOpacity ?? 1}
                    onChange={e => updateNested('letterheadConfig', { backgroundOpacity: Number(e.target.value) })}
                    className="w-full" />
                </div>
              </div>
            )}
          </Section>

          {/* 2. Page Margins */}
          <Section title="Page Margins" icon={<Layout className="h-4 w-4 text-indigo-600" />} defaultOpen={false}>
            <div className="grid grid-cols-2 gap-2">
              {[
                ['topMm', 'Top (mm)'],
                ['bottomMm', 'Bottom (mm)'],
                ['leftMm', 'Left (mm)'],
                ['rightMm', 'Right (mm)'],
              ].map(([field, label]) => (
                <div key={field as string}>
                  <label className="text-[10px] font-medium text-slate-600 block mb-1">{label as string}</label>
                  <input type="number" min={0} max={50}
                    value={(selected.pageMargins as any)?.[field as string] ?? 10}
                    onChange={e => updateNested('pageMargins', { [field as string]: Number(e.target.value) })}
                    className="w-full text-[11px] px-2 py-1 border border-slate-300 rounded bg-white" />
                </div>
              ))}
            </div>
          </Section>

          {/* 3. Company Header & Logo */}
          <Section title="Company Header & Logo" icon={<ImageIcon className="h-4 w-4 text-blue-600" />}>
            <div className="space-y-3">
              {/* Business Logo Asset Banner */}
              <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-800">Business Logo Asset</span>
                  <Link
                    href="/settings/branding"
                    target="_blank"
                    className="text-[10px] text-blue-600 font-bold hover:underline inline-flex items-center gap-1"
                  >
                    <span>Branding Settings</span>
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>

                {businessLogoUrl ? (
                  <div className="flex items-center gap-3 p-2 bg-white rounded border border-slate-200">
                    <img src={businessLogoUrl} alt="Logo" className="h-10 w-auto max-w-[120px] object-contain border p-1 rounded bg-slate-50" />
                    <div>
                      <div className="text-[10px] font-bold text-slate-800">Logo Uploaded</div>
                      <div className="text-[9px] text-emerald-600 font-semibold">Active for document prints</div>
                    </div>
                  </div>
                ) : (
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded text-center space-y-1">
                    <div className="text-[10px] font-bold text-amber-800">No logo uploaded yet</div>
                    <p className="text-[9px] text-amber-700">Upload your business logo image in Branding Settings to display on printed invoices.</p>
                    <Link
                      href="/settings/branding"
                      target="_blank"
                      className="inline-block mt-1 px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] rounded transition"
                    >
                      Upload Logo Now →
                    </Link>
                  </div>
                )}
              </div>

              {/* Logo display options */}
              {!isPPL && (
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-700">Show Logo on Invoice</span>
                    <button onClick={() => updateNested('logoConfig', { enabled: !selected.logoConfig?.enabled })}
                      className={`px-2.5 py-1 rounded text-[11px] font-bold border transition ${
                        selected.logoConfig?.enabled !== false
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}>
                      {selected.logoConfig?.enabled !== false ? 'ON' : 'OFF'}
                    </button>
                  </div>
                  {selected.logoConfig?.enabled !== false && (
                    <>
                      <div>
                        <label className="text-[10px] font-medium text-slate-600 block mb-1">Logo Position</label>
                        <div className="flex gap-1">
                          {(['LEFT', 'CENTER', 'RIGHT'] as const).map(a => (
                            <button key={a} onClick={() => updateNested('logoConfig', { alignment: a })}
                              className={`flex-1 py-1 rounded text-[10px] font-bold border transition ${
                                selected.logoConfig?.alignment === a
                                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                                  : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                              }`}>{a}</button>
                          ))}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-medium text-slate-600 block mb-1">Width (mm)</label>
                          <input type="number" min={10} max={100}
                            value={selected.logoConfig?.widthMm ?? 40}
                            onChange={e => updateNested('logoConfig', { widthMm: Number(e.target.value) })}
                            className="w-full text-[11px] px-2 py-1 border border-slate-300 rounded" />
                        </div>
                        <div>
                          <label className="text-[10px] font-medium text-slate-600 block mb-1">Max Height (mm)</label>
                          <input type="number" min={5} max={60}
                            value={selected.logoConfig?.maxHeightMm ?? 20}
                            onChange={e => updateNested('logoConfig', { maxHeightMm: Number(e.target.value) })}
                            className="w-full text-[11px] px-2 py-1 border border-slate-300 rounded" />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Company details toggles */}
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  ['showName', 'Business Name'],
                  ['showAddress', 'Business Address'],
                  ['showGstin', 'GSTIN'],
                  ['showPhone', 'Phone'],
                  ['showEmail', 'Email'],
                  ['showWebsite', 'Website'],
                  ['showPan', 'PAN'],
                ].map(([field, label]) => (
                  <div key={field as string} className="flex items-center justify-between p-1.5 rounded border border-[#E5E7EB] text-[11px] hover:bg-slate-50">
                    <span className="font-medium text-slate-700">{label as string}</span>
                    <button
                      onClick={() => updateNested('companyHeaderConfig', { [field as string]: !(selected.companyHeaderConfig as any)?.[field as string] })}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition ${
                        (selected.companyHeaderConfig as any)?.[field as string]
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-400 border-slate-200'
                      }`}>
                      {(selected.companyHeaderConfig as any)?.[field as string] ? 'ON' : 'OFF'}
                    </button>
                  </div>
                ))}
              </div>

              {/* Alignment */}
              <div>
                <label className="text-[10px] font-medium text-slate-600 block mb-1">Header Text Alignment</label>
                <div className="flex gap-1">
                  {(['LEFT', 'CENTER', 'RIGHT'] as const).map(a => (
                    <button key={a} onClick={() => updateNested('companyHeaderConfig', { alignment: a })}
                      className={`flex-1 py-1 rounded text-[10px] font-bold border transition ${
                        selected.companyHeaderConfig?.alignment === a
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}>{a}</button>
                  ))}
                </div>
              </div>
            </div>
          </Section>

          {/* 4. Signatory */}
          <Section title="Signatory" icon={<PenLine className="h-4 w-4 text-teal-600" />} defaultOpen={false}>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium">Show Authorized Signature</span>
                <button onClick={() => updateNested('signatoryConfig', { showAuthorizedSignature: !selected.signatoryConfig?.showAuthorizedSignature })}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold border ${selected.signatoryConfig?.showAuthorizedSignature ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                  {selected.signatoryConfig?.showAuthorizedSignature ? 'YES' : 'NO'}
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium">Show Customer Signature</span>
                <button onClick={() => updateNested('signatoryConfig', { showCustomerSignature: !selected.signatoryConfig?.showCustomerSignature })}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold border ${selected.signatoryConfig?.showCustomerSignature ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                  {selected.signatoryConfig?.showCustomerSignature ? 'YES' : 'NO'}
                </button>
              </div>
              <div>
                <label className="text-[10px] font-medium text-slate-600 block mb-1">Signatory Label</label>
                <input type="text"
                  value={selected.signatoryConfig?.signatoryLabel || 'Authorized Signatory'}
                  onChange={e => updateNested('signatoryConfig', { signatoryLabel: e.target.value })}
                  className="w-full text-[11px] px-2 py-1.5 border border-slate-300 rounded" />
              </div>
              <div>
                <label className="text-[10px] font-medium text-slate-600 block mb-1">Signatory Name (optional)</label>
                <input type="text"
                  value={selected.signatoryConfig?.signatoryName || ''}
                  onChange={e => updateNested('signatoryConfig', { signatoryName: e.target.value })}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full text-[11px] px-2 py-1.5 border border-slate-300 rounded" />
              </div>
            </div>
          </Section>

          {/* 5. Item Table Columns */}
          <Section title="Item Table Columns" icon={<Table2 className="h-4 w-4 text-orange-600" />} defaultOpen={false}>
            <div className="space-y-1">
              {(selected.itemColumns || []).map(col => (
                <div key={col.key} className="flex items-center justify-between p-2 rounded border border-[#E5E7EB] hover:bg-slate-50">
                  <div>
                    <span className="text-[11px] font-semibold text-slate-700">{col.label}</span>
                    <span className="text-[10px] text-slate-400 ml-1 font-mono">({col.key})</span>
                  </div>
                  <button onClick={() => toggleColumn(col.key)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border transition ${
                      col.visible ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-400 border-slate-200'
                    }`}>
                    {col.visible ? 'Visible' : 'Hidden'}
                  </button>
                </div>
              ))}
            </div>
          </Section>

          {/* 6. Field Visibility */}
          <Section title="Field Visibility" icon={<Eye className="h-4 w-4 text-green-600" />}>
            <div className="p-2 bg-blue-50 border border-blue-200 rounded text-[10px] text-blue-800 mb-2 flex items-start gap-1.5">
              <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>Click to cycle: <b>VISIBLE</b> → <b>AUTO</b> (show when relevant) → <b>HIDDEN</b></span>
            </div>
            {fieldGroups.map(({ group, fields }) => (
              <div key={group} className="mb-3">
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">{group}</div>
                <div className="space-y-1">
                  {fields.map(({ key, label, locked }) => {
                    const vis = toVisibility(selected.fieldVisibility?.[key]);
                    return (
                      <div key={key} className="flex items-center justify-between p-1.5 rounded border border-[#F3F4F6] hover:bg-slate-50">
                        <div className="flex items-center gap-1.5">
                          {locked && <Lock className="h-3 w-3 text-slate-300" />}
                          <span className="text-[11px] font-medium text-slate-600">{label}</span>
                        </div>
                        <button
                          onClick={() => !locked && toggleFieldVisibility(key)}
                          disabled={locked}
                          className={`px-2 py-0.5 rounded border text-[10px] font-bold transition ${VISIBILITY_STYLES[vis]} ${locked ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
                          {vis}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Statutory lock notice */}
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-[10px] text-slate-600 mt-2 flex items-start gap-1.5">
              <Lock className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
              <span><b>Rule 46 GST Protection:</b> Business Name, GSTIN, Invoice #, Date, HSN/SAC, Tax Amounts, and Grand Total are always printed (legally mandatory). They are not listed here.</span>
            </div>
          </Section>

          {/* 7. Styling */}
          <Section title="Typography &amp; Style" icon={<Sliders className="h-4 w-4 text-rose-600" />} defaultOpen={false}>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-medium text-slate-600 block mb-1">Accent Color</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={selected.styling?.accentColor || '#1e40af'}
                      onChange={e => updateNested('styling', { accentColor: e.target.value })}
                      className="h-8 w-8 rounded border border-slate-200 cursor-pointer" />
                    <input type="text" value={selected.styling?.accentColor || '#1e40af'}
                      onChange={e => updateNested('styling', { accentColor: e.target.value })}
                      className="flex-1 text-[11px] px-2 py-1 border border-slate-300 rounded font-mono" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-medium text-slate-600 block mb-1">Text Color</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={selected.styling?.primaryColor || '#0f172a'}
                      onChange={e => updateNested('styling', { primaryColor: e.target.value })}
                      className="h-8 w-8 rounded border border-slate-200 cursor-pointer" />
                    <input type="text" value={selected.styling?.primaryColor || '#0f172a'}
                      onChange={e => updateNested('styling', { primaryColor: e.target.value })}
                      className="flex-1 text-[11px] px-2 py-1 border border-slate-300 rounded font-mono" />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-medium text-slate-600 block mb-1">
                  Base Font Size: {selected.styling?.baseFontSizePt || 9}pt
                </label>
                <input type="range" min={7} max={14} step={0.5}
                  value={selected.styling?.baseFontSizePt || 9}
                  onChange={e => updateNested('styling', { baseFontSizePt: Number(e.target.value) })}
                  className="w-full" />
                <div className="flex justify-between text-[9px] text-slate-400"><span>7pt (tiny)</span><span>14pt (large)</span></div>
              </div>

              <div>
                <label className="text-[10px] font-medium text-slate-600 block mb-1">Table Density</label>
                <div className="flex gap-1">
                  {(['COMFORTABLE', 'COMPACT'] as const).map(d => (
                    <button key={d} onClick={() => updateNested('styling', { tableDensity: d })}
                      className={`flex-1 py-1.5 rounded text-[11px] font-bold border transition ${
                        selected.styling?.tableDensity === d
                          ? 'border-rose-400 bg-rose-50 text-rose-700'
                          : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}>{d}</button>
                  ))}
                </div>
              </div>
            </div>
          </Section>

          {/* 8. Section Order */}
          <Section title="Section Order" icon={<MoveUp className="h-4 w-4 text-slate-600" />} defaultOpen={false}>
            <div className="space-y-1 text-[11px]">
              {selected.sectionOrder.map((sec, idx) => (
                <div key={sec} className="flex items-center justify-between p-2 bg-[#F9FAFB] rounded border border-[#E5E7EB] gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 flex items-center justify-center bg-slate-200 text-slate-600 rounded text-[9px] font-bold">{idx + 1}</span>
                    <span className="font-semibold text-slate-700">{sec.replace(/_/g, ' ')}</span>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <button onClick={() => moveSection(idx, 'UP')} disabled={idx === 0}
                      className="p-1 hover:bg-slate-200 rounded disabled:opacity-30 transition">
                      <MoveUp className="h-3 w-3" />
                    </button>
                    <button onClick={() => moveSection(idx, 'DOWN')} disabled={idx === selected.sectionOrder.length - 1}
                      className="p-1 hover:bg-slate-200 rounded disabled:opacity-30 transition">
                      <MoveDown className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* 9. Text Content */}
          <Section title="Terms &amp; Declaration" icon={<FileText className="h-4 w-4 text-slate-600" />} defaultOpen={false}>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-medium text-slate-600 block mb-1">Terms &amp; Conditions</label>
                <textarea rows={4} value={selected.termsText || ''}
                  onChange={e => update({ termsText: e.target.value })}
                  className="w-full text-[11px] px-2 py-1.5 border border-slate-300 rounded resize-none" />
              </div>
              <div>
                <label className="text-[10px] font-medium text-slate-600 block mb-1">Declaration Text</label>
                <textarea rows={3} value={selected.declarationText || ''}
                  onChange={e => update({ declarationText: e.target.value })}
                  className="w-full text-[11px] px-2 py-1.5 border border-slate-300 rounded resize-none" />
              </div>
            </div>
          </Section>
        </div>

        {/* ── RIGHT: Live A4 Preview ─────────────────────────────────────── */}
        <div className="sticky top-4">
          <div className="text-xs font-bold text-[#1F2937] mb-3 flex items-center gap-2">
            <Eye className="h-4 w-4 text-[#2563EB]" />
            Live A4 Preview
            <span className="ml-auto text-[10px] text-slate-400 font-normal">Real-time reflection of your settings</span>
          </div>
          <div className="flex justify-center">
            <A4Preview template={selected} logoUrl={businessLogoUrl} />
          </div>
          <div className="mt-3 p-2.5 bg-slate-50 border border-slate-200 rounded text-[10px] text-slate-500 text-center">
            Preview is representative. Actual print output scales to full A4 (210mm × 297mm) via browser print dialog.
          </div>
        </div>
      </div>
    </div>
  );
}
