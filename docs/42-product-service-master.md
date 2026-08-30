# 42 — Product, Service, Category & Unit Master Architecture Specification

## 1. Overview & System Purpose

This specification establishes the architectural contract for the **Product, Service, Category, and Unit Master Modules** of the NIRAMAALAI SaaS billing system.

The Catalog Master represents physical goods, billable services, business-defined classification categories, and global unit/UQC master data backed by **LIVE MongoDB Atlas** persistence.

---

## 2. Core Architectural Principles & Boundaries

### 2.1 Multi-Tenant Isolation Model
$$\text{Session Cookie} \longrightarrow \text{User} \longrightarrow \text{Business.userId} \longrightarrow \text{businessId} \longrightarrow \text{CatalogRepository} \longrightarrow \text{MongoDB}$$

- `businessId` MUST be derived strictly from authenticated server session context.
- The client browser payload (`req.body.businessId`, query parameters, or URL segments) MUST NEVER supply or manipulate `businessId`.
- `Category`, `Product`, and `Service` collections are strictly tenant-isolated by `businessId`.
- `Unit` is global master data (shared across all businesses).

### 2.2 Crucial GST Engine Boundary (Master Data vs Tax Engine)
- Product and Service Master records store **CATALOG DEFAULT DATA** (`hsnCode`, `sacCode`, `uqc`, `sellingPrice`, `defaultGstRate`, `taxTreatment`).
- Product/Service CRUD operations MUST NOT calculate CGST, SGST, UTGST, IGST, or Cess. Calculation logic belongs exclusively to Phase 10 (`src/engine/gst/`).
- `defaultGstRate` is a **catalog default reference** validated against the `TaxRate` master data. It is NOT the final invoice tax rate.
- `TaxTreatment` (`TAXABLE`, `NIL_RATED`, `EXEMPT`, `NON_GST`, `ZERO_RATED`) is distinct from `TaxRate`. A `0%` rate does NOT automatically mean `EXEMPT` or `NIL_RATED`.

### 2.3 Unit & UQC Server Resolution
- Units are global master data (`UnitModel`).
- Server-side validation resolves `unit` (symbol, e.g. `"Pcs"`) and `uqc` (official GST UQC, e.g. `"PCS"`) against `UnitModel` to prevent browser inconsistency (e.g. `unit = PCS, uqc = KGS`).

### 2.4 Category Type Compatibility & Cross-Tenant Protection
- `Category.type`: `'PRODUCT'`, `'SERVICE'`, or `'BOTH'`.
- Product accepts `PRODUCT` or `BOTH` categories; rejects `SERVICE` categories.
- Service accepts `SERVICE` or `BOTH` categories; rejects `PRODUCT` categories.
- Cross-tenant category references (assigning Business A's product to Business B's category ID) are strictly rejected with HTTP 404/400.
- New Products/Services CANNOT reference an `INACTIVE` Category or an `INACTIVE` Unit. Historical records retain existing references.

### 2.5 SKU / Service Code Normalization & Uniqueness
- Product `code` (SKU) and Service `code` are normalized with `.trim().toUpperCase()`.
- SKU and Service code uniqueness is strictly **business-scoped** (`{ businessId: 1, code: 1 }`).
- Product names and Service names are NOT required to be unique.
- MongoDB E11000 duplicate key errors are caught and returned as HTTP 409 Conflict.

### 2.6 Money & Financial Precision
- Prices (`sellingPrice`, `purchasePrice`, `rate`) use `src/lib/money.ts` exact integer arithmetic or paise rounding helpers. Negative values, `NaN`, and `Infinity` are rejected.

### 2.7 Soft Deactivation Policy
- Deleting a Product, Service, or Category sets `status: 'INACTIVE'`. Physical document deletion is prohibited.

---

## 3. Database Schema Models

### 3.1 Product Schema (`products` collection)
```typescript
interface IProductCatalogItem extends Document {
  businessId: Types.ObjectId;
  type: 'PRODUCT';
  name: string;
  code?: string; // SKU, normalized UPPERCASE
  hsnCode: string;
  unit: string; // ref Unit.symbol
  uqc: string; // ref Unit.uqc
  sellingPrice: number;
  purchasePrice?: number;
  defaultGstRate: number; // Catalog default reference
  taxTreatment: 'TAXABLE' | 'NIL_RATED' | 'EXEMPT' | 'NON_GST' | 'ZERO_RATED';
  categoryId?: Types.ObjectId;
  description?: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: Date;
  updatedAt: Date;
}
```

### 3.2 Service Schema (`services` collection)
```typescript
interface IServiceItem extends Document {
  businessId: Types.ObjectId;
  type: 'SERVICE';
  name: string;
  code?: string; // Service code, normalized UPPERCASE
  sacCode: string;
  billingUnit: string; // ref Unit.symbol
  rate: number;
  defaultGstRate: number; // Catalog default reference
  taxTreatment: 'TAXABLE' | 'NIL_RATED' | 'EXEMPT' | 'NON_GST' | 'ZERO_RATED';
  categoryId?: Types.ObjectId;
  description?: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: Date;
  updatedAt: Date;
}
```

### 3.3 Category Schema (`categories` collection)
```typescript
interface ICategory extends Document {
  businessId: Types.ObjectId;
  name: string;
  type: 'PRODUCT' | 'SERVICE' | 'BOTH';
  description?: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: Date;
  updatedAt: Date;
}
```

### 3.4 Unit Schema (`units` collection — Global Master)
```typescript
interface IUnitMaster extends Document {
  name: string;
  symbol: string;
  uqc: string;
  description: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 4. Audit Log Event Types

- `PRODUCT_CREATED`, `PRODUCT_UPDATED`, `PRODUCT_DEACTIVATED`
- `SERVICE_CREATED`, `SERVICE_UPDATED`, `SERVICE_DEACTIVATED`
- `CATEGORY_CREATED`, `CATEGORY_UPDATED`, `CATEGORY_DEACTIVATED`
