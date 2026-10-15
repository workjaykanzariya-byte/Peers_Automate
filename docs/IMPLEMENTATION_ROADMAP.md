# DOOT — Prioritized Implementation Roadmap & Engineering Checklist

> **Phase Focus:** Phase 1 Foundation, Security Architecture, Multi-Tenant Core  
> **Status:** Active Execution Plan  
> **Updated:** October 2026

---

## 1. Phased Delivery Roadmap

### Phase 1: Foundation, Security Architecture & Multi-Tenant Core (Completed)
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

### Phase 2: Meta WhatsApp Cloud API, Contacts, CRM, Inbox, Campaigns & Webhooks (Part 2 — Completed)
- [x] **Meta WhatsApp Business Platform Integration:**
  - Official Meta Cloud API v21.0 provider service with envelope encryption (`AES-256-GCM`).
  - System token & OAuth connection flow with multi-WABA & phone number asset selection.
  - One-click test message dispatch workflow.
  - Inbound webhook handshake verification (`hub.challenge`) and HMAC validation (`X-Hub-Signature-256`).
- [x] **Contact Management & CSV Import Engine:**
  - International phone normalization to standard E.164 format via `libphonenumber-js`.
  - CSV formula injection defense (OWASP DDE sanitization).
  - Asynchronous background CSV import queue with duplicate policies (`SKIP`, `OVERWRITE`, `MERGE_TAGS`).
  - Contact directory UI with search, tag filters, pagination, bulk selection, and downloadable CSV error reports.
- [x] **Leads CRM Pipeline:**
  - Aggregated Kanban pipeline boards grouped by stage (`NEW`, `CONTACTED`, `QUALIFIED`, `PROPOSAL`, `WON`, `LOST`).
  - Lead priority, follow-up dates, activity notes, and ownership management.
- [x] **WhatsApp Message Templates:**
  - Bi-directional synchronization with Meta WhatsApp Manager.
  - Dynamic parameter detection (`{{1}}`, `{{2}}`), category validation, and message bubble preview.
- [x] **Omnichannel Customer Chat Inbox:**
  - 3-pane layout (conversations thread list, active chat, and contact CRM profile).
  - 24-hour customer service window tracking with real-time countdown timer.
  - Strict Meta policy compliance (blocking freeform messages after 24h, requiring approved template message).
- [x] **WhatsApp Marketing & Bulk Campaigns:**
  - Unified campaign wizard supporting segmented audiences (tags, lists) and direct CSV uploads.
  - BullMQ queueing with rate limits (20 messages/sec) and per-tier concurrency.
  - Automatic filtering of opted-out (`OPTED_OUT`) contacts.
  - Recipient-level status tracking (`PENDING`, `SUBMITTED`, `SENT`, `DELIVERED`, `READ`, `FAILED`).
- [x] **Outbound Webhooks & SSRF Defense:**
  - Event catalog (`contact.created`, `lead.stage_changed`, `message.received`, `message.delivered`, `campaign.completed`).
  - HMAC-SHA256 signature header (`X-DOOT-Signature`).
  - Strict SSRF protection blocking private RFC1918 CIDRs, loopbacks, and cloud metadata (`169.254.169.254`).
  - Real-time delivery logs table with idempotent retry capability.
- [x] **Usage Aggregation & Quotas:**
  - Real database aggregation service for Starter, Growth, and Enterprise tiers.
  - Quota enforcement on contacts, monthly messages, and phone number assets.
- [x] **Automated Test Suite:**
  - 7 test suites, 33 tests verifying tenant isolation, cryptographic encryption, SSRF protection, CSV sanitization, 24h window compliance, and webhook verification.

### Phase 3: Platform Administration, SaaS Billing, Advanced Automations, AI & Production Release (Part 3 — Completed)
- [x] **Platform Owner Administration (`/admin`):**
  - Explicit platform-level security boundary via `PlatformAdminGuard` (`isPlatformAdmin: true`).
  - Cross-tenant operational KPI metrics (registered orgs, active, trial, suspended, messages dispatched, delivered, read, failed, webhook delivery rate, queue depth, open tickets).
  - Customer organization directory with search, status filters, and safe suspension/reactivation with mandatory audit log justification.
  - Global user directory across all tenants.
  - SaaS subscription plans manager and queue & worker health monitoring.
- [x] **SaaS Subscription & Billing Engine:**
  - Configurable plan limits (contacts, monthly messages, phone numbers, team seats, bot flow, AI assistant).
  - Razorpay & Stripe compatible checkout session lifecycle.
  - Webhook verification with HMAC-SHA256 signature enforcement and idempotent processing.
  - Customer invoice history with printable receipts.
- [x] **Visual Bot Flow & Automations (`/automations`):**
  - No-code visual node builder (TRIGGER, CONDITION, DELAY, SEND_MESSAGE, SEND_TEMPLATE).
  - Directed Acyclic Graph (DAG) cycle detection with max 25 nodes per flow to prevent runaway recursion.
  - Interactive "Dry-Run Simulation" mode for testing workflows with sample incoming text without calling external APIs.
- [x] **Extensible AI Support Assistant:**
  - Multi-provider support (OpenAI GPT-4o, Anthropic Claude 3.5 Sonnet, Google Gemini 1.5 Pro).
  - Envelope-encrypted API keys stored at rest with AES-256-GCM.
  - Prompt injection sanitization and customer PII masking (email & phone redaction).
  - Human-in-the-loop requirement for draft suggestions.
- [x] **Facebook Messenger Platform Integration:**
  - Authorized Facebook Page connection with encrypted Page Access Tokens and webhook verification.
- [x] **Customer Support & Help Desk (`/support`):**
  - In-app support ticket submission with category, priority, and status lifecycle.
  - Multi-party conversation threads with internal notes hidden from customer workspace.
- [x] **Production Release & Deployment Artifacts:**
  - `docs/BILLING.md`, `docs/DEPLOYMENT.md`, `docs/BACKUP_AND_RECOVERY.md`, `docs/TEST_PLAN.md`.
  - Production `docker-compose.yml` and multi-stage `Dockerfile`.
  - 11 automated test suites passing with 100% success rate.

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
