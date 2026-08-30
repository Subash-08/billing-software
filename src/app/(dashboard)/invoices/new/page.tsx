'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, ChevronDown, ChevronUp, Save, Send, ArrowLeft, Info, DollarSign, CheckCircle2 } from 'lucide-react';
import { calculateInvoice } from '@/engine/invoice/invoice.calculator';
import { ResolvedTaxRate } from '@/engine/gst/gst.types';
import { QuickAddCustomerModal, QuickAddProductModal } from '@/components/modals/quick-add-modals';
import { Toast } from '@/components/ui/toast';

interface CustomerOption {
  _id: string;
  displayName?: string;
  name?: string;
  gstin?: string;
  stateCode?: string;
  billingAddress?: { stateCode?: string };
  placeOfSupply?: string;
}

interface ProductOption {
  _id: string;
  name: string;
  hsnCode?: string;
  unit: string;
  sellingPrice: number;
  defaultGstRate: number;
}

interface LineItemForm {
  itemId: string;
  itemType: 'GOODS' | 'SERVICES';
  name: string;
  hsnSacCode: string;
  quantity: number;
  unit: string;
  uqc: string;
  rate: number;
  discountValue: number;
  discountType: 'FIXED' | 'PERCENTAGE';
  taxTreatment: 'REDUCE_TAXABLE_VALUE' | 'COMMERCIAL_ONLY';
  gstRate: number;
}

export default function CreateInvoicePage() {
  const router = useRouter();
  const [formError, setFormError] = useState<any>(null);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [paymentModes, setPaymentModes] = useState<any[]>([]);
  const [businessStateCode, setBusinessStateCode] = useState('33');

  const [addCustomerOpen, setAddCustomerOpen] = useState(false);
  const [addProductOpen, setAddProductOpen] = useState(false);
  const [activeItemIndexForAdd, setActiveItemIndexForAdd] = useState<number>(0);

  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [placeOfSupplyStateCode, setPlaceOfSupplyStateCode] = useState('33');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]);
  const [supplyType, setSupplyType] = useState('B2B');

  // Initial Payment Options
  const [recordInitialPayment, setRecordInitialPayment] = useState(false);
  const [selectedPaymentModeId, setSelectedPaymentModeId] = useState('');
  const [initialPaidAmount, setInitialPaidAmount] = useState<number>(0);
  const [initialPaymentRef, setInitialPaymentRef] = useState('');

  const [items, setItems] = useState<LineItemForm[]>([
    {
      itemId: '',
      itemType: 'GOODS',
      name: '',
      hsnSacCode: '73181500',
      quantity: 1,
      unit: 'PCS',
      uqc: 'PCS',
      rate: 0,
      discountValue: 0,
      discountType: 'FIXED',
      taxTreatment: 'REDUCE_TAXABLE_VALUE',
      gstRate: 18,
    },
  ]);

  const [showTaxBreakdown, setShowTaxBreakdown] = useState(false);
  const [showAuditTrace, setShowAuditTrace] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load Business Profile, Customers, Products, and Payment Modes
  useEffect(() => {
    async function loadData() {
      try {
        const [bizRes, custRes, prdRes, modeRes] = await Promise.all([
          fetch('/api/business/profile'),
          fetch('/api/customers'),
          fetch('/api/products'),
          fetch('/api/payment-modes'),
        ]);

        const bizJson = await bizRes.json();
        if (bizJson.success && bizJson.data) {
          setBusinessStateCode(bizJson.data.address?.stateCode || '33');
          setPlaceOfSupplyStateCode(bizJson.data.address?.stateCode || '33');
        }

        const custJson = await custRes.json();
        if (custJson.success) {
          setCustomers(custJson.customers || custJson.items || []);
        }

        const prdJson = await prdRes.json();
        if (prdJson.success) {
          setProducts(prdJson.products || prdJson.items || []);
        }

        const modeJson = await modeRes.json();
        if (modeJson.success && Array.isArray(modeJson.data)) {
          setPaymentModes(modeJson.data);
          if (modeJson.data.length > 0) {
            setSelectedPaymentModeId(modeJson.data[0]._id);
          }
        }
      } catch (err) {
        console.error('Error loading form options', err);
      }
    }
    loadData();
  }, []);

  const handleCustomerChange = (customerId: string) => {
    setSelectedCustomerId(customerId);
    const found = customers.find((c) => c._id === customerId);
    if (found) {
      const pos = found.stateCode || found.billingAddress?.stateCode || found.placeOfSupply || '33';
      setPlaceOfSupplyStateCode(pos);
    }
  };

  const handleItemSelect = (index: number, productId: string) => {
    const prd = products.find((p) => p._id === productId);
    if (!prd) return;

    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      itemId: prd._id,
      name: prd.name,
      hsnSacCode: prd.hsnCode || '73181500',
      rate: prd.sellingPrice || 0,
      gstRate: prd.defaultGstRate || 18,
      unit: prd.unit || 'PCS',
      uqc: prd.unit || 'PCS',
    };
    setItems(newItems);
  };

  const addItemRow = () => {
    setItems([
      ...items,
      {
        itemId: '',
        itemType: 'GOODS',
        name: '',
        hsnSacCode: '73181500',
        quantity: 1,
        unit: 'PCS',
        uqc: 'PCS',
        rate: 0,
        discountValue: 0,
        discountType: 'FIXED',
        taxTreatment: 'REDUCE_TAXABLE_VALUE',
        gstRate: 18,
      },
    ]);
  };

  const removeItemRow = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  // Real-time Phase 11 engine calculation preview
  const runLiveCalculation = () => {
    try {
      const lineInputs = items.map((it) => {
        const dummyRateDoc: ResolvedTaxRate = {
          taxRateId: '507f1f77bcf86cd799439018',
          version: '1.0',
          rate: it.gstRate,
          cessRate: 0,
          effectiveFrom: new Date('2026-01-01'),
        };

        return {
          lineId: `line-${Math.random()}`,
          itemId: it.itemId || '507f1f77bcf86cd799439018',
          itemType: it.itemType,
          name: it.name || 'Sample Line Item',
          quantity: it.quantity,
          unit: it.unit,
          uqc: it.uqc,
          classificationCode: { type: (it.itemType === 'SERVICES' ? 'SAC' : 'HSN') as 'SAC' | 'HSN', code: it.hsnSacCode || '73181500' },
          ratePaise: Math.round(it.rate * 100),
          rate: it.rate,
          discountValue: it.discountValue,
          discountType: it.discountType,
          taxTreatment: 'TAXABLE' as const,
          resolvedTaxRate: dummyRateDoc,
        };
      });

      return calculateInvoice({
        supplierStateCode: businessStateCode,
        placeOfSupplyStateCode,
        items: lineInputs,
      });
    } catch {
      return null;
    }
  };

  const calcResult = runLiveCalculation();
  const grandTotal = calcResult ? calcResult.grandTotalAmount : 0;
  const balanceDue = Math.max(0, grandTotal - (recordInitialPayment ? initialPaidAmount : 0));

  const handleSave = async (andIssue = false) => {
    setFormError(null);

    if (!selectedCustomerId) {
      setFormError('Please select a customer.');
      return;
    }

    if (items.some((i) => !i.name || i.quantity <= 0 || i.rate <= 0)) {
      setFormError('All line items must have a valid name, quantity > 0, and rate > 0.');
      return;
    }

    if (recordInitialPayment && initialPaidAmount > grandTotal + 0.01) {
      setFormError(`Initial payment (₹${initialPaidAmount.toLocaleString('en-IN')}) cannot exceed Grand Total (₹${grandTotal.toLocaleString('en-IN')}).`);
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        customerId: selectedCustomerId,
        invoiceDate,
        dueDate,
        supplyType,
        placeOfSupplyStateCode,
        items: items.map((i) => ({
          itemId: i.itemId || undefined,
          itemType: i.itemType,
          name: i.name,
          hsnSacCode: i.hsnSacCode,
          quantity: i.quantity,
          unit: i.unit,
          uqc: i.uqc,
          rate: i.rate,
          lineDiscount:
            i.discountValue > 0
              ? { type: i.discountType, value: i.discountValue, taxTreatment: i.taxTreatment }
              : undefined,
          gstRate: i.gstRate,
        })),
      };

      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!json.success) {
        setFormError(json.details || json.error || 'Failed to create invoice');
        setIsSubmitting(false);
        return;
      }

      const createdId = json.data._id;

      if (andIssue) {
        const issueRes = await fetch(`/api/invoices/${createdId}/issue`, { method: 'POST' });
        const issueJson = await issueRes.json();
        if (!issueJson.success) {
          setFormError(`Created draft, but issue failed: ${issueJson.error}`);
          router.push(`/invoices/${createdId}`);
          return;
        }

        // Record Initial Payment if requested
        if (recordInitialPayment && initialPaidAmount > 0 && selectedPaymentModeId) {
          const amountPaise = Math.round(initialPaidAmount * 100);
          const idempKey = `idemp-initpay-${createdId}-${Date.now()}`;
          await fetch('/api/payments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              customerId: selectedCustomerId,
              paymentDate: invoiceDate,
              amountPaise,
              paymentModeId: selectedPaymentModeId,
              referenceNumber: initialPaymentRef.trim() || undefined,
              idempotencyKey: idempKey,
              requestHash: `hash-${idempKey}`,
              allocations: [
                {
                  invoiceId: createdId,
                  allocationAmountPaise: amountPaise,
                },
              ],
            }),
          });
        }
      }

      router.push(`/invoices/${createdId}`);
    } catch (err: any) {
      setFormError(err.message || 'Submission failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {formError && <Toast type="error" message={formError} onClose={() => setFormError(null)} />}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Create GST Tax Invoice</h1>
            <p className="text-xs text-slate-500">Real-time Phase 11 engine calculation & statutory previews.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => handleSave(false)} disabled={isSubmitting} className="gap-1.5 text-xs">
            <Save className="h-3.5 w-3.5" />
            <span>Save Draft</span>
          </Button>
          <Button size="sm" onClick={() => handleSave(true)} disabled={isSubmitting} className="bg-[#0f172a] hover:bg-slate-800 text-white gap-1.5 text-xs font-semibold">
            <Send className="h-3.5 w-3.5" />
            <span>Issue Invoice & Save</span>
          </Button>
        </div>
      </div>

      {/* Header Fields */}
      <Card>
        <CardContent className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="font-semibold text-slate-700">Customer *</label>
              <button
                type="button"
                onClick={() => setAddCustomerOpen(true)}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-0.5"
              >
                <Plus className="w-3 h-3" /> Add Customer
              </button>
            </div>
            <select
              value={selectedCustomerId}
              onChange={(e) => handleCustomerChange(e.target.value)}
              className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-slate-50 text-xs focus:border-slate-500 focus:outline-none"
            >
              <option value="">Select Customer...</option>
              {customers.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.displayName || c.name} {c.gstin ? `(${c.gstin})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Place of Supply (State Code)</label>
            <Input
              type="text"
              value={placeOfSupplyStateCode}
              onChange={(e) => setPlaceOfSupplyStateCode(e.target.value)}
              placeholder="e.g. 33 (TN)"
              className="h-9 text-xs"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Supply Type</label>
            <select
              value={supplyType}
              onChange={(e) => setSupplyType(e.target.value)}
              className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-slate-50 text-xs focus:border-slate-500 focus:outline-none"
            >
              <option value="B2B">B2B (Registered Customer)</option>
              <option value="B2C">B2C (Unregistered Consumer)</option>
              <option value="SEZ_WITH_PAYMENT">SEZ With Payment</option>
              <option value="SEZ_WITHOUT_PAYMENT">SEZ Without Payment</option>
              <option value="EXPORT_WITH_PAYMENT">Export With Payment</option>
              <option value="EXPORT_WITHOUT_PAYMENT">Export Without Payment</option>
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Invoice Date</label>
            <Input
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              className="h-9 text-xs"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Due Date</label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="h-9 text-xs"
            />
          </div>
        </CardContent>
      </Card>

      {/* Line Items Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-3 px-6 border-b border-slate-100">
          <CardTitle className="text-xs font-bold text-slate-800 uppercase tracking-wider">Line Items</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={addItemRow} className="gap-1 text-xs">
            <Plus className="h-3.5 w-3.5" /> Add Row
          </Button>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3 min-w-[200px]">Item Description</th>
                <th className="px-4 py-3 w-28">HSN/SAC</th>
                <th className="px-4 py-3 w-20 text-right">Qty</th>
                <th className="px-4 py-3 w-24 text-right">Rate (₹)</th>
                <th className="px-4 py-3 w-24 text-right">Discount</th>
                <th className="px-4 py-3 w-24 text-right">GST %</th>
                <th className="px-4 py-3 w-12 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {items.map((it, index) => (
                <tr key={index} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 text-slate-400 font-semibold">{index + 1}</td>
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      <select
                        onChange={(e) => handleItemSelect(index, e.target.value)}
                        value={it.itemId || ''}
                        className="w-full h-8 px-2 rounded border border-slate-200 bg-slate-50 text-xs focus:outline-none mb-1"
                      >
                        <option value="">Select from catalog...</option>
                        {products.map((p) => (
                          <option key={p._id} value={p._id}>
                            {p.name} (₹{p.sellingPrice})
                          </option>
                        ))}
                      </select>
                      <Input
                        type="text"
                        placeholder="Item name / description..."
                        value={it.name}
                        onChange={(e) => {
                          const newItems = [...items];
                          newItems[index].name = e.target.value;
                          setItems(newItems);
                        }}
                        className="h-8 text-xs font-semibold"
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Input
                      type="text"
                      value={it.hsnSacCode}
                      onChange={(e) => {
                        const newItems = [...items];
                        newItems[index].hsnSacCode = e.target.value;
                        setItems(newItems);
                      }}
                      className="h-8 text-xs font-mono"
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Input
                      type="number"
                      min="1"
                      value={it.quantity}
                      onChange={(e) => {
                        const newItems = [...items];
                        newItems[index].quantity = parseFloat(e.target.value) || 0;
                        setItems(newItems);
                      }}
                      className="h-8 text-xs text-right"
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={it.rate}
                      onChange={(e) => {
                        const newItems = [...items];
                        newItems[index].rate = parseFloat(e.target.value) || 0;
                        setItems(newItems);
                      }}
                      className="h-8 text-xs text-right font-semibold"
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={it.discountValue}
                      onChange={(e) => {
                        const newItems = [...items];
                        newItems[index].discountValue = parseFloat(e.target.value) || 0;
                        setItems(newItems);
                      }}
                      className="h-8 text-xs text-right"
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <select
                      value={it.gstRate}
                      onChange={(e) => {
                        const newItems = [...items];
                        newItems[index].gstRate = parseFloat(e.target.value);
                        setItems(newItems);
                      }}
                      className="h-8 px-2 rounded border border-slate-200 bg-slate-50 text-xs focus:outline-none"
                    >
                      <option value={0}>0%</option>
                      <option value={5}>5%</option>
                      <option value={12}>12%</option>
                      <option value={18}>18%</option>
                      <option value={28}>28%</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItemRow(index)}
                      disabled={items.length <= 1}
                      className="h-7 w-7 text-slate-400 hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Initial Payment Section */}
      <Card className="border border-slate-200 bg-white">
        <CardHeader className="py-3 px-6 border-b border-slate-100 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-emerald-600" />
            <CardTitle className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Initial Payment & Payment Status
            </CardTitle>
          </div>
          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={recordInitialPayment}
              onChange={(e) => {
                setRecordInitialPayment(e.target.checked);
                if (e.target.checked && grandTotal > 0) {
                  setInitialPaidAmount(grandTotal);
                }
              }}
              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
            />
            <span>Record Initial Payment Received</span>
          </label>
        </CardHeader>
        {recordInitialPayment && (
          <CardContent className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs bg-slate-50/50">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Payment Mode *</label>
              <select
                value={selectedPaymentModeId}
                onChange={(e) => setSelectedPaymentModeId(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs focus:outline-none"
              >
                {paymentModes.map((mode) => (
                  <option key={mode._id} value={mode._id}>
                    {mode.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Amount Paid (₹) *
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max={grandTotal}
                value={initialPaidAmount || ''}
                onChange={(e) => setInitialPaidAmount(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="h-9 text-xs font-bold text-slate-900"
              />
              <div className="flex gap-2 mt-1 text-[11px]">
                <button
                  type="button"
                  onClick={() => setInitialPaidAmount(grandTotal)}
                  className="text-blue-600 hover:underline font-medium"
                >
                  Full Paid (₹{grandTotal.toLocaleString('en-IN')})
                </button>
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Reference / Transaction No.
              </label>
              <Input
                type="text"
                value={initialPaymentRef}
                onChange={(e) => setInitialPaymentRef(e.target.value)}
                placeholder="e.g. UTR / GPay Ref / Cheque No."
                className="h-9 text-xs"
              />
            </div>
          </CardContent>
        )}
      </Card>

      {/* Calculation Summary Card */}
      {calcResult && (
        <Card className="border border-slate-200 bg-slate-50/50">
          <CardContent className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowTaxBreakdown(!showTaxBreakdown)}
                  className="text-xs text-slate-600 gap-1"
                >
                  <span>Tax Breakdown</span>
                  {showTaxBreakdown ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAuditTrace(!showAuditTrace)}
                  className="text-xs text-slate-600 gap-1"
                >
                  <Info className="h-3.5 w-3.5 text-teal-600" />
                  <span>Why this tax?</span>
                </Button>
              </div>
            </div>

            {/* Expandable Tax Breakdown */}
            {showTaxBreakdown && (
              <div className="bg-white p-3 rounded-lg border border-slate-200 text-xs space-y-2">
                <span className="font-semibold text-slate-800">Compound GST Rate Summaries</span>
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b">
                    <tr>
                      <th className="p-2">Rate</th>
                      <th className="p-2">Treatment</th>
                      <th className="p-2">Jurisdiction</th>
                      <th className="p-2 text-right">Taxable</th>
                      <th className="p-2 text-right">CGST</th>
                      <th className="p-2 text-right">SGST</th>
                      <th className="p-2 text-right">IGST</th>
                      <th className="p-2 text-right">Total Tax</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calcResult.rateSummaries.map((s, i) => (
                      <tr key={i} className="border-b">
                        <td className="p-2 font-bold">{s.gstRate}%</td>
                        <td className="p-2">{s.taxTreatment}</td>
                        <td className="p-2">{s.jurisdiction}</td>
                        <td className="p-2 text-right">₹{s.taxableAmount.toLocaleString('en-IN')}</td>
                        <td className="p-2 text-right">₹{s.cgstAmount.toLocaleString('en-IN')}</td>
                        <td className="p-2 text-right">₹{s.sgstAmount.toLocaleString('en-IN')}</td>
                        <td className="p-2 text-right">₹{s.igstAmount.toLocaleString('en-IN')}</td>
                        <td className="p-2 text-right font-bold">₹{s.totalTaxAmount.toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Calculation Totals */}
            <div className="space-y-1.5 text-xs text-right max-w-xs ml-auto font-medium">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span>₹{calcResult.subTotalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              {calcResult.totalDiscountAmount > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Discount:</span>
                  <span>-₹{calcResult.totalDiscountAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-700 font-semibold border-t pt-1">
                <span>Taxable Value:</span>
                <span>₹{calcResult.totalTaxableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              {calcResult.totalCgstAmount > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>CGST:</span>
                  <span>+₹{calcResult.totalCgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              {calcResult.totalSgstAmount > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>SGST:</span>
                  <span>+₹{calcResult.totalSgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              {calcResult.totalIgstAmount > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>IGST:</span>
                  <span>+₹{calcResult.totalIgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              {calcResult.roundOffAmount !== 0 && (
                <div className="flex justify-between text-slate-500">
                  <span>Round-off:</span>
                  <span>₹{calcResult.roundOffAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-900 text-sm font-bold border-t border-slate-300 pt-2">
                <span>Grand Total:</span>
                <span>₹{calcResult.grandTotalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>

              {recordInitialPayment && (
                <>
                  <div className="flex justify-between text-emerald-700 text-xs font-bold border-t border-slate-200 pt-1">
                    <span>Initial Paid Amount:</span>
                    <span>₹{initialPaidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-amber-700 text-xs font-bold">
                    <span>Balance Due:</span>
                    <span>₹{balanceDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Add Modals */}
      <QuickAddCustomerModal
        isOpen={addCustomerOpen}
        onClose={() => setAddCustomerOpen(false)}
        onSuccess={(newCust) => {
          setCustomers((prev) => [...prev, newCust]);
          setSelectedCustomerId(newCust._id);
          const pos = newCust.stateCode || newCust.billingAddress?.stateCode || '33';
          setPlaceOfSupplyStateCode(pos);
        }}
      />

      <QuickAddProductModal
        isOpen={addProductOpen}
        onClose={() => setAddProductOpen(false)}
        onSuccess={(newPrd) => {
          setProducts((prev) => [...prev, newPrd]);
          handleItemSelect(activeItemIndexForAdd, newPrd._id);
        }}
      />
    </div>
  );
}
