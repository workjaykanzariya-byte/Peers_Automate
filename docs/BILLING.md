# DOOT — Commercial SaaS Billing & Subscription Architecture

## 1. Overview
DOOT implements a centralized multi-tenant subscription and usage metering model. Each customer organization is bound to a `Subscription` associated with a commercial `Plan`. Entitlements and usage limits are enforced at the backend service layer before executing operations (messaging, campaign dispatch, contact imports, or team invitations).

---

## 2. Subscription Plans & Entitlements

| Plan Tier | Monthly Price | Annual Price | Max Contacts | Monthly Messages | Connected Numbers | Team Members | Visual Bot Flow | AI Assistant |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **STARTER** | $29 | $290 | 1,000 | 2,500 | 1 | 2 | No | No |
| **GROWTH** | $79 | $790 | 10,000 | 25,000 | 3 | 10 | Yes | Yes |
| **ENTERPRISE** | $199 | $1,990 | Unlimited (100k) | Unlimited (250k) | 10 | Unlimited (50) | Yes | Yes |

### Plan Statuses
- `TRIAL`: 14-day free trial on Starter plan tier without credit card requirement.
- `ACTIVE`: Paid active subscription in good standing.
- `PAST_DUE`: Payment renewal failed; entering a 3-day grace period.
- `CANCELLED`: Subscription scheduled to terminate at `currentPeriodEnd`.
- `SUSPENDED`: Administrative restriction applied; blocking outbound messaging without corrupting historical records.

---

## 3. Payment Provider Integration & Security

### Supported Providers
- **Razorpay** (Official Webhooks API with HMAC-SHA256 signature verification).
- **Stripe** (Checkout Sessions & Webhook HMAC-SHA256 signing secrets).

### Security Requirements
1. **Never Trust Client Redirects**: Browser redirects to `?billing=success` are treated solely as UI feedback. Subscriptions and invoices are updated **only** upon cryptographically verified backend webhook events.
2. **Zero Payment Card Storage**: Card numbers, CVVs, and banking details are never handled or stored on DOOT servers. All transactions occur within provider-hosted checkout sessions or elements.
3. **Webhook Verification**: Every inbound billing webhook must contain a valid `sha256` HMAC signature matching the shared `BILLING_WEBHOOK_SECRET`. Malformed or invalid signatures return `400 Bad Request`.
4. **Idempotent Webhook Processing**: Billing webhooks are processed idempotently using the unique payment event ID / invoice ID to prevent duplicate charges or duplicate invoice records.

---

## 4. Invoices & Receipts
Each successful charge generates a persistent `Invoice` record:
- **Invoice Number**: Formatted as `INV-YYYY-XXXXX`.
- **Amount & Currency**: Precise floating/decimal storage (e.g. `79.00 USD`).
- **Billing Date & Period**: Exact timestamp and coverage dates.
- **Status**: `PAID`, `PENDING`, `FAILED`, or `REFUNDED`.
- **Receipt Action**: Available in the Customer Workspace Settings for print or PDF download.
