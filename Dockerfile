# Multi-stage Dockerfile for DOOT SaaS Platform

# 1. Base Builder
FROM node:22-alpine AS base-builder
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl

COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY apps/api/package*.json ./apps/api/
COPY apps/web/package*.json ./apps/web/

RUN npm ci

COPY packages/shared ./packages/shared
COPY apps/api ./apps/api
COPY apps/web ./apps/web

# Build Shared Workspace
RUN npm run build --workspace=@doot/shared

# 2. API Production Stage
FROM base-builder AS api-production
WORKDIR /app
RUN npm run prisma:generate --workspace=@doot/api
RUN npm run build --workspace=@doot/api

EXPOSE 3000
CMD ["npm", "run", "start:prod", "--workspace=@doot/api"]

# 3. Web Production Stage (Nginx)
FROM base-builder AS web-builder
WORKDIR /app
RUN npm run build --workspace=@doot/web

FROM nginx:alpine AS web-production
COPY --from=web-builder /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
