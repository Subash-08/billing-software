# 23 — Environment Configuration

- **Status:** Approved Architecture Specification
- **Owner:** DevOps & Security
- **Last Updated:** 2026-08-26
- **Purpose:** Specifies environment variable definitions, secret policies, and configuration validation.

---

## 1. Environment Variable Specification

| Variable Name | Required | Public / Server | Description |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | Yes | Server | App mode (`development`, `production`, `test`) |
| `NEXT_PUBLIC_APP_URL` | Yes | Public | Base URL (e.g. `http://localhost:3000` or production domain) |
| `MONGODB_URI` | Yes | Server | MongoDB Atlas connection string |
| `BETTER_AUTH_SECRET` | Yes | Server | 32-character secret key for session cookie encryption |
| `BETTER_AUTH_URL` | Yes | Server | Auth callback base URL |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Yes | Public | Cloudinary account identifier |
| `CLOUDINARY_API_KEY` | Yes | Server | Cloudinary upload API key |
| `CLOUDINARY_API_SECRET` | Yes | Server | Cloudinary API secret for signing uploads |

---

## 2. Server Configuration Boot Guard

On server startup, Zod validates all environment variables. If any mandatory variable is missing or invalid, the process halts immediately with an explicit configuration error message.
