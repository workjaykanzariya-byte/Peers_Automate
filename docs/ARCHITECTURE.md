# DOOT — Technical Architecture

> **System:** DOOT Multi-Tenant WhatsApp SaaS  
> **Status:** Active Technical Blueprint (Phase 1 Foundation)  
> **Target Release:** v1.0.0

---

## 1. Architectural Philosophy & Principles

DOOT is engineered as a **modular monolith** with decoupled asynchronous workers. This architecture delivers:
1. **Strong Domain Boundaries:** Clean NestJS modules with explicit interfaces, encapsulated domain entities, and decoupled business logic.
2. **Zero Inappropriate Microservices:** A single coherent codebase avoids distributed transactions, network latency overhead, and complex service orchestration during the growth phase, while maintaining strict module boundaries ready for microservice extraction if ever required.
3. **Strict Multi-Tenancy:** Zero data leakage between organizations. Every request is authenticated, bound to a validated organization membership, and scoped to the organization ID at the database layer.
4. **Resilient Asynchronous Processing:** Long-running I/O (campaign broadcasts, CSV parsing, webhook dispatch, template synchronization) is offloaded to Redis-backed BullMQ queues with idempotency keys, exponential backoff, and dead-letter visibility.

```
                      +---------------------------------------+
                      |        React 19 + TypeScript          |
                      |       (Vite, Tailwind, TanStack)      |
                      +---------------------------------------+
                                          |
                                    HTTPS / WSS
                                          |
                                          v
                      +---------------------------------------+
                      |         NestJS API Gateway            |
                      |        (/api/v1 - REST API)           |
                      |  +---------------------------------+  |
                      |  | TenantGuard & AuthMiddleware    |  |
                      |  +---------------------------------+  |
                      +---------------------------------------+
                           |              |             |
           +---------------+              |             +---------------+
           |                              |                             |
           v                              v                             v
+---------------------+        +--------------------+        +---------------------+
| PostgreSQL (DOOT)   |        |   Redis 8 Engine   |        | BullMQ Workers      |
|  - Prisma ORM       |        |  - Cache & Lock    |        |  - Campaign Worker  |
|  - Tenant Scoped    |        |  - Message Queues  |=======>|  - Import Worker    |
|  - Encrypted Creds  |        +--------------------+        |  - Webhook Worker   |
+---------------------+                                      |  - Meta Sync Worker |
                                                             +---------------------+
                                                                        |
                                                                        v
                                                             +---------------------+
                                                             | Meta Cloud API      |
                                                             | (WhatsApp Platform) |
                                                             +---------------------+
```

---

## 2. Monorepo Repository Structure

The codebase is organized in an enterprise monorepo using npm workspaces:

```
DOOT/
├── apps/
│   ├── api/                    # NestJS REST API application
│   │   ├── src/
│   │   │   ├── common/         # Global guards, filters, interceptors, decorators
│   │   │   ├── config/         # Environment & validation schema
│   │   │   ├── database/       # Prisma client service & connection manager
│   │   │   ├── security/       # AES-256-GCM encryption & credential service
│   │   │   └── modules/        # Domain modules (Auth, Orgs, Contacts, etc.)
│   │   ├── prisma/             # Schema, migrations, and seed scripts
│   │   └── test/               # Integration and E2E test suites
│   ├── web/                    # React 19 + Vite frontend application
│   │   ├── src/
│   │   │   ├── components/     # UI design system (buttons, modals, tables, badges)
│   │   │   ├── layouts/        # Shell, sidebar, header, org switcher
│   │   │   ├── pages/          # Auth, dashboard, contacts, templates, inbox, etc.
│   │   │   ├── hooks/          # TanStack query hooks & auth state
│   │   │   └── services/       # Typed HTTP API client
│   │   └── public/
│   └── worker/                 # BullMQ asynchronous queue worker processes
│       └── src/
│           ├── processors/     # Campaign, webhook, import, template processors
│           └── queues/         # Queue definitions and rate limit configs
├── packages/
│   ├── shared/                 # Shared TypeScript interfaces, DTOs, Zod schemas
│   └── config/                 # Shared linting, formatting, TSConfigs
├── docs/                       # Architecture, security, DB design, specs
├── .env.example
├── package.json
└── README.md
```

---

## 3. Backend Modular Architecture (NestJS)

Every domain feature is isolated in a NestJS module with dedicated controllers, services, DTOs, and repositories:

1. **`AuthModule`:** Argon2id hashing, secure HttpOnly cookie session management, password resets, registration, login, logout.
2. **`OrganizationsModule`:** Tenant lifecycle, organization creation, settings, profile, and workspace switching.
3. **`MembershipsModule`:** Tenant membership, user invites, role assignments, seat allocations.
4. **`UsersModule`:** User profiles, avatar updates, notification preferences, credential rotation.
5. **`RolesPermissionsModule`:** Granular RBAC definitions, role hierarchy, permission checks (`can(Action, Resource)`).
6. **`SecurityModule`:** AES-256-GCM encryption service with envelope encryption, masked secrets display, audit trails.
7. **`MetaIntegrationModule`:** Official Meta Cloud API client, token exchange, Webhook signature verification (`X-Hub-Signature-256`).
8. **`WhatsAppAccountsModule` & `PhoneNumbersModule`:** Multi-WABA and phone asset management, quality monitoring, messaging tiers.
9. **`TemplatesModule`:** Template sync, variable mapping, message component authoring, Meta submission pipeline.
10. **`ContactsModule` & `ContactImportsModule`:** Directory, E.164 normalization, tags, groups, chunked CSV import queue.
11. **`LeadsModule`:** Lead stages, pipelines, source attribution, team assignment workflows.
12. **`ConversationsModule` & `MessagesModule`:** Real-time chat stream, 24h window calculation, template outbound dispatch.
13. **`CampaignsModule`:** Broadcast wizard, recipient filtering, rate-limited dispatch scheduler, live delivery metrics.
14. **`WebhooksModule`:** Inbound Meta webhook processor and outbound subscriber dispatcher with SSRF guard.
15. **`AutomationModule`:** Bot flow executor, keyword routing, interactive button response workflows.
16. **`UsageModule` & `BillingModule`:** Tenant quota tracking, message counters, contact tier tracking.
17. **`AuditLogsModule`:** Immutable security audit logging for all tenant administrative and credential actions.
18. **`HealthModule`:** Liveness/readiness probes for Postgres, Redis, and disk storage.

---

## 4. Multi-Tenant Request Lifecycle

```
[ Incoming HTTP Request ]
          │
          ▼
┌────────────────────────┐
│   CorrelationIdFilter  │  Generates or extracts `X-Correlation-Id` for tracing
└─────────┬──────────────┘
          │
          ▼
┌────────────────────────┐
│       JwtAuthGuard     │  Validates HttpOnly JWT cookie; attaches `req.user`
└─────────┬──────────────┘
          │
          ▼
┌────────────────────────┐
│     TenantContextGuard │  Extracts `X-Tenant-Id` header or user's active org;
│                        │  validates membership in database; verifies status
└─────────┬──────────────┘
          │
          ▼
┌────────────────────────┐
│    PermissionsGuard    │  Checks `@RequirePermission(action, resource)`
└─────────┬──────────────┘
          │
          ▼
┌────────────────────────┐
│       Controller       │  Calls service passing `TenantContext(organizationId)`
└─────────┬──────────────┘
          │
          ▼
┌────────────────────────┐
│   Tenant-Scoped Query  │  `prisma.contact.findMany({ where: { organizationId } })`
└────────────────────────┘
```

---

## 5. Asynchronous Architecture & Queue Topology

BullMQ queues managed via Redis:

| Queue Name | Concurrency | Retry Strategy | Purpose |
| :--- | :--- | :--- | :--- |
| `campaign-dispatch` | Tenant-rate-limited | Exp backoff (3 attempts) | Bulk template dispatch via Meta API with per-second rate limit. |
| `contact-import` | 2 concurrent | Exp backoff (2 attempts) | Streaming chunked CSV parsing, phone normalization, validation. |
| `webhook-outbound` | 10 concurrent | Exp backoff (5 attempts) | Delivering tenant webhook notifications with SSRF validation. |
| `template-sync` | 3 concurrent | Exp backoff (3 attempts) | Background sync of approved templates from Meta Cloud API. |
| `message-status` | 20 concurrent | Exp backoff (3 attempts) | Processing inbound Meta delivery status receipts (sent/delivered/read). |
| `bot-flow-execution`| 10 concurrent | Exp backoff (2 attempts) | Executing automated trigger and action graph sequences. |

---

## 6. Frontend Architectural Baseline

- **Framework:** React 19 with TypeScript in strict mode.
- **Build Tool:** Vite with optimized code splitting and dynamic imports.
- **Styling:** Vanilla Tailwind CSS with design tokens for dark/light themes, sleek borders, subtle gradients, and micro-interactions.
- **Server State:** TanStack React Query for caching, optimistic mutations, and window focus revalidation.
- **Form System:** React Hook Form coupled with Zod schema resolvers for client-side and server-side validation alignment.
- **Component Design System:** Reusable, accessible primitives:
  - App Shell with responsive Collapsible Sidebar, Breadcrumbs, Tenant Switcher, User Menu.
  - Data Tables with sorting, search, column filters, and pagination.
  - Action Modals, Slide-over Drawers, and Confirm Dialogs.
  - Status Badges, Progress Bars, Stat Cards, and Dynamic Toasts.
