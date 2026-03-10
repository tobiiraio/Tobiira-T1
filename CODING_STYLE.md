Great. Here is a **`CODING_STYLE.md`** you should add to the root of `tobiira-api`.

This file helps **Codex generate consistent, clean code** and prevents it from introducing messy patterns.

Save as:

```
tobiira-api/CODING_STYLE.md
```

---

````md
# CODING_STYLE.md

This document defines coding conventions for the Tobiira API.

All contributors and AI agents must follow these rules when generating or modifying code.

---

# Language

- TypeScript
- Strict mode enabled
- Avoid `any`
- Prefer explicit types

Example:

```ts
interface UserSession {
  userId: string
  organizationId: string
}
````

---

# Framework

Backend framework:

```
NestJS
```

Preferred architecture:

```
Controller → Service → Repository
```

Responsibilities:

Controller

* HTTP request handling
* DTO validation

Service

* business logic

Repository

* database interaction

---

# File Naming

Use **kebab-case** for files.

Examples:

```
auth.controller.ts
auth.service.ts
auth.repository.ts
request-otp.dto.ts
verify-otp.dto.ts
```

Module example:

```
persta-properties.module.ts
persta-properties.service.ts
```

---

# Folder Structure

Every module should follow this structure.

```
module/
  module.module.ts
  module.controller.ts
  module.service.ts
  module.repository.ts
  dto/
  schemas/
```

Example:

```
persta/properties/
  persta-properties.module.ts
  persta-properties.controller.ts
  persta-properties.service.ts
  persta-properties.repository.ts
  dto/
  schemas/
```

---

# DTO Rules

All request bodies must use DTOs.

Example:

```ts
export class CreatePropertyDto {
  name: string
  organizationId: string
}
```

Use `class-validator`.

Example:

```ts
import { IsString } from "class-validator"

export class CreatePropertyDto {
  @IsString()
  name: string
}
```

---

# MongoDB Schemas

Use Mongoose.

Schemas live in:

```
schemas/
```

Example:

```ts
@Schema({ timestamps: true })
export class Property {
  @Prop({ required: true })
  name: string

  @Prop({ required: true })
  organizationId: string
}
```

---

# Controller Rules

Controllers should remain **thin**.

Do:

```ts
@Post()
create(@Body() dto: CreatePropertyDto) {
  return this.service.create(dto)
}
```

Do NOT:

* implement business logic in controllers
* perform database operations in controllers

---

# Service Rules

Services contain **business logic**.

Example:

```ts
async create(dto: CreatePropertyDto) {
  return this.repository.create(dto)
}
```

Services should not contain raw database queries.

---

# Repository Rules

Repositories interact with the database.

Example:

```ts
async create(data: Partial<Property>) {
  const doc = new this.model(data)
  return doc.save()
}
```

---

# API Response Design

Return plain objects.

Avoid complex wrapper structures unless required.

Example:

```
{
  id: "property_id",
  name: "Sunset Apartments"
}
```

Avoid unnecessary structures like:

```
{
  status: "success",
  data: {...}
}
```

Unless the API requires it.

---

# Error Handling

Use NestJS exceptions.

Examples:

```
BadRequestException
NotFoundException
UnauthorizedException
ForbiddenException
```

Example:

```ts
throw new NotFoundException("Property not found")
```

---

# Validation

Always validate inputs using DTOs.

Never trust request data directly.

---

# Dependency Rules

These boundaries must never be broken.

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

Shared logic must live in:

```
core
```

---

# Logging

Use NestJS logger when needed.

Example:

```ts
private readonly logger = new Logger(AuthService.name)
```

Avoid excessive logging.

---

# Simplicity Rule

Prefer simple code over complex abstractions.

Do NOT introduce:

* CQRS
* Event sourcing
* Event buses
* Microservices

Unless explicitly requested.

---

# Code Generation Rules for AI Agents

When generating code:

* respect module boundaries
* use DTO validation
* create schemas inside module folders
* follow Controller → Service → Repository pattern
* avoid introducing new architectural patterns

Changes should be **incremental and minimal**.

---

# Goal

The codebase should remain:

* simple
* modular
* predictable
* easy to evolve

The architecture must support the long-term vision of **Tobiira as a spatial data and AI platform**.

```

---

Now your repo root should look like this:

```

tobiira-api
│
├─ ARCHITECTURE.md
├─ AGENTS.md
├─ CODING_STYLE.md
├─ package.json
├─ tsconfig.json
│
└─ src
├─ modules
│   ├─ core
│   ├─ persta
│   └─ testa
│
├─ common
├─ config
└─ database

```

---

