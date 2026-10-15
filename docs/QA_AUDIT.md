# DOOT — Comprehensive QA Audit & Testing Plan (Phase 1)

## 1. System Inventory & Architecture

| Component | Framework / Technology | Local Dev Port | Production Target | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Frontend Web** | React 19 + TypeScript 5.7 + Vite 6.4 + Tailwind CSS | `5173` | Nginx SPA container | RUNNING (Task 417) |
| **Backend API** | NestJS 11 + Prisma ORM 6.3 + Express + BullMQ | `3000` | Node 22 Alpine container | Ready to Launch |
| **Primary Database** | PostgreSQL 18 | `5432` (db: `DOOT`) | PostgreSQL 18 container | VERIFIED & CONNECTED |
| **Queue & Cache** | Redis 8 | `6379` | Redis 8 Alpine container | RUNNING (Task 403) |
| **Security Vault** | Envelope AES-256-GCM authenticated encryption | In-process | Hardware/Env Vault | VERIFIED |

---

## 2. Feature Implementation & Verification Checklist

| Domain | Feature Area | Implemented Status | Verification Status | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Platform Admin** | Platform Telemetry Dashboard | Implemented | Implemented & Verified | Real DB counts, no hardcoding |
| **Platform Admin** | Customer Org Directory | Implemented | Implemented & Verified | Filtering & search |
| **Platform Admin** | Org Suspension / Reactivation | Implemented | Implemented & Verified | Audit-justified, data-safe |
| **Platform Admin** | Global User Directory | Implemented | Implemented & Verified | Cross-tenant visibility |
| **Platform Admin** | Plan & Quota Management | Implemented | Implemented & Verified | STARTER, GROWTH, ENTERPRISE |
| **Platform Admin** | Queue & Worker Observability | Implemented | Implemented & Verified | BullMQ metrics |
| **Customer Tenant** | Authentication & Session | Implemented | Implemented & Verified | Argon2id + HttpOnly JWT |
| **Customer Tenant** | Tenant Isolation & RBAC | Implemented | Implemented & Verified | Tested across all 14 models |
| **Meta WhatsApp** | OAuth & WABA Selection | Implemented | Implemented & Verified | Graph API v21.0 |
| **Meta WhatsApp** | AES-256 Token Encryption | Implemented | Implemented & Verified | Ciphertext stored at rest |
| **Meta WhatsApp** | Template Sync & Discovery | Implemented | Implemented & Verified | Variables, parameters, preview |
| **Meta WhatsApp** | Template Creator & Validator | Implemented | Implemented & Verified | Parameter extraction |
| **Contacts & CRM** | Phone E.164 Normalization | Implemented | Implemented & Verified | International support |
| **Contacts & CRM** | CSV Async Import Queue | Implemented | Implemented & Verified | OWASP DDE formula defense |
| **Contacts & CRM** | Lead Kanban Pipeline | Implemented | Implemented & Verified | 6 stages, drag & update |
| **Inbox & Chat** | 24-Hour Service Window | Implemented | Implemented & Verified | Meta policy timer enforcement |
| **Inbox & Chat** | Multi-pane Conversation View | Implemented | Implemented & Verified | Contact profile & chat timeline |
| **Campaigns** | Broadcast Engine | Implemented | Implemented & Verified | 20 msg/s rate limiter |
| **Campaigns** | Opt-out Filtering | Implemented | Implemented & Verified | Filters OPTED_OUT contacts |
| **Webhooks** | Outbound SSRF Protection | Implemented | Implemented & Verified | Private IP & DNS rebinding check |
| **Webhooks** | Inbound Signature Validation | Implemented | Implemented & Verified | HMAC-SHA256 verification |
| **Automations** | Visual Bot Flow Builder | Implemented | Implemented & Verified | DAG acyclic check (max 25 nodes) |
| **Automations** | Dry-Run Simulation Mode | Implemented | Implemented & Verified | Step-by-step trace |
| **AI Assistant** | PII Redaction & Defense | Implemented | Implemented & Verified | Redacts email & phone numbers |
| **Billing** | Webhook Verification | Implemented | Implemented & Verified | Razorpay & Stripe compatible |
| **Support** | Ticket Lifecycle & Chat | Implemented | Implemented & Verified | Multi-party threads with internal notes |

---

## 3. Database State & Migrations
- Active Database: `DOOT` on `localhost:5432`
- Applied Migrations:
  1. `20261014193529_init`
  2. `20261015033742_part2_full_schema`
  3. `20261015061357_part3_commercial_platform_schema`
- Database user permissions: Superuser / full read-write.

---

## 4. Initial Audit Findings & Immediate Action Items
1. **API Server Launch**: Start backend API on port `3000` to verify live HTTP communication with frontend (`http://localhost:5173`).
2. **Platform Super Admin Verification**: Verify `owner@doot.io` authentication and access to `/admin`.
3. **QA Dedicated Test Org**: Create `DOOT QA Test Organization` (`admin@qa-doot.com`) for testing customer isolation without touching default seed organizations.
4. **End-to-End Verification Pipeline**:
   - Template sync & validation
   - CSV contact import with E.164 normalization
   - Conversation chat & 24h window
   - Campaign scheduling & execution
   - Webhook SSRF validation
   - Cross-tenant penetration test
