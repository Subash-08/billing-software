/**
 * Standard Indian GST HSN (Goods) & SAC (Services) Reference Dataset
 * Version 1.0 — Official Centralized Master Reference
 */

export interface HsnSacReferenceItem {
  code: string;
  type: 'HSN' | 'SAC';
  description: string;
  chapter?: string;
  heading?: string;
}

export const HSN_SAC_REFERENCE_DATA: HsnSacReferenceItem[] = [
  // ── GOODS (HSN) ──────────────────────────────────────────────────────────
  { code: '8471', type: 'HSN', description: 'Automatic data processing machines (Computers, Laptops, Servers)', chapter: '84', heading: '8471' },
  { code: '847130', type: 'HSN', description: 'Portable laptops and notebooks weighing not more than 10 kg', chapter: '84', heading: '8471' },
  { code: '847141', type: 'HSN', description: 'Desktop microcomputers and all-in-one workstations', chapter: '84', heading: '8471' },
  { code: '8517', type: 'HSN', description: 'Telephone sets, smartphones, routers, and telecommunication apparatus', chapter: '85', heading: '8517' },
  { code: '851712', type: 'HSN', description: 'Smartphones and mobile cellular network phones', chapter: '85', heading: '8517' },
  { code: '8528', type: 'HSN', description: 'Monitors and projectors; computer displays & television screens', chapter: '85', heading: '8528' },
  { code: '8443', type: 'HSN', description: 'Printers, multi-function copiers, fax machines, and printing machinery', chapter: '84', heading: '8443' },
  { code: '8523', type: 'HSN', description: 'Solid-state storage devices (SSDs), USB flash drives, and memory cards', chapter: '85', heading: '8523' },
  { code: '8504', type: 'HSN', description: 'Power adapters, UPS systems, static converters, and transformers', chapter: '85', heading: '8504' },
  { code: '9403', type: 'HSN', description: 'Office furniture, wooden desks, chairs, and metal storage cabinets', chapter: '94', heading: '9403' },
  { code: '4820', type: 'HSN', description: 'Registers, account books, notebooks, order books, and receipt pads', chapter: '48', heading: '4820' },
  { code: '3004', type: 'HSN', description: 'Medicaments consisting of mixed or unmixed products for therapeutic use', chapter: '30', heading: '3004' },
  { code: '6204', type: 'HSN', description: "Women's or girls' suits, jackets, dresses, skirts, and trousers", chapter: '62', heading: '6204' },
  { code: '6109', type: 'HSN', description: 'T-shirts, singlets and other vests, knitted or crocheted', chapter: '61', heading: '6109' },
  { code: '0401', type: 'HSN', description: 'Milk and cream, fresh, not concentrated nor containing added sugar', chapter: '04', heading: '0401' },
  { code: '1006', type: 'HSN', description: 'Rice, packaged and branded or unbranded', chapter: '10', heading: '1006' },
  { code: '8708', type: 'HSN', description: 'Parts and accessories of motor vehicles', chapter: '87', heading: '8708' },

  // ── SERVICES (SAC) ────────────────────────────────────────────────────────
  { code: '9983', type: 'SAC', description: 'Other professional, technical and business services', chapter: '99', heading: '9983' },
  { code: '998313', type: 'SAC', description: 'Information technology consulting and software support services', chapter: '99', heading: '9983' },
  { code: '998314', type: 'SAC', description: 'Information technology design and development services (Web, Mobile Apps)', chapter: '99', heading: '9983' },
  { code: '998311', type: 'SAC', description: 'Management consulting and management advisory services', chapter: '99', heading: '9983' },
  { code: '998312', type: 'SAC', description: 'Business management, strategy, and financial consulting services', chapter: '99', heading: '9983' },
  { code: '9984', type: 'SAC', description: 'Telecommunications, internet access, and information supply services', chapter: '99', heading: '9984' },
  { code: '998413', type: 'SAC', description: 'Broadband, high-speed internet, and telecommunication access services', chapter: '99', heading: '9984' },
  { code: '9987', type: 'SAC', description: 'Maintenance, repair, and installation services (Computer hardware, Machinery)', chapter: '99', heading: '9987' },
  { code: '998713', type: 'SAC', description: 'Maintenance and repair services of office & computing machinery', chapter: '99', heading: '9987' },
  { code: '9954', type: 'SAC', description: 'Construction, civil engineering, and building alteration services', chapter: '99', heading: '9954' },
  { code: '9965', type: 'SAC', description: 'Goods transport services by road (Goods Transport Agency — GTA)', chapter: '99', heading: '9965' },
  { code: '9967', type: 'SAC', description: 'Supporting and auxiliary transport services, cargo handling, and warehousing', chapter: '99', heading: '9967' },
  { code: '9972', type: 'SAC', description: 'Real estate services involving own or leased property (Commercial rent)', chapter: '99', heading: '9972' },
  { code: '9982', type: 'SAC', description: 'Legal, accounting, auditing, bookkeeping, and tax preparation services', chapter: '99', heading: '9982' },
  { code: '998222', type: 'SAC', description: 'Accounting, auditing, bookkeeping, and GST filing services', chapter: '99', heading: '9982' },
];
