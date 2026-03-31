# Tobiira Backend Architecture

## Repository Structure

NestJS monorepo (`nest-cli.json`, `monorepo: true`). One repository, one `package.json`, shared `node_modules`, independent deployable services under `apps/`.

```
tobiira-t1/
  apps/
    core/           # Auth, users, organizations, memberships
    notifications/  # Email delivery — RabbitMQ consumer only
    documents/      # PDF generation — event-driven + on-demand HTTP
    payments/       # Vertical-agnostic payment recording
    persta/         # Property management vertical
  libs/
    common/         # Shared types, event names, DTOs, constants
  kong/
    kong.yml        # Declarative Kong gateway config (DB-less)
  Dockerfile        # Single multi-stage build — ARG APP selects service
  docker-compose.yml
  .github/workflows/ci.yml
```

---

## Services

### Platform (60xx)

| Service | Port | Role |
|---------|------|------|
| core | 6000 | Auth, users, organizations, memberships |
| notifications | 6001 | Transactional email via Brevo |
| documents | 6002 | PDF generation, on-demand streaming |
| payments | 6003 | Payment recording and voiding |

### Verticals (70xx)

| Service | Port | Role |
|---------|------|------|
| persta | 7000 | Residential property management |
| testa | 7001 | Hospitality _(planned)_ |
| lumi | 7002 | Restaurant / smart building _(planned)_ |
| costa | 7003 | Commercial property _(planned)_ |

---

## Technology Stack

| Concern | Choice |
|---------|--------|
| Framework | NestJS 11 |
| Language | TypeScript 5 |
| Database | MongoDB Atlas — separate cluster DB per service |
| ODM | Mongoose 9 (`@nestjs/mongoose`) |
| Message broker | RabbitMQ — `@nestjs/microservices` Transport.RMQ |
| API gateway | Kong 3.7 — declarative DB-less mode |
| Email | Brevo (transactional, attachment support) |
| PDF | pdfkit — in-memory generation, never stored |
| HTTP client | `@nestjs/axios` / `axios` — internal service-to-service calls |
| Auth | Email OTP → JWT access token (15m) + refresh token (30d rotation) |
| Validation | `class-validator` + `class-transformer` on all DTOs |
| Shared lib | `@tobiira/common` — events, constants, shared DTOs |
| File storage | Cloudflare R2 / S3-compatible _(wired, Phase 2 only)_ |

---

## API Gateway — Kong

All client traffic enters on port `8000`. Kong handles:

- **JWT validation** on protected routes (`exp` claim)
- **Header injection** — extracts `sub` and `email` from JWT, injects `x-user-id`, `x-user-email`, `x-org-id` into upstream requests
- **CORS** — global, all HTTP methods
- **Rate limiting** — 120 req/min (local policy)

Route table:

```
/api/v1/auth           → core:6000          (public)
/api/v1/users          → core:6000          (JWT required)
/api/v1/organizations  → core:6000          (JWT required)
/api/v1/memberships    → core:6000          (JWT required)
/api/v1/payments       → payments:6003      (JWT + header injection)
/api/v1/documents      → documents:6002     (JWT + header injection)
/api/v1/properties     → persta:7000        (JWT + header injection)
/api/v1/leases         → persta:7000        (JWT + header injection)
/api/v1/tenants        → persta:7000        (JWT + header injection)
```

Notifications has no Kong route — not HTTP-addressable by clients.

---

## Authentication Flow

```
POST /auth/request-otp   → core stores hashed OTP, emits core.auth.otp_requested
                         ← notifications sends OTP email

POST /auth/verify-otp    → core verifies hash, upserts user, issues JWT pair
                         ← { accessToken, refreshToken }

POST /auth/refresh       → core rotates refresh token, issues new JWT pair

GET  /auth/session       → core validates access token, returns { userId, email }
```

Verticals never re-validate JWTs. They read `x-user-id`, `x-user-email`, `x-org-id` from Kong-injected headers via `GatewayAuthGuard`.

---

## Service-to-Service Communication

### RabbitMQ (async, preferred)

| Queue | Publisher | Consumers |
|-------|-----------|-----------|
| `notifications.core` | core | notifications |
| `notifications.persta` | persta | notifications, documents |
| `notifications.payments` | payments | notifications, documents |
| `documents.events` | documents | notifications |

### Internal HTTP (sync, for data reads)

Protected by `x-internal-api-key` header (`InternalApiKeyGuard`). Never routed through Kong.

| Caller | Endpoint | Purpose |
|--------|----------|---------|
| persta | `core GET /users/:id` | Resolve user profile on tenant enrol |
| persta | `core GET /organizations/:id/internal` | Resolve org name |
| persta | `core POST /memberships/internal` | Create occupant membership |
| documents | `persta GET /leases/:id/internal` | Full lease record for PDF |
| documents | `payments GET /payments/:id/internal` | Full payment record for receipt |

Service base URLs are configured via env vars: `CORE_SERVICE_URL`, `PERSTA_SERVICE_URL`, `PAYMENTS_SERVICE_URL`.

---

## Guard Layers

| Guard | Used in | Mechanism |
|-------|---------|-----------|
| `JwtAccessGuard` | core | Validates Bearer JWT directly |
| `GatewayAuthGuard` | persta, payments, documents | Reads Kong-injected `x-user-id`, `x-org-id` headers |
| `InternalApiKeyGuard` | all services (internal endpoints) | Validates `x-internal-api-key` header |
| `OrganizationMembershipGuard` | core | Verifies user has a membership in the target org |
| `MembershipRolesGuard` | core | Checks `@RequireMembershipRoles(...)` against membership |

---

## Authorization Model

Membership roles within an organization:

```
owner     — full control, cannot be removed
operator  — manage members, resources, payments
occupant  — tenant / resident; read access
```

`isManagingAgent: boolean` on a membership — gives an operator owner-equivalent write rights.

System roles on users:

```
user   — standard
admin  — platform-level access (future)
```

---

## Database Design

Each service connects to its own MongoDB database via a named Mongoose connection. No service reads another service's database directly.

| Service | Connection name | Env var |
|---------|----------------|---------|
| core | `core` | `MONGODB_URI_CORE` |
| persta | `persta` | `MONGODB_URI_PERSTA` |
| payments | `payments` | `MONGODB_URI_PAYMENTS` |
| testa | `testa` | `MONGODB_URI_TESTA` _(planned)_ |

---

## PDF & Document Flow

Documents are **generated in memory, never stored**.

**Event-driven** (automatic on state change):
```
payments emits payments.payment.recorded
  → documents fetches full payment via internal HTTP
  → pdfkit generates receipt in memory as Buffer
  → documents emits documents.document.generated { pdfBase64, recipientEmail, ... }
  → notifications sends Brevo email with PDF as base64 attachment
```

**On-demand** (client-initiated):
```
GET /api/v1/documents/leases/:leaseId/pdf
GET /api/v1/documents/payments/:paymentId/receipt
  → documents fetches record via internal HTTP
  → generates PDF buffer
  → streams directly to client (Content-Type: application/pdf)
```

---

## Payment Model

Payments are vertical-agnostic. Each record carries a `resourceType` + `resourceId` pointer back to the originating vertical:

```ts
resourceType: string  // 'lease' | 'booking' | 'subscription' | ...
resourceId:   string  // ID in the originating service
source:       'manual' | 'platform'
```

Phase 1: staff-recorded manual payments. Phase 2: platform-initiated (M-Pesa, card).

---

## Shared Library — `@tobiira/common`

```
libs/common/src/
  events/
    core.events.ts       # CoreEvents, CoreEvent type, event payloads
    persta.events.ts     # PerstaEvents, PerstaEvent type
    payments.events.ts   # PaymentsEvents, PaymentsEvent type
    documents.events.ts  # DocumentsEvents, DocumentGeneratedPayload
  constants/
    gateway-headers.ts   # GATEWAY_HEADERS (x-user-id, x-org-id, ...)
    internal-headers.ts  # INTERNAL_HEADERS (x-internal-api-key)
    rabbitmq-queues.ts   # RABBITMQ_QUEUES
  dto/
    pagination-query.dto.ts
  types/
    membership-role.ts
```

Imported in all apps as `@tobiira/common` via TypeScript path alias.

---

## Build & Deployment

### Local development

```sh
npm run start:core:dev
npm run start:persta:dev
# etc.
```

### Docker (single Dockerfile, multi-service)

```sh
docker build --build-arg APP=persta -t tobiira-persta .
docker-compose up   # brings up all services + mongo + rabbitmq + kong
```

### Railway (production)

Each service is a separate Railway service. All built from the same repo. Set `APP` build arg per service in Railway settings. Set env vars individually per service (do not share a single `.env`). Use Railway private networking hostnames for inter-service URLs.

### CI — GitHub Actions

```
push to dev / master
  → lint (eslint --max-warnings 0)
  → test (jest --passWithNoTests)
  → build matrix: [core, notifications, documents, payments, persta] in parallel
```

---

## Port Reference

```
Kong proxy    8000   ← all external client traffic
Kong admin    8001
core          6000
notifications 6001   (health endpoint only — no client routes)
documents     6002
payments      6003
persta        7000
testa         7001   (planned)
lumi          7002   (planned)
costa         7003   (planned)
```

---

## Environment Variables

Each service reads from a shared `.env` (local) or per-service env config (Railway). Key variables:

```
# Database
MONGODB_URI_CORE / _PERSTA / _PAYMENTS / _TESTA

# JWT
JWT_ACCESS_SECRET, JWT_ACCESS_EXPIRES_IN
JWT_REFRESH_SECRET, JWT_REFRESH_EXPIRES_IN

# OTP
OTP_LENGTH, OTP_TTL_MINUTES

# Email
BREVO_API_KEY, BREVO_SENDER_EMAIL, BREVO_SENDER_NAME

# RabbitMQ
RABBITMQ_URL   # use service hostname inside Docker: rabbitmq

# Internal
INTERNAL_API_KEY
CORE_SERVICE_URL      # http://core:6000 in Docker
PERSTA_SERVICE_URL    # http://persta:7000 in Docker
PAYMENTS_SERVICE_URL  # http://payments:6003 in Docker

# App
CORS_ORIGINS, APP_PUBLIC_URL, APP_NAME, PORT
INVITE_TTL_DAYS
```
