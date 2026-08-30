---
name: product-service-catalog
description: Product and service catalog, HSN/SAC codes, pricing, units, and inventory extension interfaces.
---

# Product & Service Catalog Skill

## Purpose
Manages catalog items categorized as `PRODUCT` or `SERVICE`, units, categories, selling prices, and HSN/SAC codes.

## Key Rules
- Items must specify `type` (`PRODUCT` | `SERVICE`).
- HSN (Goods) or SAC (Services) code association is mandatory for GST taxable catalog items.
- Schema must provide extension fields (e.g., `trackInventory: boolean`) for future inventory releases without breaking V1 catalog contracts.

## Forbidden Practices
- NEVER implement full warehouse/stock-in-stock-out logic in V1 (keep as future extensibility hooks).
