Save this file as **`AGENTS.md`** in the root of the `tobiira-api` repository.
This file tells **Codex and other AI agents how to work inside the repo**.

```md
# AGENTS.md

## Project

Tobiira API

Backend for the **Tobiira spatial data and AI platform**.

This backend powers multiple product verticals that operate real-world spaces such as residential buildings, hospitality properties, commercial spaces, and restaurants.

The system collects structured spatial and operational data which will later support spatial analytics and AI systems.

---

# Architecture

Framework:
- NestJS

Architecture style:
- Modular monolith

Language:
- TypeScript

Database:
- MongoDB (via Mongoose)

API style:
- REST

Global API prefix:

```

/api/v1

```

---

# Module Groups

The backend is organized into **domain module groups**.

```

src/modules/
core/
persta/
testa/

```

Future domains may include:

```

costa/
lumi/

```

---

# Core Platform

Core modules provide shared capabilities used by all domains.

```

core/
auth/
users/
organizations/
memberships/
roles/
notifications/
documents/

```

Responsibilities:

auth
- OTP login
- session creation
- logout
- session validation

users
- user profile management

organizations
- business entities or workspaces

memberships
- connect users to organizations

roles
- owner
- operator
- occupant

notifications
- OTP delivery
- invites
- alerts
- receipts

documents
- generate PDFs (receipts, invoices, agreements)

---

# Persta Domain

Persta handles **long-stay residential operations**.

```

persta/
properties/
blocks/
units/
tenants/
leases/
rent/
maintenance/

```

Examples:
- apartments
- villas
- standalones
- hostels
- rental blocks

---

# Testa Domain

Testa handles **short-stay hospitality operations**.

```

testa/
properties/
blocks/
units/
reservations/
guests/
rates/
operations/

```

Examples:
- hotels
- inns
- lodges
- guest houses

---

# Spatial Data Model

The platform models physical spaces.

General hierarchy:

```

Organization
→ Property
→ Block
→ Unit

```

Examples:

Residential:

```

Organization
→ Property
→ Block
→ Unit
→ Tenant

```

Hospitality:

```

Organization
→ Property
→ Block
→ Unit
→ Reservation
→ Guest

```

---

# Domain Dependency Rules

These rules must be followed.

Allowed:

```

persta → core
testa → core

```

Not allowed:

```

persta → testa
testa → persta

```

All shared logic must live in **core**.

---

# Code Structure Pattern

Each module should follow the NestJS pattern:

```

module/
module.module.ts
module.controller.ts
module.service.ts
module.repository.ts
dto/
schemas/

```

Preferred patterns:

- Controller handles HTTP layer
- Service contains business logic
- Repository handles database access
- DTOs validate input
- Schemas define MongoDB models

---

# Common Shared Code

Shared technical utilities go in:

```

src/common/
decorators/
guards/
interceptors/
filters/
pipes/
utils/

```

Important rule:

Business logic **must not live in `common`**.

---

# Authentication

Authentication uses **email OTP**.

Flow:

1. User submits email
2. Auth module creates OTP challenge
3. Notifications module sends OTP
4. User verifies OTP
5. Session created

Sessions will later support **secure HTTP-only cookies**.

---

# API Design Rules

Always use:

```

/api/v1

```

Examples:

```

POST /api/v1/auth/request-otp
POST /api/v1/auth/verify-otp
GET  /api/v1/auth/session

POST /api/v1/organizations
GET  /api/v1/organizations

POST /api/v1/persta/properties
POST /api/v1/persta/blocks
POST /api/v1/persta/units

POST /api/v1/testa/reservations
POST /api/v1/testa/check-in
POST /api/v1/testa/check-out

```

---

# Database Rules

Database:

MongoDB

Each module owns its collections.

Examples:

Core collections

```

users
organizations
memberships
sessions
otp_challenges

```

Persta collections

```

persta_properties
persta_blocks
persta_units
tenants
leases
rent_payments
maintenance_requests

```

Testa collections

```

testa_properties
testa_blocks
testa_units
reservations
guests
rates

```

---

# Coding Principles

Agents must follow these principles:

- Keep modules small and clear
- Avoid unnecessary abstractions
- Prefer explicit code over clever patterns
- Use DTO validation
- Use Mongoose schemas
- Maintain strict domain boundaries
- Keep the system easy to evolve

Do not introduce:

- CQRS
- event buses
- microservices
- unnecessary architecture layers

Unless explicitly requested.

---

# Development Order

When extending the system, prefer this order:

Phase 1

```

auth
notifications
users
organizations
memberships
roles

```

Phase 2

```

persta
properties
blocks
units

```

Phase 3

```

persta
tenants
leases
rent
maintenance

```

Phase 4

```

testa
properties
blocks
units

```

Phase 5

```

testa
reservations
guests
rates
operations

```

---

# AI Agent Behavior

When modifying code:

- respect module boundaries
- update DTOs and schemas consistently
- avoid breaking existing modules
- keep controllers thin
- move logic into services

Prefer incremental changes instead of large refactors.

---

# Strategic Direction

Tobiira is a **spatial data and AI platform**.

Operational products such as:

- Persta
- Testa
- Costa
- Lumi

act as structured **data collection layers**.

Future platform capabilities may include:

- spatial analytics
- operational intelligence
- automation
- predictive models
- AI agents

This backend should maintain strong spatial data discipline to support those systems.
```

---
