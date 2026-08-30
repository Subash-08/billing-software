# 22 — Deployment Architecture

- **Status:** Approved Architecture Specification
- **Owner:** DevOps & Infrastructure
- **Last Updated:** 2026-08-26
- **Purpose:** Specifies initial Vercel production setup, MongoDB Atlas provisioning, Cloudinary setup, and future container deployment targets.

---

## 1. Initial Target: Vercel + MongoDB Atlas + Cloudinary

```
[Vercel Global CDN / Edge] ──► [Serverless Node Functions] ──► [MongoDB Atlas Database]
                                          │
                                          ▼
                               [Cloudinary Asset Storage]
```

- **Vercel Hosting:** Deploys Next.js 16 App Router application.
- **MongoDB Atlas:** Managed multi-region M0/M10 cluster with automated daily backups.
- **Cloudinary:** Media asset hosting for business logos, signatures, attachments, and PDFs.

---

## 2. Multi-Infrastructure Deployment Extensibility

The codebase avoids Vercel-proprietary runtime locks to preserve deployment flexibility:
- **Docker Support:** Multi-stage `Dockerfile` creating standalone Node.js server.
- **VPS / On-Premise Support:** Executable via Docker Compose or PM2 process manager.
- **Cloud Agnostic:** Compatible with AWS ECS, Google Cloud Run, Azure Container Apps, or DigitalOcean App Platform.
