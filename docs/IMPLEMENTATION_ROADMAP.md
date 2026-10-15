# DOOT — Prioritized Implementation Roadmap & Engineering Checklist

> **Phase Focus:** Phase 1 Foundation, Security Architecture, Multi-Tenant Core  
> **Status:** Active Execution Plan  
> **Updated:** October 2026

---

## 1. Phased Delivery Roadmap

### Phase 1: Foundation, Security Architecture & Multi-Tenant Core (Current Deliverable)
- [x] Workspace & environment discovery (Postgres 18, Redis 8, Node v24).
- [x] Product Specification, Technical Architecture, Security Model & Database Design.
- [x] Monorepo repository setup (`apps/api`, `apps/web`, `apps/worker`, `packages/shared`).
- [x] Initial Prisma schema, migrations, and PostgreSQL connection to `DOOT`.
- [x] Cryptographic Security Service (AES-256-GCM authenticated encryption for API secrets).
- [x] Multi-tenant isolation engine (`TenantContextGuard`, `@CurrentTenant()`, `@CurrentUser()`).
- [x] Authentication & Access Control (Argon2id, secure HttpOnly cookie tokens, RBAC permissions).
- [x] Redis & BullMQ queuing baseline infrastructure.
- [x] React 19 + TypeScript + Vite frontend shell with modern aesthetics, responsive layout, sidebar, header, tenant switcher, and dashboard cards.
- [x] Automated test suite verifying tenant isolation and security boundaries.

### Phase 2: Meta WhatsApp Cloud API & Asset Management
- [ ] Meta Embedded Signup OAuth handshake & token exchange.
- [ ] WABA and Phone Number asset synchronization & tier display.
- [ ] Inbound Meta webhook verification (`hub.challenge`) and HMAC signature validation (`X-Hub-Signature-256`).
- [ ] One-click WhatsApp test message delivery verification utility.

### Phase 3: Contact Directory, Leads & Chunked CSV Import Pipeline
- [ ] Contact CRUD with phone normalization to E.164.
- [ ] Tags & Contact Groups management.
- [ ] Lead status pipeline and agent assignment.
- [ ] Asynchronous CSV import queue (BullMQ) with validation preview and error report download.

### Phase 4: WhatsApp Templates & Broadcast Campaigns
- [ ] Bi-directional template sync with Meta Cloud API.
- [ ] Interactive template preview with dynamic variable parameters.
- [ ] Bulk broadcast campaign wizard (audience segmentation, variable mapping, tier rate limits).
- [ ] Campaign dispatch queue worker with live progress tracking and recipient delivery logs.

### Phase 5: Omnichannel Inbox & Real-Time Customer Chat
- [ ] Real-time conversation list with unread counters and status filters.
- [ ] Message history stream with delivery status ticks and timestamps.
- [ ] 24-hour customer service window tracking.
- [ ] In-window freeform composer and out-of-window template selector.
- [ ] Contact details sidebar and internal team notes.

### Phase 6: Bot Flows, Outbound Webhooks & Platform Administration
- [ ] Visual Bot Flow automation builder with keyword/trigger routing.
- [ ] Outbound webhook dispatcher with SSRF protection and retry logic.
- [ ] Platform Super Admin dashboard for multi-tenant monitoring and plan management.
- [ ] Audit logs viewer and usage telemetry.

---

## 2. Phase 1 Implementation Checklist

- [x] **1. Project Inspection & Environment Setup**
  - [x] Verify local PostgreSQL 18 connection to database `DOOT` on port 5432.
  - [x] Install & launch Redis 8 on port 6379.
  - [x] Initialize Git repository and directory structure.
- [x] **2. Documentation Suite**
  - [x] `docs/PRODUCT_SPECIFICATION.md`
  - [x] `docs/ARCHITECTURE.md`
  - [x] `docs/SECURITY_MODEL.md`
  - [x] `docs/DATABASE_DESIGN.md`
  - [x] `docs/IMPLEMENTATION_ROADMAP.md`
- [ ] **3. Backend Core (`apps/api`)**
  - [ ] Package setup with NestJS, TypeScript, Prisma, BullMQ, Argon2, Class-Validator.
  - [ ] Prisma schema implementation for all multi-tenant models.
  - [ ] Execute database migration against `DOOT` PostgreSQL database.
  - [ ] AES-256-GCM Encryption Service implementation.
  - [ ] Multi-tenant Guard, Interceptor, and Param Decorators.
  - [ ] AuthModule: Register, Login, Refresh, Logout, Me endpoints.
  - [ ] OrganizationsModule: List user orgs, active org switcher, org settings.
  - [ ] HealthModule & Dashboard stats aggregation endpoint.
- [ ] **4. Shared Package (`packages/shared`)**
  - [ ] Common TypeScript interfaces, Enums, DTOs, and RBAC definitions.
- [ ] **5. Asynchronous Queue Worker (`apps/worker` / BullMQ setup)**
  - [ ] BullMQ Redis connection and sample queue consumer.
- [ ] **6. Frontend Shell (`apps/web`)**
  - [ ] React 19 + TypeScript + Vite + Tailwind CSS configuration.
  - [ ] Modern UI layout: Collapsible Sidebar, Header, Breadcrumbs, Tenant Switcher.
  - [ ] Authentication Views: Login, Register, Forgot Password.
  - [ ] Dashboard Page: Dynamic KPIs, subscription quota, charts, quick actions.
  - [ ] API integration using TanStack React Query.
- [ ] **7. Verification & Security Testing**
  - [ ] Unit tests for AES-256-GCM encryption & decryption integrity.
  - [ ] Integration tests verifying Tenant Isolation (preventing cross-tenant data access).
  - [ ] End-to-end API execution verification.
