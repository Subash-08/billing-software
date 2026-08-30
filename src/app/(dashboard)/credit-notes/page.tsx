'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Plus,
  RefreshCw,
  Loader2,
  FileText,
  CheckCircle2,
  Search,
  Trash2,
  Eye,
  Printer,
  DollarSign,
  AlertCircle,
  TrendingDown,
} from 'lucide-react';
import { Toast } from '@/components/ui/toast';

interface ICreditNoteItem {
  name: string;
  hsnSacCode: string;
  quantity: number;
  unit: string;
  rate: number; // in paise
  taxableAmount: number;
  gstRate: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalAmount: number;
}

interface ICreditNote {
  _id: string;
  creditNoteNumber: string;
  creditNoteDate: string;
  customerSnapshot: { displayName: string; gstin?: string };
  originalInvoiceId?: string;
  reason: string;
  reasonNotes?: string;
  items?: ICreditNoteItem[];
  subTotal?: number;
  totalTaxable?: number;
  totalCgst?: number;
  totalSgst?: number;
  totalIgst?: number;
  grandTotal?: number;
  totals?: { grandTotalPaise: number; totalTaxablePaise: number; totalTaxPaise: number };
  status: 'DRAFT' | 'ISSUED' | 'CANCELLED';
  createdAt: string;
}

interface ICustomer {
  _id: string;
  displayName: string;
}

interface IInvoiceItemOption {
  name: string;
  hsnSacCode: string;
  quantity: number;
  unit: string;
  rate: number; // in paise
  gstRate: number;
}

interface IInvoiceOption {
  _id: string;
  invoiceNumber: string;
  customerId: string;
  billToSnapshot?: { name: string };
  grandTotal: number;
  paidAmount?: number;
  outstandingBalance?: number;
  documentType: string;
  items?: IInvoiceItemOption[];
}

interface ICreditNoteFormLine {
  selected: boolean;
  itemId?: string;
  name: string;
  hsnSacCode: string;
  maxQuantity: number;
  quantity: number;
  unit: string;
  rateRupees: number;
  gstRate: number;
}

function toRupees(val: number | undefined | null): number {
  if (!val) return 0;
  if (val >= 100000 || (val >= 100 && Number.isInteger(val))) {
    return val / 100;
  }
  return val;
}

export default function CreditNotesPage() {
  const [loading, setLoading] = useState(true);
  const [creditNotes, setCreditNotes] = useState<ICreditNote[]>([]);
  const [customers, setCustomers] = useState<ICustomer[]>([]);
  const [invoices, setInvoices] = useState<IInvoiceOption[]>([]);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  // View Modal State
  const [selectedCreditNoteForView, setSelectedCreditNoteForView] = useState<ICreditNote | null>(null);

  // Creation Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<IInvoiceOption | null>(null);

  const [formData, setFormData] = useState({
    customerId: '',
    originalInvoiceId: '',
    reason: 'SALES_RETURN' as 'SALES_RETURN' | 'RATE_REDUCTION' | 'POST_SALE_DISCOUNT' | 'CANCELLATION' | 'OTHER',
    reasonNotes: '',
    items: [
      {
        selected: true,
        name: 'Returned Goods / Service Credit',
        hsnSacCode: '9983',
        maxQuantity: 1,
        quantity: 1,
        unit: 'PCS',
        rateRupees: 1000,
        gstRate: 18,
      },
    ] as ICreditNoteFormLine[],

    // Direct Cash/Bank Payout parameters
    refundMode: 'Bank Transfer',
    referenceNumber: '',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [cnRes, custRes, invRes] = await Promise.all([
        fetch('/api/credit-notes'),
        fetch('/api/customers'),
        fetch('/api/invoices?limit=200'),
      ]);
      const cnData = await cnRes.json();
      const custData = await custRes.json();
      const invData = await invRes.json();

      if (cnData.success) setCreditNotes(cnData.creditNotes || []);
      if (custData.success) setCustomers(custData.customers || []);
      if (invData.success) setInvoices(invData.items || invData.invoices || []);
    } catch (e) {
      console.error('Failed to load credit notes data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleInvoiceSelect = (invoiceId: string) => {
    const inv = invoices.find((i) => i._id === invoiceId);
    if (inv) {
      setSelectedInvoice(inv);
      const mappedItems: ICreditNoteFormLine[] =
        inv.items && inv.items.length > 0
          ? inv.items.map((it) => ({
              selected: true,
              name: it.name,
              hsnSacCode: it.hsnSacCode || '9983',
              maxQuantity: it.quantity || 1,
              quantity: it.quantity || 1,
              unit: it.unit || 'PCS',
              rateRupees: toRupees(it.rate),
              gstRate: inv.documentType === 'BILL_OF_SUPPLY' ? 0 : it.gstRate ?? 18,
            }))
          : [
              {
                selected: true,
                name: `Return for Invoice ${inv.invoiceNumber}`,
                hsnSacCode: '9983',
                maxQuantity: 1,
                quantity: 1,
                unit: 'PCS',
                rateRupees: toRupees(inv.grandTotal),
                gstRate: inv.documentType === 'BILL_OF_SUPPLY' ? 0 : 18,
              },
            ];

      setFormData((prev) => ({
        ...prev,
        originalInvoiceId: invoiceId,
        customerId: inv.customerId || prev.customerId,
        items: mappedItems,
      }));
    } else {
      setSelectedInvoice(null);
      setFormData((prev) => ({ ...prev, originalInvoiceId: '' }));
    }
  };

  const handleToggleItemSelection = (index: number) => {
    setFormData((prev) => {
      const updated = [...prev.items];
      updated[index] = { ...updated[index], selected: !updated[index].selected };
      return { ...prev, items: updated };
    });
  };

  const handleItemQuantityChange = (index: number, qty: number) => {
    setFormData((prev) => {
      const updated = [...prev.items];
      updated[index] = { ...updated[index], quantity: qty };
      return { ...prev, items: updated };
    });
  };

  const handleAddItemLine = () => {
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          selected: true,
          name: '',
          hsnSacCode: '9983',
          maxQuantity: 99,
          quantity: 1,
          unit: 'PCS',
          rateRupees: 0,
          gstRate: selectedInvoice?.documentType === 'BILL_OF_SUPPLY' ? 0 : 18,
        },
      ],
    }));
  };

  // Selected items for submission
  const selectedItems = formData.items.filter((it) => it.selected);

  // Calculations for Modal
  const calculatedSubtotalRupees = selectedItems.reduce(
    (sum, item) => sum + Number(item.quantity) * Number(item.rateRupees),
    0
  );
  const calculatedTaxRupees = selectedItems.reduce(
    (sum, item) => sum + Number(item.quantity) * Number(item.rateRupees) * (Number(item.gstRate) / 100),
    0
  );
  const calculatedGrandTotalRupees = calculatedSubtotalRupees + calculatedTaxRupees;

  const invoiceGrandTotalRupees = selectedInvoice ? toRupees(selectedInvoice.grandTotal) : 0;
  const invoicePaidRupees = selectedInvoice ? toRupees(selectedInvoice.paidAmount) : 0;
  const invoiceOutstandingRupees = selectedInvoice ? toRupees(selectedInvoice.outstandingBalance) : 0;

  const offsetOutstandingRupees = Math.min(calculatedGrandTotalRupees, invoiceOutstandingRupees);
  const excessRefundableRupees = Math.max(0, calculatedGrandTotalRupees - offsetOutstandingRupees);

  const handleCreateCreditNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerId) {
      alert('Please select a customer.');
      return;
    }
    if (selectedItems.length === 0) {
      alert('Please select at least 1 returned item.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        customerId: formData.customerId,
        originalInvoiceId: formData.originalInvoiceId || undefined,
        reason: formData.reason,
        reasonNotes: formData.reasonNotes,
        items: selectedItems.map((it) => ({
          name: it.name,
          hsnSacCode: it.hsnSacCode,
          quantity: Number(it.quantity),
          unit: it.unit,
          uqc: 'OTH',
          rate: Number(it.rateRupees),
          gstRate: Number(it.gstRate),
        })),
      };

      const res = await fetch('/api/credit-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create Credit Note');

      // If there is excess collected cash from original invoice, pay back directly to customer
      if (excessRefundableRupees > 0) {
        await fetch('/api/refunds', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerId: formData.customerId,
            invoiceId: formData.originalInvoiceId || undefined,
            amountRupees: excessRefundableRupees,
            refundMode: formData.refundMode,
            referenceNumber: formData.referenceNumber,
            reason: `Credit Note ${data.creditNote?.creditNoteNumber || ''} Direct Customer Refund`,
          }),
        });
      }

      setToast(
        excessRefundableRupees > 0
          ? `Credit Note issued & ₹${excessRefundableRupees.toLocaleString('en-IN')} cash refund paid directly to customer!`
          : 'Credit Note issued successfully! Unpaid invoice balance updated.'
      );
      setModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredNotes = creditNotes.filter(
    (cn) =>
      cn.creditNoteNumber.toLowerCase().includes(search.toLowerCase()) ||
      cn.customerSnapshot?.displayName?.toLowerCase().includes(search.toLowerCase())
  );

  const totalCreditValue = creditNotes.reduce(
    (sum, cn) => sum + toRupees(cn.grandTotal || cn.totals?.grandTotalPaise),
    0
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 text-xs">
      {toast && <Toast type="success" message={toast} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Credit Notes & Sales Returns</h1>
          <p className="text-sm text-slate-500 mt-1">
            Issue sales returns for specific items, offset unpaid invoice balances, and process direct customer payouts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadData} className="gap-1.5 text-xs">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
          <Button
            onClick={() => setModalOpen(true)}
            className="bg-slate-900 hover:bg-slate-800 text-white gap-2 font-semibold text-xs shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>New Credit Note / Return</span>
          </Button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border border-slate-200 bg-white p-4 rounded-xl shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 block">Total Credit Notes</span>
          <p className="text-xl font-extrabold text-slate-900 mt-1">{creditNotes.length}</p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Issued document count</span>
        </Card>

        <Card className="border border-slate-200 bg-white p-4 rounded-xl shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 block">Total Value Credited</span>
          <p className="text-xl font-extrabold text-red-700 mt-1">
            ₹{totalCreditValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[11px] text-red-600 font-medium mt-0.5 block">Sales value deduction</span>
        </Card>

        <Card className="border border-slate-200 bg-white p-4 rounded-xl shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 block">GST Sec 34 & Ledger Status</span>
          <p className="text-sm font-bold text-emerald-700 mt-1 flex items-center gap-1">
            <CheckCircle2 className="h-4 w-4" /> Active & Inventory Synced
          </p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Auto-restocks inventory & offsets invoice due</span>
        </Card>
      </div>

      {/* Main Table */}
      <Card className="border border-slate-200 shadow-sm rounded-xl overflow-hidden bg-white">
        <CardHeader className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Credit Note No, Customer..."
              className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs focus:bg-white focus:outline-none"
            />
          </div>
        </CardHeader>

        <CardContent className="p-0 overflow-x-auto">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center space-y-2 text-slate-500">
              <Loader2 className="w-6 h-6 animate-spin text-slate-900" />
              <span className="text-xs font-medium">Loading credit notes...</span>
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-500">
              No credit notes found. Click <strong>"New Credit Note / Return"</strong> to issue a sales return.
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-900 text-slate-200 uppercase font-semibold text-[11px]">
                <tr>
                  <th className="px-5 py-3.5">Credit Note No</th>
                  <th className="px-4 py-3.5">Date</th>
                  <th className="px-5 py-3.5">Customer</th>
                  <th className="px-5 py-3.5">Reason</th>
                  <th className="px-4 py-3.5 text-center">Status</th>
                  <th className="px-5 py-3.5 text-right">Credit Value</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredNotes.map((cn) => (
                  <tr key={cn._id} className="hover:bg-slate-50">
                    <td className="px-5 py-4 font-bold text-slate-900 font-mono">{cn.creditNoteNumber}</td>
                    <td className="px-4 py-4 text-slate-600">{new Date(cn.creditNoteDate).toLocaleDateString('en-IN')}</td>
                    <td className="px-5 py-4 font-semibold text-slate-900">{cn.customerSnapshot?.displayName || 'Customer'}</td>
                    <td className="px-5 py-4">
                      <Badge variant="outline" className="text-[10px] uppercase">{cn.reason.replace(/_/g, ' ')}</Badge>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <Badge variant="success">Issued</Badge>
                    </td>
                    <td className="px-5 py-4 text-right font-extrabold text-red-700">
                      ₹{toRupees(cn.grandTotal || cn.totals?.grandTotalPaise).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedCreditNoteForView(cn)}
                        className="h-7 w-7 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                        title="View Detailed Credit Note"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Detailed Credit Note Document Modal */}
      {selectedCreditNoteForView && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 space-y-4 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-red-700" />
                <h3 className="font-bold text-slate-900 text-sm">GST Credit Note Document (Rule 53)</h3>
              </div>
              <button onClick={() => setSelectedCreditNoteForView(null)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <div className="space-y-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="flex justify-between items-start border-b border-slate-200/60 pb-3">
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm">{selectedCreditNoteForView.creditNoteNumber}</h4>
                  <p className="text-[11px] text-slate-500">Date: {new Date(selectedCreditNoteForView.creditNoteDate).toLocaleDateString('en-IN')}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Reason: <strong className="text-slate-800 uppercase">{selectedCreditNoteForView.reason.replace(/_/g, ' ')}</strong></p>
                </div>
                <div className="text-right">
                  <span className="font-bold text-slate-900 text-xs block">{selectedCreditNoteForView.customerSnapshot?.displayName || 'Customer'}</span>
                  {selectedCreditNoteForView.customerSnapshot?.gstin && (
                    <span className="font-mono text-[11px] text-slate-600 block">GSTIN: {selectedCreditNoteForView.customerSnapshot.gstin}</span>
                  )}
                  <Badge variant="success" className="mt-1">ISSUED</Badge>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <span className="font-bold text-slate-900 block mb-1">Itemized Sales Returns & Deductions</span>
                <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-700 font-semibold uppercase text-[10px]">
                      <tr>
                        <th className="p-2">Item Description</th>
                        <th className="p-2">HSN/SAC</th>
                        <th className="p-2 text-right">Qty</th>
                        <th className="p-2 text-right">Rate (₹)</th>
                        <th className="p-2 text-center">GST %</th>
                        <th className="p-2 text-right">Total (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-[11px]">
                      {selectedCreditNoteForView.items && selectedCreditNoteForView.items.length > 0 ? (
                        selectedCreditNoteForView.items.map((it, i) => (
                          <tr key={i}>
                            <td className="p-2 font-bold text-slate-900">{it.name}</td>
                            <td className="p-2 font-mono text-slate-500">{it.hsnSacCode}</td>
                            <td className="p-2 text-right">{it.quantity} {it.unit}</td>
                            <td className="p-2 text-right">₹{toRupees(it.rate).toFixed(2)}</td>
                            <td className="p-2 text-center">{it.gstRate}%</td>
                            <td className="p-2 text-right font-extrabold text-slate-900">₹{toRupees(it.totalAmount).toFixed(2)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="p-4 text-center text-slate-400">Standard Credit Adjustment</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="pt-2 flex justify-between items-center text-sm border-t border-slate-300">
                <span className="font-bold text-slate-900">Grand Total Credit Value:</span>
                <span className="text-base font-extrabold text-red-700">
                  ₹{toRupees(selectedCreditNoteForView.grandTotal || selectedCreditNoteForView.totals?.grandTotalPaise).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => window.print()} className="gap-1 text-xs">
                <Printer className="h-3.5 w-3.5" />
                <span>Print Credit Note</span>
              </Button>
              <Button type="button" onClick={() => setSelectedCreditNoteForView(null)} className="bg-slate-900 text-white text-xs font-bold">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Item-Selection Credit Note Creation Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full p-6 space-y-4 text-xs max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Issue Credit Note / Item Return</h3>
                <p className="text-[11px] text-slate-500">
                  Select items being returned. The original GST rate & prices are preserved automatically.
                </p>
              </div>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <form onSubmit={handleCreateCreditNote} className="space-y-4">
              {/* Target Invoice & Customer */}
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-800 block mb-1">
                    Select Target Invoice (Loads items & original GST rates)
                  </label>
                  <select
                    value={formData.originalInvoiceId}
                    onChange={(e) => handleInvoiceSelect(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-300 text-xs font-medium"
                  >
                    <option value="">-- Standalone Return (No Invoice Selected) --</option>
                    {invoices.map((inv) => (
                      <option key={inv._id} value={inv._id}>
                        {inv.invoiceNumber} — {inv.billToSnapshot?.name || 'Customer'} (₹{toRupees(inv.grandTotal).toLocaleString('en-IN')}) [{inv.documentType}]
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-800 block mb-1">Select Customer *</label>
                  <select
                    value={formData.customerId}
                    onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                    required
                    className="w-full h-9 px-3 rounded-lg border border-slate-300 text-xs font-medium"
                  >
                    <option value="">-- Choose Customer --</option>
                    {customers.map((c) => (
                      <option key={c._id} value={c._id}>{c.displayName}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Invoice Financial Breakdown Status Card */}
              {selectedInvoice && (
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-slate-700 font-bold border-b border-slate-200/60 pb-1.5">
                    <span>Target Invoice Status ({selectedInvoice.invoiceNumber})</span>
                    <Badge variant="outline" className="text-[10px]">{selectedInvoice.documentType}</Badge>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-400 block">Invoice Total</span>
                      <span className="font-bold text-slate-900">₹{invoiceGrandTotalRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Amount Paid</span>
                      <span className="font-bold text-emerald-700">₹{invoicePaidRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Outstanding Due</span>
                      <span className="font-bold text-amber-700">₹{invoiceOutstandingRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Selected Return Credit</span>
                      <span className="font-bold text-red-700">₹{calculatedGrandTotalRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>

                  {offsetOutstandingRupees > 0 && (
                    <div className="p-2 bg-amber-50 text-amber-900 border border-amber-200 rounded-lg text-[11px] font-medium">
                      ✓ <strong>₹{offsetOutstandingRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong> of this return will offset & cancel the unpaid due balance of {selectedInvoice.invoiceNumber}.
                    </div>
                  )}

                  {excessRefundableRupees > 0 && (
                    <div className="p-3 bg-emerald-50 text-emerald-950 border border-emerald-300 rounded-xl space-y-1.5 text-[11px]">
                      <div className="flex items-center justify-between font-bold text-emerald-900">
                        <span>⚡ Net Cash Refund Payout to Customer:</span>
                        <span className="text-sm font-extrabold text-emerald-700">
                          ₹{excessRefundableRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div className="pt-1.5 border-t border-emerald-200/80 text-[10px] text-emerald-900 space-y-1 font-medium">
                        <p>• <strong>Original Cash Paid by Customer:</strong> ₹{invoicePaidRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                        {invoiceGrandTotalRupees - calculatedGrandTotalRupees > 0 && (
                          <p>• <strong>Payment Retained for Kept Items:</strong> - ₹{(invoiceGrandTotalRupees - calculatedGrandTotalRupees).toLocaleString('en-IN', { minimumFractionDigits: 2 })} (Keyboard, Mouse, etc.)</p>
                        )}
                        <p>• <strong>Unpaid Due Balance Cancelled:</strong> - ₹{offsetOutstandingRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })} (Invoice Due → ₹0.00)</p>
                        <div className="p-1.5 bg-emerald-100/70 border border-emerald-300/80 rounded font-bold text-emerald-950 mt-1">
                          ➔ Actual Cash Collected to Return = ₹{invoicePaidRupees.toLocaleString('en-IN')} paid - ₹{Math.max(0, invoiceGrandTotalRupees - calculatedGrandTotalRupees).toLocaleString('en-IN')} kept items = <strong>₹{excessRefundableRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Items Checkbox Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-900 block">
                    Select Product(s) Being Returned ({selectedItems.length} of {formData.items.length} selected)
                  </label>
                  <Button type="button" variant="outline" size="sm" onClick={handleAddItemLine} className="h-7 text-[11px] gap-1">
                    <Plus className="h-3 w-3" />
                    <span>Add Custom Line</span>
                  </Button>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-900 text-slate-200 font-semibold uppercase text-[10px]">
                      <tr>
                        <th className="p-2.5 w-10 text-center">Return?</th>
                        <th className="p-2.5">Item Description</th>
                        <th className="p-2.5 w-24">HSN/SAC</th>
                        <th className="p-2.5 w-24 text-right">Return Qty</th>
                        <th className="p-2.5 w-28 text-right">Rate (₹)</th>
                        <th className="p-2.5 w-20 text-center">GST %</th>
                        <th className="p-2.5 w-28 text-right">Total (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {formData.items.map((item, idx) => {
                        const lineSubtotal = Number(item.quantity) * Number(item.rateRupees);
                        const lineTax = lineSubtotal * (Number(item.gstRate) / 100);
                        const lineTotal = lineSubtotal + lineTax;

                        return (
                          <tr key={idx} className={item.selected ? 'bg-white' : 'bg-slate-50 opacity-50'}>
                            <td className="p-2.5 text-center">
                              <input
                                type="checkbox"
                                checked={item.selected}
                                onChange={() => handleToggleItemSelection(idx)}
                                className="h-4 w-4 rounded border-slate-300 text-slate-900 cursor-pointer"
                              />
                            </td>
                            <td className="p-2.5 font-bold text-slate-900">{item.name}</td>
                            <td className="p-2.5 font-mono text-slate-500">{item.hsnSacCode}</td>
                            <td className="p-2.5 text-right">
                              <Input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => handleItemQuantityChange(idx, Number(e.target.value))}
                                disabled={!item.selected}
                                min={1}
                                max={item.maxQuantity}
                                className="h-7 w-16 text-right font-bold text-xs"
                              />
                            </td>
                            <td className="p-2.5 text-right font-bold text-slate-800">
                              ₹{item.rateRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="p-2.5 text-center">
                              <Badge variant="outline" className="font-mono text-[10px]">
                                {item.gstRate}%
                              </Badge>
                            </td>
                            <td className="p-2.5 text-right font-extrabold text-slate-900">
                              ₹{lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-between items-center text-xs font-bold pt-1 text-slate-800">
                  <span>Credit Return Grand Total:</span>
                  <span className="text-sm font-extrabold text-red-700">
                    ₹{calculatedGrandTotalRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Direct Cash Refund Payout Section */}
              {excessRefundableRupees > 0 && (
                <div className="p-4 border border-emerald-200 bg-emerald-50/70 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-950 block text-xs">
                      Direct Cash / Bank Refund Payout to Customer: ₹{excessRefundableRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                    <Badge variant="success">Direct Payout</Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="font-semibold text-emerald-900 block mb-1">Payout Method *</label>
                      <select
                        value={formData.refundMode}
                        onChange={(e) => setFormData({ ...formData, refundMode: e.target.value })}
                        className="w-full h-8 px-2 rounded-lg border border-emerald-300 text-xs bg-white font-medium"
                      >
                        <option value="Bank Transfer">Bank Transfer (NEFT/RTGS/IMPS)</option>
                        <option value="Cash">Cash Handout</option>
                        <option value="UPI">UPI / GPay / PhonePe</option>
                        <option value="Cheque">Cheque Payout</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-semibold text-emerald-900 block mb-1">Ref / UTR No (Optional)</label>
                      <Input
                        value={formData.referenceNumber}
                        onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                        placeholder="e.g. UTR-98127391"
                        className="h-8 text-xs font-mono bg-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <Button type="button" variant="outline" onClick={() => setModalOpen(false)} className="text-xs">Cancel</Button>
                <Button type="submit" disabled={submitting} className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs">
                  {submitting ? 'Processing...' : 'Confirm & Issue Credit Note'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
