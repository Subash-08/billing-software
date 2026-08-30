# 05 — Business Account Model

- **Status:** Approved Architecture Specification
- **Owner:** Domain Architecture Team
- **Last Updated:** 2026-08-26
- **Purpose:** Specifies Business entity schema fields, branding settings, GST setup attributes, bank configuration, and editability policies.

---

## 1. Business Profile Schema Fields

The `Business` collection encapsulates all profile, taxation, and invoice branding settings:

```typescript
interface IBusiness {
  _id: Types.ObjectId;
  userId: Types.ObjectId; // Unique 1:1 binding to User
  legalName: string; // e.g. "Acme Enterprises Private Limited"
  tradeName?: string; // e.g. "Acme Store"
  logoUrl?: string; // Cloudinary asset URL
  logoPublicId?: string; // Cloudinary public identifier
  businessType: 'SOLE_PROPRIETORSHIP' | 'PARTNERSHIP' | 'LLP' | 'PRIVATE_LIMITED' | 'PUBLIC_LIMITED' | 'OTHER';
  
  // Contact Info
  phone: string;
  email: string;
  website?: string;
  
  // Address Details
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  stateCode: string; // 2-digit GST state code (e.g. "27" for Maharashtra)
  pincode: string;
  
  // Tax & Registration Configuration
  gstRegistrationType: 'REGISTERED' | 'UNREGISTERED' | 'COMPOSITION';
  gstin?: string; // 15-character GSTIN (e.g. "27AAAAA0000A1Z5")
  pan?: string; // 10-character PAN
  
  // Bank Account Configuration (Printed on invoices for payment)
  bankDetails?: {
    accountName: string;
    bankName: string;
    accountNumber: string;
    ifscCode: string; // 11-character IFSC
    branchName?: string;
    upiId?: string; // e.g. "acme@upi"
  };
  
  // Invoice Customization & Settings
  invoiceSettings: {
    defaultPrefix: string; // e.g. "INV/"
    nextSequenceNumber: number; // e.g. 1001
    defaultTermsAndConditions?: string;
    defaultNotes?: string;
    signatoryImageUrl?: string; // Cloudinary URL
    signatoryImagePublicId?: string;
  };
  
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 2. Editability Policies & Restrictions

- **Editability:** All business profile, address, bank details, and branding settings remain fully editable at any time via the Settings page.
- **Impact of Edits:** Updating business profile settings affects **FUTURE** created/issued invoices only. Past issued invoices retain their snapshotted business data and will not change retroactively.

---

## 3. Data Isolation Constraint

Every query against business data checks `userId: session.userId` or uses the `businessId` derived from session context. Cross-business reads or writes are strictly forbidden.
