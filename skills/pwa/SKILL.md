---
name: pwa-architecture
description: Progressive Web App manifest, service worker caching, standalone application mode, and offline shell rules.
---

# PWA Architecture Skill

## Purpose
Governs Progressive Web App installation, service worker shell caching, and offline state handling.

## Architectural Rules
- PWA manifest must configure `display: "standalone"`, app icons, theme colors, and start URL.
- Service worker caches application shell assets and safe static resources.
- Financial mutations (creating invoices, recording payments) REQUIRE reliable server connectivity in V1.

## Forbidden Practices
- NEVER claim or attempt full offline financial accounting or sync in V1.
