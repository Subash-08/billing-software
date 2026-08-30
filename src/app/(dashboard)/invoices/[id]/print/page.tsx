'use client';

import React, { useEffect, useState, use } from 'react';

interface PrintableInvoice {
  _id: string;
  invoiceNumber: string;
  financialYear: string;
  documentType: string;
  invoiceDate: string;
  dueDate: string;
  supplyType: string;
  billFromSnapshot: { name: string; gstin?: string; addressLine: string; city: string; state: string; pincode?: string; phone?: string };
  billToSnapshot: { name: string; gstin?: string; addressLine: string; city: string; state: string; pincode?: string; phone?: string };
  items: Array<{
    name: string;
    hsnSacCode: string;
    quantity: number;
    unit: string;
    rate: number;
    taxableAmount: number;
    gstRate: number;
    cgstAmount: number;
    sgstAmount: number;
    igstAmount: number;
    totalAmount: number;
  }>;
  subTotal: number;
  totalDiscount: number;
  totalTaxable: number;
  totalCgst: number;
  totalSgst: number;
  totalUtgst: number;
  totalIgst: number;
  totalCess: number;
  roundOff: number;
  grandTotal: number;
}

function toRupees(val: number | undefined | null): number {
  if (!val) return 0;
  if (val >= 100000 || (val >= 100 && Number.isInteger(val))) {
    return val / 100;
  }
  return val;
}

export default function PrintableInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [invoice, setInvoice] = useState<PrintableInvoice | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/invoices/${resolvedParams.id}`);
        const json = await res.json();
        if (json.success) {
          setInvoice(json.data);
        }
      } catch (e) {
        console.error('Failed to load invoice for printing', e);
      }
    }
    load();
  }, [resolvedParams.id]);

  useEffect(() => {
    if (invoice) {
      setTimeout(() => {
        window.print();
      }, 500);
    }
  }, [invoice]);

  if (!invoice) {
    return <div className="p-8 text-center text-xs">Loading invoice for printing...</div>;
  }

  return (
    <div className="bg-white text-slate-900 p-8 max-w-4xl mx-auto text-xs font-sans">
      {/* Action Header for Screen View */}
      <div className="print:hidden mb-6 flex justify-between items-center bg-slate-100 p-3 rounded-lg">
        <span className="font-semibold text-slate-700">Print Preview (Rule 46 GST Tax Invoice)</span>
        <button
          onClick={() => window.print()}
          className="bg-slate-900 text-white px-4 py-1.5 rounded text-xs font-medium hover:bg-slate-800"
        >
          Print Now / Save PDF
        </button>
      </div>

      {/* Printable Invoice Sheet */}
      <div className="border border-slate-300 p-6 space-y-6">
        <div className="flex justify-between items-start border-b border-slate-300 pb-4">
          <div>
            {(invoice as any).billFromSnapshot?.logoUrl && (
              <img
                src={(invoice as any).billFromSnapshot.logoUrl}
                alt="Company Logo"
                className="h-12 w-auto object-contain mb-2"
              />
            )}
            <h1 className="text-xl font-bold uppercase tracking-wider">{invoice.billFromSnapshot.name}</h1>
            <p>{invoice.billFromSnapshot.addressLine}</p>
            <p>
              {invoice.billFromSnapshot.city}, {invoice.billFromSnapshot.state} - {invoice.billFromSnapshot.pincode}
            </p>
            {invoice.billFromSnapshot.gstin && <p className="font-bold mt-1">GSTIN: {invoice.billFromSnapshot.gstin}</p>}
          </div>

          <div className="text-right">
            <h2 className="text-lg font-bold text-slate-800">TAX INVOICE</h2>
            <p className="font-bold text-sm mt-1">{invoice.invoiceNumber}</p>
            <p className="text-slate-600">Date: {new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}</p>
            <p className="text-slate-600">Financial Year: {invoice.financialYear}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 border-b border-slate-300 pb-4">
          <div>
            <h3 className="font-bold text-slate-700 uppercase mb-1 text-[10px]">Details of Recipient (Billed To)</h3>
            <p className="font-bold text-sm">{invoice.billToSnapshot.name}</p>
            <p>{invoice.billToSnapshot.addressLine}</p>
            <p>
              {invoice.billToSnapshot.city}, {invoice.billToSnapshot.state} - {invoice.billToSnapshot.pincode}
            </p>
            {invoice.billToSnapshot.gstin && <p className="font-bold mt-1">GSTIN: {invoice.billToSnapshot.gstin}</p>}
          </div>
        </div>

        {/* Item Table */}
        <table className="w-full text-left border-collapse border border-slate-300">
          <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
            <tr>
              <th className="p-2 border-r border-slate-300">Item Description</th>
              <th className="p-2 border-r border-slate-300 text-center">HSN/SAC</th>
              <th className="p-2 border-r border-slate-300 text-right">Qty</th>
              <th className="p-2 border-r border-slate-300 text-right">Rate</th>
              <th className="p-2 border-r border-slate-300 text-right">Taxable Value</th>
              <th className="p-2 border-r border-slate-300 text-right">GST %</th>
              <th className="p-2 text-right">Total (₹)</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((it, idx) => (
              <tr key={idx} className="border-b border-slate-200">
                <td className="p-2 border-r border-slate-300 font-medium">{it.name}</td>
                <td className="p-2 border-r border-slate-300 text-center">{it.hsnSacCode}</td>
                <td className="p-2 border-r border-slate-300 text-right">{it.quantity} {it.unit}</td>
                <td className="p-2 border-r border-slate-300 text-right">₹{toRupees(it.rate).toFixed(2)}</td>
                <td className="p-2 border-r border-slate-300 text-right">₹{toRupees(it.taxableAmount).toFixed(2)}</td>
                <td className="p-2 border-r border-slate-300 text-right">{it.gstRate}%</td>
                <td className="p-2 text-right font-bold">₹{toRupees(it.totalAmount).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals Summary */}
        <div className="flex justify-between items-start pt-2">
          <div className="text-[11px] text-slate-500 max-w-sm">
            <p className="font-bold text-slate-700">Terms & Conditions:</p>
            <p>1. Goods once sold will not be taken back.</p>
            <p>2. Subject to local jurisdiction.</p>
          </div>

          <table className="w-64 text-right border-collapse">
            <tbody>
              <tr>
                <td className="py-1 font-medium text-slate-600">Subtotal:</td>
                <td className="py-1 font-bold">₹{invoice.subTotal.toFixed(2)}</td>
              </tr>
              {invoice.totalDiscount > 0 && (
                <tr>
                  <td className="py-1 font-medium text-slate-600">Discount:</td>
                  <td className="py-1 font-bold">-₹{invoice.totalDiscount.toFixed(2)}</td>
                </tr>
              )}
              <tr className="border-t">
                <td className="py-1 font-bold text-slate-800">Taxable Amount:</td>
                <td className="py-1 font-bold">₹{invoice.totalTaxable.toFixed(2)}</td>
              </tr>
              {invoice.totalCgst > 0 && (
                <tr>
                  <td className="py-1 text-slate-600">CGST:</td>
                  <td className="py-1">₹{invoice.totalCgst.toFixed(2)}</td>
                </tr>
              )}
              {invoice.totalSgst > 0 && (
                <tr>
                  <td className="py-1 text-slate-600">SGST:</td>
                  <td className="py-1">₹{invoice.totalSgst.toFixed(2)}</td>
                </tr>
              )}
              {invoice.totalIgst > 0 && (
                <tr>
                  <td className="py-1 text-slate-600">IGST:</td>
                  <td className="py-1">₹{invoice.totalIgst.toFixed(2)}</td>
                </tr>
              )}
              {invoice.roundOff !== 0 && (
                <tr>
                  <td className="py-1 text-slate-500">Round-off:</td>
                  <td className="py-1">₹{invoice.roundOff.toFixed(2)}</td>
                </tr>
              )}
              <tr className="border-t border-b text-sm font-bold">
                <td className="py-2 text-slate-900">Grand Total:</td>
                <td className="py-2 text-slate-900">₹{invoice.grandTotal.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="pt-12 flex justify-between items-end text-slate-600">
          <div>
            <p className="text-[10px]">Customer Signature</p>
          </div>
          <div className="text-right">
            <p className="font-bold text-slate-800">For {invoice.billFromSnapshot.name}</p>
            <p className="text-[10px] mt-8">Authorized Signatory</p>
          </div>
        </div>
      </div>
    </div>
  );
}
