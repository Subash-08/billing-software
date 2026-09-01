'use client';

import React, { useEffect, useState, use } from 'react';
import { Loader2, Printer } from 'lucide-react';
import { InvoicePdfViewModel } from '@/services/pdf-document.service';

export default function PrintableInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [data, setData] = useState<InvoicePdfViewModel | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/invoices/${resolvedParams.id}/pdf`);
        const json = await res.json();
        if (json.success) {
          setData(json.data);
        } else {
          setError(json.error || 'Failed to load invoice document payload.');
        }
      } catch (e: any) {
        setError(e.message || 'Failed to load invoice print view');
      }
    }
    load();
  }, [resolvedParams.id]);

  useEffect(() => {
    if (data) {
      const timer = setTimeout(() => {
        window.print();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [data]);

  if (error) {
    return (
      <div className="p-8 text-center text-rose-600 text-xs font-semibold">
        Error loading print document: {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-2 text-[#6B7280]">
        <Loader2 className="w-8 h-8 animate-spin text-[#2563EB]" />
        <span className="text-xs font-medium">Preparing print layout engine...</span>
      </div>
    );
  }

  const template = (data.template || {}) as any;
  const templateMode: string = template.templateMode || 'STANDARD';
  const isPPL = templateMode === 'PRE_PRINTED_LETTERHEAD';
  const isDigital = templateMode === 'DIGITAL_LETTERHEAD';

  const margins = template.pageMargins || { topMm: 10, bottomMm: 10, leftMm: 10, rightMm: 10 };
  const letterhead = template.letterheadConfig || { reservedHeaderHeightMm: 40, reservedFooterHeightMm: 25, calibrationTopOffsetMm: 0, calibrationLeftOffsetMm: 0 };
  const logoConfig = template.logoConfig || { enabled: true, alignment: 'LEFT', widthMm: 40, maxHeightMm: 20 };
  const companyHeader = template.companyHeaderConfig || { showName: true, showAddress: true, showGstin: true, showPhone: true, showEmail: true, alignment: 'LEFT' };
  const signatory = template.signatoryConfig || { showAuthorizedSignature: true, signatoryLabel: 'Authorized Signatory' };
  const styling = template.styling || { baseFontSizePt: 9, tableDensity: 'COMFORTABLE', accentColor: '#1e40af', primaryColor: '#0f172a' };
  const fv = template.fieldVisibility || {};
  const columns: Array<{ key: string; label: string; visible: boolean; align: string }> = template.itemColumns || [];

  const isVisible = (key: string) => {
    const val = fv[key];
    if (val === false || val === 'HIDDEN') return false;
    return true; // VISIBLE or AUTO
  };

  const visibleCols = columns.length > 0 ? columns.filter(c => c.visible) : [
    { key: 'serialNo', label: '#', visible: true, align: 'CENTER' },
    { key: 'name', label: 'Item Description', visible: true, align: 'LEFT' },
    { key: 'hsnSac', label: 'HSN/SAC', visible: true, align: 'CENTER' },
    { key: 'quantity', label: 'Qty', visible: true, align: 'RIGHT' },
    { key: 'rate', label: 'Rate', visible: true, align: 'RIGHT' },
    { key: 'taxableValue', label: 'Taxable Value', visible: true, align: 'RIGHT' },
    { key: 'gstRate', label: 'GST %', visible: true, align: 'CENTER' },
    { key: 'total', label: 'Total (₹)', visible: true, align: 'RIGHT' },
  ];

  // Dynamic CSS @page margins
  const topMarginMm = isPPL ? (margins.topMm || 10) + (letterhead.reservedHeaderHeightMm || 40) + (letterhead.calibrationTopOffsetMm || 0) : margins.topMm || 10;
  const bottomMarginMm = isPPL ? (margins.bottomMm || 10) + (letterhead.reservedFooterHeightMm || 25) : margins.bottomMm || 10;
  const leftMarginMm = (margins.leftMm || 10) + (letterhead.calibrationLeftOffsetMm || 0);
  const rightMarginMm = margins.rightMm || 10;

  const accentBg = styling.accentColor || '#1e40af';
  const primaryColor = styling.primaryColor || '#0f172a';
  const fontSizePt = styling.baseFontSizePt || 9;
  const densityPadding = styling.tableDensity === 'COMPACT' ? 'py-1 px-1.5' : 'py-2 px-2';

  const logoUrl = template.logoUrl || (data.billFrom as any)?.logoUrl;
  const signatureUrl = template.signatureUrl;

  return (
    <div className="bg-slate-100 min-h-screen p-4 print:p-0 print:bg-white text-slate-900 font-sans">
      {/* Dynamic CSS @page stylesheet Injection */}
      <style jsx global>{`
        @page {
          size: A4 portrait;
          margin-top: ${topMarginMm}mm;
          margin-bottom: ${bottomMarginMm}mm;
          margin-left: ${leftMarginMm}mm;
          margin-right: ${rightMarginMm}mm;
        }

        @media print {
          body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          .page-break-inside-avoid {
            page-break-inside: avoid;
          }
        }
      `}</style>

      {/* Screen Action Bar */}
      <div className="no-print max-w-4xl mx-auto mb-4 p-3 bg-white border border-slate-200 rounded-lg shadow-sm flex justify-between items-center text-xs">
        <div className="flex items-center gap-2">
          <Printer className="h-4 w-4 text-blue-600" />
          <span className="font-bold text-slate-800">Print Preview — {data.documentTitle} ({data.invoiceNumber})</span>
          <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded">{templateMode}</span>
        </div>
        <button
          onClick={() => window.print()}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-1.5 rounded text-xs gap-1.5 inline-flex items-center transition"
        >
          <Printer className="h-3.5 w-3.5" />
          Print / Save PDF
        </button>
      </div>

      {/* Printable Sheet Sheet Container */}
      <div
        className="max-w-[210mm] mx-auto bg-white shadow-xl ring-1 ring-slate-200 print:shadow-none print:ring-0 relative"
        style={{
          fontSize: `${fontSizePt}pt`,
          backgroundImage: isDigital && letterhead.backgroundMediaUrl ? `url(${letterhead.backgroundMediaUrl})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          padding: `${margins.topMm || 10}mm ${margins.rightMm || 10}mm ${margins.bottomMm || 10}mm ${margins.leftMm || 10}mm`,
        }}
      >
        {/* Digital letterhead opacity overlay */}
        {isDigital && letterhead.backgroundMediaUrl && (
          <div
            className="absolute inset-0 bg-white pointer-events-none"
            style={{ opacity: 1 - (letterhead.backgroundOpacity ?? 1) }}
          />
        )}

        <div className="relative z-10 space-y-4">
          {/* HEADER SECTION (Suppressed in PRE_PRINTED_LETTERHEAD mode) */}
          {!isPPL && (
            <div className="flex items-start justify-between border-b border-slate-300 pb-4">
              {/* Logo (if left aligned) */}
              {logoConfig.enabled !== false && logoConfig.alignment === 'LEFT' && logoUrl && (
                <div className="mr-4 shrink-0">
                  <img
                    src={logoUrl}
                    alt="Business Logo"
                    style={{ width: `${logoConfig.widthMm || 40}mm`, maxHeight: `${logoConfig.maxHeightMm || 20}mm` }}
                    className="object-contain"
                  />
                </div>
              )}

              {/* Company Details */}
              <div className={`flex-1 ${companyHeader.alignment === 'CENTER' ? 'text-center' : companyHeader.alignment === 'RIGHT' ? 'text-right' : ''}`}>
                {companyHeader.showName !== false && (
                  <h1 className="text-xl font-bold tracking-tight uppercase" style={{ color: primaryColor }}>
                    {data.billFrom.name}
                  </h1>
                )}
                {companyHeader.showAddress !== false && (
                  <p className="text-slate-600 leading-tight">
                    {data.billFrom.addressLine}, {data.billFrom.city}, {data.billFrom.state} - {data.billFrom.pincode}
                  </p>
                )}
                {companyHeader.showGstin !== false && data.billFrom.gstin && (
                  <p className="font-bold text-slate-800 mt-0.5">GSTIN: {data.billFrom.gstin}</p>
                )}
                {companyHeader.showPhone !== false && data.billFrom.phone && (
                  <p className="text-slate-500">Phone: {data.billFrom.phone}</p>
                )}
              </div>

              {/* Logo (if right aligned) */}
              {logoConfig.enabled !== false && logoConfig.alignment === 'RIGHT' && logoUrl && (
                <div className="ml-4 shrink-0">
                  <img
                    src={logoUrl}
                    alt="Business Logo"
                    style={{ width: `${logoConfig.widthMm || 40}mm`, maxHeight: `${logoConfig.maxHeightMm || 20}mm` }}
                    className="object-contain"
                  />
                </div>
              )}

              {/* Document Title Block */}
              <div className="text-right shrink-0 ml-4">
                <h2 className="text-lg font-black uppercase tracking-wider" style={{ color: accentBg }}>
                  {data.documentTitle}
                </h2>
                <p className="font-bold font-mono text-sm mt-0.5">{data.invoiceNumber}</p>
                <p className="text-slate-500">Date: {data.invoiceDate}</p>
                <p className="text-slate-500">Financial Year: {data.financialYear}</p>
              </div>
            </div>
          )}

          {/* INVOICE METADATA ROW */}
          <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded border border-slate-200 text-xs font-medium">
            <div>
              <span className="text-slate-400 block uppercase text-[9px]">Invoice Date:</span>
              <span>{data.invoiceDate}</span>
            </div>
            {isVisible('dueDate') && (
              <div>
                <span className="text-slate-400 block uppercase text-[9px]">Payment Due Date:</span>
                <span>{data.dueDate}</span>
              </div>
            )}
            <div>
              <span className="text-slate-400 block uppercase text-[9px]">Place of Supply State:</span>
              <span>{data.billTo.state} ({data.placeOfSupplyStateCode})</span>
            </div>
          </div>

          {/* CUSTOMER BILLING / SHIPPING BLOCK */}
          <div className={`grid gap-4 border-b border-slate-200 pb-4 ${isVisible('shippingAddress') ? 'grid-cols-2' : 'grid-cols-1'}`}>
            <div>
              <h3 className="font-bold text-slate-400 uppercase text-[9px] tracking-wider mb-1">Details of Recipient (Billed To)</h3>
              <p className="font-bold text-sm text-slate-900">{data.billTo.name}</p>
              <p className="text-slate-600">{data.billTo.addressLine}</p>
              <p className="text-slate-600">{data.billTo.city}, {data.billTo.state} - {data.billTo.pincode}</p>
              {data.billTo.gstin && <p className="font-bold text-slate-800 mt-1">GSTIN: {data.billTo.gstin}</p>}
              {isVisible('customerPhone') && data.billTo.phone && <p className="text-slate-500">Phone: {data.billTo.phone}</p>}
            </div>

            {isVisible('shippingAddress') && (
              <div>
                <h3 className="font-bold text-slate-400 uppercase text-[9px] tracking-wider mb-1">Shipped To Address</h3>
                <p className="font-bold text-sm text-slate-900">{data.billTo.name}</p>
                <p className="text-slate-600">{data.billTo.addressLine}</p>
                <p className="text-slate-600">{data.billTo.city}, {data.billTo.state}</p>
              </div>
            )}
          </div>

          {/* ITEM TABLE (Repeatable header across multi-page printouts) */}
          <div className="border border-slate-300 rounded overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr style={{ backgroundColor: accentBg, color: 'white' }} className="font-bold text-xs">
                  {visibleCols.map(col => (
                    <th
                      key={col.key}
                      className={`${densityPadding} border-r border-slate-400 last:border-r-0 text-${col.align === 'RIGHT' ? 'right' : col.align === 'CENTER' ? 'center' : 'left'}`}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {data.items.map((item, idx) => (
                  <tr key={idx} className="page-break-inside-avoid">
                    {visibleCols.map(col => {
                      let val = '';
                      if (col.key === 'serialNo') val = String(idx + 1);
                      else if (col.key === 'name') val = item.name;
                      else if (col.key === 'hsnSac') val = item.hsnSacCode;
                      else if (col.key === 'quantity') val = `${item.quantity} ${item.unit}`;
                      else if (col.key === 'unit') val = item.unit;
                      else if (col.key === 'rate') val = `₹${item.rateRupees.toFixed(2)}`;
                      else if (col.key === 'taxableValue') val = `₹${item.taxableAmountRupees.toFixed(2)}`;
                      else if (col.key === 'gstRate') val = `${item.gstRate}%`;
                      else if (col.key === 'cgst') val = `₹${item.cgstRupees.toFixed(2)}`;
                      else if (col.key === 'sgst') val = `₹${item.sgstRupees.toFixed(2)}`;
                      else if (col.key === 'igst') val = `₹${item.igstRupees.toFixed(2)}`;
                      else if (col.key === 'total') val = `₹${item.totalRupees.toFixed(2)}`;

                      return (
                        <td
                          key={col.key}
                          className={`${densityPadding} border-r border-slate-200 last:border-r-0 text-${col.align === 'RIGHT' ? 'right' : col.align === 'CENTER' ? 'center' : 'left'} ${col.key === 'total' || col.key === 'name' ? 'font-bold' : ''}`}
                        >
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* TOTALS & TAX BREAKDOWN */}
          <div className="flex justify-between items-start pt-2 page-break-inside-avoid">
            {/* Amount in words */}
            <div className="max-w-xs space-y-2 text-xs">
              {isVisible('amountInWords') && (
                <div className="p-2 bg-slate-50 border border-slate-200 rounded">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Amount (in words):</span>
                  <span className="font-semibold text-slate-800">{data.amountInWords}</span>
                </div>
              )}

              {isVisible('bankDetails') && (
                <div className="p-2 bg-slate-50 border border-slate-200 rounded text-[11px]">
                  <span className="font-bold text-slate-700 block uppercase text-[9px]">Bank Details:</span>
                  <p>HDFC Bank | A/C: 50200012345678 | IFSC: HDFC0001234</p>
                </div>
              )}
            </div>

            {/* Totals Table */}
            <div className="w-72">
              <table className="w-full text-right border-collapse text-xs">
                <tbody>
                  {isVisible('subtotalRow') && (
                    <tr>
                      <td className="py-1 text-slate-600">Subtotal:</td>
                      <td className="py-1 font-semibold">₹{data.subTotalRupees.toFixed(2)}</td>
                    </tr>
                  )}
                  {data.totalDiscountRupees > 0 && isVisible('discountRow') && (
                    <tr>
                      <td className="py-1 text-slate-600">Discount:</td>
                      <td className="py-1 font-semibold text-emerald-600">-₹{data.totalDiscountRupees.toFixed(2)}</td>
                    </tr>
                  )}
                  {isVisible('taxableValueRow') && (
                    <tr className="border-t border-slate-200">
                      <td className="py-1 font-bold text-slate-700">Taxable Value:</td>
                      <td className="py-1 font-bold">₹{data.totalTaxableRupees.toFixed(2)}</td>
                    </tr>
                  )}
                  {data.totalCgstRupees > 0 && isVisible('cgstRow') && (
                    <tr>
                      <td className="py-1 text-slate-600">CGST:</td>
                      <td className="py-1">₹{data.totalCgstRupees.toFixed(2)}</td>
                    </tr>
                  )}
                  {data.totalSgstRupees > 0 && isVisible('sgstRow') && (
                    <tr>
                      <td className="py-1 text-slate-600">SGST:</td>
                      <td className="py-1">₹{data.totalSgstRupees.toFixed(2)}</td>
                    </tr>
                  )}
                  {data.totalIgstRupees > 0 && isVisible('igstRow') && (
                    <tr>
                      <td className="py-1 text-slate-600">IGST:</td>
                      <td className="py-1">₹{data.totalIgstRupees.toFixed(2)}</td>
                    </tr>
                  )}
                  {data.totalCessRupees > 0 && isVisible('cessRow') && (
                    <tr>
                      <td className="py-1 text-slate-600">Cess:</td>
                      <td className="py-1">₹{data.totalCessRupees.toFixed(2)}</td>
                    </tr>
                  )}
                  {data.roundOffRupees !== 0 && isVisible('roundOffRow') && (
                    <tr>
                      <td className="py-1 text-slate-400">Round Off:</td>
                      <td className="py-1 text-slate-500">₹{data.roundOffRupees.toFixed(2)}</td>
                    </tr>
                  )}
                  <tr className="border-t-2 border-slate-900 border-b text-sm font-bold">
                    <td className="py-2 text-slate-900">Grand Total:</td>
                    <td className="py-2 text-slate-900" style={{ color: accentBg }}>
                      ₹{data.grandTotalRupees.toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* TERMS & DECLARATION */}
          {isVisible('termsAndConditions') && (
            <div className="border-t border-slate-200 pt-3 text-xs space-y-1 page-break-inside-avoid">
              <span className="font-bold text-slate-700 uppercase text-[9px] tracking-wider block">Terms & Conditions</span>
              <p className="text-slate-600 whitespace-pre-line">{template.termsText || '1. Goods once sold will not be taken back.\n2. All disputes subject to local jurisdiction.'}</p>
            </div>
          )}

          {/* SIGNATURE BLOCK */}
          {isVisible('authorizedSignature') && (
            <div className="pt-8 flex justify-between items-end text-xs text-slate-600 page-break-inside-avoid">
              <div>
                {isVisible('customerSignature') && (
                  <div className="border-t border-slate-300 pt-1 text-center w-40 font-semibold">
                    Customer Signature
                  </div>
                )}
              </div>
              <div className="text-center">
                {signatureUrl && (
                  <img src={signatureUrl} alt="Signature" className="h-10 w-auto mx-auto mb-1 object-contain" />
                )}
                <div className="border-t border-slate-400 pt-1 font-bold text-slate-900 min-w-44">
                  For {data.billFrom.name}
                  <div className="text-[10px] font-normal text-slate-500">
                    {signatory.signatoryLabel || 'Authorized Signatory'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
