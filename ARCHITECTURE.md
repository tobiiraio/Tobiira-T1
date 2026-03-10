Save this as `ARCHITECTURE.md` in the root of `tobiira-api`.

````md
# Tobiira API Architecture

## Overview

Tobiira is a spatial data and AI platform for operating real-world spaces.

The platform captures structured operational data from physical environments such as:

- residential properties
- hospitality spaces
- commercial spaces
- restaurants

This data is intended to become the foundation for future spatial intelligence, automation, analytics, and AI systems.

The backend currently serves the core platform and selected product verticals.

---

## Current Backend Scope

This backend is a **NestJS modular monolith**.

Repository:

```text
tobiira-api
````

Primary deployment target:

```text
api.tobiira.io
```

Current module groups:

* `core`
* `persta`
* `testa`

Future product domains may include:

* `costa`
* `lumi`

---

## Product Vision

Tobiira is not positioned only as property management software.

Tobiira is positioned as a:

**Spatial data and AI platform for operating real-world spaces.**

Product verticals act as operational data layers.

### Persta

Residential and long-stay operations.

Examples:

* apartments
* villas
* standalones
* hostels
* rental blocks

### Testa

Hospitality and short-stay accommodation operations.

Examples:

* hotels
* inns
* lodges
* guest houses
* serviced spaces

### Costa

Commercial property operations.

Examples:

* malls
* plazas
* complexes
* offices
* shops

### Lumi

Restaurant operations and device ecosystem.

Examples:

* tables
* zones
* branches
* devices
* staff request flows

---

## Architectural Style

The backend uses a **modular monolith**.

### Why

* simple to operate as a solo builder
* fast to build and iterate
* clear domain boundaries
* easier to split later if needed
* good fit for NestJS

### What this means

* one backend repo
* one backend application
* separate domain modules inside the application
* clear dependency rules between domains

---

## Technology Choices

### Backend Framework

* NestJS

### Database

* MongoDB

### API Style

* HTTP REST API

### Auth Model

* email OTP
* session-based auth
* secure cookie support across subdomains later

---

## Frontend and Platform Context

The backend supports multiple frontend applications.

### Frontends

* `id.tobiira.io`
* `persta.tobiira.io`
* `testa.tobiira.io`
* future: `costa.tobiira.io`
* future: `lumi.tobiira.io`

### Main website

* `tobiira.io`

### Identity frontend

* `id.tobiira.io`

This backend is responsible for powering shared data and business logic.

---

## High-Level Backend Structure

```text
src/
  modules/
    core/
    persta/
    testa/
  common/
  config/
  database/
  app.module.ts
  main.ts
```

---

## Module Groups

## 1. Core

The `core` group contains platform-wide shared capabilities.

```text
src/modules/core/
  auth/
  users/
  organizations/
  memberships/
  roles/
  notifications/
  documents/
```

### Responsibilities

#### auth

Handles:

* request OTP
* verify OTP
* create session
* logout
* current session lookup

#### users

Handles:

* user profile
* basic identity data
* account metadata

#### organizations

Handles:

* organization creation
* organization management
* workspace/business container

#### memberships

Handles:

* linking users to organizations
* invitation and membership lifecycle
* organization access relationships

#### roles

Handles:

* owner
* operator
* occupant
* permission checks
* access rules

#### notifications

Handles:

* OTP delivery
* invitations
* receipts
* alerts
* future messaging channels

#### documents

Handles:

* document generation
* receipts
* invoices
* agreements
* PDF rendering

---

## 2. Persta

The `persta` group contains long-stay and residential operations.

```text
src/modules/persta/
  properties/
  blocks/
  units/
  tenants/
  leases/
  rent/
  maintenance/
```

### Responsibilities

#### properties

* property creation
* property metadata
* organization ownership

#### blocks

* building-level structure under a property

#### units

* occupiable or rentable spaces inside a block

#### tenants

* long-stay occupants
* tenant profiles

#### leases

* lease lifecycle
* agreements
* occupancy periods

#### rent

* charges
* payments
* rent tracking

#### maintenance

* issues
* assignments
* repairs
* status tracking

---

## 3. Testa

The `testa` group contains short-stay accommodation operations.

```text
src/modules/testa/
  properties/
  blocks/
  units/
  reservations/
  guests/
  rates/
  operations/
```

### Responsibilities

#### properties

* hospitality property management

#### blocks

* buildings, wings, or towers

#### units

* rooms, suites, or other stay spaces

#### reservations

* booking lifecycle
* date-based stays

#### guests

* guest profiles
* booking-linked identities

#### rates

* pricing and room rate logic

#### operations

* check-in
* check-out
* stay operations

---

## Future Module Groups

These are not part of the current implementation target, but the architecture should not block them.

## Costa

Commercial operations.

Likely future modules:

```text
src/modules/costa/
  properties/
  blocks/
  units/
  occupants/
  leases/
  operations/
```

## Lumi

Restaurant operations and devices.

Likely future modules:

```text
src/modules/lumi/
  branches/
  zones/
  tables/
  devices/
  requests/
  operations/
```

---

## Spatial Data Model

Tobiira is fundamentally built around structured spatial modeling.

A generalized hierarchy:

```text
Organization
  -> Property
    -> Block
      -> Unit
```

This hierarchy may map differently by vertical:

### Persta

```text
Organization
  -> Property
    -> Block
      -> Unit
        -> Tenant
```

### Testa

```text
Organization
  -> Property
    -> Block
      -> Unit
        -> Reservation
          -> Guest
```

### Costa

```text
Organization
  -> Property
    -> Block
      -> Unit
        -> Occupant
```

### Lumi

```text
Organization
  -> Branch
    -> Zone
      -> Table
        -> Device
```

This structured model is important because it becomes a future **spatial data layer** for AI systems.

---

## Domain Dependency Rules

These dependency rules must be preserved.

### Allowed

```text
persta -> core
testa  -> core
future costa -> core
future lumi  -> core
```

### Not Allowed

```text
persta -> testa
testa  -> persta
persta -> future costa
testa  -> future lumi
```

### Rule

Domains must not depend on each other directly.

All shared logic should live in `core`.

---

## Module Design Pattern

Each module should follow a simple NestJS structure.

Example:

```text
src/modules/core/auth/
  auth.module.ts
  auth.controller.ts
  auth.service.ts
  auth.repository.ts
  dto/
  schemas/
```

Or similarly:

```text
src/modules/persta/properties/
  persta-properties.module.ts
  persta-properties.controller.ts
  persta-properties.service.ts
  persta-properties.repository.ts
  dto/
  schemas/
```

### Preferred internal patterns

* controller
* service
* repository
* DTOs
* Mongoose schemas

Avoid unnecessary complexity.

Do not introduce CQRS, event buses, or microservice patterns unless explicitly needed.

---

## Shared Technical Layer

Shared technical code belongs in:

```text
src/common/
  decorators/
  guards/
  interceptors/
  filters/
  pipes/
  utils/
  types/
```

Examples:

* auth guards
* organization context decorators
* validation helpers
* shared pipes

### Rule

Business logic must not live in `common`.

Business logic belongs inside `core`, `persta`, or `testa`.

---

## Database Design

Database:

* MongoDB

Each module owns its own collections.

### Example collections

#### Core

* `users`
* `organizations`
* `memberships`
* `roles`
* `otp_challenges`
* `sessions`

#### Persta

* `persta_properties`
* `persta_blocks`
* `persta_units`
* `tenants`
* `leases`
* `rent_payments`
* `maintenance_requests`

#### Testa

* `testa_properties`
* `testa_blocks`
* `testa_units`
* `reservations`
* `guests`
* `rates`

### Rule

Do not treat MongoDB as one shared unstructured bucket.

Each module should own its models and data boundaries.

---

## API Prefix and Route Structure

Global API prefix:

```text
/api/v1
```

### Example routes

#### Auth

```text
POST /api/v1/auth/request-otp
POST /api/v1/auth/verify-otp
POST /api/v1/auth/logout
GET  /api/v1/auth/session
```

#### Users

```text
GET /api/v1/users/me
PATCH /api/v1/users/me
```

#### Organizations

```text
POST /api/v1/organizations
GET  /api/v1/organizations
GET  /api/v1/organizations/:id
```

#### Memberships

```text
POST /api/v1/memberships/invite
GET  /api/v1/memberships
PATCH /api/v1/memberships/:id
```

#### Persta

```text
POST /api/v1/persta/properties
GET  /api/v1/persta/properties
POST /api/v1/persta/blocks
GET  /api/v1/persta/blocks
POST /api/v1/persta/units
GET  /api/v1/persta/units
POST /api/v1/persta/tenants
POST /api/v1/persta/leases
POST /api/v1/persta/rent/payments
```

#### Testa

```text
POST /api/v1/testa/properties
GET  /api/v1/testa/properties
POST /api/v1/testa/blocks
POST /api/v1/testa/units
POST /api/v1/testa/reservations
POST /api/v1/testa/guests
POST /api/v1/testa/operations/check-in
POST /api/v1/testa/operations/check-out
```

---

## Authentication and Session Architecture

Authentication uses **email OTP**.

### Flow

1. user submits email
2. auth module creates OTP challenge
3. notifications module sends OTP
4. user submits OTP
5. auth verifies challenge
6. session is created
7. API returns or sets auth context

### Future production cookie model

Use secure HTTP-only cookies with shared subdomain support.

Recommended cookie settings:

```text
HttpOnly
Secure
SameSite=Lax
Domain=.tobiira.io
Path=/
```

This allows the ecosystem to support seamless auth across:

* `id.tobiira.io`
* `persta.tobiira.io`
* `testa.tobiira.io`
* future `costa.tobiira.io`
* future `lumi.tobiira.io`

---

## Notifications Architecture

Notifications are part of core and are a first-class capability.

### Notifications should be used by:

* auth
* memberships
* documents
* future vertical workflows

### Examples

* send OTP
* send invitation
* send receipt
* send alerts

### Rule

Other modules should not send emails directly.
They should call the notifications service.

---

## Documents Architecture

Documents are generated, not user-uploaded.

### Examples

* invoices
* receipts
* lease agreements
* stay confirmations

### Rule

Documents should receive structured data from business modules and render outputs such as PDFs.

The documents module should not become the owner of business data.

---

## Coding Principles

* keep modules small and clear
* prefer explicit naming
* avoid magic abstractions
* build only what is needed now
* keep code production-lean
* make future extraction possible, but do not optimize for microservices yet

### Current mindset

* structure first
* simple implementation
* strong boundaries
* minimal complexity

---

## Initial Build Order

The system should be implemented in this order.

### Phase 1: Core foundation

* auth
* notifications
* users
* organizations
* memberships
* roles

### Phase 2: Persta base structure

* properties
* blocks
* units

### Phase 3: Persta operations

* tenants
* leases
* rent
* maintenance

### Phase 4: Testa base structure

* properties
* blocks
* units

### Phase 5: Testa operations

* reservations
* guests
* rates
* operations

---

## Strategic Positioning

Tobiira should be understood as:

**A spatial data and AI platform for operating real-world spaces.**

Persta, Testa, Costa, and Lumi are not only products.
They are also domain-specific data collection surfaces.

The long-term strategic asset is the structured spatial data generated through operational use.

---

## Future Spatial Intelligence Layer

This backend is the start of a future spatial intelligence platform.

Possible future capabilities:

* occupancy analytics
* pricing intelligence
* operational automation
* anomaly detection
* predictive maintenance
* service optimization
* AI assistants for spatial operations

This future layer depends on strong data discipline now.

---

## Summary

This backend should be built as:

* NestJS
* modular monolith
* MongoDB
* domain-based module groups
* clear dependency rules
* shared core platform
* strong spatial modeling foundation

Current focus:

* `core`
* `persta`
* `testa`

Future-ready for:

* `costa`
* `lumi`
* spatial intelligence and AI

```
```
