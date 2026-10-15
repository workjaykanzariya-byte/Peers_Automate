# DOOT — PostgreSQL Database Design & Schema Architecture

> **Database:** PostgreSQL 18  
> **Schema Strategy:** Normalized Relational Models with Targeted JSONB & Prisma ORM Migrations  
> **Target Database:** `DOOT` on port 5432  
> **Primary Isolation Key:** `organization_id` (UUID)

---

## 1. Design Principles

1. **Strict Relational Integrity:** Core operational records (Organizations, Users, Memberships, Contacts, Messages, Templates, Campaigns) use normalized relational structures with foreign keys, cascading rules, and check constraints.
2. **Targeted JSONB Usage:** JSONB is restricted strictly to variable payload definitions where external APIs require elasticity:
   - `custom_fields`: Tenant-defined contact custom properties.
   - `components`: Meta WhatsApp Template dynamic components (Header, Body parameters, Buttons).
   - `trigger_config` & `steps`: Bot Flow definition nodes.
   - `request_payload`: Webhook delivery telemetry.
3. **UTC Timestamps:** All datetime columns (`created_at`, `updated_at`, `sent_at`, `expires_at`) are stored in `TIMESTAMPTZ` (UTC). Timezone presentation is handled client-side per user/tenant preference.
4. **Tenant Isolation Indexes:** Every query filtering by `organization_id` is supported by composite indexes to eliminate table scans in high-concurrency environments.

---

## 2. Core Relational ER Diagram

```
+----------------+          +--------------------+          +----------------+
|  Organization  |1       N |     Membership     | N       1|      User      |
|----------------|<---------|--------------------|--------->|----------------|
| id (PK, UUID)  |          | organization_id(FK)|          | id (PK, UUID)  |
| name           |          | user_id (FK)       |          | email (UNIQUE) |
| plan_tier      |          | role (ENUM)        |          | password_hash  |
+----------------+          +--------------------+          +----------------+
        | 1                         | 1                             | 1
        |                           |                               |
        +---------------+           |                               |
        | N             | N         |                               |
        v               v           v                               v
+----------------+  +----------------+  +----------------+  +----------------+
|MetaIntegration |  |    Contact     |  |  AuditLog      |  | RefreshSession |
|----------------|  |----------------|  |----------------|  |----------------|
| id (PK)        |  | id (PK)        |  | id (PK)        |  | id (PK)        |
| organization_id|  | organization_id|  | organization_id|  | user_id (FK)   |
| enc_token (GCM)|  | phone          |  | user_id (FK)   |  | token_hash     |
+----------------+  +----------------+  +----------------+  +----------------+
        | 1                 | 1
        v N                 v 1
+----------------+  +----------------+
|  PhoneNumber   |  |  Conversation  |
|----------------|  |----------------|
| id (PK)        |  | id (PK)        |
| phone_number_id|  | contact_id (FK)|
| quality_rating |  | status         |
+----------------+  +----------------+
        |                   | 1
        v                   v N
+----------------+  +----------------+
|    Campaign    |  |    Message     |
|----------------|  |----------------|
| id (PK)        |  | id (PK)        |
| template_id    |  | conversation_id|
| status         |  | direction      |
+----------------+  | status         |
                    +----------------+
```

---

## 3. Entity Definitions & Specifications

### 3.1 Identity & Multi-Tenant Access
- **`organizations`**: Top-level tenant container.
  - `id`: UUID Primary Key
  - `name`: VARCHAR(255)
  - `slug`: VARCHAR(100) UNIQUE (URL friendly tenant identifier)
  - `plan_tier`: VARCHAR(50) DEFAULT 'STARTER' (e.g., STARTER, GROWTH, ENTERPRISE)
  - `status`: ENUM ('ACTIVE', 'SUSPENDED', 'CANCELLED')
  - `timezone`: VARCHAR(50) DEFAULT 'UTC'
  - `settings`: JSONB (branding, feature flags, alert recipients)
  - `created_at`, `updated_at`: TIMESTAMPTZ

- **`users`**: System users (can belong to multiple organizations).
  - `id`: UUID Primary Key
  - `email`: VARCHAR(255) UNIQUE NOT NULL
  - `password_hash`: VARCHAR(255) NOT NULL (Argon2id)
  - `first_name`: VARCHAR(100)
  - `last_name`: VARCHAR(100)
  - `phone`: VARCHAR(50)
  - `avatar_url`: TEXT
  - `is_active`: BOOLEAN DEFAULT true
  - `is_platform_admin`: BOOLEAN DEFAULT false
  - `created_at`, `updated_at`: TIMESTAMPTZ

- **`memberships`**: Association between User and Organization with RBAC.
  - `id`: UUID Primary Key
  - `organization_id`: UUID FK -> `organizations(id)` ON DELETE CASCADE
  - `user_id`: UUID FK -> `users(id)` ON DELETE CASCADE
  - `role`: ENUM ('OWNER', 'ADMIN', 'MANAGER', 'AGENT', 'ANALYST')
  - `is_active`: BOOLEAN DEFAULT true
  - *Indexes:* `UNIQUE(organization_id, user_id)`

- **`refresh_sessions`**: User sessions / refresh tokens.
  - `id`: UUID Primary Key
  - `user_id`: UUID FK -> `users(id)` ON DELETE CASCADE
  - `token_hash`: VARCHAR(255) UNIQUE NOT NULL
  - `user_agent`: TEXT
  - `ip_address`: VARCHAR(45)
  - `expires_at`: TIMESTAMPTZ NOT NULL
  - `revoked_at`: TIMESTAMPTZ

### 3.2 Meta & WhatsApp Assets
- **`meta_integrations`**: Connected Meta Business Accounts.
  - `id`: UUID Primary Key
  - `organization_id`: UUID FK -> `organizations(id)` ON DELETE CASCADE
  - `meta_business_id`: VARCHAR(100) NOT NULL
  - `waba_id`: VARCHAR(100) NOT NULL (WhatsApp Business Account ID)
  - `name`: VARCHAR(255) NOT NULL
  - `encrypted_access_token`: TEXT NOT NULL (AES-256-GCM ciphertext)
  - `token_key_version`: VARCHAR(10) NOT NULL DEFAULT 'v1'
  - `token_expires_at`: TIMESTAMPTZ
  - `webhook_verify_token`: VARCHAR(255) NOT NULL
  - `status`: ENUM ('CONNECTED', 'EXPIRED', 'REVOKED', 'ERROR')
  - *Indexes:* `INDEX(organization_id)`

- **`phone_numbers`**: WhatsApp Phone Numbers under connected WABA.
  - `id`: UUID Primary Key
  - `organization_id`: UUID FK -> `organizations(id)` ON DELETE CASCADE
  - `meta_integration_id`: UUID FK -> `meta_integrations(id)` ON DELETE CASCADE
  - `phone_number_id`: VARCHAR(100) NOT NULL UNIQUE (Meta Phone ID)
  - `display_phone_number`: VARCHAR(50) NOT NULL
  - `verified_name`: VARCHAR(255)
  - `quality_rating`: ENUM ('GREEN', 'YELLOW', 'RED', 'UNKNOWN') DEFAULT 'UNKNOWN'
  - `messaging_limit_tier`: VARCHAR(50) DEFAULT 'TIER_250'
  - `status`: ENUM ('CONNECTED', 'PENDING', 'FLAGGED', 'RESTRICTED') DEFAULT 'CONNECTED'
  - `is_default`: BOOLEAN DEFAULT false
  - *Indexes:* `INDEX(organization_id, is_default)`

### 3.3 Contacts, Leads & Grouping
- **`contacts`**: Customer directory.
  - `id`: UUID Primary Key
  - `organization_id`: UUID FK -> `organizations(id)` ON DELETE CASCADE
  - `phone`: VARCHAR(50) NOT NULL (E.164 normalized)
  - `first_name`: VARCHAR(100)
  - `last_name`: VARCHAR(100)
  - `email`: VARCHAR(255)
  - `lead_status`: ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST') DEFAULT 'NEW'
  - `lead_source`: VARCHAR(100)
  - `assigned_to_user_id`: UUID FK -> `users(id)` ON DELETE SET NULL
  - `custom_fields`: JSONB DEFAULT '{}'
  - `is_blocked`: BOOLEAN DEFAULT false
  - *Indexes:* `UNIQUE(organization_id, phone)`, `INDEX(organization_id, lead_status)`

- **`tags`** & **`contact_tags`**: Tagging taxonomy.
  - `tags`: `id`, `organization_id`, `name`, `color`
  - `contact_tags`: `contact_id`, `tag_id`

- **`contact_groups`** & **`contact_group_members`**: Static audience lists.
  - `contact_groups`: `id`, `organization_id`, `name`, `description`
  - `contact_group_members`: `group_id`, `contact_id`

### 3.4 Templates, Conversations & Messaging
- **`whatsapp_templates`**: Approved message templates synced with Meta.
  - `id`: UUID Primary Key
  - `organization_id`: UUID FK -> `organizations(id)` ON DELETE CASCADE
  - `meta_integration_id`: UUID FK -> `meta_integrations(id)` ON DELETE CASCADE
  - `meta_template_id`: VARCHAR(100) NOT NULL
  - `name`: VARCHAR(255) NOT NULL
  - `language`: VARCHAR(20) NOT NULL
  - `category`: ENUM ('MARKETING', 'UTILITY', 'AUTHENTICATION') NOT NULL
  - `status`: ENUM ('APPROVED', 'PENDING', 'REJECTED', 'PAUSED', 'DISABLED') NOT NULL
  - `components`: JSONB NOT NULL
  - *Indexes:* `UNIQUE(organization_id, name, language)`

- **`conversations`**: Chat thread between organization and a contact.
  - `id`: UUID Primary Key
  - `organization_id`: UUID FK -> `organizations(id)` ON DELETE CASCADE
  - `contact_id`: UUID FK -> `contacts(id)` ON DELETE CASCADE
  - `phone_number_id`: UUID FK -> `phone_numbers(id)` ON DELETE RESTRICT
  - `assigned_user_id`: UUID FK -> `users(id)` ON DELETE SET NULL
  - `status`: ENUM ('OPEN', 'PENDING', 'RESOLVED') DEFAULT 'OPEN'
  - `last_message_at`: TIMESTAMPTZ DEFAULT NOW()
  - `window_expires_at`: TIMESTAMPTZ (24h customer service window expiry)
  - `unread_count`: INT DEFAULT 0
  - *Indexes:* `INDEX(organization_id, status, last_message_at)`

- **`messages`**: Individual WhatsApp messages in a conversation.
  - `id`: UUID Primary Key
  - `organization_id`: UUID FK -> `organizations(id)` ON DELETE CASCADE
  - `conversation_id`: UUID FK -> `conversations(id)` ON DELETE CASCADE
  - `meta_message_id`: VARCHAR(255) UNIQUE
  - `direction`: ENUM ('INBOUND', 'OUTBOUND') NOT NULL
  - `type`: ENUM ('TEXT', 'IMAGE', 'DOCUMENT', 'AUDIO', 'VIDEO', 'TEMPLATE', 'INTERACTIVE', 'LOCATION') NOT NULL
  - `body`: TEXT
  - `media_url`: TEXT
  - `media_type`: VARCHAR(100)
  - `status`: ENUM ('SENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED') NOT NULL
  - `error_code`: VARCHAR(50)
  - `error_message`: TEXT
  - `sent_at`, `delivered_at`, `read_at`: TIMESTAMPTZ
  - *Indexes:* `INDEX(conversation_id, created_at)`, `INDEX(meta_message_id)`

### 3.5 Broadcast Campaigns
- **`campaigns`**: Bulk WhatsApp broadcast dispatch definitions.
  - `id`: UUID Primary Key
  - `organization_id`: UUID FK -> `organizations(id)` ON DELETE CASCADE
  - `phone_number_id`: UUID FK -> `phone_numbers(id)` ON DELETE RESTRICT
  - `template_id`: UUID FK -> `whatsapp_templates(id)` ON DELETE RESTRICT
  - `name`: VARCHAR(255) NOT NULL
  - `status`: ENUM ('DRAFT', 'SCHEDULED', 'QUEUED', 'PROCESSING', 'COMPLETED', 'PARTIALLY_FAILED', 'FAILED', 'CANCELLED') DEFAULT 'DRAFT'
  - `total_recipients`: INT DEFAULT 0
  - `sent_count`, `delivered_count`, `read_count`, `failed_count`: INT DEFAULT 0
  - `scheduled_at`, `started_at`, `completed_at`: TIMESTAMPTZ
  - *Indexes:* `INDEX(organization_id, status)`

- **`campaign_recipients`**: Target recipients and delivery tracking.
  - `id`: UUID Primary Key
  - `campaign_id`: UUID FK -> `campaigns(id)` ON DELETE CASCADE
  - `contact_id`: UUID FK -> `contacts(id)` ON DELETE SET NULL
  - `phone`: VARCHAR(50) NOT NULL
  - `template_parameters`: JSONB DEFAULT '[]'
  - `status`: ENUM ('PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED') DEFAULT 'PENDING'
  - `meta_message_id`: VARCHAR(255)
  - `error_message`: TEXT
  - `sent_at`: TIMESTAMPTZ
  - *Indexes:* `INDEX(campaign_id, status)`

### 3.6 Webhooks, Automations & Audits
- **`webhook_endpoints`**: Outbound tenant webhooks.
  - `id`, `organization_id`, `url`, `secret`, `events` (TEXT[]), `is_active`
- **`webhook_delivery_logs`**: Outbound delivery logs.
  - `id`, `organization_id`, `webhook_endpoint_id`, `event`, `request_payload`, `response_status`, `response_body`, `duration_ms`
- **`automation_flows`**: Bot flow definitions.
  - `id`, `organization_id`, `name`, `trigger_type`, `trigger_config`, `steps`, `is_active`, `execution_count`
- **`contact_imports`**: Batch CSV import records.
  - `id`, `organization_id`, `filename`, `total_rows`, `imported_rows`, `failed_rows`, `status`, `error_report`
- **`audit_logs`**: Immutable security audit trail.
  - `id`, `organization_id`, `user_id`, `action`, `resource`, `resource_id`, `metadata`, `ip_address`, `user_agent`, `created_at`
