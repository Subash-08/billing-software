---
name: database-modeling
description: MongoDB Atlas, Mongoose schemas, compound index design, and data snapshotting rules.
---

# Database Modeling Skill

## Purpose
Governs Mongoose schema creation, index optimization, embedded document snapshots, and strict tenant isolation.

## Architectural Rules
- Every collection schema (except shared lookup data) MUST require `businessId` of type `Schema.Types.ObjectId`.
- Compound indexes MUST place `businessId` as the leading key (e.g. `{ businessId: 1, invoiceNumber: 1 }`).
- Embedded item/customer snapshots inside `Invoice` documents must remain independent of edits to `Customer` or `Product` collections.

## Forbidden Practices
- NEVER perform schema updates that remove `businessId` indexing.
- NEVER perform multi-tenant queries without appending `businessId` to the query predicate.
