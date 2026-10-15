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

## 3. Dedicated QA Test Customer Organization

### Test Tenant Credentials
- **Organization Name**: `DOOT QA Test Organization`
- **Organization Slug**: `doot-qa-test-organization-5ddcf3`
- **User Name**: `DOOT QA User`
- **Email**: `qa-user@doot-test.com`
- **Role**: `OWNER` (Scoped strictly to `DOOT QA Test Organization`)

### Customer Tenant Features Tested
1. **Workspace Switching**: Select between authorized organizations using the header tenant dropdown.
2. **Meta WhatsApp Connection**: Connect WABA and registered phone lines.
3. **Template Management**: Synchronize approved templates from Meta WhatsApp Manager and create new templates.
4. **Contacts & CRM**: CSV bulk import with E.164 normalization and formula injection sanitization.
5. **Customer Chat Inbox**: 24-hour service window timer and live conversation threads.
6. **Campaigns**: Batch broadcast dispatches with rate limits and opt-out exclusion.
7. **Webhooks & SSRF Defense**: Dispatch outbound webhooks with HMAC-SHA256 signatures and private IP filtering.
8. **Automations**: No-code visual flow builder with DAG acyclic validation.
9. **Support Tickets**: Open tickets directly with the platform engineering team.
