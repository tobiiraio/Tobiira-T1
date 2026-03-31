# Tobiira Backend Architecture V2

**Version:** 2.0  
**Last Updated:** March 2026  
**Status:** Active Development

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Core Philosophy](#core-philosophy)
3. [Architecture Overview](#architecture-overview)
4. [Module Organization](#module-organization)
5. [Database Strategy](#database-strategy)
6. [The Spatial Engine](#the-spatial-engine)
7. [Vertical Domains](#vertical-domains)
8. [Cross-Cutting Concerns](#cross-cutting-concerns)
9. [Development Guidelines](#development-guidelines)
10. [Migration Path](#migration-path)

---

## Executive Summary

Tobiira's backend is built as a **spatial intelligence platform** with a unique three-layer architecture:

```
┌─────────────────────────────────────────────┐
│  CORE      → Platform identity & auth       │
├─────────────────────────────────────────────┤
│  SPATIAL   → Shared primitives (the engine) │
├─────────────────────────────────────────────┤
│  VERTICALS → Domain-specific business logic │
└─────────────────────────────────────────────┘
```

**The Key Insight:**  
Shared data structures live in `spatial/`, while verticals own workflows and domain semantics. This enables rapid development of new verticals without duplicating core platform capabilities.

---

## Core Philosophy

### Design Principles

**1. Shared Primitives, Domain Semantics**

```
✅ DO: Move shared structures to spatial/
   - property.model.ts (used by Persta, Testa, Costa)
   - occupancy.model.ts (base for leases, reservations)
   
❌ DON'T: Duplicate space logic across verticals
   - Persta shouldn't own property.model.ts
   - Testa shouldn't own property.model.ts
```

**2. Spatial Engine as Platform Layer**

The `spatial/` module is the **platform innovation** that makes Tobiira more than a collection of separate apps:

- **Spaces**: WHERE things happen (properties, units, rooms, bays, tables)
- **Occupancies**: WHAT fills spaces (leases, reservations, sessions)
- **Actors**: WHO performs actions (base primitive only)
- **Activities**: WHAT happens (payments, maintenance, service requests)
- **Events**: WHEN things happen (temporal tracking for analytics & AI)

**3. Verticals as Business Logic**

Verticals **orchestrate** the platform, they don't own primitives:

```typescript
// ❌ BAD: Vertical owns data model
verticals/persta/models/property.model.ts

// ✅ GOOD: Vertical uses platform primitive
import { Property } from '@/spatial/spaces/models/property.model';
import { Lease } from '@/spatial/occupancies/models/lease-occupancy.model';

export class LeaseManagementService {
  async createLease() {
    // Business logic using platform primitives
  }
}
```

**4. Don't Over-Centralize Too Fast**

⚠️ **Critical Balance:**

Some things should stay in `spatial/` (shared primitives):
- ✅ property, block, unit, room, bay, table
- ✅ occupancy types
- ✅ event structures

Some things should stay in `verticals/` (domain semantics):
- ✅ tenant (residential-specific fields)
- ✅ guest (hospitality-specific fields)
- ✅ customer (car wash/restaurant-specific)

**Why?** A residential tenant has different semantics than a hotel guest:
- Tenant: credit score, employment, references
- Guest: passport, loyalty tier, stay preferences

---

## Architecture Overview

### Directory Structure

```
src/
├── core/                              # Platform identity & infrastructure
│   ├── auth/
│   │   ├── models/
│   │   │   ├── user.model.ts
│   │   │   ├── organization.model.ts
│   │   │   └── role.model.ts
│   │   ├── services/
│   │   │   ├── auth.service.ts
│   │   │   ├── otp.service.ts
│   │   │   └── token.service.ts
│   │   ├── controllers/
│   │   ├── routes/
│   │   └── middleware/
│   │
│   ├── memberships/                   # User-Organization relationships
│   │   ├── models/
│   │   │   └── membership.model.ts
│   │   ├── services/
│   │   │   ├── invitation.service.ts
│   │   │   ├── activation.service.ts
│   │   │   └── role-assignment.service.ts
│   │   ├── controllers/
│   │   └── routes/
│   │
│   ├── notifications/
│   │   ├── services/
│   │   │   ├── email.service.ts
│   │   │   ├── sms.service.ts
│   │   │   └── push.service.ts
│   │   └── templates/
│   │
│   └── documents/
│       ├── services/
│       ├── storage/
│       └── templates/
│
├── spatial/                           # Platform engine (shared primitives)
│   │
│   ├── spaces/                        # WHERE
│   │   ├── models/
│   │   │   ├── space.model.ts              # Base primitive
│   │   │   ├── property.model.ts           # Shared across verticals
│   │   │   ├── block.model.ts              # Shared across verticals
│   │   │   ├── unit.model.ts               # Persta/Costa
│   │   │   ├── room.model.ts               # Testa
│   │   │   ├── bay.model.ts                # Bayra
│   │   │   └── table.model.ts              # Lumi
│   │   ├── services/
│   │   │   ├── space.service.ts
│   │   │   └── geospatial.service.ts
│   │   └── types/
│   │       └── space-types.enum.ts
│   │
│   ├── occupancies/                   # WHAT (fills the space)
│   │   ├── models/
│   │   │   ├── occupancy.model.ts          # Base primitive
│   │   │   ├── lease-occupancy.model.ts    # Persta/Costa
│   │   │   ├── reservation-occupancy.model.ts  # Testa
│   │   │   ├── bay-occupancy.model.ts      # Bayra
│   │   │   └── dining-occupancy.model.ts   # Lumi
│   │   └── services/
│   │       ├── occupancy.service.ts
│   │       └── availability.service.ts
│   │
│   ├── actors/                        # WHO (lightweight!)
│   │   ├── models/
│   │   │   └── actor.model.ts              # Base primitive only
│   │   ├── services/
│   │   │   └── actor.service.ts
│   │   └── types/
│   │       └── actor-types.enum.ts         # 'tenant' | 'guest' | 'customer'
│   │
│   ├── activities/                    # WHAT (happens)
│   │   ├── models/
│   │   │   ├── activity.model.ts           # Base primitive
│   │   │   ├── payment.model.ts            # Shared
│   │   │   ├── service-request.model.ts    # Shared
│   │   │   └── maintenance.model.ts        # Shared
│   │   └── services/
│   │       └── activity.service.ts
│   │
│   └── events/                        # WHEN (temporal tracking)
│       ├── models/
│       │   ├── event.model.ts              # Historical events
│       │   └── scheduled-event.model.ts    # Future events
│       └── services/
│           ├── event.service.ts
│           └── analytics.service.ts
│
├── verticals/                         # Domain-specific business logic
│   │
│   ├── persta/                        # Residential property management
│   │   ├── models/
│   │   │   └── tenant.model.ts            # Domain-specific fields
│   │   ├── services/
│   │   │   ├── rent-collection.service.ts
│   │   │   ├── lease-management.service.ts
│   │   │   ├── tenant-screening.service.ts
│   │   │   └── maintenance.service.ts
│   │   ├── controllers/
│   │   └── routes/
│   │
│   ├── testa/                         # Hotel management
│   │   ├── models/
│   │   │   └── guest.model.ts             # Domain-specific fields
│   │   ├── services/
│   │   │   ├── reservation.service.ts
│   │   │   ├── rate-management.service.ts
│   │   │   ├── housekeeping.service.ts
│   │   │   └── guest-services.service.ts
│   │   ├── controllers/
│   │   └── routes/
│   │
│   ├── costa/                         # Commercial property management
│   │   ├── models/
│   │   │   └── commercial-tenant.model.ts
│   │   ├── services/
│   │   │   ├── commercial-lease.service.ts
│   │   │   ├── billing.service.ts
│   │   │   └── facility-management.service.ts
│   │   └── routes/
│   │
│   ├── bayra/                         # Car wash management
│   │   ├── models/
│   │   │   ├── vehicle.model.ts
│   │   │   └── customer.model.ts
│   │   ├── services/
│   │   │   ├── wash-session.service.ts
│   │   │   ├── queue-management.service.ts
│   │   │   └── service-catalog.service.ts
│   │   └── routes/
│   │
│   └── lumi/                          # Restaurant management
│       ├── models/
│       │   └── dining-party.model.ts
│       ├── services/
│       │   ├── table-management.service.ts
│       │   ├── session.service.ts
│       │   └── service-request.service.ts
│       └── routes/
│
└── common/                            # Shared utilities
    ├── database/
    │   ├── connections/
    │   │   ├── core-db.ts
    │   │   ├── spatial-db.ts
    │   │   ├── persta-db.ts
    │   │   ├── testa-db.ts
    │   │   ├── costa-db.ts
    │   │   ├── bayra-db.ts
    │   │   └── lumi-db.ts
    │   └── base.ts
    │
    ├── cache/
    │   ├── redis.ts
    │   └── availability-cache.ts
    │
    ├── config/
    │   ├── env.ts
    │   └── constants.ts
    │
    └── utils/
        ├── logging.ts
        ├── errors.ts
        └── validators.ts
```

---

## Module Organization

### Core Modules

**Purpose:** Platform identity and infrastructure

**Modules:**
- `auth/` - Authentication (OTP, JWT, sessions)
- `memberships/` - User-Organization relationships
- `notifications/` - Multi-channel notifications
- `documents/` - Document generation and storage

**Key Principle:** Core owns identity, not domain logic

### Spatial Modules (The Engine)

**Purpose:** Shared platform primitives used by all verticals

**The 5 Primitives:**

1. **Spaces** - WHERE things happen
2. **Occupancies** - WHAT fills spaces
3. **Actors** - WHO performs actions (base only)
4. **Activities** - WHAT happens
5. **Events** - WHEN things happen

**Module Structure:**

```
spatial/
  spaces/
    models/           # Shared space types
    services/         # Space management, geospatial
    types/            # Enums, interfaces
    
  occupancies/
    models/           # Base occupancy + type variants
    services/         # Availability, occupancy management
    
  actors/
    models/           # Lightweight actor primitive
    services/         # Actor management
    types/            # Actor types enum
    
  activities/
    models/           # Shared activity types
    services/         # Activity tracking
    
  events/
    models/           # Event schemas
    services/         # Event recording, analytics
```

### Vertical Modules

**Purpose:** Domain-specific business logic and workflows

**What Verticals Own:**
- Domain-specific models (tenant, guest, customer)
- Business workflows (rent collection, rate management)
- Domain rules (screening criteria, loyalty programs)
- Vertical-specific controllers and routes

**What Verticals Don't Own:**
- Space primitives (use from `spatial/spaces`)
- Occupancy primitives (use from `spatial/occupancies`)
- Event structures (use from `spatial/events`)

---

## Database Strategy

### Seven Databases Approach

Unlike the original proposal, we maintain **7 separate databases** for:
1. Domain isolation
2. Security boundaries
3. Independent scaling
4. Future microservices extraction

**Database Mapping:**

| Database | Purpose | Main Collections | Module |
|----------|---------|------------------|--------|
| **tobiira_core** | Platform identity | users, organizations, memberships, roles | `core/` |
| **tobiira_spatial** | Spatial primitives | spaces, occupancies, actors, activities, events | `spatial/` |
| **tobiira_persta** | Residential domain | tenants, lease_documents, screening_reports | `verticals/persta/` |
| **tobiira_testa** | Hotel domain | guests, loyalty_programs, guest_preferences | `verticals/testa/` |
| **tobiira_costa** | Commercial domain | commercial_tenants, lease_contracts | `verticals/costa/` |
| **tobiira_bayra** | Car wash domain | vehicles, customers, service_packages | `verticals/bayra/` |
| **tobiira_lumi** | Restaurant domain | dining_parties, menu_items, table_config | `verticals/lumi/` |

### Database Connection Pattern

```typescript
// common/database/connections/core-db.ts
import mongoose from 'mongoose';

export const coreDB = mongoose.createConnection(
  process.env.MONGODB_CORE_URI!,
  { dbName: 'tobiira_core' }
);

// common/database/connections/spatial-db.ts
export const spatialDB = mongoose.createConnection(
  process.env.MONGODB_SPATIAL_URI!,
  { dbName: 'tobiira_spatial' }
);

// common/database/connections/persta-db.ts
export const perstaDB = mongoose.createConnection(
  process.env.MONGODB_PERSTA_URI!,
  { dbName: 'tobiira_persta' }
);

// ... similar for testa, costa, bayra, lumi
```

### Cross-Database Queries

**Rule:** No database joins at the database level.

**Pattern:** Join at application layer using service calls.

```typescript
// ❌ BAD: Cross-database join
const result = await Lease.aggregate([
  {
    $lookup: {
      from: 'persta_tenants',  // Different database!
      localField: 'tenantId',
      foreignField: '_id',
      as: 'tenant'
    }
  }
]);

// ✅ GOOD: Application-level join
const lease = await Lease.findById(leaseId);
const tenant = await tenantService.getTenantById(lease.actorId);

return {
  ...lease.toObject(),
  tenant
};
```

---

## The Spatial Engine

The spatial engine is the **core innovation** of Tobiira's architecture.

### 1. Spaces (WHERE)

**Base Primitive:**

```typescript
// spatial/spaces/models/space.model.ts
export interface ISpace {
  _id: string;
  organizationId: string;
  spaceType: SpaceType;  // 'property' | 'block' | 'unit' | 'room' | 'bay' | 'table'
  name: string;
  code?: string;
  location?: GeoPoint;
  address?: Address;
  parentSpaceId?: string;  // Hierarchy support
  status: SpaceStatus;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}
```

**Space Hierarchy:**

```
Property (Building)
  └── Block (Floor/Wing)
      └── Unit/Room/Bay/Table (Individual spaces)
```

**Shared Types:**

- `property.model.ts` - Used by Persta, Testa, Costa
- `block.model.ts` - Used by Persta, Testa, Costa
- `unit.model.ts` - Used by Persta, Costa
- `room.model.ts` - Used by Testa
- `bay.model.ts` - Used by Bayra
- `table.model.ts` - Used by Lumi

### 2. Occupancies (WHAT)

**Base Primitive:**

```typescript
// spatial/occupancies/models/occupancy.model.ts
export interface IOccupancy {
  _id: string;
  organizationId: string;
  occupancyType: OccupancyType;  // 'lease' | 'reservation' | 'wash_session' | 'dining_session'
  
  // What space?
  spaceId: string;
  spaceType: string;
  
  // Who?
  actorId: string;
  actorType: string;
  
  // When? (scheduled vs actual)
  scheduledStart: Date;
  scheduledEnd: Date;
  actualStart?: Date;
  actualEnd?: Date;
  
  status: OccupancyStatus;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}
```

**Occupancy Types:**

- `lease-occupancy.model.ts` - Residential/Commercial leases (Persta/Costa)
- `reservation-occupancy.model.ts` - Hotel reservations (Testa)
- `bay-occupancy.model.ts` - Wash sessions (Bayra)
- `dining-occupancy.model.ts` - Dining sessions (Lumi)

**Key Feature:** All occupancies share availability logic:

```typescript
// spatial/occupancies/services/availability.service.ts
export class AvailabilityService {
  async checkAvailability(
    spaceId: string,
    startDate: Date,
    endDate: Date
  ): Promise<boolean> {
    // Works for units, rooms, bays, tables!
    const overlapping = await Occupancy.countDocuments({
      spaceId,
      status: { $in: ['confirmed', 'active'] },
      scheduledStart: { $lt: endDate },
      scheduledEnd: { $gt: startDate }
    });
    
    return overlapping === 0;
  }
}
```

### 3. Actors (WHO)

**Base Primitive Only:**

```typescript
// spatial/actors/models/actor.model.ts
export interface IActor {
  _id: string;
  userId: string;           // Links to core/auth user
  organizationId: string;
  actorType: ActorType;     // 'tenant' | 'guest' | 'customer' | 'staff'
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

**⚠️ Important:** Actor is intentionally lightweight.

Domain-specific actor details live in verticals:
- `persta/models/tenant.model.ts` - Residential tenant details
- `testa/models/guest.model.ts` - Hotel guest details
- `bayra/models/customer.model.ts` - Car wash customer details

### 4. Activities (WHAT happens)

**Shared Activity Types:**

```typescript
// spatial/activities/models/payment.model.ts
export interface IPayment {
  _id: string;
  organizationId: string;
  occupancyId: string;
  actorId: string;
  
  amount: number;
  currency: string;
  
  // Time tracking
  dueAt: Date;
  paidAt?: Date;
  
  status: PaymentStatus;
  paymentMethod?: string;
  metadata?: Record<string, any>;
}
```

Similar models for:
- `maintenance.model.ts` - Maintenance requests
- `service-request.model.ts` - General service requests

### 5. Events (WHEN)

**The Temporal Layer:**

```typescript
// spatial/events/models/event.model.ts
export interface ISpatialEvent {
  _id: string;
  
  // The 5 primitives
  organizationId: string;
  spaceId: string;
  occupancyId?: string;
  actorId: string;
  activityType: string;
  
  // When it happened
  occurredAt: Date;
  
  // Context
  spaceType?: string;
  actorType?: string;
  metadata?: Record<string, any>;
  source?: string;  // 'persta' | 'testa' | etc.
  
  createdAt: Date;
}
```

**Purpose:**
- Historical record of everything that happened
- Foundation for analytics
- Training data for future AI features
- Audit trail

**Example Events:**
```
Persta:
  - lease_application_submitted
  - lease_approved
  - lease_signed
  - tenant_moved_in
  - rent_paid
  - maintenance_requested

Testa:
  - reservation_created
  - reservation_confirmed
  - guest_checked_in
  - guest_checked_out
  - room_service_ordered

Bayra:
  - wash_session_started
  - wash_session_completed
  - customer_joined_queue

Lumi:
  - dining_session_started
  - waiter_called
  - order_placed
  - bill_requested
```

---

## Vertical Domains

Each vertical **uses** the spatial engine and adds domain-specific logic.

### Persta (Residential Property Management)

**Uses from Spatial:**
- `Property`, `Block`, `Unit` (spaces)
- `Lease` (occupancy)
- `Payment`, `Maintenance` (activities)
- `SpatialEvent` (events)

**Owns:**
- `Tenant` model (residential-specific fields)
- Rent collection workflows
- Lease management workflows
- Tenant screening logic
- Maintenance coordination

**Example Service:**

```typescript
// verticals/persta/services/lease-management.service.ts
import { Unit } from '@/spatial/spaces/models/unit.model';
import { Lease } from '@/spatial/occupancies/models/lease-occupancy.model';
import { SpatialEvent } from '@/spatial/events/models/event.model';
import { Tenant } from '../models/tenant.model';

export class LeaseManagementService {
  async createLease(data: CreateLeaseInput) {
    // 1. Validate unit exists (spatial engine)
    const unit = await Unit.findById(data.unitId);
    
    // 2. Validate tenant exists (vertical domain)
    const tenant = await Tenant.findById(data.tenantId);
    
    // 3. Check availability (spatial engine)
    const isAvailable = await availabilityService.checkAvailability(
      data.unitId,
      data.startDate,
      data.endDate
    );
    
    // 4. Create lease (spatial engine)
    const lease = await Lease.create({
      organizationId: data.organizationId,
      occupancyType: 'lease',
      spaceId: data.unitId,
      actorId: data.tenantId,
      // ... lease details
    });
    
    // 5. Record event (spatial engine)
    await SpatialEvent.create({
      organizationId: data.organizationId,
      spaceId: data.unitId,
      occupancyId: lease._id,
      actorId: data.tenantId,
      activityType: 'lease_created',
      occurredAt: new Date(),
      source: 'persta'
    });
    
    return lease;
  }
}
```

### Testa (Hotel Management)

**Uses from Spatial:**
- `Property`, `Block`, `Room` (spaces)
- `Reservation` (occupancy)
- `Payment` (activities)
- `SpatialEvent` (events)

**Owns:**
- `Guest` model (hospitality-specific fields)
- Reservation workflows
- Rate management (dynamic pricing)
- Housekeeping schedules
- Guest services

**Example Service:**

```typescript
// verticals/testa/services/reservation.service.ts
import { Room } from '@/spatial/spaces/models/room.model';
import { Reservation } from '@/spatial/occupancies/models/reservation-occupancy.model';
import { SpatialEvent } from '@/spatial/events/models/event.model';
import { Guest } from '../models/guest.model';

export class ReservationService {
  async createReservation(data: CreateReservationInput) {
    // 1. Get room (spatial engine)
    const room = await Room.findById(data.roomId);
    
    // 2. Get/create guest (vertical domain)
    const guest = await this.getOrCreateGuest(data.guestInfo);
    
    // 3. Check availability (spatial engine)
    const isAvailable = await availabilityService.checkAvailability(
      data.roomId,
      data.checkIn,
      data.checkOut
    );
    
    // 4. Calculate pricing (vertical domain - dynamic rates)
    const pricing = await rateManagementService.calculateRate(
      room,
      data.checkIn,
      data.checkOut,
      guest.loyaltyTier
    );
    
    // 5. Create reservation (spatial engine)
    const reservation = await Reservation.create({
      organizationId: data.organizationId,
      occupancyType: 'reservation',
      spaceId: data.roomId,
      actorId: guest._id,
      scheduledStart: data.checkIn,
      scheduledEnd: data.checkOut,
      ratePerNight: pricing.ratePerNight,
      totalAmount: pricing.totalAmount,
      // ... reservation details
    });
    
    // 6. Record event (spatial engine)
    await SpatialEvent.create({
      organizationId: data.organizationId,
      spaceId: data.roomId,
      occupancyId: reservation._id,
      actorId: guest._id,
      activityType: 'reservation_created',
      occurredAt: new Date(),
      source: 'testa'
    });
    
    return reservation;
  }
}
```

### Costa (Commercial Property Management)

**Uses from Spatial:**
- `Property`, `Block`, `Unit` (spaces)
- `Lease` (occupancy)
- `Payment` (activities)

**Owns:**
- `CommercialTenant` model
- Commercial lease workflows (different terms than residential)
- Facility management
- Commercial billing logic

### Bayra (Car Wash)

**Uses from Spatial:**
- `Property`, `Bay` (spaces)
- `BayOccupancy` (wash sessions)
- `Payment` (activities)

**Owns:**
- `Vehicle` model
- `Customer` model
- Queue management
- Service catalog
- Wash session workflows

### Lumi (Restaurant)

**Uses from Spatial:**
- `Property`, `Zone`, `Table` (spaces)
- `DiningOccupancy` (dining sessions)
- `ServiceRequest` (activities)

**Owns:**
- `DiningParty` model
- Table management
- Session tracking
- Service request handling
- Billing logic

---

## Cross-Cutting Concerns

### Availability Caching

**Location:** `common/cache/availability-cache.ts`

**Purpose:** Fast availability checks using Redis

**Strategy:**
```
1. Check Redis cache first (< 5ms)
2. If miss, query MongoDB (50-100ms)
3. Cache result for 1 hour
4. Invalidate on occupancy changes
```

**Used By:** All verticals for availability queries

### Event Analytics

**Location:** `spatial/events/services/analytics.service.ts`

**Purpose:** Query temporal data for insights

**Capabilities:**
- Event timelines
- Activity breakdowns
- Conversion funnels
- Performance metrics (time between events)
- Space utilization rates
- Revenue tracking

**Used By:** All verticals for reporting

### Geospatial Queries

**Location:** `spatial/spaces/services/geospatial.service.ts`

**Purpose:** Location-based searches

**Features:**
- Find spaces within radius
- Distance calculations
- Nearest spaces
- Bounding box queries

**Used By:** All verticals with location features

---

## Development Guidelines

### File Naming

```
Models:     kebab-case     → user-profile.model.ts
Services:   kebab-case     → lease-management.service.ts
Classes:    PascalCase     → LeaseManagementService
Functions:  camelCase      → createLease()
Constants:  UPPER_SNAKE    → MAX_LEASE_DURATION
Collections: snake_case    → spatial_events
```

### Import Patterns

```typescript
// ✅ GOOD: Import from spatial engine
import { Property } from '@/spatial/spaces/models/property.model';
import { Lease } from '@/spatial/occupancies/models/lease-occupancy.model';
import { SpatialEvent } from '@/spatial/events/models/event.model';

// ✅ GOOD: Import domain models from same vertical
import { Tenant } from '../models/tenant.model';

// ❌ BAD: Don't import across verticals
import { Guest } from '@/verticals/testa/models/guest.model';
```

### Service Layer Rules

1. **No business logic in controllers** - Controllers handle HTTP only
2. **No business logic in routes** - Routes define endpoints only
3. **Services contain all business logic** - This is where workflows live
4. **Services can import other services** - Orchestration is allowed
5. **Always record events** - Every important action creates an event

### Database Rules

1. **No cross-database joins** - Join at application layer
2. **Each model registers with correct database** - Check connection carefully
3. **Use transactions within database** - MongoDB transactions for consistency
4. **Always use indexes** - For query fields, especially dates and IDs

### Event Recording Rules

```typescript
// ALWAYS record events for:
// - State changes (created, approved, signed, cancelled)
// - Actions (moved_in, checked_in, payment_made)
// - Milestones (completed, terminated)

// Event structure:
await SpatialEvent.create({
  organizationId: string,     // Required
  spaceId: string,            // Required
  occupancyId?: string,       // If related to occupancy
  actorId: string,            // Required
  activityType: string,       // Required (descriptive, past tense)
  occurredAt: Date,           // Required (when it happened)
  metadata?: object,          // Optional extra context
  source: string              // Required ('persta', 'testa', etc.)
});
```

---

## Migration Path

### Phase 1: MVP (Current)

**Focus:** Persta + Testa + Spatial Engine

**Status:**
- ✅ Core modules (auth, memberships, notifications)
- ✅ Spatial engine (spaces, occupancies, events)
- 🚧 Persta (residential leases)
- 🚧 Testa (hotel reservations)

### Phase 2: Expansion

**Add:**
- Costa (commercial properties)
- Enhanced analytics
- AI features (semantic search)

### Phase 3: New Verticals

**Add:**
- Bayra (car wash)
- Lumi (restaurants)
- Future verticals (parking, venues, etc.)

### Phase 4: Microservices (Future)

**When:** After proven market traction

**How:**
- Each vertical becomes a microservice
- Spatial engine becomes shared API
- Event bus for cross-service communication
- API gateway for routing

**Path:**
```
Monolith (now)
  → Modular monolith (phase 1-3)
    → Microservices (phase 4)
```

---

## Key Takeaways

### The Platform Formula

```
Spatial Primitives + Domain Semantics = Rapid Vertical Development
```

### The Architecture Rule

```
┌─────────────────────────────────────────────┐
│  Shared primitives → spatial/               │
│  Domain semantics  → verticals/             │
│  Platform identity → core/                  │
└─────────────────────────────────────────────┘
```

### The Development Flow

```
1. Define space type in spatial/spaces
2. Define occupancy type in spatial/occupancies
3. Build vertical workflows using primitives
4. Record events for everything
5. Query events for analytics
```

### Success Metrics

- ✅ New vertical can launch in 1-2 weeks (not months)
- ✅ Shared features work across all verticals
- ✅ Analytics work across all verticals automatically
- ✅ Adding vertical doesn't touch other vertical code

---

## Appendix: Quick Reference

### When to Put Something in Spatial

Ask: "Will multiple verticals use this **exact same structure**?"

✅ YES → Put in `spatial/`
- Property (Persta, Testa, Costa all use)
- Occupancy (all verticals have occupancies)
- Payment (all verticals process payments)

❌ NO → Put in `verticals/`
- Tenant (only Persta/Costa)
- Guest (only Testa)
- Loyalty program (only Testa)

### When to Put Something in Vertical

Ask: "Is this specific to one business domain?"

✅ YES → Put in `verticals/`
- Tenant screening (residential-specific)
- Dynamic hotel pricing (hotel-specific)
- Queue management (car wash-specific)

❌ NO → Put in `spatial/` or `common/`

---

**End of Architecture Document**

*This architecture enables Tobiira to build spatial intelligence at scale.*