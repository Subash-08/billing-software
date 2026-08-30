# 12 — Product & Service Architecture

- **Status:** Approved Architecture Specification
- **Owner:** Catalog Engineering
- **Last Updated:** 2026-08-26
- **Purpose:** Specifies Products & Services catalog schema, HSN/SAC classification, units of measurement, and inventory extension points.

---

## 1. Unified Catalog Architecture

The application provides a unified catalog for physical goods (`PRODUCT`) and billable services (`SERVICE`).

```typescript
interface ICatalogItem {
  _id: Types.ObjectId;
  businessId: Types.ObjectId; // Mandatory tenant isolation key
  type: 'PRODUCT' | 'SERVICE';
  name: string;
  code?: string; // SKU or internal item code
  description?: string;
  categoryId?: Types.ObjectId;
  
  unit: string; // e.g. "Pcs", "Kg", "Mtr", "Nos", "Hours", "Days", "Box"
  sellingPrice: number; // Decimal exact price
  
  // Tax Classification
  hsnSacCode: string; // HSN for Products, SAC for Services
  gstRate: number; // e.g. 0, 5, 12, 18, 28
  taxPreference: 'TAXABLE' | 'EXEMPT' | 'NIL_RATED';
  isTaxInclusive: boolean; // Default pricing model
  
  // Future Inventory Hooks (Disabled in V1, Schema Ready)
  trackInventory?: boolean;
  stockQuantity?: number;
  reorderLevel?: number;
  
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 2. Master Measurement Units (`units`)

Standard units supported out-of-the-box:
- **Pcs** (Pieces), **Kg** (Kilograms), **Mtr** (Meters), **Nos** (Numbers), **Box** (Boxes), **Hours**, **Days**, **Set**, **SqFt** (Square Feet).

---

## 3. Inventory Extension Boundaries for V1

- **V1 Scope:** Catalog pricing and HSN/SAC master management.
- **Explicit Non-Goal for V1:** Stock entry, stock-in/stock-out transactions, warehouse management, reorder alerts, and FIFO stock valuation are strictly **DEFERRED** to future roadmap releases.
