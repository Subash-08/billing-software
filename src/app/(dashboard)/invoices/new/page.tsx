'use client';

/**
 * Invoice Creation Page — Phase 3A.1 Professional UI/UX
 *
 * Professional Indian GST Billing Engine & Document Creation Interface:
 * - Direct real DB backend integration for PRODUCTS & SERVICES (/api/products & /api/services)
 * - Support for all 8 statutory document types: Tax Invoice, Bill of Supply, Quotation, Proforma,
 *   Credit Note, Debit Note, Delivery Challan, Sales Order
 * - Inclusive / Exclusive GST pricing mode per line item with visual indicators
 * - Real-time live tax calculation via Phase 11 GST Engine
 * - Inline quick-create Product / Service modal
 * - Extended details: Reference/PO #, Vehicle #, E-Way Bill #, Transport mode
 * - Fixed Z-index dropdown positioning so item search suggestions float cleanly on top
 * - Strict integer-only Quantity handling (no 2.5 decimal quantities allowed)
 * - Functional Record Payment section with auto-fill grand total
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { calculateInvoice } from '@/engine/invoice/invoice.calculator';
import { ResolvedTaxRate } from '@/engine/gst/gst.types';
import { rupeesToPaise, paiseToRupees } from '@/lib/money';
import { Toast } from '@/components/ui/toast';
import {
  FileText,
  Plus,
  Trash2,
  CheckCircle2,
  ChevronDown,
  Info,
  Calendar,
  User,
  Truck,
  ShieldCheck,
  ArrowLeft,
  X,
  CreditCard,
  Layers,
  Loader2,
  DollarSign,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

interface CustomerOption {
  _id: string;
  displayName?: string;
  name?: string;
  gstin?: string;
  gstTreatment?: string;
  stateCode?: string;
  billingAddress?: { stateCode?: string; addressLine1?: string; city?: string; state?: string; pincode?: string };
  shippingAddresses?: Array<{ stateCode?: string; addressLine1?: string; city?: string; state?: string; pincode?: string; isDefaultShipping?: boolean }>;
  phone?: string;
  email?: string;
}

interface CatalogItem {
  _id: string;
  itemType: 'GOODS' | 'SERVICES';
  name: string;
  code?: string;
  hsnSacCode: string;
  unit: string;
  uqc: string;
  sellingPrice: number;
  defaultGstRate: number;
  isPriceInclusiveOfGst?: boolean;
  taxTreatment?: string;
  description?: string;
  stockQuantity?: number;
  trackInventory?: boolean;
}

interface TaxRateOption {
  id: string;
  name: string;
  rate: number;
}

interface LineItem {
  id: string;
  itemId: string;
  itemType: 'GOODS' | 'SERVICES';
  name: string;
  description: string;
  hsnSacCode: string;
  quantity: number;
  unit: string;
  uqc: string;
  rate: number;
  priceMode: 'EXCLUSIVE' | 'INCLUSIVE';
  discountValue: number;
  discountType: 'FIXED' | 'PERCENTAGE';
  discountTaxTreatment: 'REDUCE_TAXABLE_VALUE' | 'COMMERCIAL_ONLY';
  taxTreatment: 'TAXABLE' | 'NIL_RATED' | 'EXEMPT' | 'NON_GST' | 'ZERO_RATED';
  gstRate: number;
}

const newLine = (): LineItem => ({
  id: `${Date.now()}-${Math.random()}`,
  itemId: '',
  itemType: 'GOODS',
  name: '',
  description: '',
  hsnSacCode: '',
  quantity: 1,
  unit: 'PCS',
  uqc: 'PCS',
  rate: 0,
  priceMode: 'EXCLUSIVE',
  discountValue: 0,
  discountType: 'PERCENTAGE',
  discountTaxTreatment: 'REDUCE_TAXABLE_VALUE',
  taxTreatment: 'TAXABLE',
  gstRate: 18,
});

const DOCUMENT_TYPES = [
  { value: 'TAX_INVOICE', label: 'Tax Invoice', badge: 'GST Invoice', desc: 'Standard GST tax invoice for registered B2B & B2C transactions.' },
  { value: 'BILL_OF_SUPPLY', label: 'Bill of Supply', badge: 'Exempt / Composition', desc: 'Issued when selling exempt goods or operating under Composition Scheme (No GST charged).' },
  { value: 'PROFORMA', label: 'Proforma Invoice', badge: 'Draft Estimate', desc: 'Preliminary bill of sale sent to buyers in advance of commercial delivery.' },
  { value: 'QUOTATION', label: 'Quotation / Estimate', badge: 'Price Quote', desc: 'Formal price quote issued to prospective buyers.' },
  { value: 'CREDIT_NOTE', label: 'Credit Note', badge: 'Sales Return / Adjustment', desc: 'Issued for sales returns, price reductions, or excess tax adjustments.' },
  { value: 'DEBIT_NOTE', label: 'Debit Note', badge: 'Additional Charge', desc: 'Issued for short charges, additional taxable amounts, or price increases.' },
  { value: 'DELIVERY_CHALLAN', label: 'Delivery Challan', badge: 'Statutory Transport', desc: 'Rule 55 document for movement of goods (Job work, Supply on approval, Logistics).' },
  { value: 'SALES_ORDER', label: 'Sales Order', badge: 'Order Confirmation', desc: 'Confirmation document issued upon receiving a customer purchase order.' },
];

const SUPPLY_TYPES = [
  { value: 'B2B', label: 'B2B — Registered Business (With GSTIN)' },
  { value: 'B2C', label: 'B2C — Consumer / Unregistered' },
  { value: 'SEZ_WITHOUT_PAYMENT', label: 'SEZ Without Payment (LUT Bond)' },
  { value: 'SEZ_WITH_PAYMENT', label: 'SEZ With Payment of IGST' },
  { value: 'EXPORT_WITHOUT_PAYMENT', label: 'Export Without Payment (LUT Bond)' },
  { value: 'EXPORT_WITH_PAYMENT', label: 'Export With Payment of IGST' },
];

const INDIAN_STATES = [
  { code: '01', name: 'Jammu & Kashmir' }, { code: '02', name: 'Himachal Pradesh' },
  { code: '03', name: 'Punjab' }, { code: '04', name: 'Chandigarh' },
  { code: '05', name: 'Uttarakhand' }, { code: '06', name: 'Haryana' },
  { code: '07', name: 'Delhi' }, { code: '08', name: 'Rajasthan' },
  { code: '09', name: 'Uttar Pradesh' }, { code: '10', name: 'Bihar' },
  { code: '11', name: 'Sikkim' }, { code: '12', name: 'Arunachal Pradesh' },
  { code: '13', name: 'Nagaland' }, { code: '14', name: 'Manipur' },
  { code: '15', name: 'Mizoram' }, { code: '16', name: 'Tripura' },
  { code: '17', name: 'Meghalaya' }, { code: '18', name: 'Assam' },
  { code: '19', name: 'West Bengal' }, { code: '20', name: 'Jharkhand' },
  { code: '21', name: 'Odisha' }, { code: '22', name: 'Chhattisgarh' },
  { code: '23', name: 'Madhya Pradesh' }, { code: '24', name: 'Gujarat' },
  { code: '25', name: 'Daman & Diu' }, { code: '26', name: 'Dadra & Nagar Haveli' },
  { code: '27', name: 'Maharashtra' }, { code: '28', name: 'Andhra Pradesh (Old)' },
  { code: '29', name: 'Karnataka' }, { code: '30', name: 'Goa' },
  { code: '31', name: 'Lakshadweep' }, { code: '32', name: 'Kerala' },
  { code: '33', name: 'Tamil Nadu' }, { code: '34', name: 'Puducherry' },
  { code: '35', name: 'Andaman & Nicobar' }, { code: '36', name: 'Telangana' },
  { code: '37', name: 'Andhra Pradesh' }, { code: '38', name: 'Ladakh' },
];

const UT_CODES = new Set(['04', '07', '25', '26', '31', '34', '35', '38']);

// ─── Amount in Words ─────────────────────────────────────────────────────────

const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen'];
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function numToWords(n: number): string {
  if (n === 0) return 'Zero';
  if (n < 20) return ones[n];
  if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
  if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + numToWords(n % 100) : '');
  if (n < 100000) return numToWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + numToWords(n % 1000) : '');
  if (n < 10000000) return numToWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + numToWords(n % 100000) : '');
  return numToWords(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + numToWords(n % 10000000) : '');
}

function amountInWords(paise: number): string {
  const rupees = Math.floor(paise / 100);
  const remainingPaise = paise % 100;
  let words = 'Rupees ' + numToWords(rupees);
  if (remainingPaise > 0) words += ' and ' + numToWords(remainingPaise) + ' Paise';
  return words + ' Only';
}

// ─── Inline Line Calculation Preview ─────────────────────────────────────────

function calcLinePreview(line: LineItem, businessStateCode: string, pos: string) {
  if (!line.name || line.quantity <= 0 || line.rate <= 0) return null;
  try {
    const ratePaise = rupeesToPaise(line.rate);
    const dummyRate: ResolvedTaxRate = {
      taxRateId: 'preview', version: '1.0',
      rate: line.gstRate, cessRate: 0,
      effectiveFrom: new Date('2017-07-01'),
    };
    const discountInput = line.discountValue > 0
      ? { type: line.discountType, value: line.discountValue, taxTreatment: line.discountTaxTreatment }
      : undefined;

    const result = calculateInvoice({
      supplierStateCode: businessStateCode,
      placeOfSupplyStateCode: pos,
      items: [{
        itemId: line.itemId || 'preview',
        name: line.name,
        itemType: line.itemType,
        classificationCode: { type: line.itemType === 'SERVICES' ? 'SAC' : 'HSN', code: line.hsnSacCode || '9999' },
        quantity: line.quantity,
        freeQuantity: 0,
        unit: line.unit,
        uqc: line.uqc,
        ratePaise,
        lineDiscount: discountInput,
        taxTreatment: line.taxTreatment as any,
        resolvedTaxRate: dummyRate,
        isPriceInclusiveOfGst: line.priceMode === 'INCLUSIVE',
      }],
    });
    return result.items[0];
  } catch {
    return null;
  }
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function CreateInvoicePage() {
  const router = useRouter();

  // Master data
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [rowSearchResults, setRowSearchResults] = useState<CatalogItem[][]>([[]]);
  const [rowSearchLoading, setRowSearchLoading] = useState<boolean[]>([false]);
  const [taxRates, setTaxRates] = useState<TaxRateOption[]>([]);
  const [paymentModes, setPaymentModes] = useState<any[]>([]);
  const [businessStateCode, setBusinessStateCode] = useState('33');
  const [businessName, setBusinessName] = useState('');

  // Form state
  const [documentType, setDocumentType] = useState('TAX_INVOICE');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null);
  const [placeOfSupply, setPlaceOfSupply] = useState('33');
  const [supplyType, setSupplyType] = useState('B2B');
  const [reverseCharge, setReverseCharge] = useState(false);
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [termsAndConditions, setTermsAndConditions] = useState('1. Goods once sold will not be taken back.\n2. All disputes subject to local jurisdiction.');

  // Extended Details (PO / Vehicle / Transport)
  const [showExtendedDetails, setShowExtendedDetails] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [eWayBillNumber, setEWayBillNumber] = useState('');

  // Invoice-level discount
  const [invoiceDiscountValue, setInvoiceDiscountValue] = useState(0);
  const [invoiceDiscountType, setInvoiceDiscountType] = useState<'FIXED' | 'PERCENTAGE'>('PERCENTAGE');

  // Line items
  const [items, setItems] = useState<LineItem[]>([newLine()]);
  const [itemSearch, setItemSearch] = useState<string[]>(['']);
  const [itemDropdownOpen, setItemDropdownOpen] = useState<boolean[]>([false]);
  const searchTimers = React.useRef<(NodeJS.Timeout | null)[]>([null]);

  // Quick Add Item Modal
  const [quickAddModalOpen, setQuickAddModalOpen] = useState(false);
  const [quickAddRowIndex, setQuickAddRowIndex] = useState<number>(0);
  const [quickAddItemType, setQuickAddItemType] = useState<'GOODS' | 'SERVICES'>('GOODS');
  const [quickAddName, setQuickAddName] = useState('');
  const [quickAddPrice, setQuickAddPrice] = useState(0);
  const [quickAddHsnSac, setQuickAddHsnSac] = useState('');
  const [quickAddGstRate, setQuickAddGstRate] = useState(18);
  const [quickAddSaving, setQuickAddSaving] = useState(false);

  // Initial payment
  const [recordInitialPayment, setRecordInitialPayment] = useState(false);
  const [selectedPaymentModeId, setSelectedPaymentModeId] = useState('');
  const [initialPaidAmount, setInitialPaidAmount] = useState(0);
  const [initialPaymentRef, setInitialPaymentRef] = useState('');

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [bizRes, custRes, modeRes, taxRes] = await Promise.all([
          fetch('/api/business/profile'),
          fetch('/api/customers?limit=200'),
          fetch('/api/payment-modes'),
          fetch('/api/tax-rates'),
        ]);

        const [biz, cust, mode, tax] = await Promise.all([
          bizRes.json(), custRes.json(), modeRes.json(), taxRes.json(),
        ]);

        if (biz.success && biz.data) {
          setBusinessStateCode(biz.data.stateCode || biz.data.address?.stateCode || '33');
          setBusinessName(biz.data.legalName || biz.data.tradeName || '');
          setPlaceOfSupply(biz.data.stateCode || biz.data.address?.stateCode || '33');
        }

        if (cust.success) setCustomers(cust.customers || cust.items || cust.data || []);
        if (mode.success && Array.isArray(mode.data)) {
          setPaymentModes(mode.data);
          if (mode.data.length > 0) setSelectedPaymentModeId(mode.data[0]._id);
        }
        if (tax.success && Array.isArray(tax.data)) setTaxRates(tax.data);
      } catch (err) {
        console.error('Failed to load master data', err);
      }
    }
    load();
  }, []);

  // Server-side catalog search per row
  const searchCatalogForRow = useCallback(async (idx: number, query: string) => {
    if (!query || query.trim().length === 0) {
      setRowSearchResults(prev => { const next = [...prev]; next[idx] = []; return next; });
      return;
    }
    setRowSearchLoading(prev => { const next = [...prev]; next[idx] = true; return next; });
    try {
      const [prdRes, svcRes] = await Promise.all([
        fetch(`/api/products?search=${encodeURIComponent(query)}&status=ACTIVE&limit=20`),
        fetch(`/api/services?search=${encodeURIComponent(query)}&status=ACTIVE&limit=10`),
      ]);
      const [prdData, svcData] = await Promise.all([prdRes.json(), svcRes.json()]);

      const rawProducts = prdData.products || prdData.items || [];
      const productsList: CatalogItem[] = rawProducts.map((p: any) => ({
        _id: p._id,
        itemType: 'GOODS' as const,
        name: p.name,
        code: p.code,
        hsnSacCode: p.hsnCode || '',
        unit: p.unit || 'PCS',
        uqc: p.uqc || 'PCS',
        sellingPrice: p.sellingPrice || 0,
        defaultGstRate: p.defaultGstRate ?? 18,
        isPriceInclusiveOfGst: p.isPriceInclusiveOfGst ?? false,
        taxTreatment: p.taxTreatment || 'TAXABLE',
        description: p.description,
        stockQuantity: p.stockQuantity,
        trackInventory: p.trackInventory,
      }));

      const rawServices = svcData.services || svcData.items || [];
      const servicesList: CatalogItem[] = rawServices.map((s: any) => ({
        _id: s._id,
        itemType: 'SERVICES' as const,
        name: s.name,
        hsnSacCode: s.sacCode || '',
        unit: s.billingUnit || 'JOB',
        uqc: s.uqc || 'OTH',
        sellingPrice: s.rate || 0,
        defaultGstRate: s.defaultGstRate ?? 18,
        isPriceInclusiveOfGst: s.isPriceInclusiveOfGst ?? false,
        taxTreatment: s.taxTreatment || 'TAXABLE',
        description: s.description,
      }));

      setRowSearchResults(prev => {
        const next = [...prev];
        next[idx] = [...productsList, ...servicesList];
        return next;
      });
    } catch {
      /* silent */
    } finally {
      setRowSearchLoading(prev => { const next = [...prev]; next[idx] = false; return next; });
    }
  }, []);

  const handleCustomerChange = (customerId: string) => {
    setSelectedCustomerId(customerId);
    const c = customers.find(x => x._id === customerId);
    setSelectedCustomer(c || null);
    if (!c) return;

    const pos = c.billingAddress?.stateCode || c.stateCode || '33';
    setPlaceOfSupply(pos);

    const gst = c.gstTreatment || 'UNREGISTERED';
    const hasGstin = Boolean(c.gstin && c.gstin.trim().length >= 15);

    if (gst === 'EXPORT' || gst === 'OVERSEAS') setSupplyType('EXPORT_WITHOUT_PAYMENT');
    else if (gst === 'SEZ') setSupplyType('SEZ_WITHOUT_PAYMENT');
    else if (hasGstin) setSupplyType('B2B');
    else setSupplyType('B2C');
  };

  const handleCatalogSelect = (idx: number, catItem: CatalogItem) => {
    const updated = [...items];
    updated[idx] = {
      ...updated[idx],
      itemId: catItem._id,
      itemType: catItem.itemType,
      name: catItem.name,
      description: catItem.description || '',
      hsnSacCode: catItem.hsnSacCode,
      rate: catItem.sellingPrice,
      gstRate: catItem.defaultGstRate,
      unit: catItem.unit,
      uqc: catItem.uqc,
      priceMode: catItem.isPriceInclusiveOfGst ? 'INCLUSIVE' : 'EXCLUSIVE',
      taxTreatment: (catItem.taxTreatment as any) || 'TAXABLE',
    };
    setItems(updated);
    const searches = [...itemSearch];
    searches[idx] = catItem.name;
    setItemSearch(searches);
    const open = [...itemDropdownOpen];
    open[idx] = false;
    setItemDropdownOpen(open);
  };

  const updateItem = (idx: number, field: keyof LineItem, value: any) => {
    const updated = [...items];
    (updated[idx] as any)[field] = value;
    setItems(updated);
  };

  const addRow = () => {
    setItems([...items, newLine()]);
    setItemSearch([...itemSearch, '']);
    setItemDropdownOpen([...itemDropdownOpen, false]);
    setRowSearchResults([...rowSearchResults, []]);
    setRowSearchLoading([...rowSearchLoading, false]);
    searchTimers.current = [...searchTimers.current, null];
  };

  const removeRow = (idx: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== idx));
    setItemSearch(itemSearch.filter((_, i) => i !== idx));
    setItemDropdownOpen(itemDropdownOpen.filter((_, i) => i !== idx));
    setRowSearchResults(rowSearchResults.filter((_, i) => i !== idx));
    setRowSearchLoading(rowSearchLoading.filter((_, i) => i !== idx));
    const timer = searchTimers.current[idx];
    if (timer) clearTimeout(timer);
    searchTimers.current = searchTimers.current.filter((_, i) => i !== idx);
  };

  // Quick Product Create Handler
  const handleQuickCreateItem = async () => {
    if (!quickAddName.trim()) return;
    setQuickAddSaving(true);
    try {
      const endpoint = quickAddItemType === 'GOODS' ? '/api/products' : '/api/services';
      const payload = quickAddItemType === 'GOODS'
        ? {
            name: quickAddName.trim(),
            sellingPrice: quickAddPrice,
            hsnCode: quickAddHsnSac,
            defaultGstRate: quickAddGstRate,
            unit: 'PCS',
            uqc: 'PCS',
            taxTreatment: 'TAXABLE',
          }
        : {
            name: quickAddName.trim(),
            rate: quickAddPrice,
            sacCode: quickAddHsnSac,
            defaultGstRate: quickAddGstRate,
            billingUnit: 'JOB',
            uqc: 'OTH',
            taxTreatment: 'TAXABLE',
          };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (res.ok && (json.product || json.service || json.data)) {
        const created = json.product || json.service || json.data;
        const catItem: CatalogItem = {
          _id: created._id,
          itemType: quickAddItemType,
          name: created.name,
          hsnSacCode: quickAddItemType === 'GOODS' ? (created.hsnCode || '') : (created.sacCode || ''),
          unit: created.unit || created.billingUnit || 'PCS',
          uqc: created.uqc || 'PCS',
          sellingPrice: created.sellingPrice || created.rate || quickAddPrice,
          defaultGstRate: created.defaultGstRate ?? quickAddGstRate,
        };

        handleCatalogSelect(quickAddRowIndex, catItem);
        setQuickAddModalOpen(false);
        setQuickAddName('');
        setQuickAddPrice(0);
        setQuickAddHsnSac('');
      } else {
        alert(json.error || 'Failed to create item');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create item');
    } finally {
      setQuickAddSaving(false);
    }
  };

  // Live calculation powered strictly by central GST Engine
  const calcResult = useMemo(() => {
    const validItems = items.filter(it => it.name && it.quantity > 0 && it.rate >= 0);
    if (validItems.length === 0) return null;
    try {
      const lineInputs = validItems.map(it => {
        const dummyRate: ResolvedTaxRate = {
          taxRateId: 'preview', version: '1.0',
          rate: it.gstRate, cessRate: 0,
          effectiveFrom: new Date('2017-07-01'),
        };
        return {
          itemId: it.itemId || 'preview',
          name: it.name,
          itemType: it.itemType,
          classificationCode: { type: (it.itemType === 'SERVICES' ? 'SAC' : 'HSN') as 'HSN' | 'SAC', code: it.hsnSacCode || '9999' },
          quantity: it.quantity,
          freeQuantity: 0,
          unit: it.unit,
          uqc: it.uqc,
          ratePaise: rupeesToPaise(it.rate),
          lineDiscount: it.discountValue > 0
            ? { type: it.discountType, value: it.discountValue, taxTreatment: it.discountTaxTreatment }
            : undefined,
          taxTreatment: documentType === 'BILL_OF_SUPPLY' ? ('EXEMPT' as const) : (it.taxTreatment as any),
          resolvedTaxRate: dummyRate,
          isPriceInclusiveOfGst: it.priceMode === 'INCLUSIVE',
        };
      });

      return calculateInvoice({
        supplierStateCode: businessStateCode,
        placeOfSupplyStateCode: placeOfSupply,
        supplyClassification:
          supplyType.includes('SEZ') ? 'SEZ' :
          supplyType.includes('EXPORT') ? 'EXPORT' : 'DOMESTIC',
        taxTreatment: documentType === 'BILL_OF_SUPPLY' ? 'EXEMPT' : 'TAXABLE',
        items: lineInputs,
        invoiceDiscount: invoiceDiscountValue > 0
          ? { type: invoiceDiscountType, value: invoiceDiscountValue }
          : undefined,
        roundOffPolicy: 'NEAREST_RUPEE',
      });
    } catch {
      return null;
    }
  }, [items, businessStateCode, placeOfSupply, supplyType, invoiceDiscountValue, invoiceDiscountType, documentType]);

  const grandTotalRupees = calcResult ? paiseToRupees(calcResult.grandTotalPaise) : 0;
  const isInterState = businessStateCode !== placeOfSupply;
  const isUT = UT_CODES.has(placeOfSupply);
  const activeDocMeta = DOCUMENT_TYPES.find(d => d.value === documentType) || DOCUMENT_TYPES[0];

  // Auto-fill initial payment amount when payment box is toggled
  const handleToggleRecordPayment = (checked: boolean) => {
    setRecordInitialPayment(checked);
    if (checked && initialPaidAmount === 0 && grandTotalRupees > 0) {
      setInitialPaidAmount(grandTotalRupees);
    }
  };

  const handleSave = async (andIssue: boolean) => {
    setFormError(null);
    if (!selectedCustomerId) { setFormError('Please select a customer.'); return; }
    const validItems = items.filter(it => it.name && it.quantity > 0);
    if (validItems.length === 0) { setFormError('Add at least one line item with a name and quantity.'); return; }
    if (recordInitialPayment && initialPaidAmount > grandTotalRupees + 0.01) {
      setFormError(`Payment (₹${initialPaidAmount}) cannot exceed Grand Total (₹${grandTotalRupees.toFixed(2)}).`);
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        customerId: selectedCustomerId,
        documentType,
        invoiceDate,
        dueDate,
        supplyType,
        placeOfSupplyStateCode: placeOfSupply,
        reverseCharge,
        taxTreatment: documentType === 'BILL_OF_SUPPLY' ? 'EXEMPT' : 'TAXABLE',
        notes,
        termsAndConditions,
        invoiceDiscount: invoiceDiscountValue > 0
          ? { type: invoiceDiscountType, value: invoiceDiscountValue }
          : undefined,
        items: validItems.map(it => ({
          itemId: it.itemId || undefined,
          itemType: it.itemType,
          name: it.name,
          description: it.description || undefined,
          hsnCode: it.itemType === 'GOODS' ? (it.hsnSacCode || undefined) : undefined,
          sacCode: it.itemType === 'SERVICES' ? (it.hsnSacCode || undefined) : undefined,
          quantity: it.quantity,
          unit: it.unit,
          uqc: it.uqc,
          rate: it.rate,
          enteredRate: it.rate,
          isPriceInclusiveOfGst: it.priceMode === 'INCLUSIVE',
          lineDiscount: it.discountValue > 0
            ? { type: it.discountType, value: it.discountValue, taxTreatment: it.discountTaxTreatment }
            : undefined,
          gstRate: it.gstRate,
          taxTreatment: documentType === 'BILL_OF_SUPPLY' ? 'EXEMPT' : it.taxTreatment,
        })),
      };

      const res = await fetch('/api/invoices', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const json = await res.json();
      if (!json.success) { setFormError(json.details || json.error || 'Failed to create invoice'); setIsSubmitting(false); return; }

      const createdId = json.data._id;

      if (andIssue) {
        const issueRes = await fetch(`/api/invoices/${createdId}/issue`, { method: 'POST' });
        const issueJson = await issueRes.json();
        if (!issueJson.success) {
          setFormError(`Draft created. Issue failed: ${issueJson.error}`);
          router.push(`/invoices/${createdId}`);
          return;
        }
      }

      // Record Payment if checked (for both DRAFT and ISSUED invoices)
      if (recordInitialPayment && initialPaidAmount > 0 && selectedPaymentModeId) {
        try {
          const amtPaise = rupeesToPaise(initialPaidAmount);
          const idempKey = `initpay-${createdId}-${Date.now()}`;
          await fetch('/api/payments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              customerId: selectedCustomerId,
              paymentDate: invoiceDate,
              amountPaise: amtPaise,
              paymentModeId: selectedPaymentModeId,
              referenceNumber: initialPaymentRef || undefined,
              idempotencyKey: idempKey,
              requestHash: `hash-${idempKey}`,
              allocations: [{ invoiceId: createdId, allocationAmountPaise: amtPaise }],
            }),
          });
        } catch {
          /* payment log silent */
        }
      }

      router.push(`/invoices/${createdId}`);
    } catch (err: any) {
      setFormError(err.message || 'Submission failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const gstRateOptions = taxRates.length > 0
    ? taxRates.map(t => ({ value: t.rate, label: `${t.rate}%` }))
    : [0, 5, 12, 18, 28].map(r => ({ value: r, label: `${r}%` }));

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-16 font-sans">
      {formError && <Toast type="error" message={formError} onClose={() => setFormError(null)} />}

      {/* ── Sticky Top Bar ────────────────────────────────────────────── */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-slate-900 leading-tight">Create {activeDocMeta.label}</h1>
                <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md">
                  {activeDocMeta.badge}
                </span>
              </div>
              <p className="text-xs text-slate-500">{businessName || 'Niramaalai Billing Platform'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Document Type Selector */}
            <div className="relative">
              <select
                value={documentType}
                onChange={e => setDocumentType(e.target.value)}
                className="h-9 pl-3 pr-8 text-xs font-semibold border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-xs"
              >
                {DOCUMENT_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>

            <button
              onClick={() => handleSave(false)}
              disabled={isSubmitting}
              className="px-3.5 py-2 text-xs font-semibold border border-slate-300 rounded-lg bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition shadow-xs"
            >
              Save Draft
            </button>

            <button
              onClick={() => handleSave(true)}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 transition flex items-center gap-1.5 shadow-sm"
            >
              {isSubmitting ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Issue {activeDocMeta.label}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Dynamic Notice Banner for non-standard documents */}
        {documentType === 'BILL_OF_SUPPLY' && (
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center gap-2.5">
            <Info className="w-4 h-4 text-amber-600 shrink-0" />
            <span><b>Bill of Supply Notice (Rule 46 GST):</b> Issued for composition taxpayers or exempt supplies. Tax is legally set to 0.</span>
          </div>
        )}
        {documentType === 'DELIVERY_CHALLAN' && (
          <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-900 flex items-center gap-2.5">
            <Truck className="w-4 h-4 text-indigo-600 shrink-0" />
            <span><b>Statutory Delivery Challan (Rule 55):</b> Transport document used for job work, supply on approval, or movement of goods prior to tax invoice issuance.</span>
          </div>
        )}

        {/* ── Section 1: Customer & Document Meta ────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Customer Selection Card */}
          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <User className="w-4 h-4 text-blue-600" />
                <span>Customer &amp; Billed Party</span>
              </h2>
              <Link href="/customers" target="_blank" className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" /> New Customer
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Select Customer *</label>
                <select
                  value={selectedCustomerId}
                  onChange={e => handleCustomerChange(e.target.value)}
                  className="w-full h-10 px-3 text-xs font-medium border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                >
                  <option value="">— Select Customer from Master Directory —</option>
                  {customers.map(c => (
                    <option key={c._id} value={c._id}>
                      {c.displayName || c.name} {c.gstin ? `(GSTIN: ${c.gstin})` : ''}
                    </option>
                  ))}
                </select>

                {selectedCustomer && (
                  <div className="mt-2 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 space-y-1">
                    <div className="font-bold text-slate-900">{selectedCustomer.displayName || selectedCustomer.name}</div>
                    {selectedCustomer.billingAddress?.addressLine1 && (
                      <div>{selectedCustomer.billingAddress.addressLine1}, {selectedCustomer.billingAddress.city}, {selectedCustomer.billingAddress.state}</div>
                    )}
                    <div className="flex gap-4 text-[11px] font-mono pt-1 text-slate-700">
                      {selectedCustomer.gstin && <span>GSTIN: <b>{selectedCustomer.gstin}</b></span>}
                      {selectedCustomer.phone && <span>Ph: {selectedCustomer.phone}</span>}
                    </div>
                  </div>
                )}
              </div>

              {/* Place of Supply */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Place of Supply (POS) *</label>
                <select
                  value={placeOfSupply}
                  onChange={e => setPlaceOfSupply(e.target.value)}
                  className="w-full h-9 px-3 text-xs border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                >
                  {INDIAN_STATES.map(s => (
                    <option key={s.code} value={s.code}>{s.code} — {s.name}</option>
                  ))}
                </select>
                <p className="mt-1 text-[10px] font-semibold text-slate-500">
                  {isInterState
                    ? `⚡ Inter-state → ${isUT ? 'UTGST' : 'IGST'} applicable`
                    : '🏠 Intra-state → CGST + SGST applicable'}
                </p>
              </div>

              {/* Supply Type */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">GST Supply Type</label>
                <select
                  value={supplyType}
                  onChange={e => setSupplyType(e.target.value)}
                  className="w-full h-9 px-3 text-xs border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                >
                  {SUPPLY_TYPES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-3">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={reverseCharge}
                  onChange={e => setReverseCharge(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Reverse Charge Mechanism (RCM)</span>
              </label>

              <button
                type="button"
                onClick={() => setShowExtendedDetails(!showExtendedDetails)}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <span>{showExtendedDetails ? 'Hide Transport & PO Details' : '+ Add PO / Vehicle / Transport Details'}</span>
              </button>
            </div>

            {/* Extended Details Collapsible */}
            {showExtendedDetails && (
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">PO / Reference Number</label>
                  <input
                    type="text"
                    placeholder="e.g. PO-2026-99"
                    value={referenceNumber}
                    onChange={e => setReferenceNumber(e.target.value)}
                    className="w-full h-8 px-2.5 border border-slate-300 rounded bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Vehicle Number</label>
                  <input
                    type="text"
                    placeholder="e.g. TN-37-AB-1234"
                    value={vehicleNumber}
                    onChange={e => setVehicleNumber(e.target.value)}
                    className="w-full h-8 px-2.5 border border-slate-300 rounded bg-white uppercase font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">E-Way Bill Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 121000998877"
                    value={eWayBillNumber}
                    onChange={e => setEWayBillNumber(e.target.value)}
                    className="w-full h-8 px-2.5 border border-slate-300 rounded bg-white font-mono"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Dates & Reference Card */}
          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-purple-600" />
              <span>Dates &amp; Terms</span>
            </h2>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Document Date *</label>
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={e => setInvoiceDate(e.target.value)}
                  className="w-full h-9 px-3 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Payment Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  className="w-full h-9 px-3 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Internal Notes</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-xs"
                  placeholder="Private internal notes (not printed)..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Section 2: Line Items Table (Fixed Dropdown Z-Index & Integer Qty) ────── */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                <span>Line Items</span>
              </h2>
              <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md font-medium">
                Real-time GST calculation
              </span>
            </div>

            <button
              type="button"
              onClick={addRow}
              className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-200 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add Line Item</span>
            </button>
          </div>

          {/* Table Container with Minimum Height so dropdown never clips */}
          <div className="overflow-x-auto min-h-[320px] pb-16">
            <table className="w-full text-xs text-slate-800 border-collapse min-w-[1300px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                  <th className="px-3 py-3 text-center w-8">#</th>
                  <th className="px-2 py-3 text-center w-24">Item Type</th>
                  <th className="px-3 py-3 text-left min-w-[280px]">Product / Service Description</th>
                  <th className="px-3 py-3 text-center w-24">HSN/SAC</th>
                  <th className="px-3 py-3 text-center w-20">Qty</th>
                  <th className="px-3 py-3 text-center w-20">Unit</th>
                  <th className="px-3 py-3 text-right w-32">Rate (₹)</th>
                  <th className="px-3 py-3 text-center w-28">Price Mode</th>
                  <th className="px-3 py-3 text-center w-28">Discount</th>
                  <th className="px-3 py-3 text-center w-24">GST %</th>
                  <th className="px-3 py-3 text-right w-32">Taxable</th>
                  <th className="px-3 py-3 text-right w-36">Tax</th>
                  <th className="px-3 py-3 text-right w-36">Total</th>
                  <th className="px-2 py-3 text-center w-10" />
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {items.map((item, idx) => {
                  const preview = calcLinePreview(item, businessStateCode, placeOfSupply);
                  const taxLabel = isInterState
                    ? (UT_CODES.has(placeOfSupply) ? 'UTGST' : 'IGST')
                    : 'CGST+SGST';

                  const isOpen = itemDropdownOpen[idx];

                  return (
                    <tr key={item.id} className={`hover:bg-slate-50/70 transition ${isOpen ? 'z-40 relative' : ''}`}>
                      <td className="px-3 py-3.5 text-center text-slate-400 font-bold">{idx + 1}</td>

                      {/* Type Toggle */}
                      <td className="px-2 py-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            const newType = item.itemType === 'GOODS' ? 'SERVICES' : 'GOODS';
                            updateItem(idx, 'itemType', newType);
                            if (newType === 'SERVICES' && item.unit === 'PCS') {
                              updateItem(idx, 'unit', 'JOB');
                              updateItem(idx, 'uqc', 'JOB');
                            }
                          }}
                          className={`px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wide uppercase transition ${
                            item.itemType === 'SERVICES'
                              ? 'bg-purple-100 text-purple-700 border border-purple-200'
                              : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {item.itemType === 'SERVICES' ? 'Service' : 'Goods'}
                        </button>
                      </td>

                      {/* Item Name + Searchable Catalog Dropdown */}
                      <td className={`px-3 py-3.5 ${isOpen ? 'z-50 relative' : 'relative'}`}>
                        <div className="space-y-1 relative">
                          <input
                            type="text"
                            value={itemSearch[idx] !== undefined ? itemSearch[idx] : item.name}
                            onChange={e => {
                              const searches = [...itemSearch];
                              searches[idx] = e.target.value;
                              setItemSearch(searches);
                              if (!e.target.value) updateItem(idx, 'name', '');
                              const open = [...itemDropdownOpen];
                              open[idx] = true;
                              setItemDropdownOpen(open);
                              const timer = searchTimers.current[idx];
                              if (timer) clearTimeout(timer);
                              searchTimers.current[idx] = setTimeout(() => {
                                searchCatalogForRow(idx, e.target.value);
                              }, 250);
                            }}
                            onFocus={e => {
                              const open = [...itemDropdownOpen];
                              open[idx] = true;
                              setItemDropdownOpen(open);
                              searchCatalogForRow(idx, e.target.value || '');
                            }}
                            onBlur={() => {
                              setTimeout(() => {
                                const open = [...itemDropdownOpen];
                                open[idx] = false;
                                setItemDropdownOpen(open);
                              }, 250);
                            }}
                            placeholder="Search products or services..."
                            className="w-full h-9 px-3 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-semibold text-slate-900 shadow-2xs"
                          />

                          {/* Live Search Floating Dropdown */}
                          {isOpen && (
                            <div className="absolute z-50 left-0 top-10 w-96 bg-white border border-slate-200 rounded-lg shadow-2xl max-h-64 overflow-y-auto ring-1 ring-black/5">
                              {rowSearchLoading[idx] && (
                                <div className="px-3 py-3 text-xs text-slate-400 flex items-center gap-2">
                                  <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                                  Searching product catalog...
                                </div>
                              )}
                              {!rowSearchLoading[idx] && (rowSearchResults[idx] || []).length === 0 && (
                                <div className="p-3 text-xs text-slate-500 space-y-2">
                                  <div>No items found matching &ldquo;{itemSearch[idx]}&rdquo;</div>
                                  <button
                                    type="button"
                                    onMouseDown={() => {
                                      setQuickAddRowIndex(idx);
                                      setQuickAddName(itemSearch[idx] || '');
                                      setQuickAddItemType(item.itemType);
                                      setQuickAddModalOpen(true);
                                    }}
                                    className="px-2.5 py-1 bg-blue-600 text-white rounded text-[11px] font-bold hover:bg-blue-700 inline-flex items-center gap-1"
                                  >
                                    <Plus className="w-3 h-3" /> Quick Add &ldquo;{itemSearch[idx]}&rdquo;
                                  </button>
                                </div>
                              )}
                              {!rowSearchLoading[idx] && (rowSearchResults[idx] || []).map(c => (
                                <button
                                  key={c._id}
                                  type="button"
                                  onMouseDown={() => handleCatalogSelect(idx, c)}
                                  className="w-full text-left px-3 py-2 hover:bg-blue-50 text-xs flex items-start gap-2 border-b border-slate-100 transition cursor-pointer"
                                >
                                  <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded uppercase mt-0.5 shrink-0 ${
                                    c.itemType === 'SERVICES' ? 'bg-purple-100 text-purple-700' : 'bg-emerald-100 text-emerald-700'
                                  }`}>
                                    {c.itemType === 'SERVICES' ? 'SVC' : 'PRD'}
                                  </span>
                                  <div className="flex-1 min-w-0">
                                    <div className="font-bold text-slate-900 truncate">{c.name}</div>
                                    <div className="text-slate-500 text-[10px] flex flex-wrap gap-x-2">
                                      <span className="font-bold text-slate-800">₹{c.sellingPrice.toFixed(2)}</span>
                                      <span>{c.itemType === 'SERVICES' ? 'SAC' : 'HSN'}: {c.hsnSacCode || 'N/A'}</span>
                                      <span>GST: {c.defaultGstRate}%</span>
                                    </div>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* HSN/SAC */}
                      <td className="px-3 py-3.5 text-center">
                        <input
                          type="text"
                          value={item.hsnSacCode}
                          onChange={e => updateItem(idx, 'hsnSacCode', e.target.value.toUpperCase())}
                          className="w-full h-9 px-2 text-xs font-mono font-bold text-center border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 shadow-2xs"
                          placeholder={item.itemType === 'SERVICES' ? 'SAC' : 'HSN'}
                        />
                      </td>

                      {/* Qty (Strict Integer Only — Always visible) */}
                      <td className="px-3 py-3.5 text-center">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={item.quantity}
                          onChange={e => {
                            const val = e.target.value;
                            if (val === '') {
                              updateItem(idx, 'quantity', 0);
                            } else {
                              const parsed = parseInt(val, 10);
                              updateItem(idx, 'quantity', isNaN(parsed) ? 1 : Math.max(1, parsed));
                            }
                          }}
                          onBlur={e => {
                            const val = parseInt(e.target.value, 10);
                            if (!isNaN(val) && val > 0) {
                              updateItem(idx, 'quantity', Math.max(1, Math.floor(val)));
                            } else {
                              updateItem(idx, 'quantity', 1);
                            }
                          }}
                          className="w-full h-9 px-2 text-xs text-center border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-900 shadow-2xs"
                        />
                      </td>

                      {/* Unit */}
                      <td className="px-3 py-3.5 text-center">
                        <input
                          type="text"
                          value={item.unit}
                          onChange={e => updateItem(idx, 'unit', e.target.value.toUpperCase())}
                          className="w-full h-9 px-2 text-xs text-center border border-slate-300 rounded-md uppercase font-mono font-bold text-slate-800 shadow-2xs"
                        />
                      </td>

                      {/* Rate */}
                      <td className="px-3 py-3.5">
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold pointer-events-none">₹</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.rate === 0 ? '' : item.rate}
                            onChange={e => updateItem(idx, 'rate', parseFloat(e.target.value) || 0)}
                            placeholder="0.00"
                            className="w-full h-9 pl-6 pr-2 text-xs text-right font-bold border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 shadow-2xs"
                          />
                        </div>
                      </td>

                      {/* Price Mode — EXCLUSIVE / INCLUSIVE */}
                      <td className="px-3 py-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => updateItem(idx, 'priceMode', item.priceMode === 'EXCLUSIVE' ? 'INCLUSIVE' : 'EXCLUSIVE')}
                          className={`px-3 py-1.5 rounded-md text-[10px] font-bold border transition ${
                            item.priceMode === 'INCLUSIVE'
                              ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                              : 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100'
                          }`}
                        >
                          {item.priceMode === 'INCLUSIVE' ? 'Incl. GST' : 'Excl. GST'}
                        </button>
                      </td>

                      {/* Discount */}
                      <td className="px-3 py-3.5">
                        <div className="flex items-center gap-1 justify-center">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.discountValue === 0 ? '' : item.discountValue}
                            onChange={e => updateItem(idx, 'discountValue', parseFloat(e.target.value) || 0)}
                            placeholder="0"
                            className="w-14 h-9 px-2 text-xs text-right font-bold border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 shadow-2xs"
                          />
                          <button
                            type="button"
                            onClick={() => updateItem(idx, 'discountType', item.discountType === 'PERCENTAGE' ? 'FIXED' : 'PERCENTAGE')}
                            className="h-9 px-2 text-[11px] font-bold bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-md shrink-0 text-slate-800"
                          >
                            {item.discountType === 'PERCENTAGE' ? '%' : '₹'}
                          </button>
                        </div>
                      </td>

                      {/* GST Rate */}
                      <td className="px-3 py-3.5 text-center">
                        <select
                          value={item.gstRate}
                          onChange={e => updateItem(idx, 'gstRate', parseFloat(e.target.value))}
                          disabled={documentType === 'BILL_OF_SUPPLY'}
                          className="w-full h-9 px-2 text-xs text-center border border-slate-300 rounded-md bg-white font-bold text-slate-900 disabled:bg-slate-100 focus:ring-2 focus:ring-blue-500 shadow-2xs"
                        >
                          {gstRateOptions.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                        </select>
                      </td>

                      {/* Taxable */}
                      <td className="px-3 py-3.5 text-right text-xs font-bold tabular-nums text-slate-900 bg-slate-50/50">
                        {preview ? `₹${paiseToRupees(preview.taxablePaise).toFixed(2)}` : '—'}
                      </td>

                      {/* Tax */}
                      <td className="px-3 py-3.5 text-right text-xs tabular-nums text-slate-700 bg-slate-50/50">
                        {preview ? (
                          <div>
                            <div className="font-bold text-slate-900">₹{paiseToRupees(preview.gstResult.totalTaxPaise).toFixed(2)}</div>
                            <div className="text-[9px] text-blue-600 font-bold">{taxLabel}</div>
                          </div>
                        ) : '—'}
                      </td>

                      {/* Total */}
                      <td className="px-3 py-3.5 text-right text-xs font-black tabular-nums text-slate-900 bg-slate-100/60">
                        {preview ? `₹${paiseToRupees(preview.totalAmountPaise).toFixed(2)}` : '—'}
                      </td>

                      {/* Delete */}
                      <td className="px-2 py-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => removeRow(idx)}
                          disabled={items.length <= 1}
                          className="p-1 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600 disabled:opacity-30 transition cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Section 3: Summary, Discounts & Totals ────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Terms & Record Payment Card */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-600" />
              <span>Terms &amp; Conditions Footer</span>
            </h2>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Standard Terms &amp; Conditions</label>
                <textarea
                  rows={4}
                  value={termsAndConditions}
                  onChange={e => setTermsAndConditions(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs font-sans focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* Record Payment Interactive Block */}
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2.5 cursor-pointer font-bold text-emerald-900 text-xs">
                    <input
                      type="checkbox"
                      checked={recordInitialPayment}
                      onChange={e => handleToggleRecordPayment(e.target.checked)}
                      className="h-4 w-4 rounded border-emerald-400 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="flex items-center gap-1.5">
                      <DollarSign className="w-4 h-4 text-emerald-600" />
                      <span>Record Payment Received (Advance / Paid in Full)</span>
                    </span>
                  </label>
                  {recordInitialPayment && (
                    <span className="text-[10px] font-bold bg-emerald-600 text-white px-2 py-0.5 rounded-full">
                      ACTIVE
                    </span>
                  )}
                </div>

                {recordInitialPayment && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Amount Received (₹)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={initialPaidAmount === 0 ? '' : initialPaidAmount}
                        onChange={e => setInitialPaidAmount(parseFloat(e.target.value) || 0)}
                        className="w-full h-9 px-2.5 border border-slate-300 rounded-lg bg-white text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Payment Mode</label>
                      <select
                        value={selectedPaymentModeId}
                        onChange={e => setSelectedPaymentModeId(e.target.value)}
                        className="w-full h-9 px-2 border border-slate-300 rounded-lg bg-white text-xs font-medium"
                      >
                        {paymentModes.map((m: any) => (
                          <option key={m._id} value={m._id}>{m.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Ref / UTR Number</label>
                      <input
                        type="text"
                        placeholder="UPI UTR / Cheque #"
                        value={initialPaymentRef}
                        onChange={e => setInitialPaymentRef(e.target.value)}
                        className="w-full h-9 px-2.5 border border-slate-300 rounded-lg bg-white text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Financial Totals Card */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-3 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Financial Summary</span>
            </h2>

            {calcResult ? (
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
                  <span>Subtotal (Items Total):</span>
                  <span className="font-semibold text-slate-800">₹{paiseToRupees(calcResult.subTotalPaise).toFixed(2)}</span>
                </div>

                {calcResult.totalDiscountPaise > 0 && (
                  <div className="flex justify-between py-1 border-b border-slate-100 text-emerald-600">
                    <span>Line Discounts:</span>
                    <span className="font-bold">-₹{paiseToRupees(calcResult.totalDiscountPaise).toFixed(2)}</span>
                  </div>
                )}

                {/* Document-level discount input */}
                <div className="py-2 border-b border-slate-100 flex items-center justify-between gap-2">
                  <span className="text-slate-600">Invoice Discount:</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={invoiceDiscountValue === 0 ? '' : invoiceDiscountValue}
                      onChange={e => setInvoiceDiscountValue(parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className="w-20 h-7 px-2 text-right border border-slate-300 rounded text-xs font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => setInvoiceDiscountType(invoiceDiscountType === 'PERCENTAGE' ? 'FIXED' : 'PERCENTAGE')}
                      className="h-7 px-2 text-[10px] font-bold bg-slate-100 border border-slate-300 rounded"
                    >
                      {invoiceDiscountType === 'PERCENTAGE' ? '%' : '₹'}
                    </button>
                  </div>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-100 text-slate-800 font-bold">
                  <span>Taxable Amount:</span>
                  <span>₹{paiseToRupees(calcResult.totalTaxablePaise).toFixed(2)}</span>
                </div>

                {/* Tax Breakdown */}
                {calcResult.totalCgstPaise > 0 && (
                  <div className="flex justify-between py-1 text-slate-600">
                    <span>CGST:</span>
                    <span className="font-mono text-blue-700">₹{paiseToRupees(calcResult.totalCgstPaise).toFixed(2)}</span>
                  </div>
                )}
                {calcResult.totalSgstPaise > 0 && (
                  <div className="flex justify-between py-1 text-slate-600">
                    <span>SGST:</span>
                    <span className="font-mono text-blue-700">₹{paiseToRupees(calcResult.totalSgstPaise).toFixed(2)}</span>
                  </div>
                )}
                {calcResult.totalIgstPaise > 0 && (
                  <div className="flex justify-between py-1 text-slate-600">
                    <span>IGST:</span>
                    <span className="font-mono text-blue-700">₹{paiseToRupees(calcResult.totalIgstPaise).toFixed(2)}</span>
                  </div>
                )}
                {calcResult.totalUtgstPaise > 0 && (
                  <div className="flex justify-between py-1 text-slate-600">
                    <span>UTGST:</span>
                    <span className="font-mono text-blue-700">₹{paiseToRupees(calcResult.totalUtgstPaise).toFixed(2)}</span>
                  </div>
                )}
                {calcResult.roundOffPaise !== 0 && (
                  <div className="flex justify-between py-1 text-slate-400">
                    <span>Round Off:</span>
                    <span>₹{paiseToRupees(calcResult.roundOffPaise).toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between py-3 border-t-2 border-slate-900 border-b text-sm font-black text-slate-900">
                  <span>Grand Total:</span>
                  <span className="text-blue-700">₹{grandTotalRupees.toFixed(2)}</span>
                </div>

                {/* Amount in Words Callout */}
                <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-lg text-xs space-y-0.5 mt-2">
                  <span className="text-[10px] font-bold uppercase text-blue-800 block">Amount in Words</span>
                  <span className="font-semibold text-slate-800 leading-snug block">
                    {amountInWords(calcResult.grandTotalPaise)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-slate-400 text-xs">
                Add line items above to see live GST calculations &amp; grand total.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Quick Add Item Modal ──────────────────────────────────────── */}
      {quickAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-5 space-y-4 border border-slate-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900">Quick Create {quickAddItemType === 'GOODS' ? 'Product' : 'Service'}</h3>
              <button onClick={() => setQuickAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Item Name *</label>
                <input
                  type="text"
                  value={quickAddName}
                  onChange={e => setQuickAddName(e.target.value)}
                  className="w-full h-9 px-3 border border-slate-300 rounded-lg"
                  placeholder="Product or service name..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Selling Price (₹)</label>
                  <input
                    type="number"
                    value={quickAddPrice}
                    onChange={e => setQuickAddPrice(parseFloat(e.target.value) || 0)}
                    className="w-full h-9 px-3 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{quickAddItemType === 'GOODS' ? 'HSN Code' : 'SAC Code'}</label>
                  <input
                    type="text"
                    value={quickAddHsnSac}
                    onChange={e => setQuickAddHsnSac(e.target.value.toUpperCase())}
                    className="w-full h-9 px-3 border border-slate-300 rounded-lg uppercase font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Default GST Rate</label>
                <select
                  value={quickAddGstRate}
                  onChange={e => setQuickAddGstRate(parseFloat(e.target.value))}
                  className="w-full h-9 px-3 border border-slate-300 rounded-lg bg-white"
                >
                  {[0, 5, 12, 18, 28].map(r => <option key={r} value={r}>{r}% GST</option>)}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setQuickAddModalOpen(false)}
                className="px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleQuickCreateItem}
                disabled={quickAddSaving || !quickAddName.trim()}
                className="px-4 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 inline-flex items-center gap-1"
              >
                {quickAddSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                Save &amp; Select
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
