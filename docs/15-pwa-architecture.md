# 15 — PWA Architecture

- **Status:** Approved Architecture Specification
- **Owner:** Frontend & PWA Team
- **Last Updated:** 2026-08-26
- **Purpose:** Specifies Progressive Web App standards, manifest configuration, service worker caching, standalone app mode, and offline boundaries.

---

## 1. Core Progressive Web App Capabilities

Billing Software SaaS is fully architected as an installable Progressive Web App (PWA):
- **Standalone App Display Mode:** Renders without browser URL bars or window frames on Windows, macOS, Android, and iOS.
- **App Installation Prompts:** Custom prompt triggers for desktop and mobile installation.
- **Web App Manifest:** Configures app icons (192x192, 512x512, maskable), theme color (`#0f172a`), background color (`#ffffff`), and start URL.

---

## 2. Service Worker & Caching Strategy

Using `Serwist` / `next-pwa`:
- **App Shell Cache (Cache-First):** Static JavaScript bundles, CSS stylesheets, fonts, and core UI icons are cached locally for sub-second loads.
- **Static Assets (Stale-While-Revalidate):** Navigation layout frames, logos, and UI component assets.
- **API Requests (Network-Only):** Dynamic invoice data, payment balance queries, and financial calculations ALWAYS use direct network requests.

---

## 3. Offline Capabilities & Boundaries for V1

- **V1 Offline Scope:** Safe app shell loading, offline fallback page display ("You are currently offline. Please reconnect to record payments or issue invoices."), and cached viewing of previously loaded dashboards.
- **Prohibition:** Complete offline accounting write operations (offline invoice creation with client-side sync) are strictly **EXCLUDED** from V1 to prevent financial sequence collisions and multi-tenant sync errors.
