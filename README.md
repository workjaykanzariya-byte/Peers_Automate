# DOOT — Enterprise Multi-Tenant WhatsApp SaaS Platform

> **System:** Independent WhatsApp Business Platform, Campaigns, CRM & Chat Automation SaaS  
> **Architecture:** Modular Monolith with Asynchronous Redis & BullMQ Workers  
> **Status:** Phase 1 Foundation & Security Core Active

---

## 1. Project Overview & Identity

**DOOT** is a high-performance, multi-tenant B2B SaaS platform engineered for businesses to manage their Meta WhatsApp Business communications, contacts, leads, approved templates, broadcast marketing campaigns, chatbot automations, and unified agent inbox from a single dashboard.

DOOT is completely independently owned—with zero dependence on third-party subscriptions or private Reshobrand/FlexiMSG APIs.

---

## 2. Technology Stack

- **Database:** PostgreSQL 18 (Local database: `DOOT` on port `5432`).
- **ORM & Migrations:** Prisma ORM (`@prisma/client` v6).
- **Backend API:** Node.js (LTS), TypeScript, NestJS (`/api/v1`), Swagger OpenAPI.
- **Asynchronous Workers:** Redis 8 (`localhost:6379`) & BullMQ queues.
- **Authentication & Security:** Argon2id password hashing, AES-256-GCM authenticated credential encryption, HttpOnly/SameSite cookies, RBAC permissions matrix.
- **Frontend Application:** React 19, TypeScript, Vite, Tailwind CSS v4, TanStack Query v5, Lucide React.

---

## 3. Monorepo Organization

```
DOOT/
├── apps/
│   ├── api/                    # NestJS REST API (/api/v1) & Prisma migrations
│   └── web/                    # React 19 + Vite frontend application
├── packages/
│   └── shared/                 # Shared TypeScript types, Enums, and RBAC matrix
├── docs/
│   ├── PRODUCT_SPECIFICATION.md# Master product specification & requirements
│   ├── ARCHITECTURE.md         # Monolith & asynchronous queue architecture
│   ├── SECURITY_MODEL.md       # Cryptographic model, tenant isolation, SSRF defenses
│   ├── DATABASE_DESIGN.md      # Normalized schema & entity relations
│   └── IMPLEMENTATION_ROADMAP.md # Prioritized engineering roadmap & checklist
├── .env.example                # Example environment configuration
├── package.json                # Root workspace definition
└── README.md
```

---

## 4. Multi-Tenant Security & Tenant Isolation

Every tenant-scoped table features an explicit `organization_id` column with relational foreign keys.
- **`TenantContextGuard`**: Verifies that the authenticated user has an active membership in the target organization before permitting any operation.
- **Cross-Tenant Blocking**: Verified by automated test suites. Passing an unauthorized `X-Tenant-Id` header results in immediate `403 Forbidden`.
- **Envelope Encryption**: Meta tokens and API secrets are encrypted with `AES-256-GCM` using isolated environment keys. Plaintext tokens are never returned in public REST endpoints or persisted in plain text.

---

## 5. Getting Started & Local Development

### 5.1 Prerequisites
1. **Node.js**: v20+ (Verified on v24.11.1).
2. **PostgreSQL 18**: Running on `localhost:5432` with database `DOOT`.
3. **Redis 8**: Running on `localhost:6379`.

### 5.2 Environment Configuration
Create `.env` in the root and in `apps/api/.env`:
```bash
cp .env.example .env
```

Default connection string for local development:
```env
DATABASE_URL="postgresql://postgres:2004@localhost:5432/DOOT?schema=public"
REDIS_HOST=localhost
REDIS_PORT=6379
ENCRYPTION_MASTER_KEY_V1=c7e52a97544062cbda262b9a781b95ffae73c26727de4568e6f1f41bfb9ef617
JWT_SECRET=doot-production-grade-super-secret-jwt-key-2026-secure
```

### 5.3 Database Setup & Migrations
```bash
# Generate Prisma Client
npm run prisma:generate

# Apply migrations
npm run prisma:migrate

# Seed demo tenants (Acme Enterprises & Globex Corporation)
npm run prisma:seed --workspace=@doot/api
```

### 5.4 Running the Application
```bash
# Start Backend API (runs on http://localhost:3000/api/v1, Swagger on http://localhost:3000/docs)
npm run start:dev --workspace=@doot/api

# Start Frontend Application (runs on http://localhost:5173)
npm run dev --workspace=@doot/web
```

### 5.5 Pre-seeded Demo Credentials
| Tenant Workspace | Email | Password | Role |
| :--- | :--- | :--- | :--- |
| **Acme Enterprises** | `admin@acme.com` | `Password123!` | Owner |
| **Acme Enterprises** | `agent@acme.com` | `Password123!` | Support Agent |
| **Globex Corporation**| `ceo@globex.com` | `Password123!` | Owner |

---

## 6. Verification & Automated Tests

Run the backend test suite:
```bash
npm test --workspace=@doot/api
```
Includes:
- AES-256-GCM encryption, decryption, IV randomness, and tamper verification.
- Tenant isolation guard tests proving cross-tenant access rejection (`403 Forbidden`).
- RBAC permissions tests verifying role boundary enforcement.
