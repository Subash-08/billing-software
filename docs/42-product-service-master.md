# 42 — Product & Service Master Architecture

- **Status:** Approved Architecture Specification (v1.0 — GST Module Upgrade)
- **Owner:** Product & Inventory Engineering
- **Last Updated:** 2026-08-31
- **Purpose:** Specifies data contracts, schemas, HSN/SAC separation, UOM, tax rate master linkage, price inclusive toggle, and snapshot isolation for Products and Services.

---

## 1. Architectural Philosophy

Products (Goods) and Services are separate entities with distinct classification requirements:
- **Products (Goods):** Have `hsnCode` (4, 6, or 8 digits), `unit`, `uqc`, `sellingPrice`, `isPriceInclusiveOfGst`, `defaultTaxRateId`.
- **Services (Services):** Have `sacCode` (exactly 6 digits), `billingUnit`, `uqc`, `rate` (selling price in rupees), `isPriceInclusiveOfGst`, `defaultTaxRateId`.

**Core Rule (Invariant 7):** Product and Service masters configure **default tax suggestions** (`defaultTaxRateId`). The HSN or SAC code itself **NEVER calculates tax**. Tax rates are strictly resolved from `TaxRate` master data.

---

## 2. Product Model Data Schema (`IProductCatalogItem`)

```typescript
export interface IProductCatalogItem extends Document {
  _id: Types.ObjectId;
  businessId: Types.ObjectId;
  name: string;
  sku?: string;
  description?: string;
  category?: string;

  // Classification & Tax
  hsnCode: string;                         // 4, 6, or 8 digits (Invariant 9)
  defaultTaxRateId?: Types.ObjectId;       // FK → TaxRate Master
  defaultGstRate: number;                  // Kept as migration fallback (deprecated)
  isPriceInclusiveOfGst: boolean;          // Default: false

  // Unit of Measure (UOM)
  unit: string;                            // Display name e.g. "Pieces", "Boxes"
  uqc: string;                             // Official GST UQC e.g. "PCS", "BOX", "NOS"

  // Pricing
  sellingPrice: number;                    // Base selling price in rupees
  purchasePrice?: number;                  // Cost price in rupees

  // Inventory
  trackInventory: boolean;
  currentStock?: number;
  minStockLevel?: number;

  status: 'ACTIVE' | 'INACTIVE';
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 3. Service Model Data Schema (`IServiceItem`)

```typescript
export interface IServiceItem extends Document {
  _id: Types.ObjectId;
  businessId: Types.ObjectId;
  name: string;
  code?: string;
  description?: string;
  category?: string;

  // Classification & Tax
  sacCode: string;                         // Exactly 6 digits (Invariant 9)
  defaultTaxRateId?: Types.ObjectId;       // FK → TaxRate Master
  defaultGstRate: number;                  // Kept as migration fallback (deprecated)
  isPriceInclusiveOfGst: boolean;          // Default: false

  // Unit of Measure (UOM)
  billingUnit: string;                     // Display name e.g. "Hours", "Days", "Job"
  uqc: string;                             // Official GST UQC e.g. "HRS", "JOB", "NOS" (Default: "JOB")

  // Pricing
  rate: number;                            // Service charge rate in rupees

  status: 'ACTIVE' | 'INACTIVE';
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 4. Master Data vs. Invoice Snapshot Isolation

Editing a Product or Service record in catalog master:
- Updates default suggestions for FUTURE invoices only.
- **NEVER** mutates past issued invoices or past credit notes (Invariants 5 & 6).
- If a Product's HSN code is updated from `847130` → `847141`, past issued invoices retain `847130`.

---

## 5. UI & UX Standards for Catalog Items

1. **HSN Search Widget:** Allows searching HSN codes by keyword or code. Displays format validation error if `/^[0-9]{4,8}$/` fails. Displays master lookup warning if code is not in `HsnSacMaster`.
2. **SAC Search Widget:** Allows searching SAC codes by keyword or 6-digit code. Enforces `/^[0-9]{6}$/`.
3. **GST Rate Dropdown:** Populated dynamically from `GET /api/tax-rates`. Displays full rate structure e.g. `"18% — GST 18% (CGST 9% + SGST 9%)"`. No hardcoded rate options in UI.
4. **Inclusive Toggle:** Toggle switch for `"Price Includes GST"`. When toggled, UI displays live price breakdown preview:
   - Price Entered: ₹5,900.00
   - Taxable Value: ₹5,000.00
   - GST (18%): ₹900.00 (CGST ₹450 + SGST ₹450)
   - Customer Pays: ₹5,900.00
