# DOOT — Production Deployment Guide

## 1. Production Architecture Overview

The DOOT SaaS platform comprises five decoupled components:
1. **Frontend Web App (`@doot/web`)**: React 19 + Vite SPA served via Nginx with TLS termination.
2. **Backend API (`@doot/api`)**: NestJS 11 REST API with Swagger documentation and multi-tenant security guards.
3. **Queue & Background Worker**: Redis 8 + BullMQ worker cluster processing outbound WhatsApp dispatches, SSRF-validated webhooks, and campaign jobs.
4. **Primary Database**: PostgreSQL 18 with connection pooling and strict foreign keys.
5. **Caching & Broker**: Redis 8 with AOF persistence.

---

## 2. Environment Variables Specification

### Core API (`apps/api/.env`)
```bash
# Environment & Ports
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://app.doot.io

# Primary Database
DATABASE_URL=postgresql://doot_app:StrongSecretPassword@postgres:5432/doot_production?schema=public

# Redis Connection
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=StrongRedisPassword

# Security & Secrets
JWT_SECRET=super_secure_jwt_random_secret_at_least_32_chars
ENCRYPTION_KEY_V1=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef # 64-char hex
ACTIVE_KEY_VERSION=v1

# Meta Platform Credentials
META_API_VERSION=v21.0
META_APP_ID=your_meta_app_id
META_APP_SECRET=your_meta_app_secret
META_WEBHOOK_VERIFY_TOKEN=random_secure_verify_token

# Billing
BILLING_WEBHOOK_SECRET=your_razorpay_or_stripe_webhook_secret
```

---

## 3. Database Migration Deployment Step
Database migrations must run as an isolated pre-deployment step:
```bash
# In CI/CD deployment pipeline:
npm run prisma:deploy --workspace=@doot/api
```
Never execute `prisma migrate reset` in production environments.

---

## 4. Reverse Proxy & HTTPS Configuration (Nginx)

```nginx
server {
    listen 80;
    server_name app.doot.io api.doot.io;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.doot.io;

    ssl_certificate /etc/letsencrypt/live/api.doot.io/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.doot.io/privkey.pem;

    # Security Headers
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self';" always;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
