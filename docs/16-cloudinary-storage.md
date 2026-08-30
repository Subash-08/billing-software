# 16 — Cloudinary Asset Storage

- **Status:** Approved Architecture Specification
- **Owner:** Infrastructure & Media Team
- **Last Updated:** 2026-08-26
- **Purpose:** Specifies Cloudinary integration architecture, asset upload signing flow, file types, security, and MongoDB metadata mapping.

---

## 1. Binary File Storage Strategy

- **Rule:** Binary media files (images, signatures, attachments, PDFs) MUST NOT be stored in MongoDB collections.
- **Storage Provider:** Cloudinary.
- **Metadata Persistence:** MongoDB stores Cloudinary URL, public ID, file size, mime type, and creation timestamp.

---

## 2. Server-Signed Upload Workflow

To prevent unauthorized public uploads or token theft, all file uploads execute through server-signed presignatures:

```
[Browser / Form] ──(1) Request Upload Signature──► [Next.js Server Action]
                                                           │
                                                           ▼
                                                [Generate HMAC Signature]
                                                (Using CLOUDINARY_API_SECRET)
                                                           │
[Browser] ◄──(2) Return Signature & Timestamp──────────────┘
    │
    ├─(3) Upload File Directly to Cloudinary API──► [Cloudinary]
    │                                                      │
    ▼                                                      ▼
[Receive Asset Public ID & Secure URL] ◄──(4) Return Asset Credentials
    │
    ▼
[Submit Form Payload + Public ID] ──(5) Save Metadata──► [MongoDB Database]
```

---

## 3. Supported Asset Types & Constraints

| Asset Category | Max Size | Allowed Formats | Cloudinary Folder Path | Access |
| :--- | :--- | :--- | :--- | :--- |
| **Business Logo** | 2 MB | PNG, JPG, WEBP | `billing/logos/{businessId}/` | Public Read |
| **Authorized Signatory**| 1 MB | PNG, JPG | `billing/signatures/{businessId}/` | Authenticated / Signed |
| **Product Images** | 5 MB | PNG, JPG, WEBP | `billing/products/{businessId}/` | Public Read |
| **Invoice Attachments** | 10 MB | PDF, PNG, JPG | `billing/attachments/{businessId}/`| Authenticated / Signed |
| **Generated Invoice PDFs**| 10 MB | PDF | `billing/pdf/{businessId}/` | Authenticated / Signed |
