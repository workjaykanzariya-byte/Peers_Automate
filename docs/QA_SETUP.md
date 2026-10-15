# DOOT — QA Local Setup & Authentication Guide

## 1. Local Environment URLs
- **Customer Frontend Web Application**: [http://localhost:5173/](http://localhost:5173/)
- **Backend API Base**: [http://localhost:3000/api/v1](http://localhost:3000/api/v1)
- **API Health Check**: [http://localhost:3000/api/v1/health](http://localhost:3000/api/v1/health)
- **Swagger OpenAPI Documentation**: [http://localhost:3000/docs](http://localhost:3000/docs)

---

## 2. Platform Administrator Bootstrap & Login

### Super Admin Credentials
- **Email**: `owner@doot.io`
- **Role**: `isPlatformAdmin: true` (Super Administrator)
- **Access Route**: `/admin` (Platform Owner Command Center)
- **Privileges**: Cross-tenant KPI metrics, customer organization suspension/reactivation, plans manager, queue health.

### Login Steps
1. Navigate to [http://localhost:5173/login](http://localhost:5173/login).
2. Enter the administrator email and the development password configured in your local environment.
3. Upon authentication, a high-visibility **"Platform Admin Panel"** navigation badge appears in the left sidebar.
4. Click on **Platform Admin Panel** or visit [http://localhost:5173/admin](http://localhost:5173/admin).

---

## 3. Direct Login Links & Credentials

| Role | Login Link | Destination Route | Email | Password | Privileges |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Platform Super Admin** | [http://localhost:5173/login](http://localhost:5173/login) | `/admin` | `owner@doot.io` | `Password123!` | System Command Center, cross-tenant KPIs, organization suspension/reactivation, queues |
| **Customer QA Tenant** | [http://localhost:5173/login](http://localhost:5173/login) | `/dashboard` | `qa-user@doot-test.com` | `Password123!` | Scoped strictly to `DOOT QA Test Organization` (inbox, templates, contacts, campaigns) |
| **Customer Demo Tenant 1** | [http://localhost:5173/login](http://localhost:5173/login) | `/dashboard` | `admin@acme.com` | `Password123!` | Scoped strictly to `Acme Enterprises` |
| **Customer Demo Tenant 2** | [http://localhost:5173/login](http://localhost:5173/login) | `/dashboard` | `ceo@globex.com` | `Password123!` | Scoped strictly to `Globex Corporation` |

---

## 4. How to Connect WhatsApp API / WABA in the User Admin Panel

### Step-by-Step Customer Connection Workflow:
1. Log in as a customer user at [http://localhost:5173/login](http://localhost:5173/login) (e.g. `qa-user@doot-test.com` / `Password123!`).
2. In the left navigation sidebar, navigate to **Settings** $\to$ **WhatsApp Accounts** (or open [http://localhost:5173/meta](http://localhost:5173/meta)).
3. Click the **"Connect WhatsApp Account"** button.
4. Fill in the required official Meta Business assets:
   - **Account Name**: e.g., `Official Customer Care Line`
   - **Meta Business ID**: Your Meta Business Portfolio ID (from Meta Business Suite).
   - **WhatsApp Business Account (WABA) ID**: Numeric WABA ID from Meta Developer Portal.
   - **Phone Number ID**: 15/16 digit Phone Number ID assigned by Meta Cloud API.
   - **Display Phone Number**: Canonical E.164 phone number (e.g., `+15551234567`).
   - **Verified Business Name**: Approved display name registered with Meta.
   - **System User Permanent Access Token**: Generated under Meta Business Settings $\to$ System Users with `whatsapp_business_messaging` and `whatsapp_business_management` permissions.
5. Click **"Save & Connect"**:
   - The backend validates the credentials via Meta Graph API `v21.0`.
   - The System User token is encrypted at rest using AES-256-GCM with your `ENCRYPTION_MASTER_KEY_V1`.
   - The raw token is discarded and never returned in API responses or frontend state.
6. The phone number immediately appears in your active WhatsApp Accounts list, ready for template synchronization and inbox messaging.

---

## 5. How Platform Admin Oversees WhatsApp Connections & Tenant Reflection

1. **Platform Owner Visibility**:
   - The platform admin logs into [http://localhost:5173/admin](http://localhost:5173/admin).
   - The admin can view platform-wide messaging statistics, active phone lines across all tenants, and BullMQ queue throughput.
2. **Direct Reflection on Customer Side**:
   - **Tenant Plans & Quotas**: If the platform admin upgrades a tenant's subscription plan from STARTER to GROWTH or ENTERPRISE, the customer portal immediately unlocks higher contact limits, additional phone line slots, and advanced bot automation nodes without requiring a page refresh.
   - **Tenant Suspension**: If the platform admin suspends an organization from the Command Center (`POST /admin/organizations/:id/suspend`), the customer's outbound messaging and campaign dispatches are instantly halted with a clear policy notice, while data remains safe and preserved.
   - **Account Reactivation**: When reactivated by the platform admin, all WhatsApp phone connections and scheduled campaigns automatically resume.

---

## 6. Real Meta Integration vs. Development Mock Mode

| Behavior | Development / Test Mode | Production Live Mode |
| :--- | :--- | :--- |
| **Access Token Pattern** | Token containing `mock` or `test` | Valid Meta System User token starting with `EAAB...` |
| **Meta Graph API Call** | Built-in offline fallback returns simulated schemas | Real HTTPS fetch to `https://graph.facebook.com/v21.0/` |
| **Prerequisites** | None (runs completely offline) | Meta App ID, App Secret, verified WABA, and System User token |
