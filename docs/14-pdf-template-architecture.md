# 14 — PDF & Template Architecture

- **Status:** Approved Architecture Specification
- **Owner:** UI/UX & PDF Engineering
- **Last Updated:** 2026-08-26
- **Purpose:** Specifies customizable invoice template engine, PDF generation strategy, printable options, and visual layout configuration.

---

## 1. Modular Template Engine Architecture

The template rendering system avoids giant monolithic components or hardcoded HTML strings. It splits printable invoice documents into modular, configurable section components:

```
┌────────────────────────────────────────────────────────┐
│                   Invoice Template Config              │
│  (Primary Color, Font, Column Visibility, Branding)     │
└──────────────────────────┬─────────────────────────────┘
                           │ Layout Config Context
┌──────────────────────────▼─────────────────────────────┐
│                Modular Invoice Sections                │
│  ├── HeaderSection (Logo, Business Info, Tax Title)    │
│  ├── CustomerDetailsSection (Bill To, Ship To)         │
│  ├── InvoiceMetaSection (Number, Date, Due Date, POS)  │
│  ├── LineItemsTableSection (HSN/SAC, Rate, Qty, Tax)  │
│  ├── TaxSummarySection (CGST/SGST/IGST breakdown)     │
│  ├── PaymentBankSection (Bank Account, UPI QR Code)   │
│  └── FooterSignatorySection (Terms, Signature Image)   │
└────────────────────────────────────────────────────────┘
```

---

## 2. Configurable Template Attributes (`InvoiceTemplateConfig`)

- **Visual Tokens:** Primary theme color, header font size, table padding mode (`COMPACT`, `COMFORTABLE`).
- **Visibility Flags:** Show/hide HSN/SAC column, show/hide discount column, show/hide tax rate column, show/hide bank details, show/hide signatory line.
- **Branding Tokens:** Logo alignment (`LEFT`, `RIGHT`, `CENTER`), header banner style.

---

## 3. PDF Generation Strategy

- **Client-Side Print / Save as PDF:** Standard browser print API (`window.print()`) with CSS `@page` styling for instant, zero-cost PDF generation.
- **Server-Side PDF Rendering (Optional Persistence):** PDF generation using `@react-pdf/renderer` or Puppeteer service for automated email attachments and Cloudinary backup.
