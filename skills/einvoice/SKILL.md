---
name: einvoice-architecture
description: Isolated E-Invoice schema validation, IRP integration payloads, IRN, and QR code snapshotting.
---

# E-Invoice Architecture Skill

## Purpose
Governs the extension module for Indian E-Invoicing (NIC / IRP portal standard).

## Architectural Isolation
- Common Invoice Engine generates core totals, items, and tax calculations.
- E-Invoice Module validates strict government payload requirements (IRN, Ack No, Signed QR Code).

## Critical Rule
- Visual printable template layouts are user-configurable.
- Government/IRP required E-Invoice payload structures are strictly NOT arbitrarily editable.
