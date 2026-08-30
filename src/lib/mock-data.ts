export interface MockCustomer {
  id: string;
  displayName: string;
  companyName: string;
  phone: string;
  email: string;
  gstin: string;
  gstTreatment: string;
  placeOfSupplyStateCode: string;
  city: string;
  state: string;
  totalInvoiced: number;
  totalPaid: number;
  outstanding: number;
  creditBalance: number;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface MockItem {
  id: string;
  type: 'PRODUCT' | 'SERVICE';
  name: string;
  code: string;
  hsnSacCode: string;
  unit: string;
  uqc: string;
  sellingPrice: number;
  gstRate: number;
  cessRate: number;
  category: string;
}

export interface MockInvoice {
  id: string;
  invoiceNumber: string;
  financialYear: string;
  documentType: 'TAX_INVOICE' | 'BILL_OF_SUPPLY' | 'CREDIT_NOTE' | 'DEBIT_NOTE';
  supplyType: string;
  taxTreatment: string;
  invoiceDate: string;
  dueDate: string;
  customerName: string;
  customerGstin: string;
  subTotal: number;
  taxTotal: number;
  grandTotal: number;
  paidTotal: number;
  outstandingBalance: number;
  status: 'DRAFT' | 'ISSUED' | 'CANCELLED';
  paymentStatus: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID';
}

export interface MockPayment {
  id: string;
  receiptNumber: string;
  paymentDate: string;
  customerName: string;
  invoiceNumber: string;
  amount: number;
  paymentMode: string;
  referenceNumber: string;
  status: 'COMPLETED';
}

export const MOCK_BUSINESS = {
  legalName: 'NIRAMAALAI SERVICES PRIVATE LIMITED',
  tradeName: 'NIRAMAALAI Billing & Payments',
  phone: '+91 98765 43210',
  email: 'support@niramaalai.com',
  gstin: '33AAAAA0000A1Z5',
  state: 'Tamil Nadu',
  stateCode: '33',
  address: '123 GST Road, Guindy, Chennai - 600032',
  bankName: 'HDFC Bank',
  accountNumber: '50100234567890',
  ifscCode: 'HDFC0001234',
  branch: 'Guindy Branch, Chennai',
  upiId: 'niramaalai@hdfcbank',
};

export const MOCK_CUSTOMERS: MockCustomer[] = [
  {
    id: 'cust-1',
    displayName: 'ABC Technologies Pvt Ltd',
    companyName: 'ABC Technologies Private Limited',
    phone: '9840012345',
    email: 'billing@abctech.in',
    gstin: '33AAACB1234C1Z1',
    gstTreatment: 'REGULAR',
    placeOfSupplyStateCode: '33',
    city: 'Chennai',
    state: 'Tamil Nadu',
    totalInvoiced: 285000,
    totalPaid: 220000,
    outstanding: 65000,
    creditBalance: 0,
    status: 'ACTIVE',
  },
  {
    id: 'cust-2',
    displayName: 'Sri Lakshmi Traders',
    companyName: 'Sri Lakshmi Enterprises',
    phone: '9876543210',
    email: 'lakshmitraders@gmail.com',
    gstin: '29AAACL5678D1Z2',
    gstTreatment: 'REGULAR',
    placeOfSupplyStateCode: '29',
    city: 'Bengaluru',
    state: 'Karnataka',
    totalInvoiced: 450000,
    totalPaid: 367500,
    outstanding: 82500,
    creditBalance: 5000,
    status: 'ACTIVE',
  },
  {
    id: 'cust-3',
    displayName: 'Kovai Engineering Works',
    companyName: 'Kovai Engineering Works LLP',
    phone: '9443311223',
    email: 'info@kovaiengg.com',
    gstin: '33AAAFK9988E1Z9',
    gstTreatment: 'REGULAR',
    placeOfSupplyStateCode: '33',
    city: 'Coimbatore',
    state: 'Tamil Nadu',
    totalInvoiced: 180000,
    totalPaid: 180000,
    outstanding: 0,
    creditBalance: 0,
    status: 'ACTIVE',
  },
  {
    id: 'cust-4',
    displayName: 'Global Retail Consumers',
    companyName: 'Unregistered Walk-in Retail',
    phone: '9000000000',
    email: 'retail@niramaalai.com',
    gstin: '',
    gstTreatment: 'UNREGISTERED',
    placeOfSupplyStateCode: '33',
    city: 'Chennai',
    state: 'Tamil Nadu',
    totalInvoiced: 42500,
    totalPaid: 42500,
    outstanding: 0,
    creditBalance: 0,
    status: 'ACTIVE',
  },
];

export const MOCK_PRODUCTS: MockItem[] = [
  {
    id: 'prod-1',
    type: 'PRODUCT',
    name: 'Thermal Receipt Printer 80mm',
    code: 'PRN-80M',
    hsnSacCode: '84433210',
    unit: 'Pcs',
    uqc: 'PCS',
    sellingPrice: 4500,
    gstRate: 18,
    cessRate: 0,
    category: 'Hardware',
  },
  {
    id: 'prod-2',
    type: 'PRODUCT',
    name: 'Barcode Scanner Handheld Wireless',
    code: 'BCS-W20',
    hsnSacCode: '84719000',
    unit: 'Pcs',
    uqc: 'PCS',
    sellingPrice: 2800,
    gstRate: 18,
    cessRate: 0,
    category: 'Hardware',
  },
];

export const MOCK_SERVICES: MockItem[] = [
  {
    id: 'serv-1',
    type: 'SERVICE',
    name: 'SaaS Billing Software Implementation & Setup',
    code: 'SRV-IMPL',
    hsnSacCode: '998313',
    unit: 'Job',
    uqc: 'OTH',
    sellingPrice: 15000,
    gstRate: 18,
    cessRate: 0,
    category: 'Software Consulting',
  },
  {
    id: 'serv-2',
    type: 'SERVICE',
    name: 'Annual Accounting & GST Compliance Retainership',
    code: 'SRV-GST-RET',
    hsnSacCode: '998222',
    unit: 'Month',
    uqc: 'MON',
    sellingPrice: 5000,
    gstRate: 18,
    cessRate: 0,
    category: 'GST Retainership',
  },
];

export const MOCK_INVOICES: MockInvoice[] = [
  {
    id: 'inv-1',
    invoiceNumber: 'INV-2026-001',
    financialYear: '2025-26',
    documentType: 'TAX_INVOICE',
    supplyType: 'B2B',
    taxTreatment: 'TAXABLE',
    invoiceDate: '2026-08-20',
    dueDate: '2026-09-04',
    customerName: 'ABC Technologies Pvt Ltd',
    customerGstin: '33AAACB1234C1Z1',
    subTotal: 50000,
    taxTotal: 9000,
    grandTotal: 59000,
    paidTotal: 30000,
    outstandingBalance: 29000,
    status: 'ISSUED',
    paymentStatus: 'PARTIALLY_PAID',
  },
  {
    id: 'inv-2',
    invoiceNumber: 'INV-2026-002',
    financialYear: '2025-26',
    documentType: 'TAX_INVOICE',
    supplyType: 'B2B',
    taxTreatment: 'TAXABLE',
    invoiceDate: '2026-08-22',
    dueDate: '2026-09-06',
    customerName: 'Sri Lakshmi Traders',
    customerGstin: '29AAACL5678D1Z2',
    subTotal: 70000,
    taxTotal: 12600,
    grandTotal: 82600,
    paidTotal: 0,
    outstandingBalance: 82600,
    status: 'ISSUED',
    paymentStatus: 'UNPAID',
  },
  {
    id: 'inv-3',
    invoiceNumber: 'INV-2026-003',
    financialYear: '2025-26',
    documentType: 'TAX_INVOICE',
    supplyType: 'B2B',
    taxTreatment: 'TAXABLE',
    invoiceDate: '2026-08-24',
    dueDate: '2026-09-08',
    customerName: 'Kovai Engineering Works',
    customerGstin: '33AAAFK9988E1Z9',
    subTotal: 150000,
    taxTotal: 27000,
    grandTotal: 177000,
    paidTotal: 177000,
    outstandingBalance: 0,
    status: 'ISSUED',
    paymentStatus: 'PAID',
  },
];

export const MOCK_PAYMENTS: MockPayment[] = [
  {
    id: 'pay-1',
    receiptNumber: 'REC-2026-001',
    paymentDate: '2026-08-21',
    customerName: 'ABC Technologies Pvt Ltd',
    invoiceNumber: 'INV-2026-001',
    amount: 30000,
    paymentMode: 'UPI (PhonePe)',
    referenceNumber: 'UTR998877665544',
    status: 'COMPLETED',
  },
  {
    id: 'pay-2',
    receiptNumber: 'REC-2026-002',
    paymentDate: '2026-08-25',
    customerName: 'Kovai Engineering Works',
    invoiceNumber: 'INV-2026-003',
    amount: 177000,
    paymentMode: 'NEFT / Bank Transfer',
    referenceNumber: 'NEFT1234567890',
    status: 'COMPLETED',
  },
];
