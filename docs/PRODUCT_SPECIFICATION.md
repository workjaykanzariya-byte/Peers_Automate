# DOOT — Master Product Specification

> **Document Status:** Baseline Active Specification (Phase 1)  
> **Date:** October 2026  
> **Authors:** Principal SaaS Architect & DOOT Engineering Team  
> **Reference Notice:** The external research PDF was not present in the repository at initialization; this document synthesizes requirements directly from the Master Project Brief, verified functional module descriptions, Meta WhatsApp Business Platform API specifications, and enterprise multi-tenant SaaS standards.

---

## 1. Executive Summary & Vision

**DOOT** is an independent, multi-tenant enterprise Software-as-a-Service (SaaS) platform providing businesses with end-to-end management of WhatsApp customer communication, lead generation, contacts, approved message templates, broadcast campaigns, chatbot automations, and unified agent inboxes.

### Primary Objectives
- **Full Technology Independence:** Complete ownership of source code, database, business logic, integrations, and user experience, with zero reliance on private Reshobrand/FlexiMSG APIs or ongoing third-party subscriptions.
- **Strict Multi-Tenancy:** Multi-tenant architecture serving independent client organizations with complete cryptographic and logical isolation of customer data, contacts, chat histories, and integration credentials.
- **Meta Platform Compliance:** Native integration with the official Meta WhatsApp Business Platform (Cloud API), adhering strictly to official webhook standards, template categories, messaging rate limits, tier quality policies, and security guidelines.
- **Modern User Experience:** Fast, responsive, accessible React-based web interface with rich visual aesthetics, dark/light themes, actionable empty/error states, and real-time operational feedback.

---

## 2. Multi-Tenant Architecture & Roles

### 2.1 Workspace & Organization Isolation
- **Organization (Tenant):** The top-level administrative boundary. Every customer business operates within its own Organization workspace.
- **Organization Membership:** Users belong to one or more organizations through explicit membership records with assigned roles.
- **Platform Administration:** Platform owners maintain a distinct super-administrative plane completely isolated from customer tenant operations for tenant lifecycle management, plan definitions, global security audits, and system health.

### 2.2 Roles & Permissions Matrix
| Role | Organization Scope | Capabilities |
| :--- | :--- | :--- |
| **Organization Owner** | Organization | Full administrative control, billing, API credential management, workspace deletion, member management, all messaging/campaign features. |
| **Organization Admin** | Organization | Member management, Meta account connections, template submissions, campaign execution, webhooks, contact imports. (Cannot transfer org ownership or delete organization). |
| **Manager** | Organization | Campaign creation, template authoring, contact & lead assignments, bot flow management, analytics viewing. |
| **Agent / Support** | Organization | Inbox chat management, reading and replying to assigned conversations, contact tagging, note addition. Cannot view credentials or manage billing. |
| **Read-Only Analyst** | Organization | Read-only access to dashboard statistics, campaign logs, and analytics reports. |
| **Platform Super Admin**| System Wide | Manage tenant organizations, global system health, platform-wide metrics, subscription tier defaults. No access to customer private message content without explicit tenant audit consent. |

---

## 3. Detailed Functional Modules

### Module A: Dashboard & Analytics
- **Context & Greeting:** Dynamic greeting personalized with user name and active organization branding.
- **Subscription & Quota Summary:** Current plan tier, monthly active contacts used vs. plan quota, campaign message credits, and renewal dates.
- **Real-Time Key Performance Indicators:**
  - Total Contacts & Active Leads
  - Approved WhatsApp Templates vs. In-Review
  - Active Broadcast Campaigns & Today's Dispatch Volume
  - Open Conversations & Average Agent First-Response Time
  - Webhook Delivery Success Rate (%)
- **Integrity Rule:** Zero hardcoded mock figures. All statistics are aggregated dynamically from database models and provider sync tables, with responsive skeleton loaders, empty states, and retryable error cards.

### Module B: WhatsApp Connection & Asset Management
- **Connection Handshake:** OAuth-based Embedded Signup workflow for connecting customer Meta Business Accounts (WABA) or authenticated configuration of authorized WABA credentials.
- **Asset Overview:**
  - Display verified Business Name, Verified WhatsApp Phone Number, and Phone Number ID.
  - Quality Rating (GREEN, YELLOW, RED) and Messaging Tier Limit (Tier 250, Tier 1K, Tier 10K, Tier 100K, Unlimited).
  - Status indicators (Connected, Degraded, Expired, Revoked).
- **Interactive Verification & Diagnostics:**
  - One-click "Send Test Message" diagnostic utility to verify outbound Cloud API connectivity and verify recipient receipt.
  - Granular credential rotation and safe disconnection workflows that preserve conversation and contact history.

### Module C: Omnichannel Inbox & Real-Time Chat
- **Conversation Directory:** Filterable by status (Open, Pending, Resolved), assigned agent, tags, and unread status. Real-time message preview and search by contact phone or name.
- **Message Stream:**
  - Chronological message history with micro-timestamps and delivery status indicators (Clock/Sending, Single Check/Sent, Double Check/Delivered, Blue Check/Read, Warning/Failed with error reason).
  - Support for inbound and outbound text, media (images, documents, audio, video), interactive reply buttons, and list messages.
  - Customer Service Window countdown indicator (24-hour customer care window status).
- **Contact & Lead Context Drawer:**
  - Immediate sidebar view of contact details, lead stage, lead score, assigned agent, custom fields, and internal team notes.
- **Outbound Message Composer:**
  - Free-form text input enabled during active 24-hour service window.
  - Approved Template Selector when outside the 24-hour window, with dynamic variable input fields and preview before sending.

### Module D: Bot Flow & Automation Engine
- **Visual / Node-Based Flow Builder:** Intuitive visual flow editor allowing drag-and-drop or step-by-step composition of automation rules.
- **Trigger Types:**
  - Inbound Message Received (Keyword match, Regex, Exact text, Default fallback)
  - New Contact Created or Tag Added
  - Inbound Webhook Event from external CRM
- **Action Nodes:**
  - Send Interactive WhatsApp Message (Text, Buttons, List)
  - Condition Evaluation (Branch based on contact attributes, message content, time of day)
  - Assign Conversation to Agent or Team
  - Update Contact Tag or Lead Status
  - Execute Outbound Webhook to third-party endpoint
- **Execution & Audit Trail:** Step-by-step execution log recording trigger time, path traversed, payload, and error diagnostics for troubleshooting.

### Module E: Contacts, Directory & Import Pipeline
- **Contact Directory:** High-performance tabular view supporting sorting, search, column customization, tag filtering, and pagination.
- **Custom Attributes & Grouping:** Flexible contact attributes, static Groups (e.g., "VIP Customers", "Webinar Attendees"), and dynamic segmentation.
- **Bulk CSV Import Engine:**
  - Multi-step wizard: Upload CSV -> Interactive Column Mapping -> Validation Preview -> Background Processing.
  - Phone Number Normalization to E.164 standard (automatic country code handling).
  - Duplicate Resolution Policies: Skip existing, Overwrite existing with CSV data, or Merge tags and groups.
  - Batch audit logs tracking total rows, valid rows imported, invalid rows rejected, with downloadable CSV error report detailing per-row validation failures.

### Module F: Webhooks & Outbound Integrations
- **Outbound Webhook Dispatcher:** Configure endpoints to notify external systems (CRM, ERP, analytics) of events:
  - `message.received`, `message.delivered`, `message.read`, `message.failed`
  - `contact.created`, `contact.updated`
  - `campaign.completed`
- **Security & Delivery Reliability:**
  - HMAC SHA-256 signature verification headers sent with all outgoing webhooks.
  - Comprehensive Server-Side Request Forgery (SSRF) protection blocking loopback (`127.0.0.1`), private RFC1918 ranges, link-local addresses, and cloud metadata endpoints (`169.254.169.254`).
  - Exponential backoff retry policy for transient HTTP 5xx responses.
  - Webhook delivery history log with HTTP status code, request headers, payload snippet, execution duration, and manual replay capability.

### Module G: WhatsApp Template Management
- **Bi-Directional Synchronization:** Synchronize approved, pending, and rejected templates directly from the Meta WhatsApp Business Account via Cloud API.
- **Template Schema Support:**
  - Categories: `MARKETING`, `UTILITY`, `AUTHENTICATION`
  - Components: `HEADER` (Text, Image, Video, Document), `BODY` (with `{{1}}`, `{{2}}` positional parameters), `FOOTER`, `BUTTONS` (`QUICK_REPLY`, `URL`, `PHONE_NUMBER`, `COPY_CODE`).
  - Languages: Multi-language template support with locale codes (e.g., `en_US`, `es_ES`, `hi_IN`).
- **Template Authoring & Submission:** In-app template creation form submitting directly to Meta API, providing real-time guidance on Meta policy adherence and explicit warnings that templates require Meta approval before broadcast use.

### Module H: Bulk Broadcast Campaigns
- **Campaign Wizard:**
  1. *Basics:* Campaign Title, Outbound Channel (Connected Phone Number).
  2. *Message:* Select Approved Template, select Language, fill variable parameters (static text or contact field tokens).
  3. *Audience:* Target by Tags, Contact Groups, Filter Conditions, or validated CSV upload.
  4. *Safety & Scheduling:* Real-time recipient count, tier limit check, scheduled send date/time or immediate dispatch, rate limiting controls (messages per second).
- **Execution State Machine:**
  `DRAFT` -> `SCHEDULED` -> `QUEUED` -> `PROCESSING` -> `COMPLETED` / `PARTIALLY_FAILED` / `FAILED` / `CANCELLED`.
- **Campaign Analytics:**
  - Real-time progress bars: Messages Total, Dispatched, Delivered, Read, Failed.
  - Exportable recipient-level delivery log with failure error codes from Meta (e.g., `#131026: Message undeliverable`).

---

## 4. Non-Functional Requirements

1. **Security & Cryptography:** Zero plaintext storage of Meta API tokens or secrets. Cryptographic encryption at rest with AES-256-GCM using keys held in isolated environment variables.
2. **Performance & Concurrency:** Async queue processing via Redis and BullMQ ensuring web API remains responsive (< 100ms response time for standard endpoints) under heavy campaign dispatch loads.
3. **Data Integrity & Consistency:** PostgreSQL relational database with foreign key constraints, tenant isolation enforcement on every query, and atomic transactions.
4. **Reliability & Idempotency:** Webhook ingestion and queue consumers built with idempotent deduplication keys to prevent double-messaging.
